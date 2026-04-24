package com.LawEZY.user.repository;

import com.LawEZY.user.entity.ProfessionalProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ProfessionalProfileRepository extends JpaRepository<ProfessionalProfile, String> {
    Optional<ProfessionalProfile> findByUserId(String userId);
    Optional<ProfessionalProfile> findByPhoneNumber(String phoneNumber);
    Optional<ProfessionalProfile> findBySlug(String slug);
    void deleteByUserId(String userId);
}

