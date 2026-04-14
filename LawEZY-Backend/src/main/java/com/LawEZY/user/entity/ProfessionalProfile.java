package com.LawEZY.user.entity;

import com.LawEZY.user.enums.Role;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
public class ProfessionalProfile extends BaseProfile {

    @Enumerated(EnumType.STRING)
    private Role category; // LAWYER, CA, or OTHER

    private String experience;
    private String domains;
    private String bioSmall;
    private Double rating = 0.0;
    private Integer reviewsCount = 0;
    private String customGreeting;
    private Double chatUnlockFee = 99.0;
    private Double consultationFee = 499.0;
    private String specialization;
}

