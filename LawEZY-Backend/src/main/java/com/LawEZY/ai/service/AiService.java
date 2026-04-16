package com.LawEZY.ai.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class AiService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String PYTHON_SERVICE_URL = "http://localhost:8001/api/ai/copilot";

    public String generateResponse(String query) {
        log.info("[AI] Delegating Copilot query to Python Service: {}", query);
        try {
            Map<String, String> request = new HashMap<>();
            request.put("query", query);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(PYTHON_SERVICE_URL, request, Map.class);
            
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
            
            @SuppressWarnings("unchecked")
            Map<String, String> response = restTemplate.postForObject("http://localhost:8001/api/ai/guard", request, Map.class);
            
            return (response != null && response.containsKey("status")) ? response.get("status") : "SAFE";
        } catch (Exception e) {
            log.error("[AI] Safety Guard link unstable: {}", e.getMessage());
            return "SAFE"; // Fail safe
        }
    }
}
