package com.LawEZY.ai.service;

import com.LawEZY.ai.model.AiChatMessage;
import com.LawEZY.ai.model.AiChatSession;
import com.LawEZY.ai.repository.AiChatMessageRepository;
import com.LawEZY.ai.repository.AiChatSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AiChatSessionService {
    private final AiChatSessionRepository sessionRepository;
    private final AiChatMessageRepository messageRepository;

    public AiChatSession startSession(String userId, String initialQuery) {
        AiChatSession session = new AiChatSession();
        session.setUserId(userId != null ? userId : "GUEST");
        
        // Generate title from initial query
        String title = initialQuery.length() > 35 ? initialQuery.substring(0, 32) + "..." : initialQuery;
        session.setTitle(title);
        
        session.setCreatedAt(LocalDateTime.now());
        session.setUpdatedAt(LocalDateTime.now());
        return sessionRepository.save(session);
    }

    public List<AiChatSession> getUserHistory(String userId) {
        return sessionRepository.findByUserIdOrderByUpdatedAtDesc(userId != null ? userId : "GUEST");
    }

    public List<AiChatMessage> getSessionMessages(String sessionId) {
        return messageRepository.findBySessionIdOrderByTimestampAsc(sessionId);
    }

    public void saveMessage(String sessionId, String role, String content) {
        if (sessionId == null) return;
        AiChatMessage message = new AiChatMessage();
        message.setSessionId(sessionId);
        message.setRole(role);
        message.setContent(content);
        message.setTimestamp(LocalDateTime.now());
        messageRepository.save(message);
        
        // Update session timestamp for sorting in history
        sessionRepository.findById(sessionId).ifPresent(s -> {
            s.setUpdatedAt(LocalDateTime.now());
            sessionRepository.save(s);
        });
    }

    public void deleteSession(String sessionId) {
        if (sessionId == null) return;
        messageRepository.deleteBySessionId(sessionId);
        sessionRepository.deleteById(sessionId);
    }
}
