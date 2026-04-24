package com.LawEZY.chat.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import java.time.LocalDateTime;

@Document(collection = "trial_audits")
@CompoundIndex(name = "user_prof_trial", def = "{'userId': 1, 'professionalId': 1}", unique = true)
public class TrialAudit {
    @Id
    private String id;
    private String userId;
    private String professionalId;
    private LocalDateTime usedAt;

    public TrialAudit() {}
    
    public TrialAudit(String userId, String professionalId) {
        this.userId = userId;
        this.professionalId = professionalId;
        this.usedAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getProfessionalId() { return professionalId; }
    public void setProfessionalId(String professionalId) { this.professionalId = professionalId; }
    public LocalDateTime getUsedAt() { return usedAt; }
    public void setUsedAt(LocalDateTime usedAt) { this.usedAt = usedAt; }
}
