package com.LawEZY.user.repository;

import com.LawEZY.user.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByExpertUidOrderByScheduledAtDesc(String expertUid);
    List<Appointment> findByClientUidOrderByScheduledAtDesc(String clientUid);
    Optional<Appointment> findByChatSessionId(String chatSessionId);
    
    // 🏛️ Automation Finder
    java.util.List<Appointment> findAllByStatusAndUpdatedAtBefore(String status, java.time.LocalDateTime threshold);
}
