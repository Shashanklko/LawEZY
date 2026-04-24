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
    public boolean isVerified() { return isVerified; }
    public void setVerified(boolean verified) { isVerified = verified; }

    public String getBarLicenseNumber() { return barLicenseNumber; }
    public void setBarLicenseNumber(String barLicenseNumber) { this.barLicenseNumber = barLicenseNumber; }
    public String getIssuingAuthority() { return issuingAuthority; }
    public void setIssuingAuthority(String issuingAuthority) { this.issuingAuthority = issuingAuthority; }
    public String getLicenseDriveLink() { return licenseDriveLink; }
    public void setLicenseDriveLink(String licenseDriveLink) { this.licenseDriveLink = licenseDriveLink; }
    public String getDomains() { return domains; }
    public void setDomains(String domains) { this.domains = domains; }
    public String getEducationHistory() { return educationHistory; }
    public void setEducationHistory(String educationHistory) { this.educationHistory = educationHistory; }
    public String getExperienceHistory() { return experienceHistory; }
    public void setExperienceHistory(String experienceHistory) { this.experienceHistory = experienceHistory; }
    public String getExperienceSnapshots() { return experienceSnapshots; }
    public void setExperienceSnapshots(String experienceSnapshots) { this.experienceSnapshots = experienceSnapshots; }
    public String getYoutubeLink() { return youtubeLink; }
    public void setYoutubeLink(String youtubeLink) { this.youtubeLink = youtubeLink; }
    public String getLinkedinLink() { return linkedinLink; }
    public void setLinkedinLink(String linkedinLink) { this.linkedinLink = linkedinLink; }
    public String getWebsiteLink() { return websiteLink; }
    public void setWebsiteLink(String websiteLink) { this.websiteLink = websiteLink; }
    public Double getConsultationFee() { return consultationFee; }
    public void setConsultationFee(Double consultationFee) { this.consultationFee = consultationFee; }
    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }
    public Integer getReviewCount() { return reviewCount; }
    public void setReviewCount(Integer reviewCount) { this.reviewCount = reviewCount; }
}
