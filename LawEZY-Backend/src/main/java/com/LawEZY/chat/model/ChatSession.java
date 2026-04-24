package com.LawEZY.chat.model;

import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import com.LawEZY.chat.enums.ChatStatus;

@Document(collection = "chat_sessions")
public class ChatSession {
    @Id
    private String id;
    
    private String userId;
    private String professionalId;
    private ChatStatus status;
    private Integer tokensGranted;
    private Integer tokensConsumed;
    private Boolean professionalEndedChat;
    private Boolean isAppointmentPaid = false; // Tracks if an official appointment has been booked and paid
    private LocalDateTime expiryTime; // New: When the current paid/free window ends
    private Boolean trialEnded = false; // New: Tracks if the 5-minute free window has been used
    private Double textChatFee; // New: Fee for next block
    private Integer chatDurationMinutes; // New: Duration of next block
    private LocalDateTime createdAt;
    @Indexed(expireAfterSeconds = 7776000) // 90 days of inactivity auto-purge
    private LocalDateTime lastUpdateAt;
    
    public ChatSession() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getProfessionalId() { return professionalId; }
    public void setProfessionalId(String professionalId) { this.professionalId = professionalId; }
    public ChatStatus getStatus() { return status; }
    public void setStatus(ChatStatus status) { this.status = status; }
    public Integer getTokensGranted() { return tokensGranted; }
    public void setTokensGranted(Integer tokensGranted) { this.tokensGranted = tokensGranted; }
    public Integer getTokensConsumed() { return tokensConsumed; }
    public void setTokensConsumed(Integer tokensConsumed) { this.tokensConsumed = tokensConsumed; }
    public Boolean getProfessionalEndedChat() { return professionalEndedChat; }
    public void setProfessionalEndedChat(Boolean professionalEndedChat) { this.professionalEndedChat = professionalEndedChat; }
    public Boolean getIsAppointmentPaid() { return isAppointmentPaid; }
    public void setIsAppointmentPaid(Boolean isAppointmentPaid) { this.isAppointmentPaid = isAppointmentPaid; }
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
}
