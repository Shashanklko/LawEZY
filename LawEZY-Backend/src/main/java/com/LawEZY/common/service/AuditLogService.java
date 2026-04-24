package com.LawEZY.common.service;

import com.LawEZY.common.entity.AuditLog;
import com.LawEZY.common.repository.AuditLogRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentLinkedQueue;

@Service
public class AuditLogService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AuditLogService.class);

    private final AuditLogRepository auditLogRepository;
    
    // In-Memory Queue for Fault-Tolerant Logging
    private final ConcurrentLinkedQueue<AuditLog> retryQueue = new ConcurrentLinkedQueue<>();

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    /**
     * Store a security-related alert in the database.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logSecurityAlert(String summary, String details, String ipAddress, String userId, String userRole) {
        saveLog("SECURITY_ALERT", summary, details, ipAddress, userId, userRole);
        log.warn("SECURITY ALERT: {} | IP: {} | User: {} | Role: {}", summary, ipAddress, userId, userRole);
    }

    /**
     * Store a critical system error in the database.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logCriticalError(String summary, String details) {
        saveLog("SYSTEM_ERROR", summary, details, null, null, "SYSTEM");
        log.error("CRITICAL ERROR: {} | Details: {}", summary, details);
    }

    /**
     * Store an AI conversation block in the database for compliance.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logAiBlock(String summary, String details, String userId, String userRole) {
        saveLog("AI_BLOCK", summary, details, null, userId, userRole);
        log.info("AI BLOCK: {} | User: {} | Role: {}", summary, userId, userRole);
    }

    /**
     * Store a general audit log in the database.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logAudit(String eventType, String summary, String ipAddress, String userId, String userRole) {
        saveLog(eventType, summary, null, ipAddress, userId, userRole);
        log.info("AUDIT: {} | {} | User: {} | Role: {}", eventType, summary, userId, userRole);
    }

    private void saveLog(String type, String summary, String details, String ipAddress, String userId, String userRole) {
        AuditLog auditLog = new AuditLog();
        auditLog.setTimestamp(LocalDateTime.now());
        auditLog.setEventType(type);
        auditLog.setSummary(summary);
        auditLog.setDetails(details);
        auditLog.setIpAddress(ipAddress);
        auditLog.setUserId(userId);
        auditLog.setUserRole(userRole);

        try {
            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("MongoDB Offline: Queueing audit log for retry... [{}]", summary);
            retryQueue.add(auditLog);
        }
    }

    /**
     * Background Flush: Periodically attempts to save queued logs once MongoDB is back.
     */
    @Scheduled(fixedDelay = 60000) // Every 1 minute
    public void flushRetryQueue() {
        if (retryQueue.isEmpty()) return;

        log.info("Audit Sync: Attempting to flush {} queued logs to MongoDB...", retryQueue.size());
        
        int successCount = 0;
        int initialSize = retryQueue.size();

        for (int i = 0; i < initialSize; i++) {
            AuditLog logToRetry = retryQueue.peek();
            if (logToRetry == null) break;

            try {
                auditLogRepository.save(logToRetry);
                retryQueue.poll(); // Remove if successful
                successCount++;
            } catch (Exception e) {
                log.warn("Audit Sync: MongoDB still offline. Retaining queue.");
                break; // Stop trying if connection is still down
            }
        }

        if (successCount > 0) {
            log.info("Audit Sync: Successfully synchronized {} logs with MongoDB.", successCount);
        }
    }

    @Transactional(readOnly = true)
    public java.util.List<AuditLog> getLogsByUserId(String userId, int limit) {
        return auditLogRepository.findByUserIdOrderByTimestampDesc(userId)
                .stream()
                .limit(limit)
                .collect(java.util.stream.Collectors.toList());
    }
}
