package com.LawEZY.content.entity;

import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Document(collection = "legal_resources")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LegalResource {

    @Id
    private String id;

    private String title;
    private String content;
    private String category;
    
    private String authorId;
    private String authorName;

    private String fileUrl;
    private String driveLink;
    private String coverUrl;
    private String abstractText;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
