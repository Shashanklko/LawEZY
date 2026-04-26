package com.LawEZY.user.repository;

import com.LawEZY.user.entity.CAProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface CAProfileRepository extends JpaRepository<CAProfile, String> {
    Optional<CAProfile> findByUserId(String userId);
    Optional<CAProfile> findBySlug(String slug);
    Optional<CAProfile> findByPhoneNumber(String phoneNumber);
    void deleteByUserId(String userId);
    long countByIsVerifiedTrue();
}
