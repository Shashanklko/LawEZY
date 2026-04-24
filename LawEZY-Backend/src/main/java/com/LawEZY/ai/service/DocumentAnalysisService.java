package com.LawEZY.ai.service;

import com.LawEZY.ai.model.AnalyzedDocument;
import com.LawEZY.ai.repository.AnalyzedDocumentRepository;
import com.LawEZY.user.entity.Wallet;
import com.LawEZY.user.repository.WalletRepository;
import com.LawEZY.service.SupabaseStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DocumentAnalysisService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(DocumentAnalysisService.class);

    private final SupabaseStorageService supabaseStorageService;
    private final AnalyzedDocumentRepository analyzedDocumentRepository;
    private final com.LawEZY.user.repository.WalletRepository walletRepository;
    private final com.LawEZY.user.repository.FinancialTransactionRepository transactionRepository;
    private final com.LawEZY.user.repository.UserRepository userRepository;
    private final com.LawEZY.notification.service.NotificationService notificationService;
    private final RestTemplate restTemplate = new RestTemplate();
    private final String PYTHON_AI_URL = "http://localhost:8001/api/ai/analyze-document";

    public AnalyzedDocument analyzeDocument(String userId, MultipartFile file) throws IOException {
        // 1. Quota & Size Validation
        if (file.getSize() > 25 * 1024 * 1024) {
            throw new RuntimeException("Institutional breach: File size exceeds 25MB tactical limit.");
        }

        Wallet wallet = walletRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Wallet not found for user: " + userId));

        // 56. Handle Governance (Token Deduction or Cash Fallback)
        if (!wallet.getIsUnlimited()) {
            int currentTokens = wallet.getFreeDocTokens() != null ? wallet.getFreeDocTokens() : 0;
            if (currentTokens >= 5) {
                // Use Free Credits (1 Audit = 5 Tokens)
                wallet.setFreeDocTokens(currentTokens - 5);
                log.info("📡 [DOCUMENT-AI] Deducted 5 Doc Tokens from user: {}. Remaining: {}", userId, wallet.getFreeDocTokens());
            } else {
                // Fallback to Cash Balance (₹50 per audit - aligning with ₹250/5pkg)
                double docCost = 50.0;
                if (wallet.getCashBalance() < docCost) {
                    throw new RuntimeException("Insufficient institutional balance (Needs ₹" + docCost + "). Please top up your wallet.");
                }
                wallet.setCashBalance(wallet.getCashBalance() - docCost);
                log.info("💰 [DOCUMENT-AI] Deducted ₹{} from cash balance for Doc Audit. User: {}", docCost, userId);
                
                // 🛡️ Institutional Audit: Record Transaction
                try {
                    com.LawEZY.user.entity.FinancialTransaction txn = new com.LawEZY.user.entity.FinancialTransaction();
                    txn.setId("TXN-" + (1000 + (int)(Math.random() * 9000)));
                    txn.setTransactionId("DOC-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                    txn.setAmount(-docCost);
                    txn.setDescription("Document Audit Fee - File: " + file.getOriginalFilename());
                    txn.setStatus("COMPLETED");
                    txn.setTimestamp(LocalDateTime.now());
                    txn.setUser(wallet.getUser());
                    transactionRepository.save(txn);

                    // Credit the Platform (Master Admin)
                    userRepository.findById("lawezy76").ifPresent(master -> {
                        com.LawEZY.user.entity.FinancialTransaction platformTxn = new com.LawEZY.user.entity.FinancialTransaction();
                        platformTxn.setId("TXN-" + (1000 + (int)(Math.random() * 9000)));
                        platformTxn.setTransactionId("LZY-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                        platformTxn.setAmount(docCost);
                        platformTxn.setDescription("Platform Fee (Document Audit) - Client: " + userId);
                        platformTxn.setStatus("COMPLETED");
                        platformTxn.setTimestamp(LocalDateTime.now());
                        platformTxn.setUser(master);
                        transactionRepository.save(platformTxn);
                    });
                } catch (Exception e) {
                    log.error("[DOCUMENT-AI] Ledger synchronization failure: {}", e.getMessage());
                }
            }
            walletRepository.save(wallet);

            // 🔔 Credit exhaustion notification (only when tokens hit 0)
            if (wallet.getFreeDocTokens() != null && wallet.getFreeDocTokens() == 0) {
                try {
                    notificationService.sendNotification(userId,
                        "🎫 Free Document Tokens Exhausted",
                        "Your free document auditor quota has been consumed. Future audits will be billed at ₹50 directly from your wallet.",
                        "SYSTEM", "FINANCIAL", "/wallet");
                } catch (Exception ignored) {}
            }
        }

        log.info("[DOCUMENT-AI] Starting analysis for user: {} | File: {}", userId, file.getOriginalFilename());

        // 2. Persist to Supabase
        String downloadUrl = supabaseStorageService.uploadFile(file);

        // 3. Create Metadata Record
        AnalyzedDocument doc = new AnalyzedDocument();
        doc.setUserId(userId);
        doc.setFileName(file.getOriginalFilename());
        doc.setFileId(downloadUrl); // Store URL in fileId field for easy retrieval
        doc.setContentType(file.getContentType());
        doc.setFileSize(file.getSize());
        doc.setAnalyzedAt(LocalDateTime.now());
        doc.setExpiresAt(LocalDateTime.now().plusDays(30)); // 30-day purge cycle
        doc.setStatus("ANALYZING");
        doc = analyzedDocumentRepository.save(doc);

        try {
            // 4. Delegate to Python AI Service
            String base64Content = Base64.getEncoder().encodeToString(file.getBytes());
            Map<String, Object> request = new HashMap<>();
            request.put("query", "Analyze this document");
            request.put("images", List.of(base64Content)); // Reusing images list for multimodal parts

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(PYTHON_AI_URL, request, Map.class);

            if (response != null && response.containsKey("analysis")) {
                doc.setAnalysisResult((String) response.get("analysis"));
                doc.setStatus("COMPLETED");
            } else {
                doc.setStatus("FAILED");
                doc.setAnalysisResult("Institutional analysis failed. Pulse lost.");
            }
        } catch (Exception e) {
            log.error("[DOCUMENT-AI] Tactical failure during analysis: {}", e.getMessage());
            doc.setStatus("FAILED");
            doc.setAnalysisResult("AI Service Unreachable: " + e.getMessage());
        }


        return analyzedDocumentRepository.save(doc);
    }

    public List<AnalyzedDocument> getUserHistory(String userId) {
        return analyzedDocumentRepository.findByUserIdOrderByAnalyzedAtDesc(userId);
    }

    public void deleteDocument(String docId) {
        analyzedDocumentRepository.findById(docId).ifPresent(doc -> {
            // Attempt deletion from Supabase if it's a URL
            if (doc.getFileId().startsWith("http")) {
                try {
                    log.info("[DOCUMENT-AI] Attempting Supabase asset purge for: {}", doc.getFileName());
                } catch (Exception ignored) {}
            }
            analyzedDocumentRepository.deleteById(docId);
        });
    }
}
