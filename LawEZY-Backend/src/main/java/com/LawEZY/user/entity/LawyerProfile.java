package com.LawEZY.user.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "lawyer_profiles")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
public class LawyerProfile extends BaseProfile {

    private String barLicenseNumber;
    private String issuingAuthority;
    private String licenseDriveLink;
    
    @Column(columnDefinition = "TEXT")
    private String domains; // JSON list of legal domains
    
    @Column(columnDefinition = "TEXT")
    private String educationHistory; // JSON list
    
    @Column(columnDefinition = "TEXT")
    private String experienceHistory; // JSON list
    
    @Column(columnDefinition = "TEXT")
    private String experienceSnapshots; // JSON list of links
    
    private String youtubeLink;
    private String linkedinLink;
    private String websiteLink;
    
    private Double consultationFee = 499.0;
    private Double rating = 0.0;
    private Integer reviewCount = 0;
    private boolean isVerified = false;
}
