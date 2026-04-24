package com.LawEZY.user.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "appointments")
public class Appointment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "client_id")
    private User client;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "expert_id")
    private User expert;

    private String initiatorId;

    public void setClientId(String id) {
        if (id != null) {
            this.client = new User();
            this.client.setId(id);
        }
    }

    public void setExpertId(String id) {
        if (id != null) {
            this.expert = new User();
            this.expert.setId(id);
        }
    }

    private String chatSessionId;
    private LocalDateTime scheduledAt;
    private Integer durationMinutes = 30;
    private Double baseFee;
    private Double platformFee = 100.0;
    private Double fee;
    private LocalDateTime proposedSlot1;
    private LocalDateTime proposedSlot2;
    private LocalDateTime proposedSlot3;
    private Boolean isFree = false;

    @Column(nullable = false)
    private String status = "PROPOSED";
    private String roomId;
    private String reason;
    private Double discountPercent;
    private String rejectionReason;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime completedByExpertAt;
    private Boolean payoutReleased = false;

    public Appointment() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getClient() { return client; }
    public void setClient(User client) { this.client = client; }
    public User getExpert() { return expert; }
    public void setExpert(User expert) { this.expert = expert; }
    public String getInitiatorId() { return initiatorId; }
    public void setInitiatorId(String initiatorId) { this.initiatorId = initiatorId; }
    public String getChatSessionId() { return chatSessionId; }
    public void setChatSessionId(String chatSessionId) { this.chatSessionId = chatSessionId; }
    public LocalDateTime getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(LocalDateTime scheduledAt) { this.scheduledAt = scheduledAt; }
    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }
    public Double getBaseFee() { return baseFee; }
    public void setBaseFee(Double baseFee) { this.baseFee = baseFee; }
    public Double getPlatformFee() { return platformFee; }
    public void setPlatformFee(Double platformFee) { this.platformFee = platformFee; }
    public Double getFee() { return fee; }
    public void setFee(Double fee) { this.fee = fee; }
    public LocalDateTime getProposedSlot1() { return proposedSlot1; }
    public void setProposedSlot1(LocalDateTime proposedSlot1) { this.proposedSlot1 = proposedSlot1; }
    public LocalDateTime getProposedSlot2() { return proposedSlot2; }
    public void setProposedSlot2(LocalDateTime proposedSlot2) { this.proposedSlot2 = proposedSlot2; }
    public LocalDateTime getProposedSlot3() { return proposedSlot3; }
    public void setProposedSlot3(LocalDateTime proposedSlot3) { this.proposedSlot3 = proposedSlot3; }
    public Boolean getIsFree() { return isFree; }
    public void setIsFree(Boolean isFree) { this.isFree = isFree; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public Double getDiscountPercent() { return discountPercent; }
    public void setDiscountPercent(Double discountPercent) { this.discountPercent = discountPercent; }
    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public LocalDateTime getCompletedByExpertAt() { return completedByExpertAt; }
    public void setCompletedByExpertAt(LocalDateTime completedByExpertAt) { this.completedByExpertAt = completedByExpertAt; }
    public Boolean getPayoutReleased() { return payoutReleased != null ? payoutReleased : false; }
    public void setPayoutReleased(Boolean payoutReleased) { this.payoutReleased = payoutReleased; }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
