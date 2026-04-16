package com.LawEZY.ai.controller;

import com.LawEZY.ai.dto.AiCopilotRequest;
import com.LawEZY.ai.model.AiChatMessage;
import com.LawEZY.ai.model.AiChatSession;
import com.LawEZY.ai.service.AiChatSessionService;
import com.LawEZY.ai.service.AiService;
import com.LawEZY.common.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Slf4j
public class AiController {

    private final AiService aiService;
    private final AiChatSessionService sessionService;
    private final com.LawEZY.common.service.AuditLogService auditLogService;
    private final com.LawEZY.user.repository.WalletRepository walletRepository;

    @PostMapping("/copilot")
    public ResponseEntity<ApiResponse<Map<String, Object>>> copilot(
            @RequestBody AiCopilotRequest request,
            jakarta.servlet.http.HttpServletRequest httpRequest) {
        
        String query = request.getQuery();
        String sessionId = request.getSessionId();
        String userId = request.getUserId();
        String ip = httpRequest.getRemoteAddr();

        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Query cannot be empty"));
        }

        // 1. Resolve Session
        if (sessionId == null || sessionId.trim().isEmpty() || sessionId.equals("null")) {
            AiChatSession session = sessionService.startSession(userId, query);
            sessionId = session.getId();
        }

        // 2. Handle Governance (Token Deduction per query)
        if (userId != null && !userId.equals("null")) {
            com.LawEZY.user.entity.Wallet wallet = walletRepository.findById(userId).orElse(null);
            if (wallet != null) {
                if (wallet.getIsUnlimited() == null || !wallet.getIsUnlimited()) {
                    if (wallet.getFreeAiTokens() <= 0) {
                        return ResponseEntity.status(403).body(ApiResponse.error("AI Quota exhausted. Please refill institutional units in your wallet."));
                    }
                    wallet.setFreeAiTokens(wallet.getFreeAiTokens() - 1);
                    walletRepository.save(wallet);
                    log.info("📡 [GOVERNANCE] Deducted 1 AI Token from user: {}. Remaining: {}", userId, wallet.getFreeAiTokens());
                } else {
                    log.info("💎 [GOVERANCE] Unlimited AI access granted to user: {}", userId);
                }
            }
        }

        // 2. Log and Persist User Message
        sessionService.saveMessage(sessionId, "user", query);
        auditLogService.logAudit("AI_QUERY", "Copilot queried: " + (query.length() > 50 ? query.substring(0, 47) + "..." : query), ip, userId != null ? userId : "GUEST", "CLIENT");

        // 3. Generate AI Response
        String aiResponse = aiService.generateResponse(query);

        // 4. Persist AI Response
        sessionService.saveMessage(sessionId, "ai", aiResponse);

        // 5. Return Response with Session ID
        Map<String, Object> result = new HashMap<>();
        result.put("response", aiResponse);
        result.put("sessionId", sessionId);

        return ResponseEntity.ok(ApiResponse.success(result, "Success"));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<AiChatSession>>> getHistory(@RequestParam(required = false) String userId) {
        List<AiChatSession> history = sessionService.getUserHistory(userId);
        return ResponseEntity.ok(ApiResponse.success(history, "History retrieved"));
    }

    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<List<AiChatMessage>>> getSessionMessages(@PathVariable String sessionId) {
        List<AiChatMessage> messages = sessionService.getSessionMessages(sessionId);
        return ResponseEntity.ok(ApiResponse.success(messages, "Session messages retrieved"));
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<Void>> deleteSession(@PathVariable String sessionId) {
        sessionService.deleteSession(sessionId);
        return ResponseEntity.ok(ApiResponse.success(null, "Session deleted"));
    }
}
