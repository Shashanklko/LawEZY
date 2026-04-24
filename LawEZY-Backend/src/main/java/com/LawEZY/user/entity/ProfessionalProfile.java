package com.LawEZY.user.entity;

import com.LawEZY.user.enums.Role;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

@Entity
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
    private Double textChatFee = 100.0; // New: Fee for the next block of time
    private Integer chatDurationMinutes = 20; // New: Duration for the paid block
    private String specialization;

    public ProfessionalProfile() {}

    public Role getCategory() { return category; }
    public void setCategory(Role category) { this.category = category; }
    public String getExperience() { return experience; }
    public void setExperience(String experience) { this.experience = experience; }
    public String getDomains() { return domains; }
    public void setDomains(String domains) { this.domains = domains; }
    public String getBioSmall() { return bioSmall; }
    public void setBioSmall(String bioSmall) { this.bioSmall = bioSmall; }
    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }
    public Integer getReviewsCount() { return reviewsCount; }
    public void setReviewsCount(Integer reviewsCount) { this.reviewsCount = reviewsCount; }
    public String getCustomGreeting() { return customGreeting; }
    public void setCustomGreeting(String customGreeting) { this.customGreeting = customGreeting; }
    public Double getChatUnlockFee() { return chatUnlockFee; }
    public void setChatUnlockFee(Double chatUnlockFee) { this.chatUnlockFee = chatUnlockFee; }
    public Double getConsultationFee() { return consultationFee; }
    public void setConsultationFee(Double consultationFee) { this.consultationFee = consultationFee; }
    public Double getTextChatFee() { return textChatFee; }
    public void setTextChatFee(Double textChatFee) { this.textChatFee = textChatFee; }
    public Integer getChatDurationMinutes() { return chatDurationMinutes; }
    public void setChatDurationMinutes(Integer chatDurationMinutes) { this.chatDurationMinutes = chatDurationMinutes; }
    public String getSpecialization() { return specialization; }
    public void setSpecialization(String specialization) { this.specialization = specialization; }
}
