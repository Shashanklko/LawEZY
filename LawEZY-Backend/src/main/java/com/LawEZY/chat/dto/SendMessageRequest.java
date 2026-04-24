package com.LawEZY.chat.dto;

import com.LawEZY.chat.enums.MessageType;

public class SendMessageRequest {
    private String chatSessionId;
    private String senderId;
    private String receiverId;
    private MessageType type;
    private String content;
    private String appointmentDate;
    private String appointmentTime;
    private Double appointmentPrice;
    private String appointmentStatus;

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
    public String getAppointmentDate() { return appointmentDate; }
    public void setAppointmentDate(String appointmentDate) { this.appointmentDate = appointmentDate; }
    public String getAppointmentTime() { return appointmentTime; }
    public void setAppointmentTime(String appointmentTime) { this.appointmentTime = appointmentTime; }
    public Double getAppointmentPrice() { return appointmentPrice; }
    public void setAppointmentPrice(Double appointmentPrice) { this.appointmentPrice = appointmentPrice; }
    public String getAppointmentStatus() { return appointmentStatus; }
    public void setAppointmentStatus(String appointmentStatus) { this.appointmentStatus = appointmentStatus; }
}
