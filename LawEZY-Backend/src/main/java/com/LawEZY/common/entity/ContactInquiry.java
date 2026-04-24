package com.LawEZY.common.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * 🏛️ INSTITUTIONAL CONTACT INQUIRY ENTITY
 * Persists all incoming lead inquiries to ensure zero data loss
 * even if the email notification service fails.
 */
@Entity
@Table(name = "contact_inquiries")
@Data
@NoArgsConstructor
public class ContactInquiry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String email;

    private String role;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(nullable = false)
    private LocalDateTime receivedAt;

    private boolean emailDispatched;

    @PrePersist
    protected void onCreate() {
        this.receivedAt = LocalDateTime.now();
    }
}
