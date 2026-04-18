package com.LawEZY.ai.service;

import com.LawEZY.ai.model.AnalyzedDocument;
import com.LawEZY.ai.repository.AnalyzedDocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@Slf4j
@RequiredArgsConstructor
public class CleanupTask {

    private final AnalyzedDocumentRepository analyzedDocumentRepository;
    private final GridFsTemplate gridFsTemplate;

    // Run every night at 2:00 AM
    @Scheduled(cron = "0 0 2 * * *")
    public void purgeExpiredDocuments() {
        log.info("[CLEANUP] Commencing institutional purge of expired documents...");
        
        LocalDateTime now = LocalDateTime.now();
        List<AnalyzedDocument> expiredDocs = analyzedDocumentRepository.findByExpiresAtBefore(now);
        
        if (expiredDocs.isEmpty()) {
            log.info("[CLEANUP] No expired documents found. Institutional storage integrity maintained.");
            return;
        }

        for (AnalyzedDocument doc : expiredDocs) {
            try {
                // Delete from GridFS
                gridFsTemplate.delete(new Query(Criteria.where("_id").is(doc.getFileId())));
                // Delete Metadata
                analyzedDocumentRepository.delete(doc);
                log.info("[CLEANUP] Purged document: {} (ID: {})", doc.getFileName(), doc.getId());
            } catch (Exception e) {
                log.error("[CLEANUP] Failed to purge document {}: {}", doc.getId(), e.getMessage());
            }
        }
        
        log.info("[CLEANUP] Institutional purge complete. {} documents removed.", expiredDocs.size());
    }
}
