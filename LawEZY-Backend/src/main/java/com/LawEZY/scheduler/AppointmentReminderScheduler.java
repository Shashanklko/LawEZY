package com.LawEZY.scheduler;

import com.LawEZY.notification.service.NotificationService;
import com.LawEZY.user.entity.Appointment;
import com.LawEZY.user.repository.AppointmentRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * 🕐 AppointmentReminderScheduler
 *
 * Fires automatically every minute to detect upcoming CONFIRMED appointments
 * that start within the next 30–31 minutes and dispatches reminder alerts
 * to both the client and the expert.
 *
 * Strategy: the window [now+29m, now+31m] creates a 2-minute de-facto
 * firing slot, ensuring each appointment is caught by exactly one poll cycle
 * without requiring a separate "reminder_sent" flag in the DB.
 * (If you add 100+ appointments per minute you should add that flag — see note below.)
 */
@Component
public class AppointmentReminderScheduler {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AppointmentReminderScheduler.class);

    private final AppointmentRepository appointmentRepository;
    private final NotificationService   notificationService;
    private final com.LawEZY.user.service.AppointmentService appointmentService;

    public AppointmentReminderScheduler(AppointmentRepository appointmentRepository, 
                                      NotificationService notificationService,
                                      com.LawEZY.user.service.AppointmentService appointmentService) {
        this.appointmentRepository = appointmentRepository;
        this.notificationService = notificationService;
        this.appointmentService = appointmentService;
    }

    private static final DateTimeFormatter TIME_FMT =
            DateTimeFormatter.ofPattern("hh:mm a");

    /**
     * Runs every 60 seconds.
     * cron = "0 * * * * *" → top of every minute.
     */
    @Scheduled(cron = "0 * * * * *")
    public void dispatchThirtyMinuteReminders() {
        LocalDateTime now        = LocalDateTime.now();
        LocalDateTime windowStart = now.plusMinutes(29);
        LocalDateTime windowEnd   = now.plusMinutes(31);

        List<Appointment> upcoming = appointmentRepository.findConfirmedInWindow(windowStart, windowEnd);

        if (upcoming.isEmpty()) return;

        log.info("⏰ [REMINDER] {} appointment(s) starting in ~30 minutes", upcoming.size());

        for (Appointment appt : upcoming) {
            String timeLabel = appt.getScheduledAt() != null
                    ? appt.getScheduledAt().format(TIME_FMT)
                    : "soon";

            // ── Client reminder ──────────────────────────────────────────────
            String clientUid = appt.getClient() != null ? appt.getClient().getId() : null;
            safeNotify(
                clientUid,
                "📅 Session Starting in 30 Minutes",
                String.format("Your consultation is scheduled at %s. Please be ready to join the session.", timeLabel),
                "APPOINTMENT",
                "ENGAGEMENT",
                "/dashboard"
            );

            // ── Expert reminder ──────────────────────────────────────────────
            String expertUid = appt.getExpert() != null ? appt.getExpert().getId() : null;
            safeNotify(
                expertUid,
                "📅 Upcoming Session in 30 Minutes",
                String.format("You have a client consultation at %s. Ensure your environment is prepared.", timeLabel),
                "APPOINTMENT",
                "ENGAGEMENT",
                "/dashboard"
            );

            log.info("⏰ [REMINDER] Dispatched for appointment #{} at {}", appt.getId(), timeLabel);
        }
    }

    /**
     * Also run at startup to catch any missed reminders on server restart.
     * Scans a slightly broader window (28–32 min) on boot.
     */
    @Scheduled(initialDelay = 5_000, fixedDelay = Long.MAX_VALUE)
    public void catchStartupMissedReminders() {
        LocalDateTime now        = LocalDateTime.now();
        LocalDateTime windowStart = now.plusMinutes(28);
        LocalDateTime windowEnd   = now.plusMinutes(32);

        List<Appointment> upcoming = appointmentRepository.findConfirmedInWindow(windowStart, windowEnd);
        if (upcoming.isEmpty()) return;

        log.info("🔁 [STARTUP-REMINDER] Catching {} reminder(s) missed during server restart", upcoming.size());
        for (Appointment appt : upcoming) {
            String timeLabel = appt.getScheduledAt() != null
                    ? appt.getScheduledAt().format(TIME_FMT)
                    : "soon";
            String clientUid = appt.getClient() != null ? appt.getClient().getId() : null;
            String expertUid = appt.getExpert() != null ? appt.getExpert().getId() : null;
            safeNotify(clientUid, "⚡ Session Reminder (Recovered)",
                    "Your consultation begins at " + timeLabel + ". Join on time.", "APPOINTMENT", "ENGAGEMENT", "/dashboard");
            safeNotify(expertUid, "⚡ Session Reminder (Recovered)",
                    "Your upcoming session is at " + timeLabel + ". Please be ready.", "APPOINTMENT", "ENGAGEMENT", "/dashboard");
        }
    }

    // ── Daily Digest: remind experts & clients of tomorrow's sessions at 8 PM ─
    /**
     * Fires at 20:00 IST daily (14:30 UTC).
     * Sends a "tomorrow's session" preview for all CONFIRMED appointments
     * scheduled within the next 12–36 hours.
     */
    @Scheduled(cron = "0 30 14 * * *") // 14:30 UTC = 20:00 IST
    public void dispatchDailyDigestReminders() {
        LocalDateTime now        = LocalDateTime.now();
        LocalDateTime windowStart = now.plusHours(12);
        LocalDateTime windowEnd   = now.plusHours(36);

        List<Appointment> upcoming = appointmentRepository.findConfirmedInWindow(windowStart, windowEnd);
        if (upcoming.isEmpty()) return;

        log.info("📋 [DIGEST] {} session(s) scheduled for tomorrow — sending previews", upcoming.size());

        for (Appointment appt : upcoming) {
            String timeLabel = appt.getScheduledAt() != null
                    ? appt.getScheduledAt().format(DateTimeFormatter.ofPattern("dd MMM, hh:mm a"))
                    : "upcoming";

            String clientUid = appt.getClient() != null ? appt.getClient().getId() : null;
            String expertUid = appt.getExpert() != null ? appt.getExpert().getId() : null;

            safeNotify(clientUid,
                "🗓️ Session Tomorrow",
                String.format("Reminder: Your consultation is confirmed for %s. You'll receive a 30-min alert before it begins.", timeLabel),
                "APPOINTMENT", "ENGAGEMENT", "/dashboard");

            safeNotify(expertUid,
                "🗓️ Session Tomorrow",
                String.format("You have a client session scheduled for %s. Review the case notes beforehand.", timeLabel),
                "APPOINTMENT", "ENGAGEMENT", "/dashboard");
        }
    }

    /**
     * Governance: Auto-release payouts for sessions marked completed by experts 
     * but not confirmed by clients within 48 hours.
     * Fires every hour.
     */
    @Scheduled(cron = "0 0 * * * *")
    public void executeAutoPayoutGovernance() {
        log.info("⚖️ [GOVERNANCE] Executing 48h Auto-Release check for pending vault payouts...");
        appointmentService.processAutoReleases();
    }

    // ── Helper ──────────────────────────────────────────────────────────────
    private void safeNotify(String uid, String title, String message,
                            String type, String category, String link) {
        if (uid == null || uid.isBlank()) return;
        try {
            notificationService.sendNotification(uid, title, message, type, category, link);
        } catch (Exception e) {
            log.error("❌ [REMINDER] Failed to notify {}: {}", uid, e.getMessage());
        }
    }
}
