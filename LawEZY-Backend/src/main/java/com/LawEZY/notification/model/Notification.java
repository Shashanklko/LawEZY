package com.LawEZY.notification.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;
import java.time.LocalDateTime;

@Document(collection = "notifications")
public class Notification {
    @Id
    private String id;
    private String userId;
    private String title;
    private String message;
    private String type; // APPOINTMENT, MESSAGE, PAYMENT, SYSTEM, SOCIAL, ENGAGEMENT
    private String category; // FINANCIAL, SOCIAL, ENGAGEMENT, SYSTEM
    private boolean read = false;
    @Indexed(expireAfterSeconds = 2592000) // 30 days auto-purge
    private LocalDateTime timestamp = LocalDateTime.now();
    private String actionLink;

    public Notification() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    public String getActionLink() { return actionLink; }
    public void setActionLink(String actionLink) { this.actionLink = actionLink; }
}
