package com.LawEZY.notification.service;

import com.LawEZY.notification.model.Notification;
import com.LawEZY.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class NotificationService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.messenger.url}")
    private String messengerUrl;

    @Value("${app.internal.secret}")
    private String internalSecret;

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

        // 2. Trigger Real-Time Relay via Messenger Bridge (Protected)
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("userId", userId);
            payload.put("notification", saved);
            
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("X-Internal-Secret", internalSecret);
            org.springframework.http.HttpEntity<Map<String, Object>> entity = new org.springframework.http.HttpEntity<>(payload, headers);
            
            restTemplate.postForObject(messengerUrl + "/api/internal/emit-notification", entity, String.class);
            log.info("🛰️ [RELAY] Real-time pulse sent to Messenger for user {}", userId);
        } catch (Exception e) {
            log.warn("🛰️ [RELAY SILENT] Messenger bridge skipped or inactive. Local persistence confirmed.");
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
