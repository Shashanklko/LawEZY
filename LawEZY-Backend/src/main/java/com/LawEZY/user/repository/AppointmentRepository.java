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
    List<Appointment> findByExpert_IdOrderByScheduledAtDesc(String expertId);
    List<Appointment> findByClient_IdOrderByScheduledAtDesc(String clientId);
    List<Appointment> findByExpert_Id(String expertId);
    Optional<Appointment> findByChatSessionId(String chatSessionId);

    // 🏛️ Automation Finder
    @Query("SELECT a FROM Appointment a WHERE a.status = 'COMPLETION_REQUESTED' " +
           "AND a.completedByExpertAt <= :threshold AND a.payoutReleased = false")
    List<Appointment> findPendingAutoReleases(@Param("threshold") LocalDateTime threshold);

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

    // 🏛️ Added missing method for AppointmentAutomationService
    List<Appointment> findAllByStatusAndUpdatedAtBefore(String status, LocalDateTime threshold);


    void deleteByExpert_Id(String expertId);
    void deleteByClient_Id(String clientId);
}
