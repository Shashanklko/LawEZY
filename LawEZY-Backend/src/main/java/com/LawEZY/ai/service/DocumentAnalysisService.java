package com.LawEZY.ai.service;

import com.LawEZY.ai.model.AnalyzedDocument;
import com.LawEZY.ai.repository.AnalyzedDocumentRepository;
import com.LawEZY.user.entity.Wallet;
import com.LawEZY.user.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
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
@Slf4j
@RequiredArgsConstructor
public class DocumentAnalysisService {

    private final GridFsTemplate gridFsTemplate;
    private final AnalyzedDocumentRepository analyzedDocumentRepository;
    private final WalletRepository walletRepository;
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

        if (!wallet.getIsUnlimited() && wallet.getFreeDocTokens() <= 0) {
            throw new RuntimeException("Institutional quota exhausted. Please upgrade for further analysis.");
        }

        log.info("[DOCUMENT-AI] Starting analysis for user: {} | File: {}", userId, file.getOriginalFilename());

        // 2. Persist to GridFS
        Object fileId = gridFsTemplate.store(file.getInputStream(), file.getOriginalFilename(), file.getContentType());

        // 3. Create Metadata Record
        AnalyzedDocument doc = new AnalyzedDocument();
        doc.setUserId(userId);
        doc.setFileName(file.getOriginalFilename());
        doc.setFileId(fileId.toString());
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

        // 5. Deduct Quota
        if (!wallet.getIsUnlimited()) {
            wallet.setFreeDocTokens(wallet.getFreeDocTokens() - 1);
            walletRepository.save(wallet);

            // 🔔 Document credit exhaustion
            if (wallet.getFreeDocTokens() <= 0) {
                try {
                    notificationService.sendNotification(userId,
                        "⚠️ Document Analysis Credits Exhausted",
                        "You've used all document auditor tokens. Purchase more to continue analyzing documents.",
                        "SYSTEM", "FINANCIAL", "/wallet");
                } catch (Exception ignored) {}
            }
        }

        return analyzedDocumentRepository.save(doc);
    }

    public List<AnalyzedDocument> getUserHistory(String userId) {
        return analyzedDocumentRepository.findByUserIdOrderByAnalyzedAtDesc(userId);
    }

    public void deleteDocument(String docId) {
        analyzedDocumentRepository.findById(docId).ifPresent(doc -> {
            gridFsTemplate.delete(new Query(Criteria.where("_id").is(doc.getFileId())));
            analyzedDocumentRepository.deleteById(docId);
        });
    }
}
