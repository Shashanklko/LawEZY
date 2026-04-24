package com.LawEZY.user.service;

import com.LawEZY.user.entity.Appointment;
import com.LawEZY.user.repository.AppointmentRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 🏛️ INSTITUTIONAL AUTOMATION ENGINE
 * Handles institutional lifecycle events that require timed execution or cleanup.
 */
@Service
public class AppointmentAutomationService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AppointmentAutomationService.class);

    private final AppointmentRepository appointmentRepository;

    public AppointmentAutomationService(AppointmentRepository appointmentRepository) {
        this.appointmentRepository = appointmentRepository;
    }

    /**
     * ⚖️ AUTO-COMPLETE PROTOCOL
     * Automatically finalizes appointments that have been in 'PENDING_REVIEW' status 
     * for more than 24 hours without client response.
     * Runs every hour on the hour.
     */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void autoCompletePendingReviews() {
        LocalDateTime threshold = LocalDateTime.now().minusHours(24);
        
        log.info("[INSTITUTIONAL AUTOMATION] Commencing 24h Confirmation Audit. Threshold: {}", threshold);
        
        List<Appointment> stagnantAppointments = appointmentRepository.findAllByStatusAndUpdatedAtBefore("PENDING_REVIEW", threshold);
        
        if (stagnantAppointments.isEmpty()) {
            log.info("[INSTITUTIONAL AUTOMATION] Institutional Audit Complete: No stagnant sessions detected.");
            return;
        }

        log.warn("[INSTITUTIONAL AUTOMATION] Detected {} stagnant sessions requiring silent confirmation.", stagnantAppointments.size());

        for (Appointment appt : stagnantAppointments) {
            try {
                appt.setStatus("COMPLETED");
                appt.setUpdatedAt(LocalDateTime.now());
                appointmentRepository.save(appt);
                log.info("[INSTITUTIONAL AUTO-COMPLETE] Session Ref-{} automatically finalized due to 24h client silence.", appt.getId());
            } catch (Exception e) {
                log.error("[INSTITUTIONAL ERROR] Failed to auto-confirm session Ref-{}: {}", appt.getId(), e.getMessage());
            }
        }

        log.info("[INSTITUTIONAL AUTOMATION] Automation cycle complete. Ledger synchronized.");
    }
}
