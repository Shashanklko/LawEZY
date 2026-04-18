package com.LawEZY.user.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "wallets")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Wallet {

    @Id
    @Column(length = 25)
    private String id; // Shared Institutional ID Glue

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private Integer tokenBalance = 5; // Paid Institutional Balance
    private Integer freeAiTokens = 5; // Tiered Free AI Quota
    private Integer freeChatTokens = 5; // Tiered Free Chat Quota
    private Integer freeDocTokens = 1; // 1 Free Institutional Document Analysis Quota
    private Boolean isUnlimited = false; // "God Mode" Toggle
    private Double earnedBalance = 0.0; // Professional Revenue
    private Double cashBalance = 0.0; // Institutional Deposits for Clients
    private String currency = "INR";
}
