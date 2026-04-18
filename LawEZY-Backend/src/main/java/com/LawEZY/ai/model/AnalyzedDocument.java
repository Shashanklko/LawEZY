package com.LawEZY.ai.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@Document(collection = "analyzed_documents")
public class AnalyzedDocument {
    @Id
    private String id;
    private String userId;
    private String fileName;
    private String fileId; // GridFS File ID
    private String contentType;
    private Long fileSize;
    private String analysisResult; // AI Summary/Analysis
    private LocalDateTime analyzedAt;
    private LocalDateTime expiresAt; // For 30-day purge
    private String status; // UPLOADED, ANALYZING, COMPLETED, FAILED
}
