package com.LawEZY.user.repository;

import com.LawEZY.user.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByExpert_IdOrderByCreatedAtDesc(String expertId);
    Optional<Review> findByAppointmentId(Long appointmentId);
    
    // Aggregate queries for rating calculations
    long countByExpert_Id(String expertId);

    void deleteByExpert_Id(String expertId);
    void deleteByClient_Id(String clientId);
}
