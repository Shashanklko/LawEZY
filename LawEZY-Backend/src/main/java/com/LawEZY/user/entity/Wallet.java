package com.LawEZY.user.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "wallets")
public class Wallet {
    @Id
    @Column(length = 25)
    private String id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private Integer tokenBalance = 5;
    private Integer freeAiTokens = 5;
    private Integer freeChatTokens = 5;
    private Integer freeDocTokens = 5;
    private Integer aiTokenLimit = 5;
    private Integer docTokenLimit = 5;
    private Boolean isUnlimited = false;
    private Double earnedBalance = 0.0;
    private Double cashBalance = 0.0;
    private Double escrowBalance = 0.0;
    private String currency = "INR";

    public Wallet() {}
    public Wallet(String id, User user, Integer tokenBalance, Integer freeAiTokens, Integer freeChatTokens, Integer freeDocTokens, Boolean isUnlimited, Double earnedBalance, Double cashBalance, String currency) {
        this.id = id;
        this.user = user;
        this.tokenBalance = tokenBalance;
        this.freeAiTokens = freeAiTokens;
        this.freeChatTokens = freeChatTokens;
        this.freeDocTokens = freeDocTokens;
        this.isUnlimited = isUnlimited;
        this.earnedBalance = earnedBalance;
        this.cashBalance = cashBalance;
        this.currency = currency;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public Integer getTokenBalance() { return tokenBalance != null ? tokenBalance : 0; }
    public void setTokenBalance(Integer tokenBalance) { this.tokenBalance = tokenBalance; }
    public Integer getFreeAiTokens() { return freeAiTokens != null ? freeAiTokens : 0; }
    public void setFreeAiTokens(Integer freeAiTokens) { this.freeAiTokens = freeAiTokens; }
    public Integer getFreeChatTokens() { return freeChatTokens != null ? freeChatTokens : 0; }
    public void setFreeChatTokens(Integer freeChatTokens) { this.freeChatTokens = freeChatTokens; }
    public Integer getFreeDocTokens() { return freeDocTokens != null ? freeDocTokens : 0; }
    public void setFreeDocTokens(Integer freeDocTokens) { this.freeDocTokens = freeDocTokens; }
    public Integer getAiTokenLimit() { return aiTokenLimit != null ? aiTokenLimit : 5; }
    public void setAiTokenLimit(Integer aiTokenLimit) { this.aiTokenLimit = aiTokenLimit; }
    public Integer getDocTokenLimit() { return docTokenLimit != null ? docTokenLimit : 5; }
    public void setDocTokenLimit(Integer docTokenLimit) { this.docTokenLimit = docTokenLimit; }
    public Boolean getIsUnlimited() { return isUnlimited != null ? isUnlimited : false; }
    public void setIsUnlimited(Boolean isUnlimited) { this.isUnlimited = isUnlimited; }
    public Double getEarnedBalance() { return earnedBalance != null ? earnedBalance : 0.0; }
    public void setEarnedBalance(Double earnedBalance) { this.earnedBalance = earnedBalance; }
    public Double getCashBalance() { return cashBalance != null ? cashBalance : 0.0; }
    public void setCashBalance(Double cashBalance) { this.cashBalance = cashBalance; }
    public Double getEscrowBalance() { return escrowBalance != null ? escrowBalance : 0.0; }
    public void setEscrowBalance(Double escrowBalance) { this.escrowBalance = escrowBalance; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
}
