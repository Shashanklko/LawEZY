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
@RequiredArgsConstructor
public class CleanupTask {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(CleanupTask.class);

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
                // Handle Legacy GridFS Purge
                if (!doc.getFileId().startsWith("http")) {
                    gridFsTemplate.delete(new Query(Criteria.where("_id").is(doc.getFileId())));
                } else {
                    // For Supabase, we let the cloud handle the asset or manually delete via API
                    log.info("[CLEANUP] Supabase asset metadata expired: {}", doc.getFileName());
                }
                
                // Delete Metadata from MongoDB
                analyzedDocumentRepository.delete(doc);
                log.info("[CLEANUP] Purged document: {} (ID: {})", doc.getFileName(), doc.getId());
            } catch (Exception e) {
                log.error("[CLEANUP] Failed to purge document {}: {}", doc.getId(), e.getMessage());
            }
        }
        
        log.info("[CLEANUP] Institutional purge complete. {} documents removed.", expiredDocs.size());
    }

    /**
     * Legacy Storage Governance: Purges ALL GridFS assets older than 7 days.
     * This ensures the 500MB Atlas tactical limit is reclaimed from old files.
     */
    @Scheduled(cron = "0 30 2 * * *") // Run at 2:30 AM
    public void purgeLegacyAssets() {
        log.info("[GOVERNANCE] Commencing legacy GridFS purge...");
        
        java.util.Date cutoff = java.util.Date.from(
            LocalDateTime.now().minusDays(7)
                .atZone(java.time.ZoneId.systemDefault())
                .toInstant()
        );

        try {
            // Delete files where uploadDate < 7 days ago
            gridFsTemplate.delete(new Query(Criteria.where("uploadDate").lt(cutoff)));
            log.info("[GOVERNANCE] Asset cleanup successful. Tactical storage window synchronized.");
        } catch (Exception e) {
            log.error("[GOVERNANCE] Asset purge failed: {}", e.getMessage());
        }
    }
}
