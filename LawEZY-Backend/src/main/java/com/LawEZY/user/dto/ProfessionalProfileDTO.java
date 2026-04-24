package com.LawEZY.user.dto;

import java.util.List;

public class ProfessionalProfileDTO {
    private String id;
    private String name;
    private String email;
    private String category;
    private String title;
    private String experience;
    private List<String> domains;
    private String location;
    private String bioSmall;
    private Double rating;
    private Integer reviewsCount;
    private Double price;
    private Boolean online;
    private String avatar;
    private String specialization;
    private String bio;
    private List<Object> educationList;
    private List<Object> experienceList;
    private List<Object> snapshots;
    private String licenseNo;
    private String licenseDriveLink;
    private Boolean isVerified;
    private String slug;
    private Double cashBalance;
    private Double earnedBalance;
    private String phoneNumber;
    private List<ReviewDTO> testimonials;
    private Double textChatFee;
    private Integer chatDurationMinutes;
    private String customGreeting;
    private String bankName;
    private String accountNumber;
    private String ifscCode;
    private String accountHolderName;
    private String upiId;

    public ProfessionalProfileDTO() {}

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getExperience() { return experience; }
    public void setExperience(String experience) { this.experience = experience; }
    public List<String> getDomains() { return domains; }
    public void setDomains(List<String> domains) { this.domains = domains; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getBioSmall() { return bioSmall; }
    public void setBioSmall(String bioSmall) { this.bioSmall = bioSmall; }
    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }
    public Integer getReviewsCount() { return reviewsCount; }
    public void setReviewsCount(Integer reviewsCount) { this.reviewsCount = reviewsCount; }
    public Double getPrice() { return price; }
    public void setPrice(Double price) { this.price = price; }
    public Boolean getOnline() { return online; }
    public void setOnline(Boolean online) { this.online = online; }
    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }
    public String getSpecialization() { return specialization; }
    public void setSpecialization(String specialization) { this.specialization = specialization; }
    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
    public List<Object> getEducationList() { return educationList; }
    public void setEducationList(List<Object> educationList) { this.educationList = educationList; }
    public List<Object> getExperienceList() { return experienceList; }
    public void setExperienceList(List<Object> experienceList) { this.experienceList = experienceList; }
    public List<Object> getSnapshots() { return snapshots; }
    public void setSnapshots(List<Object> snapshots) { this.snapshots = snapshots; }
    public String getLicenseNo() { return licenseNo; }
    public void setLicenseNo(String licenseNo) { this.licenseNo = licenseNo; }
    public String getLicenseDriveLink() { return licenseDriveLink; }
    public void setLicenseDriveLink(String licenseDriveLink) { this.licenseDriveLink = licenseDriveLink; }
    public Boolean getIsVerified() { return isVerified; }
    public void setIsVerified(Boolean isVerified) { this.isVerified = isVerified; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public Double getCashBalance() { return cashBalance; }
    public void setCashBalance(Double cashBalance) { this.cashBalance = cashBalance; }
    public Double getEarnedBalance() { return earnedBalance; }
    public void setEarnedBalance(Double earnedBalance) { this.earnedBalance = earnedBalance; }
    public List<ReviewDTO> getTestimonials() { return testimonials; }
    public void setTestimonials(List<ReviewDTO> testimonials) { this.testimonials = testimonials; }

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
