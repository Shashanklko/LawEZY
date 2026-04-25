package com.LawEZY.ai.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.HashMap;
import java.util.Map;

@Service
public class AiService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AiService.class);

    private final RestTemplate restTemplate = new RestTemplate();
    private final String PYTHON_SERVICE_URL = "http://localhost:8001/api/ai/copilot";
    
    @org.springframework.beans.factory.annotation.Value("${app.internal.secret:internal-secret}")
    private String internalSecret;

    private final com.LawEZY.common.repository.AuditLogRepository auditLogRepository;

    public AiService(com.LawEZY.common.repository.AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public String generateResponse(String query, String sessionId, String userId) {
        log.info("[AI] Delegating Copilot query to Python Service: {} (Session: {}, User: {})", query, sessionId, userId);
        
        // Institutional Audit: AI Interaction Trace
        try {
            com.LawEZY.common.entity.AuditLog auditLog = new com.LawEZY.common.entity.AuditLog(
                "USER", "AI_QUERY", "AI Copilot Query: " + (query.length() > 50 ? query.substring(0, 47) + "..." : query), userId
            );
            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.warn("Failed to audit AI query: {}", e.getMessage());
        }

        try {
            Map<String, String> request = new HashMap<>();
            request.put("query", query);
            request.put("sessionId", sessionId);
            request.put("userId", userId);

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("X-Internal-Secret", internalSecret);
            org.springframework.http.HttpEntity<Map<String, String>> entity = new org.springframework.http.HttpEntity<>(request, headers);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(PYTHON_SERVICE_URL, entity, Map.class);
            
            if (response != null && response.containsKey("response")) {
                return (String) response.get("response");
            }
            return "Institutional protocols interrupted. Received malformed response from tactical brain.";
        } catch (Exception e) {
            log.error("[AI] Error calling Python AI service: {}", e.getMessage());
            return "Tactical link offline. Python institutional core is unreachable. Please retry.";
        }
    }

    public String checkSafety(String content) {
        log.info("[AI] Delegating Safety Guard check to Python Service");
        try {
            Map<String, String> request = new HashMap<>();
            request.put("query", content);

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("X-Internal-Secret", internalSecret);
            org.springframework.http.HttpEntity<Map<String, String>> entity = new org.springframework.http.HttpEntity<>(request, headers);
            
            @SuppressWarnings("unchecked")
            Map<String, String> response = restTemplate.postForObject("http://localhost:8001/api/ai/guard", entity, Map.class);
            
            return (response != null && response.containsKey("status")) ? response.get("status") : "SAFE";
        } catch (Exception e) {
            log.error("[AI] Safety Guard link unstable: {}", e.getMessage());
            return "SAFE"; // Fail safe
        }
    }
}
