package com.LawEZY.common.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs", indexes = {
    @Index(name = "idx_audit_timestamp", columnList = "timestamp"),
    @Index(name = "idx_audit_type", columnList = "eventType")
})
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(nullable = false)
    private String eventType; // e.g., SECURITY_ALERT, AI_BLOCK, SYSTEM_ERROR

    @Column(nullable = false, length = 1000)
    private String summary;

    @Column(columnDefinition = "TEXT")
    private String details;

    private String ipAddress;

    private String userId; // Optional: Can be email or ID

    private String userRole; // e.g., CLIENT, PRO

    public AuditLog(String userRole, String eventType, String summary, String userId) {
        this.timestamp = LocalDateTime.now();
        this.userRole = userRole;
        this.eventType = eventType;
        this.summary = summary;
        this.userId = userId;
    }

    public AuditLog() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getUserRole() { return userRole; }
    public void setUserRole(String userRole) { this.userRole = userRole; }
}
