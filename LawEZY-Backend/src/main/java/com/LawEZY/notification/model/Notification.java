package com.LawEZY.notification.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "notifications")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {
    @Id
    private String id;
    private String userId;
    private String title;
    private String message;
    private String type; // APPOINTMENT, MESSAGE, PAYMENT, SYSTEM, SOCIAL, ENGAGEMENT
    private String category; // FINANCIAL, SOCIAL, ENGAGEMENT, SYSTEM
    @Builder.Default
    private boolean read = false;
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
    private String actionLink; // Optional link to redirect on click
}
