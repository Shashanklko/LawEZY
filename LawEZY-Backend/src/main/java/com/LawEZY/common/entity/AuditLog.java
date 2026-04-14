package com.LawEZY.common.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
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
}
