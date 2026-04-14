package com.LawEZY.user.repository;

import com.LawEZY.user.entity.ProfessionalProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ProfessionalProfileRepository extends JpaRepository<ProfessionalProfile, String> {
    Optional<ProfessionalProfile> findByUserId(String userId);
    Optional<ProfessionalProfile> findByUidIgnoreCase(String uid);
    Optional<ProfessionalProfile> findByPhoneNumber(String phoneNumber);
}

