package com.LawEZY.user.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "financial_transactions")
public class FinancialTransaction {
    @Id
    @Column(length = 25)
    private String id;
    
    @Column(nullable = false, unique = true)
    private String transactionId;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private Double amount;

    @Column(nullable = false)
    private String status;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    public FinancialTransaction() {}
    public FinancialTransaction(String id, String transactionId, LocalDateTime timestamp, String description, Double amount, String status, User user) {
        this.id = id;
        this.transactionId = transactionId;
        this.timestamp = timestamp;
        this.description = description;
        this.amount = amount;
        this.status = status;
        this.user = user;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    @com.fasterxml.jackson.annotation.JsonProperty("userId")
    public String getDerivedUserId() {
        return user != null ? user.getId() : null;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("userName")
    public String getDerivedUserName() {
        return user != null ? user.getName() : null;
    }
}

