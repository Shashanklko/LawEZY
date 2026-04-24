package com.LawEZY.auth.model;

import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@Document(collection = "otps")
public class OneTimePassword {
    
    @Id
    private String id;
    
    @Indexed
    private String email;
    
    private String code;
    
    private String purpose; // REGISTRATION, FORGOT_PASSWORD, MFA
    
    @Indexed(expireAfterSeconds = 300) // TTL: 5 Minutes
    private LocalDateTime createdAt;
}
