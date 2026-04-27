package com.LawEZY.chat.controller;

import com.LawEZY.auth.dto.CustomUserDetails;
import com.LawEZY.chat.dto.SendMessageRequest;
import com.LawEZY.chat.enums.ChatStatus;
import com.LawEZY.chat.model.ChatMessage;
import com.LawEZY.chat.model.ChatSession;
import com.LawEZY.chat.repository.ChatMessageRepository;
import com.LawEZY.chat.repository.ChatSessionRepository;
import com.LawEZY.user.enums.Role;
import com.LawEZY.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * WebSocket Controller for real-time chat messaging.
 * 
 * This replaces the Node.js Messenger service's Socket.io event handlers.
 * It handles incoming STOMP messages and broadcasts them to session subscribers.
 * 
 * Client sends to: /app/chat.send
 * Server broadcasts to: /topic/session/{sessionId}
 * Private notifications to: /topic/user/{userId}/notifications
 */
@Controller
public class ChatWebSocketController {

    private static final Logger log = LoggerFactory.getLogger(ChatWebSocketController.class);

    private static final List<String> PRO_ROLES = Arrays.asList(
        "LAWYER", "CA", "CFA", "PROFESSIONAL", "ADMIN", "MASTER_ADMIN",
        "ROLE_LAWYER", "ROLE_CA", "ROLE_CFA", "ROLE_PROFESSIONAL", "ROLE_ADMIN", "ROLE_MASTER_ADMIN"
    );

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ChatSessionRepository chatSessionRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private UserRepository userRepository;

    @Value("${spring.ai.google.gemini.python-url:https://lawino.vercel.app/}")
    private String aiServiceUrl;

    /**
     * Handles incoming chat messages from the frontend via STOMP.
     * 
     * This method mirrors the Node.js server.js `send_message` event handler:
     * 1. Validates the session exists and is not closed
     * 2. Checks billing/status (trial, expiry, professional reply logic)
     * 3. Optionally runs AI Safety Guard
     * 4. Saves the message to MongoDB
     * 5. Broadcasts to all session subscribers and sends discovery pings
     * 
     * Client sends: { chatSessionId, receiverId, content, type, fileMetadata, tempId }
     */
    @MessageMapping("/chat.send")
    public void handleSendMessage(@Payload Map<String, Object> payload, SimpMessageHeaderAccessor headerAccessor) {
        
        // Extract sender identity from authenticated WebSocket session
        String senderId = extractUserId(headerAccessor);
        String senderRole = extractUserRole(headerAccessor);
        
        if (senderId == null) {
            log.error("[WS-CHAT] Message rejected: Could not resolve sender identity.");
            return;
        }

        String chatSessionId = (String) payload.get("chatSessionId");
        String receiverId = (String) payload.get("receiverId");
        String content = (String) payload.get("content");
        String type = (String) payload.getOrDefault("type", "TEXT");
        String tempId = (String) payload.get("tempId");
        
        @SuppressWarnings("unchecked")
        Map<String, Object> fileMetadata = (Map<String, Object>) payload.get("fileMetadata");

        try {
            // 1. Fetch Session (Critical Path)
            ChatSession session = chatSessionRepository.findById(chatSessionId).orElse(null);
            if (session == null) {
                sendError(senderId, chatSessionId, tempId, "Session not found");
                return;
            }

            // 2. Authorization & Status Check
            if (session.getStatus() == ChatStatus.RESOLVED || session.getStatus() == ChatStatus.EXHAUSTED) {
                sendError(senderId, chatSessionId, tempId, "SESSION_CLOSED");
                return;
            }

            // 3. Determine if sender is a professional
            boolean isProfessional = isProfessionalRole(senderRole) || senderId.equals(session.getProfessionalId());

            // 4. AI Safety Guard (for unpaid sessions with text content)
            if (!Boolean.TRUE.equals(session.getIsAppointmentPaid()) && "TEXT".equals(type) && content != null && !content.trim().isEmpty()) {
                try {
                    RestTemplate rest = new RestTemplate();
                    Map<String, String> guardPayload = new HashMap<>();
                    guardPayload.put("query", content);
                    @SuppressWarnings("unchecked")
                    Map<String, Object> guardResult = rest.postForObject(aiServiceUrl + "/api/ai/guard", guardPayload, Map.class);
                    if (guardResult != null && "BLOCKED".equals(guardResult.get("status"))) {
                        sendError(senderId, chatSessionId, tempId, "BLOCKED_CONTACT_INFO");
                        return;
                    }
                } catch (Exception e) {
                    // Fail-open on timeout: allow the message if AI guard is unavailable
                    log.warn("[WS-CHAT] AI Guard unavailable, proceeding with message: {}", e.getMessage());
                }
            }

            // 5. Time-Based Billing Logic (mirrors Node.js logic)
            LocalDateTime now = LocalDateTime.now();
            
            if (isProfessional && session.getStatus() == ChatStatus.AWAITING_REPLY && "TEXT".equals(type)) {
                session.setExpiryTime(now.plusMinutes(5)); // 5 Minutes free trial
                session.setTrialEnded(true);
                session.setStatus(ChatStatus.ACTIVE);
            }

            // Check session expiry for clients
            if (!isProfessional && !Boolean.TRUE.equals(session.getIsAppointmentPaid()) 
                && session.getExpiryTime() != null && now.isAfter(session.getExpiryTime())) {
                sendError(senderId, chatSessionId, tempId, "SESSION_EXPIRED");
                return;
            }

            // 6. Create and save the message
            ChatMessage newMessage = new ChatMessage();
            newMessage.setChatSessionId(chatSessionId);
            newMessage.setSenderId(senderId);
            newMessage.setReceiverId(receiverId);
            newMessage.setContent(content);
            newMessage.setType(com.LawEZY.chat.enums.MessageType.valueOf(type));
            newMessage.setTimestamp(now);
            newMessage.setIsRead(false);

            // Lock professional replies in LOCKED_REPLY status for unpaid sessions
            if (isProfessional && session.getStatus() == ChatStatus.LOCKED_REPLY 
                && !Boolean.TRUE.equals(session.getIsAppointmentPaid())) {
                newMessage.setIsLocked(true);
            }

            session.setLastUpdateAt(now);

            // Save both in parallel
            chatMessageRepository.save(newMessage);
            chatSessionRepository.save(session);

            // 7. Build broadcast payload
            Map<String, Object> broadcastPayload = new HashMap<>();
            broadcastPayload.put("id", newMessage.getId());
            broadcastPayload.put("chatSessionId", chatSessionId);
            broadcastPayload.put("senderId", senderId);
            broadcastPayload.put("receiverId", receiverId);
            broadcastPayload.put("content", content);
            broadcastPayload.put("type", type);
            broadcastPayload.put("isLocked", newMessage.getIsLocked());
            broadcastPayload.put("isRead", false);
            broadcastPayload.put("tempId", tempId);
            broadcastPayload.put("timestamp", now.toString());

            if (fileMetadata != null) {
                broadcastPayload.put("fileMetadata", fileMetadata);
            }

            // 8. Broadcast to all session subscribers
            messagingTemplate.convertAndSend("/topic/session/" + chatSessionId, broadcastPayload);
            
            // 9. Send discovery sync to receiver (for chat list refresh)
            Map<String, Object> discoveryPayload = new HashMap<>();
            discoveryPayload.put("chatSessionId", chatSessionId);
            messagingTemplate.convertAndSend("/topic/user/" + receiverId + "/discovery", discoveryPayload);

            // 10. Send acknowledgement to sender
            Map<String, Object> ack = new HashMap<>();
            ack.put("success", true);
            ack.put("data", broadcastPayload);
            messagingTemplate.convertAndSend("/topic/user/" + senderId + "/ack", ack);

            log.info("[WS-CHAT] Message delivered: {} -> {} in session {}", senderId, receiverId, chatSessionId);

        } catch (Exception e) {
            log.error("[WS-CHAT] Critical error processing message: {}", e.getMessage(), e);
            sendError(senderId, chatSessionId, tempId, "Institutional handshake failed.");
        }
    }

