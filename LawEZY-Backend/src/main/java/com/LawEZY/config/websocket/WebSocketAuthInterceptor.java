package com.LawEZY.config.websocket;

import com.LawEZY.auth.util.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

/**
 * Intercepts the initial HTTP handshake for WebSocket connections.
 * Extracts the JWT token from query parameters and validates it,
 * storing user identity attributes in the WebSocket session for later use.
 */
@Component
public class WebSocketAuthInterceptor implements HandshakeInterceptor {

    private static final Logger log = LoggerFactory.getLogger(WebSocketAuthInterceptor.class);

    @Autowired
    private JwtUtil jwtUtil;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        
        String token = null;

        // Extract token from query parameter: /ws?token=xyz
        if (request instanceof ServletServerHttpRequest) {
            ServletServerHttpRequest servletRequest = (ServletServerHttpRequest) request;
            token = servletRequest.getServletRequest().getParameter("token");
        }

        if (token == null || token.isBlank() || "null".equals(token) || "undefined".equals(token)) {
            log.debug("[WS-AUTH] No token in HTTP handshake. Delegating to STOMP CONNECT headers.");
            return true;
        }

        try {
            String email = jwtUtil.extractUsername(token);
            
            if (email == null || jwtUtil.isTokenExpired(token)) {
                log.warn("[WS-AUTH] Handshake rejected: Token expired or invalid for subject.");
                return false;
            }

            String id = jwtUtil.extractClaim(token, "id", String.class);
            String role = jwtUtil.extractClaim(token, "role", String.class);

            // Store identity in WebSocket session attributes for downstream use
            attributes.put("userId", id);
            attributes.put("email", email);
            attributes.put("role", role != null ? role : "ROLE_CLIENT");

            log.info("[WS-AUTH] Handshake authorized for: {} (ID: {})", email, id);
            return true;

        } catch (Exception e) {
            log.error("[WS-AUTH] Handshake rejected due to token error: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // No post-handshake processing needed
    }
}
