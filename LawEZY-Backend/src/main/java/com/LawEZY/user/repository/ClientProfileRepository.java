package com.LawEZY.user.repository;

import com.LawEZY.user.entity.ClientProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClientProfileRepository extends JpaRepository<ClientProfile, String> {
    java.util.Optional<ClientProfile> findByUserId(String userId);
    java.util.Optional<ClientProfile> findByPhoneNumber(String phoneNumber);
    void deleteByUserId(String userId);
}

