package com.LawEZY.notification.service;

import com.LawEZY.notification.model.Notification;
import com.LawEZY.notification.repository.NotificationRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;

    @org.springframework.beans.factory.annotation.Autowired
    private org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public Notification sendNotification(String userId, String title, String message, String type, String category, String actionLink) {
        // 1. Persist to MongoDB
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notification.setCategory(category != null ? category : inferCategory(type));
        notification.setActionLink(actionLink);
        
        Notification saved = notificationRepository.save(notification);
        log.info("🔔 [NOTIFICATION] Saved alert for user {}: {} [{}]", userId, title, category);

        // 2. Real-Time Relay via Internal WebSocket (No external HTTP bridge needed)
        try {
            messagingTemplate.convertAndSend("/topic/user/" + userId + "/notifications", saved);
            log.info("🛰️ [RELAY] Real-time notification sent directly to user {} via WebSocket", userId);
        } catch (Exception e) {
            log.warn("🛰️ [RELAY] WebSocket notification delivery failed. Persistence confirmed: {}", e.getMessage());
        }

        return saved;
    }

    private String inferCategory(String type) {
        if (type == null) return "SYSTEM";
        return switch (type.toUpperCase()) {
            case "PAYMENT" -> "FINANCIAL";
            case "SOCIAL" -> "SOCIAL";
            case "APPOINTMENT", "ENGAGEMENT", "MESSAGE" -> "ENGAGEMENT";
            default -> "SYSTEM";
        };
    }

    /** Backward-compat overload — infers category from type */
    public Notification sendNotification(String userId, String title, String message, String type, String actionLink) {
        return sendNotification(userId, title, message, type, null, actionLink);
    }

    public List<Notification> getUserNotifications(String userId) {
        return notificationRepository.findByUserIdOrderByTimestampDesc(userId);
    }

    public List<Notification> getByCategory(String userId, String category) {
        return notificationRepository.findByUserIdAndCategoryOrderByTimestampDesc(userId, category.toUpperCase());
    }

    public void markAsRead(String notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
    }

    public void markAllAsRead(String userId) {
        List<Notification> unread = notificationRepository.findUnreadByUserId(userId);
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
        log.info("✅ [NOTIFICATION] Marked {} alerts as read for user {}", unread.size(), userId);
    }

    public long getUnreadCount(String userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }
}
