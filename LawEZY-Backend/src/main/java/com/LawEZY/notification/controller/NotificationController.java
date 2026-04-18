package com.LawEZY.notification.controller;

import com.LawEZY.common.response.ApiResponse;
import com.LawEZY.notification.model.Notification;
import com.LawEZY.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /** All notifications for a user, latest first */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Notification>>> getNotifications(@RequestParam String userId) {
        List<Notification> notifications = notificationService.getUserNotifications(userId);
        if (notifications == null) notifications = java.util.Collections.emptyList();
        return ResponseEntity.ok(ApiResponse.success(notifications, "Notifications retrieved"));
    }

    /** Filter by category: FINANCIAL | SOCIAL | ENGAGEMENT | SYSTEM */
    @GetMapping("/category/{category}")
    public ResponseEntity<ApiResponse<List<Notification>>> getByCategory(
            @RequestParam String userId,
            @PathVariable String category) {
        List<Notification> notifications = notificationService.getByCategory(userId, category);
        return ResponseEntity.ok(ApiResponse.success(notifications, "Category feed retrieved"));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(@RequestParam String userId) {
        long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(ApiResponse.success(count, "Unread count retrieved"));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable String id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Notification marked as read"));
    }

    /** Mark every unread notification as read in one shot */
    @PutMapping("/mark-all-read")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(@RequestParam String userId) {
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(ApiResponse.success(null, "All notifications marked as read"));
    }
}
