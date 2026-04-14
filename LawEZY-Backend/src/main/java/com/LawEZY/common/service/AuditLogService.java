package com.LawEZY.common.service;

import com.LawEZY.common.entity.AuditLog;
import com.LawEZY.common.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@Slf4j
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

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
        try {
            AuditLog auditLog = AuditLog.builder()
                    .timestamp(LocalDateTime.now())
                    .eventType(type)
                    .summary(summary)
                    .details(details)
                    .ipAddress(ipAddress)
                    .userId(userId)
                    .userRole(userRole)
                    .build();
            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            // We use log.error here for the terminal, but failing to save a log shouldn't crash the main app flow
            log.error("Failed to save Audit Log to database: {}", e.getMessage());
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
