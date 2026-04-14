package com.LawEZY.user.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "cfa_profiles")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
public class CFAProfile extends BaseProfile {

    private String charterNumber;
    private String issuingAuthority;
    private String licenseDriveLink;
    
    @Column(columnDefinition = "TEXT")
    private String domains; 
    
    @Column(columnDefinition = "TEXT")
    private String educationHistory; 
    
    @Column(columnDefinition = "TEXT")
    private String experienceHistory;

    @Column(columnDefinition = "TEXT")
    private String experienceSnapshots;
    
    private String linkedinLink;
    
    private Double consultationFee = 499.0;
    private Double rating = 0.0;
    private Integer reviewCount = 0;
    private boolean isVerified = false;
}
