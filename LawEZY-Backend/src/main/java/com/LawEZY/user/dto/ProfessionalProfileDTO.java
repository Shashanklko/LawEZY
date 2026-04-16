package com.LawEZY.user.dto;

import lombok.Data;
import java.util.List;

@Data
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
    private Boolean isVerified;
    private String uid;
    private Double cashBalance;
    private Double earnedBalance;
    private List<ReviewDTO> testimonials;
}

