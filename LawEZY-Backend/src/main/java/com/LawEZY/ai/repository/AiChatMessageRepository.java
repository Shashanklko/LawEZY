package com.LawEZY.ai.repository;

import com.LawEZY.ai.model.AiChatMessage;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface AiChatMessageRepository extends MongoRepository<AiChatMessage, String> {
    List<AiChatMessage> findBySessionIdOrderByTimestampAsc(String sessionId);
    void deleteBySessionId(String sessionId);
}
