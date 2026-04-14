package com.LawEZY.user.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "reviews")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long appointmentId;

    @Column(nullable = false)
    private String clientUid;

    @Column(nullable = false)
    private String expertUid;

    @Column(nullable = false)
    private Double rating; // 1.0 to 5.0

    @Column(columnDefinition = "TEXT")
    private String comment;

    private Boolean isAnonymous = false;

    private LocalDateTime createdAt = LocalDateTime.now();
}
