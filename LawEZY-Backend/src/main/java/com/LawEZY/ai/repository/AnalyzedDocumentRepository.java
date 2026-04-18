package com.LawEZY.ai.repository;

import com.LawEZY.ai.model.AnalyzedDocument;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface AnalyzedDocumentRepository extends MongoRepository<AnalyzedDocument, String> {
    List<AnalyzedDocument> findByUserIdOrderByAnalyzedAtDesc(String userId);
    List<AnalyzedDocument> findByExpiresAtBefore(LocalDateTime now);
}
