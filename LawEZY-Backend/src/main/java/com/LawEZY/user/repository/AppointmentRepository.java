package com.LawEZY.user.repository;

import com.LawEZY.user.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByExpertUidOrderByScheduledAtDesc(String expertUid);
    List<Appointment> findByClientUidOrderByScheduledAtDesc(String clientUid);
    Optional<Appointment> findByChatSessionId(String chatSessionId);

    // 🏛️ Automation Finder
    List<Appointment> findAllByStatusAndUpdatedAtBefore(String status, LocalDateTime threshold);

    /**
     * Finds all CONFIRMED appointments whose scheduledAt falls within [windowStart, windowEnd].
     * Used by the 30-minute reminder scheduler.
     */
    @Query("SELECT a FROM Appointment a WHERE a.status = 'CONFIRMED' " +
           "AND a.scheduledAt BETWEEN :windowStart AND :windowEnd")
    List<Appointment> findConfirmedInWindow(
        @Param("windowStart") LocalDateTime windowStart,
        @Param("windowEnd")   LocalDateTime windowEnd
    );
}
