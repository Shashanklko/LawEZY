package com.LawEZY.ai.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@Document(collection = "ai_chat_sessions")
public class AiChatSession {
    @Id
    private String id;
    private String userId; // Use String to accommodate Guest-ID if needed
    private String title;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
