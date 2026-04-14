package com.LawEZY.chat.dto;

import org.springframework.data.annotation.Id;

import com.LawEZY.chat.enums.ChatStatus;
import com.LawEZY.chat.enums.MessageType;

import lombok.Data;

@Data
public class ChatMessageResponse {
    
    private String id;
    private String chatSessionId;
    private String senderId;
    private String receiverId;
    private MessageType type;
    private String content;
    private Boolean isLocked = false;
    private String appointmentDate;
    private String appointmentTime;
    private Double appointmentPrice;
    private String appointmentStatus;
    private java.time.LocalDateTime timestamp;
    private ChatStatus status;
}
