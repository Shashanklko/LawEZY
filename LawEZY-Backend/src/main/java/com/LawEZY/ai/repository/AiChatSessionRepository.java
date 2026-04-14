package com.LawEZY.ai.repository;

import com.LawEZY.ai.model.AiChatSession;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface AiChatSessionRepository extends MongoRepository<AiChatSession, String> {
    List<AiChatSession> findByUserIdOrderByUpdatedAtDesc(String userId);
    List<AiChatSession> findByUpdatedAtBefore(LocalDateTime date);
}
