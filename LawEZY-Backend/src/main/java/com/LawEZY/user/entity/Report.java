package com.LawEZY.user.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "reports")
public class Report {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String reporterId;

    @Column(nullable = false)
    private String targetType; // APPOINTMENT, COMMUNITY_POST, USER_PROFILE, CHAT_MESSAGE

    @Column(nullable = false)
    private String targetId;

    @Column(nullable = false, length = 1000)
    private String reason;

    @Column(length = 2000)
    private String details; // Optional additional context provided by reporter

    @Column(nullable = false)
    private String status = "PENDING"; // PENDING, INVESTIGATING, RESOLVED, DISMISSED

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime resolvedAt;

    public Report() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getReporterId() { return reporterId; }
    public void setReporterId(String reporterId) { this.reporterId = reporterId; }

    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }

    public String getTargetId() { return targetId; }
    public void setTargetId(String targetId) { this.targetId = targetId; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }
}
