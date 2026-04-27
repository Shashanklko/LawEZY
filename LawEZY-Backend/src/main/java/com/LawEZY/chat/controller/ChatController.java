package com.LawEZY.chat.controller;

import com.LawEZY.chat.dto.ChatMessageResponse;
import com.LawEZY.chat.dto.ChatSessionResponse;
import com.LawEZY.chat.dto.SendMessageRequest;
import com.LawEZY.chat.dto.StartChatRequest;
import com.LawEZY.chat.model.ChatSession;
import com.LawEZY.chat.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import com.LawEZY.common.response.ApiResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;


import java.util.List;


@RestController
@RequestMapping("/api/chat")
public class ChatController {

    @Autowired
    private ChatService chatService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // --- REST ENDPOINTS (HTTP) ---

    @PostMapping("/start")
    public ResponseEntity<ApiResponse<ChatSessionResponse>> startChat(@NonNull @RequestBody StartChatRequest request) {
        ChatSessionResponse session = chatService.startSession(request);
        return ResponseEntity.ok(ApiResponse.success(session, "Chat session started successfully."));
    }

    @GetMapping("/{sessionId}/history")
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> getHistory(@NonNull @PathVariable String sessionId) {
        List<ChatMessageResponse> history = chatService.getChatHistory(sessionId);
        return ResponseEntity.ok(ApiResponse.success(history, "Chat history retrieved."));
    }

    @PostMapping("/{sessionId}/unlock")
    public ResponseEntity<ApiResponse<Void>> unlock(
            @NonNull @PathVariable String sessionId,
            @RequestParam(defaultValue = "10") int minutes) {
        chatService.unlockReply(sessionId, minutes);
        return ResponseEntity.ok(ApiResponse.success(null, "Chat unlocked for " + minutes + " minutes."));
    }
    
    @PostMapping("/{sessionId}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@NonNull @PathVariable String sessionId) {
        chatService.markAsRead(sessionId);
        return ResponseEntity.ok(ApiResponse.success(null, "Messages marked as read."));
    }
    
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> getTotalUnreadCount() {
        return ResponseEntity.ok(ApiResponse.success(chatService.getTotalUnreadCount(getCurrentId()), "Unread count retrieved."));
    }

    @GetMapping("/sessions/user/{userId}")
    public ResponseEntity<ApiResponse<List<ChatSessionResponse>>> getUserSessions(@NonNull @PathVariable String userId) {
        // Security Lock: Ignore @PathVariable and use Authenticated ID for safety
        String authenticatedId = getCurrentId();
        return ResponseEntity.ok(ApiResponse.success(chatService.getUserSessions(authenticatedId), "User sessions synchronized."));
    }

    @GetMapping("/sessions/pro/{proId}")
    public ResponseEntity<ApiResponse<List<ChatSessionResponse>>> getProfessionalSessions(@NonNull @PathVariable String proId) {
        // Security Lock: Ignore @PathVariable and use Authenticated ID for safety
        String authenticatedId = getCurrentId();
        return ResponseEntity.ok(ApiResponse.success(chatService.getProfessionalSessions(authenticatedId), "Professional sessions synchronized."));
    }

    private String getCurrentId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        Object principal = auth.getPrincipal();
        if (principal instanceof com.LawEZY.auth.dto.CustomUserDetails) {
            return ((com.LawEZY.auth.dto.CustomUserDetails) principal).getId();
        }
        return auth.getName();
    }


    // WebSocket message handlers moved to ChatWebSocketController


    @DeleteMapping("/session/{sessionId}")
    public ResponseEntity<ApiResponse<Void>> deleteSession(@NonNull @PathVariable String sessionId) {
        chatService.deleteSession(sessionId);
        return ResponseEntity.ok(ApiResponse.success(null, "Chat session permanently expunged."));
    }

    @PutMapping("/session/{sessionId}/resolve")
    public ResponseEntity<ApiResponse<Void>> resolveSession(@NonNull @PathVariable String sessionId) {
        chatService.resolveSession(sessionId);
        return ResponseEntity.ok(ApiResponse.success(null, "Chat session marked as RESOLVED."));
    }
}
