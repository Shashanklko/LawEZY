package com.LawEZY.chat.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import com.LawEZY.chat.enums.MessageType;

import lombok.Data;

@Data
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
    private String appointmentDate;
    private String appointmentTime;
    private Double appointmentPrice;
    private String appointmentStatus; // requested, modified, accepted, paid, declined
    private java.time.LocalDateTime timestamp;
    
}
