package com.LawEZY.user.entity;

import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.OneToOne;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Column;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@MappedSuperclass
@Data
@NoArgsConstructor
@AllArgsConstructor
public abstract class BaseProfile {

    @Id
    @Column(length = 25)
    private String id; // Typically matches User ID or unique profile ID

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private User user;

    private String firstName;
    private String lastName;
    private String title;
    private String location;
    
    @Column(columnDefinition = "TEXT")
    private String bio;
    
    private String avatar;
    private String uid; // LawEZY Institutional UID
    private String phoneNumber;
    private String experience;
    private Boolean online = true;
}
