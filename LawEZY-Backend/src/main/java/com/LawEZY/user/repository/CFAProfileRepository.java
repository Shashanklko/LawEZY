package com.LawEZY.user.repository;

import com.LawEZY.user.entity.CFAProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface CFAProfileRepository extends JpaRepository<CFAProfile, String> {
    Optional<CFAProfile> findByUserId(String userId);
    Optional<CFAProfile> findByUidIgnoreCase(String uid);
}
