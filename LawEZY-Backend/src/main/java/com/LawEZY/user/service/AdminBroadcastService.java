package com.LawEZY.user.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AdminBroadcastService {

    private final SimpMessagingTemplate messagingTemplate;

    @Autowired
    public AdminBroadcastService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Broadcasts a real-time event to the Admin Command Center.
     * @param eventType The type of event (e.g., "SYSTEM_MODE_CHANGE", "NEW_USER", "SECURITY_ALERT")
     * @param payload The data associated with the event
     */
    public void broadcastAdminEvent(String eventType, Object payload) {
        messagingTemplate.convertAndSend("/topic/admin", Map.of(
            "eventType", eventType,
            "timestamp", java.time.LocalDateTime.now().toString(),
            "data", payload
        ));
    }

    /**
     * Broadcasts a global system mode change to ALL users.
     */
    public void broadcastSystemStatus(String mode) {
        messagingTemplate.convertAndSend("/topic/system-status", Map.of(
            "mode", mode,
            "timestamp", java.time.LocalDateTime.now().toString()
        ));
    }

    /**
     * Broadcasts a global alert to all connected users.
     */
    public void broadcastPublicAlert(String message, String level) {
        messagingTemplate.convertAndSend("/topic/public-alerts", Map.of(
            "message", message,
            "level", level,
            "timestamp", java.time.LocalDateTime.now().toString()
        ));
    }
}
