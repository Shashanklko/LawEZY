package com.LawEZY.ai.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Document(collection = "ai_chat_messages")
public class AiChatMessage {
    @Id
    private String id;
    private String sessionId;
    private String role; // 'user' or 'ai'
    private String content;
    private List<String> mediaUrls;
    private LocalDateTime timestamp;
}
