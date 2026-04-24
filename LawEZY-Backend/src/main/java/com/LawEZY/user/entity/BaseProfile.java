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
    @Column(unique = true)
    private String slug; // SEO-friendly vanity URL slug
    
    private String phoneNumber;
    private String experience;
    private Boolean online = true;
    
    private Double textChatFee = 100.0;
    private Integer chatDurationMinutes = 10;
    @Column(columnDefinition = "TEXT")
    private String customGreeting;

    private String bankName;
    private String accountNumber;
    private String ifscCode;
    private String accountHolderName;
    private String upiId;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    public String getExperience() { return experience; }
    public void setExperience(String experience) { this.experience = experience; }
    public Boolean getOnline() { return online; }
    public void setOnline(Boolean online) { this.online = online; }

    public Double getTextChatFee() { return textChatFee; }
    public void setTextChatFee(Double textChatFee) { this.textChatFee = textChatFee; }
    public Integer getChatDurationMinutes() { return chatDurationMinutes; }
    public void setChatDurationMinutes(Integer chatDurationMinutes) { this.chatDurationMinutes = chatDurationMinutes; }
    public String getCustomGreeting() { return customGreeting; }
    public void setCustomGreeting(String customGreeting) { this.customGreeting = customGreeting; }

    public String getBankName() { return bankName; }
    public void setBankName(String bankName) { this.bankName = bankName; }
    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }
    public String getIfscCode() { return ifscCode; }
    public void setIfscCode(String ifscCode) { this.ifscCode = ifscCode; }
    public String getAccountHolderName() { return accountHolderName; }
    public void setAccountHolderName(String accountHolderName) { this.accountHolderName = accountHolderName; }
    public String getUpiId() { return upiId; }
    public void setUpiId(String upiId) { this.upiId = upiId; }
}
