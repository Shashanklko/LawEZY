package com.LawEZY.config.websocket;

import com.LawEZY.auth.util.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.Map;

/**
 * Intercepts all STOMP messages flowing through WebSocket channels.
 * 
 * On CONNECT: Authenticates the user via JWT from STOMP headers, setting up
 * the Spring Security context for the WebSocket session.
 * 
 * On SEND: Performs anti-leakage scanning on message payloads to prevent
 * direct contact sharing (phone numbers, emails, WhatsApp references).
 */
@Component
public class ChatChannelInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(ChatChannelInterceptor.class);

    @Autowired
    private JwtUtil jwtUtil;

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null) return message;

        // --- CONNECT: Authenticate the WebSocket session via JWT ---
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String token = accessor.getFirstNativeHeader("Authorization");
            
            if (token != null && token.startsWith("Bearer ")) {
                token = token.substring(7);
            }

            // Fallback: check session attributes (set by WebSocketAuthInterceptor during HTTP handshake)
            if (token == null || token.isBlank()) {
                Map<String, Object> sessionAttrs = accessor.getSessionAttributes();
                if (sessionAttrs != null && sessionAttrs.containsKey("userId")) {
                    // Already authenticated via handshake interceptor
                    String userId = (String) sessionAttrs.get("userId");
                    String email = (String) sessionAttrs.get("email");
                    String role = (String) sessionAttrs.get("role");

                    com.LawEZY.auth.dto.CustomUserDetails userDetails = new com.LawEZY.auth.dto.CustomUserDetails(
                        userId, email, "PROTECTED", true, true, true, true,
                        Collections.singletonList(new SimpleGrantedAuthority(
                            role.startsWith("ROLE_") ? role : "ROLE_" + role
                        ))
                    );

                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities()
                    );
                    accessor.setUser(authToken);
                    log.info("[WS-CHANNEL] STOMP CONNECT authenticated via handshake for: {} ({})", email, userId);
                    return message;
                }
                log.warn("[WS-CHANNEL] STOMP CONNECT rejected: No token in headers or session.");
                throw new RuntimeException("Authentication required for WebSocket connection.");
            }

            try {
                String email = jwtUtil.extractUsername(token);
                if (email == null || jwtUtil.isTokenExpired(token)) {
                    throw new RuntimeException("Invalid or expired token.");
                }

                String id = jwtUtil.extractClaim(token, "id", String.class);
                String role = jwtUtil.extractClaim(token, "role", String.class);
                String springRole = (role != null && role.startsWith("ROLE_")) ? role : "ROLE_" + (role != null ? role : "CLIENT");

                com.LawEZY.auth.dto.CustomUserDetails userDetails = new com.LawEZY.auth.dto.CustomUserDetails(
                    id, email, "PROTECTED", true, true, true, true,
                    Collections.singletonList(new SimpleGrantedAuthority(springRole))
                );

                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities()
                );
                accessor.setUser(authToken);
                log.info("[WS-CHANNEL] STOMP CONNECT authenticated for: {} ({})", email, id);

            } catch (Exception e) {
                log.error("[WS-CHANNEL] STOMP CONNECT auth failure: {}", e.getMessage());
                throw new RuntimeException("WebSocket authentication failed: " + e.getMessage());
            }
        }

        // --- SEND: Anti-Leakage Guard on chat message content ---
        if (StompCommand.SEND.equals(accessor.getCommand())) {
            Object payloadObj = message.getPayload();
            if (payloadObj instanceof byte[]) {
                String payload = new String((byte[]) payloadObj);
                
                // Only scan the actual user-typed 'content' field, not the full JSON
                // to avoid false positives from session IDs, user IDs, etc.
                try {
                    // Extract content field from JSON payload
                    String contentToScan = null;
                    int contentIdx = payload.indexOf("\"content\"");
                    if (contentIdx >= 0) {
                        int colonIdx = payload.indexOf(":", contentIdx);
                        int startQuote = payload.indexOf("\"", colonIdx + 1);
                        int endQuote = payload.indexOf("\"", startQuote + 1);
                        if (startQuote >= 0 && endQuote > startQuote) {
                            contentToScan = payload.substring(startQuote + 1, endQuote);
                        }
                    }

                    if (contentToScan != null && !contentToScan.isEmpty()) {
                        // Check for phone numbers (10+ digit sequences), WhatsApp, email patterns
                        if (contentToScan.matches(".*\\b\\d{10,}\\b.*") || 
                            contentToScan.toLowerCase().contains("whatsapp") || 
                            contentToScan.matches(".*[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}.*")) {
                            log.warn("[WS-SECURITY] Contact-sharing attempt blocked in content.");
                            throw new RuntimeException("Security Violation: Direct contact sharing detected.");
                        }
                    }
                } catch (RuntimeException re) {
                    throw re; // Re-throw security violations
                } catch (Exception e) {
                    log.debug("[WS-SECURITY] Could not parse message for scanning: {}", e.getMessage());
                }
            }
        }

        return message;
    }
}
