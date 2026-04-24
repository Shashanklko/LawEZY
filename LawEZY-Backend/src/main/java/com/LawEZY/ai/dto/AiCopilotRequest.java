package com.LawEZY.ai.dto;

public class AiCopilotRequest {
    private String query;
    private String sessionId;
    private String userId;

    public AiCopilotRequest() {}

    public String getQuery() { return query; }
    public void setQuery(String query) { this.query = query; }
    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
}