    /**
     * Handles chat deletion notifications.
     * Client sends to: /app/chat.delete
     */
    @MessageMapping("/chat.delete")
    public void handleDeleteChat(@Payload Map<String, Object> payload) {
        String sessionId = (String) payload.get("sessionId");
        if (sessionId != null) {
            messagingTemplate.convertAndSend("/topic/session/" + sessionId + "/deleted", Map.of("sessionId", sessionId));
            log.info("[WS-CHAT] Chat deleted notification broadcast for session: {}", sessionId);
        }
    }

    // --- HELPER METHODS ---

    private void sendError(String userId, String sessionId, String tempId, String error) {
        Map<String, Object> errorPayload = new HashMap<>();
        errorPayload.put("success", false);
        errorPayload.put("error", error);
        errorPayload.put("tempId", tempId);
        errorPayload.put("chatSessionId", sessionId);
        messagingTemplate.convertAndSend("/topic/user/" + userId + "/ack", errorPayload);
    }

    private String extractUserId(SimpMessageHeaderAccessor headerAccessor) {
        if (headerAccessor.getUser() != null) {
            Object principal = ((org.springframework.security.authentication.UsernamePasswordAuthenticationToken) 
                headerAccessor.getUser()).getPrincipal();
            if (principal instanceof CustomUserDetails) {
                return ((CustomUserDetails) principal).getId();
            }
        }
        // Fallback: check session attributes
        Map<String, Object> sessionAttrs = headerAccessor.getSessionAttributes();
        if (sessionAttrs != null) {
            return (String) sessionAttrs.get("userId");
        }
        return null;
    }

    private String extractUserRole(SimpMessageHeaderAccessor headerAccessor) {
        if (headerAccessor.getUser() != null) {
            Object principal = ((org.springframework.security.authentication.UsernamePasswordAuthenticationToken) 
                headerAccessor.getUser()).getPrincipal();
            if (principal instanceof CustomUserDetails) {
                return ((CustomUserDetails) principal).getAuthorities().stream()
                    .findFirst().map(a -> a.getAuthority()).orElse("ROLE_CLIENT");
            }
        }
        Map<String, Object> sessionAttrs = headerAccessor.getSessionAttributes();
        if (sessionAttrs != null) {
            return (String) sessionAttrs.get("role");
        }
        return "ROLE_CLIENT";
    }

    private boolean isProfessionalRole(String role) {
        return role != null && PRO_ROLES.stream().anyMatch(r -> role.toUpperCase().contains(r));
    }
}
