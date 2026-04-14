package com.LawEZY.chat.dto;

import com.LawEZY.chat.enums.MessageType;

import lombok.Data;

@Data
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
}
