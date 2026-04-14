package com.LawEZY.user.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "appointments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Appointment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String clientUid;

    @Column(nullable = false)
    private String expertUid;

    private String chatSessionId; // Link to MongoDB chat session

    private LocalDateTime scheduledAt;
    
    @Builder.Default
    private Integer durationMinutes = 30;

    private Double baseFee;
    @Builder.Default
    private Double platformFee = 100.0;
    private Double fee; // Total fee: base + platform

    private LocalDateTime proposedSlot1;
    private LocalDateTime proposedSlot2;
    private LocalDateTime proposedSlot3;

    private String initiatorUid; // UID of the user who sent the current proposal
    
    @Builder.Default
    private Boolean isFree = false;

    @Column(nullable = false)
    @Builder.Default
    private String status = "PROPOSED"; // PROPOSED, COUNTERED, CONFIRMED, AWAITING_PAYMENT, PAID, COMPLETED, CANCELLED, EXPIRED

    private String roomId; // meeting link: lzy-room-XXXX

    private String reason; // Institutional reason for booking
    private Double discountPercent; // Negotiation: 0-10% discount request
    private String rejectionReason; // Feedback if session is rejected

    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
