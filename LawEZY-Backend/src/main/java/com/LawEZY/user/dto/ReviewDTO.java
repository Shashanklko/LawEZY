package com.LawEZY.user.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReviewDTO {
    private Long appointmentId;
    private Double rating;
    private String comment;
    private Boolean isAnonymous;
    private String clientName; // Optional display name
    private String createdAt;
}
