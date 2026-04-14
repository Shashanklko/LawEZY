package com.LawEZY.user.repository;

import com.LawEZY.user.entity.LawyerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface LawyerProfileRepository extends JpaRepository<LawyerProfile, String> {
    Optional<LawyerProfile> findByUserId(String userId);
    Optional<LawyerProfile> findByUidIgnoreCase(String uid);
}
