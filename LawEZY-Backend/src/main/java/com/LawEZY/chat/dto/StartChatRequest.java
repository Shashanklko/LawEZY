package com.LawEZY.chat.dto;

public class StartChatRequest {
    private String userId;
    private String professionalId;

    public StartChatRequest() {}

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getProfessionalId() { return professionalId; }
    public void setProfessionalId(String professionalId) { this.professionalId = professionalId; }
}
