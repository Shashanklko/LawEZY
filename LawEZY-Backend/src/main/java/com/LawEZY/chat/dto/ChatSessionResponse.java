package com.LawEZY.chat.dto;

import java.time.LocalDateTime;
import com.LawEZY.chat.enums.ChatStatus;
import com.fasterxml.jackson.annotation.JsonFormat;

public class ChatSessionResponse {
    private String id;
    private String userId;
    private String professionalId; 
    private String proUid; // Institutional Public Identifier
    private String otherPartyName;
    private String otherPartyAvatar;
    private String lastMessage;
    private String lastMessageTime;
    private Integer unreadCount;
    private ChatStatus status;
    private Integer peerTokenBalance; // Institutional visibility for liquidity status
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'", timezone = "UTC")
    private LocalDateTime expiryTime; // Current window end
    private Boolean trialEnded; // New: Trial state
    private Double textChatFee; // New: Rate for next block
    private Integer chatDurationMinutes; // New: Duration for next block
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'", timezone = "UTC")
    private LocalDateTime createdAt;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'", timezone = "UTC")
    private LocalDateTime lastUpdateAt;
    private Boolean isOtherPartyEnabled; // Institutional Safety: Filter blocked contacts

    public ChatSessionResponse() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getProfessionalId() { return professionalId; }
    public void setProfessionalId(String professionalId) { this.professionalId = professionalId; }
    public String getProUid() { return proUid; }
    public void setProUid(String proUid) { this.proUid = proUid; }
    public String getOtherPartyName() { return otherPartyName; }
    public void setOtherPartyName(String otherPartyName) { this.otherPartyName = otherPartyName; }
    public String getOtherPartyAvatar() { return otherPartyAvatar; }
    public void setOtherPartyAvatar(String otherPartyAvatar) { this.otherPartyAvatar = otherPartyAvatar; }
    public String getLastMessage() { return lastMessage; }
    public void setLastMessage(String lastMessage) { this.lastMessage = lastMessage; }
    public String getLastMessageTime() { return lastMessageTime; }
    public void setLastMessageTime(String lastMessageTime) { this.lastMessageTime = lastMessageTime; }
    public Integer getUnreadCount() { return unreadCount; }
    public void setUnreadCount(Integer unreadCount) { this.unreadCount = unreadCount; }
    public ChatStatus getStatus() { return status; }
    public void setStatus(ChatStatus status) { this.status = status; }
    public Integer getPeerTokenBalance() { return peerTokenBalance; }
    public void setPeerTokenBalance(Integer peerTokenBalance) { this.peerTokenBalance = peerTokenBalance; }
    public LocalDateTime getExpiryTime() { return expiryTime; }
    public void setExpiryTime(LocalDateTime expiryTime) { this.expiryTime = expiryTime; }
    public Boolean getTrialEnded() { return trialEnded; }
    public void setTrialEnded(Boolean trialEnded) { this.trialEnded = trialEnded; }
    public Double getTextChatFee() { return textChatFee; }
    public void setTextChatFee(Double textChatFee) { this.textChatFee = textChatFee; }
    public Integer getChatDurationMinutes() { return chatDurationMinutes; }
    public void setChatDurationMinutes(Integer chatDurationMinutes) { this.chatDurationMinutes = chatDurationMinutes; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getLastUpdateAt() { return lastUpdateAt; }
    public void setLastUpdateAt(LocalDateTime lastUpdateAt) { this.lastUpdateAt = lastUpdateAt; }
    public Boolean getIsOtherPartyEnabled() { return isOtherPartyEnabled; }
    public void setIsOtherPartyEnabled(Boolean isOtherPartyEnabled) { this.isOtherPartyEnabled = isOtherPartyEnabled; }
}
