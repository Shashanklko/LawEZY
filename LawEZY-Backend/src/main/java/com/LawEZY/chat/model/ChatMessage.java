package com.LawEZY.chat.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import com.LawEZY.chat.enums.MessageType;
import org.springframework.data.mongodb.core.index.Indexed;
import java.time.LocalDateTime;

@Document(collection = "chat_messages")
public class ChatMessage {
    
    @Id
    private String id;
    private String chatSessionId;
    private String senderId;
    private String receiverId;
    private MessageType type;
    private String content;
    private Boolean isLocked = false;
    private Boolean isRead = false;
    private String appointmentDate;
    private String appointmentTime;
    private Double appointmentPrice;
    private String appointmentStatus; // requested, modified, accepted, paid, declined
    @Indexed(expireAfterSeconds = 7776000) // 90 days auto-purge
    private LocalDateTime timestamp;

    public ChatMessage() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getChatSessionId() { return chatSessionId; }
    public void setChatSessionId(String chatSessionId) { this.chatSessionId = chatSessionId; }
    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }
    public String getReceiverId() { return receiverId; }
    public void setReceiverId(String receiverId) { this.receiverId = receiverId; }
    public MessageType getType() { return type; }
    public void setType(MessageType type) { this.type = type; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public Boolean getIsLocked() { return isLocked; }
    public void setIsLocked(Boolean isLocked) { this.isLocked = isLocked; }
    public String getAppointmentDate() { return appointmentDate; }
    public void setAppointmentDate(String appointmentDate) { this.appointmentDate = appointmentDate; }
    public String getAppointmentTime() { return appointmentTime; }
    public void setAppointmentTime(String appointmentTime) { this.appointmentTime = appointmentTime; }
    public Double getAppointmentPrice() { return appointmentPrice; }
    public void setAppointmentPrice(Double appointmentPrice) { this.appointmentPrice = appointmentPrice; }
    public String getAppointmentStatus() { return appointmentStatus; }
    public void setAppointmentStatus(String appointmentStatus) { this.appointmentStatus = appointmentStatus; }
    public Boolean getIsRead() { return isRead; }
    public void setIsRead(Boolean isRead) { this.isRead = isRead; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
