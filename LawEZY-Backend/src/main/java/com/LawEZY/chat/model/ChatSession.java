package com.LawEZY.chat.model;

import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import com.LawEZY.chat.enums.ChatStatus;

import lombok.Data;

@Data
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
    private String proUid; // Public institutional UID for expert
    private LocalDateTime createdAt;
    private LocalDateTime lastUpdateAt;
    
}
