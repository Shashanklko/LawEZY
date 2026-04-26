package com.LawEZY.user.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "platform_treasury")
@Data
public class PlatformTreasury {
    @Id
    private String id = "SYSTEM_TREASURY";

    private Double totalEarnings = 0.0;
    private Double commissionEarnings = 0.0;
    private Double platformFeeEarnings = 0.0;
    private Double aiChatEarnings = 0.0;
    private Double aiAuditEarnings = 0.0;

    private LocalDateTime lastUpdatedAt;

    public PlatformTreasury() {}

    public void addEarning(Double amount, String category) {
        if (amount == null) return;
        this.totalEarnings = (this.totalEarnings != null ? this.totalEarnings : 0.0) + amount;
        
        switch (category.toUpperCase()) {
            case "COMMISSION":
                this.commissionEarnings = (this.commissionEarnings != null ? this.commissionEarnings : 0.0) + amount;
                break;
            case "PLATFORM_FEE":
                this.platformFeeEarnings = (this.platformFeeEarnings != null ? this.platformFeeEarnings : 0.0) + amount;
                break;
            case "AI_CHAT":
                this.aiChatEarnings = (this.aiChatEarnings != null ? this.aiChatEarnings : 0.0) + amount;
                break;
            case "AI_AUDIT":
                this.aiAuditEarnings = (this.aiAuditEarnings != null ? this.aiAuditEarnings : 0.0) + amount;
                break;
            default:
                this.platformFeeEarnings = (this.platformFeeEarnings != null ? this.platformFeeEarnings : 0.0) + amount;
                break;
        }
        this.lastUpdatedAt = LocalDateTime.now();
    }
}
