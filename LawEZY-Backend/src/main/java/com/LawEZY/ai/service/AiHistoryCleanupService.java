package com.LawEZY.ai.service;

import com.LawEZY.ai.model.AiChatSession;
import com.LawEZY.ai.repository.AiChatSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiHistoryCleanupService {

    private final AiChatSessionRepository sessionRepository;
    private final AiChatSessionService sessionService;

    /**
     * Runs daily at midnight to clean up chat history older than 30 days.
     */
    @Scheduled(cron = "0 0 0 * * *")
    public void cleanupOldHistory() {
        log.info("[CLEANUP] Starting automated LawinoAI history purge...");
        
        LocalDateTime cutOffDate = LocalDateTime.now().minusDays(30);
        List<AiChatSession> oldSessions = sessionRepository.findByUpdatedAtBefore(cutOffDate);
        
        if (oldSessions.isEmpty()) {
            log.info("[CLEANUP] No outdated sessions found. Strategic archives remain intact.");
            return;
        }

        log.info("[CLEANUP] Found {} outdated sessions. Initiating tactical deletion.", oldSessions.size());
        
        for (AiChatSession session : oldSessions) {
            try {
                sessionService.deleteSession(session.getId());
                log.debug("[CLEANUP] Purged session: {}", session.getId());
            } catch (Exception e) {
                log.error("[CLEANUP] Failed to purge session {}: {}", session.getId(), e.getMessage());
            }
        }
        
        log.info("[CLEANUP] Automated history purge complete.");
    }
}
