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
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.messenger.url}")
    private String messengerUrl;

    public Notification sendNotification(String userId, String title, String message, String type, String actionLink) {
        // 1. Persist to MongoDB
        Notification notification = Notification.builder()
                .userId(userId)
                .title(title)
                .message(message)
                .type(type)
                .actionLink(actionLink)
                .build();
        
        Notification saved = notificationRepository.save(notification);
        log.info("🔔 [NOTIFICATION] Saved alert for user {}: {}", userId, title);

        // 2. Trigger Real-Time Relay via Messenger Bridge
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("userId", userId);
            payload.put("notification", saved);
            
            restTemplate.postForObject(messengerUrl + "/api/internal/emit-notification", payload, String.class);
            log.info("🛰️ [RELAY] Real-time pulse sent to Messenger for user {}", userId);
        } catch (Exception e) {
            log.error("❌ [RELAY ERROR] Failed to push real-time alert to Messenger: {}", e.getMessage());
        }

        return saved;
    }

    public List<Notification> getUserNotifications(String userId) {
        return notificationRepository.findByUserIdOrderByTimestampDesc(userId);
    }

    public void markAsRead(String notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
    }

    public long getUnreadCount(String userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }
}
