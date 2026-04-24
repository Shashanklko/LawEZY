package com.LawEZY.chat.repository;

import com.LawEZY.chat.model.TrialAudit;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface TrialAuditRepository extends MongoRepository<TrialAudit, String> {
    Optional<TrialAudit> findByUserIdAndProfessionalId(String userId, String professionalId);
}
