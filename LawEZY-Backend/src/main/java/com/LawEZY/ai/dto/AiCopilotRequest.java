package com.LawEZY.ai.dto;

import lombok.Data;

@Data
public class AiCopilotRequest {
    private String query;
    private String sessionId;
    private String userId;
}
