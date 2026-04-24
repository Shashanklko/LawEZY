package com.LawEZY.auth.repository;

import com.LawEZY.auth.model.OneTimePassword;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface OtpRepository extends MongoRepository<OneTimePassword, String> {
    Optional<OneTimePassword> findByEmailAndCodeAndPurpose(String email, String code, String purpose);
    void deleteByEmailAndPurpose(String email, String purpose);
}
