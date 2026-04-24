package com.LawEZY.ai.controller;

import com.LawEZY.ai.dto.AiCopilotRequest;
import com.LawEZY.ai.model.AiChatMessage;
import com.LawEZY.ai.model.AiChatSession;
import com.LawEZY.ai.service.AiChatSessionService;
import com.LawEZY.ai.service.AiService;
import com.LawEZY.common.response.ApiResponse;
import com.LawEZY.user.entity.User;
import com.LawEZY.user.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AiController.class);

    private final AiService aiService;
    private final AiChatSessionService sessionService;
    private final com.LawEZY.common.service.AuditLogService auditLogService;
    private final com.LawEZY.user.repository.WalletRepository walletRepository;
    private final UserRepository userRepository;
    private final com.LawEZY.user.repository.FinancialTransactionRepository transactionRepository;
    private final com.LawEZY.notification.service.NotificationService notificationService;

    public AiController(
            AiService aiService,
            AiChatSessionService sessionService,
            com.LawEZY.common.service.AuditLogService auditLogService,
            com.LawEZY.user.repository.WalletRepository walletRepository,
            UserRepository userRepository,
            com.LawEZY.user.repository.FinancialTransactionRepository transactionRepository,
            com.LawEZY.notification.service.NotificationService notificationService
    ) {
        this.aiService = aiService;
        this.sessionService = sessionService;
        this.auditLogService = auditLogService;
        this.walletRepository = walletRepository;
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
        this.notificationService = notificationService;
    }

    @PostMapping("/copilot")
    public ResponseEntity<ApiResponse<Map<String, Object>>> copilot(
            @RequestBody AiCopilotRequest request,
            jakarta.servlet.http.HttpServletRequest httpRequest) {
        
        String query = request.getQuery();
        String sessionId = request.getSessionId();
        String ip = httpRequest.getRemoteAddr();

        // Extract authenticated user from JWT Security Context
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(email).orElse(null);
        String userId = currentUser != null ? currentUser.getId() : null;

        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Query cannot be empty"));
        }

        // 1. Resolve Session
        if (sessionId == null || sessionId.trim().isEmpty() || sessionId.equals("null")) {
            AiChatSession session = sessionService.startSession(userId, query);
            sessionId = session.getId();
        }

        // 2. Handle Governance (Token Deduction or Cash Fallback)
        if (userId != null) {
            com.LawEZY.user.entity.Wallet wallet = walletRepository.findById(userId).orElse(null);
            if (wallet != null) {
                if (wallet.getIsUnlimited() == null || !wallet.getIsUnlimited()) {
                    if (wallet.getFreeAiTokens() > 0) {
                        // Use Free Credits first
                        wallet.setFreeAiTokens(wallet.getFreeAiTokens() - 1);
                        log.info("📡 [GOVERNANCE] Deducted 1 AI Token from user: {}. Remaining: {}", userId, wallet.getFreeAiTokens());
                    } else {
                        // Fallback to Cash Balance (₹10 per query - aligning with ₹150/15pkg)
                        double aiCost = 10.0;
                        if (wallet.getCashBalance() < aiCost) {
                            return ResponseEntity.status(403).body(ApiResponse.error("Insufficient institutional balance for AI intelligence. Please top up your wallet."));
                        }
                        wallet.setCashBalance(wallet.getCashBalance() - aiCost);
                        log.info("💰 [GOVERNANCE] Deducted ₹{} from cash balance for AI query. User: {}", aiCost, userId);
                        try {
                            // Record a transaction for institutional transparency (User Debit)
                            com.LawEZY.user.entity.FinancialTransaction txn = new com.LawEZY.user.entity.FinancialTransaction();
                            txn.setId("TXN-" + (1000 + (int)(Math.random() * 9000)));
                            txn.setUser(currentUser);
                            txn.setDescription("LawinoAI Intelligence Query (₹" + aiCost + ")");
                            txn.setAmount(-aiCost);
                            txn.setStatus("COMPLETED");
                            txn.setTimestamp(java.time.LocalDateTime.now());
                            txn.setTransactionId("AI-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                            transactionRepository.save(txn);

                            // Credit the Platform (Master Admin)
                            userRepository.findById("lawezy76").ifPresent(master -> {
                                com.LawEZY.user.entity.FinancialTransaction platformTxn = new com.LawEZY.user.entity.FinancialTransaction();
                                platformTxn.setId("TXN-" + (1000 + (int)(Math.random() * 9000)));
                                platformTxn.setTransactionId("LZY-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                                platformTxn.setAmount(aiCost);
                                platformTxn.setDescription("Platform Fee (AI Intelligence) - Client: " + userId);
                                platformTxn.setStatus("COMPLETED");
                                platformTxn.setTimestamp(java.time.LocalDateTime.now());
                                platformTxn.setUser(master);
                                transactionRepository.save(platformTxn);
                            });
                        } catch (Exception e) {
                            log.error("Failed to record AI transaction: {}", e.getMessage());
                        }
                    }
                    walletRepository.save(wallet);

                    // 🔔 Credit exhaustion alert (only for tokens)
                    if (wallet.getFreeAiTokens() == 0 && !wallet.getIsUnlimited()) {
                        try {
                            notificationService.sendNotification(userId,
                                "🎫 Free AI Tokens Exhausted",
                                "Your free LawinoAI quota has been consumed. Future queries will be billed at ₹10 directly from your wallet.",
                                "SYSTEM", "FINANCIAL", "/wallet");
                        } catch (Exception ignored) {}
                    }
                } else {
                    log.info("💎 [GOVERNANCE] Unlimited AI access granted to user: {}", userId);
                }
            }
        }

        // 2. Log and Persist User Message
        sessionService.saveMessage(sessionId, "user", query);
        auditLogService.logAudit("AI_QUERY", "Copilot queried: " + (query.length() > 50 ? query.substring(0, 47) + "..." : query), ip, userId != null ? userId : "GUEST", "CLIENT");

        // 3. Generate AI Response
        String aiResponse = aiService.generateResponse(query, sessionId, userId);

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
        String requesterEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User requester = userRepository.findByEmail(requesterEmail).orElse(null);
        
        if (requester == null) return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized"));

        String effectiveUserId = userId;
        
        // Ownership Guard: If userId is provided, ensure it matches requester OR requester is ADMIN
        if (effectiveUserId != null && !effectiveUserId.trim().isEmpty()) {
            if (!effectiveUserId.equals(requester.getId()) && !requester.getRole().name().contains("ADMIN")) {
                log.warn("🚨 [SECURITY] Unauthorized history access attempt by {} for user {}", requester.getId(), effectiveUserId);
                return ResponseEntity.status(403).body(ApiResponse.error("You are not authorized to view this institutional history."));
            }
        } else {
            effectiveUserId = requester.getId();
        }

        List<AiChatSession> history = sessionService.getUserHistory(effectiveUserId);
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
