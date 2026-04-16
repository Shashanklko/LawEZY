package com.LawEZY.user.service;

import com.LawEZY.user.entity.Appointment;
import com.LawEZY.user.repository.AppointmentRepository;
import com.LawEZY.common.exception.ResourceNotFoundException;
import com.LawEZY.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final com.LawEZY.chat.repository.ChatSessionRepository chatSessionRepository;
    private final com.LawEZY.user.repository.ReviewRepository reviewRepository;
    private final com.LawEZY.user.repository.ProfessionalProfileRepository professionalProfileRepository;
    private final com.LawEZY.user.repository.LawyerProfileRepository lawyerProfileRepository;
    private final com.LawEZY.user.repository.CAProfileRepository caProfileRepository;
    private final com.LawEZY.user.repository.CFAProfileRepository cfaProfileRepository;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<Appointment> getAppointmentsForExpert(String expertUid) {
        return appointmentRepository.findByExpertUidOrderByScheduledAtDesc(expertUid);
    }

    @Transactional(readOnly = true)
    public List<Appointment> getAppointmentsForClient(String clientUid) {
        return appointmentRepository.findByClientUidOrderByScheduledAtDesc(clientUid);
    }

    @Transactional
    public Appointment createAppointment(Appointment appointment) {
        if (appointment.getScheduledAt() == null) appointment.setScheduledAt(LocalDateTime.now());
        if (appointment.getExpiresAt() == null) appointment.setExpiresAt(LocalDateTime.now().plusMonths(1));
        return appointmentRepository.save(appointment);
    }

    @Transactional
    public Appointment createProposal(Appointment proposal) {
        proposal.setPlatformFee(100.0);
        // Inject Wallet Institutional Data
        // Initial fee calculation based on baseFee from expert profile
        Double baseFee = proposal.getBaseFee() != null ? proposal.getBaseFee() : 499.0;
        proposal.setBaseFee(baseFee);
        proposal.setFee(baseFee + 100.0);
        proposal.setStatus("PROPOSED");
        proposal.setExpiresAt(LocalDateTime.now().plusHours(24));
        
        // Institutional Auto-Bridge: Link to existing Chat Session if not provided
        if (proposal.getChatSessionId() == null || proposal.getChatSessionId().isEmpty()) {
            List<com.LawEZY.chat.model.ChatSession> sessions = chatSessionRepository.findByProfessionalId(proposal.getExpertUid());
            sessions.stream()
                .filter(s -> s.getUserId().equals(proposal.getClientUid()))
                .findFirst()
                .ifPresent(s -> proposal.setChatSessionId(s.getId()));
        }
        
        Appointment saved = appointmentRepository.save(proposal);
        
        // NOTIFICATION: Determine target based on initiator
        String targetUid = proposal.getInitiatorUid().equals(proposal.getExpertUid()) ? proposal.getClientUid() : proposal.getExpertUid();
        notificationService.sendNotification(
            targetUid, 
            "New Appointment Proposal", 
            "You have received a new consultation request.", 
            "APPOINTMENT", 
            "/dashboard"
        );
        
        return saved;
    }

    @Transactional
    public Appointment counterOffer(Long id, LocalDateTime s1, LocalDateTime s2, LocalDateTime s3) {
        Appointment appt = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Institutional record not found."));
        appt.setProposedSlot1(s1);
        appt.setProposedSlot2(s2);
        appt.setProposedSlot3(s3);
        appt.setStatus("COUNTERED");
        appt.setExpiresAt(LocalDateTime.now().plusHours(24));
        return appointmentRepository.save(appt);
    }

    @Transactional
    public Appointment finalizeSelection(Long id, Integer slotIndex) {
        Appointment appt = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Institutional record not found."));
        LocalDateTime selected = slotIndex == 1 ? appt.getProposedSlot1() :
                                slotIndex == 2 ? appt.getProposedSlot2() :
                                appt.getProposedSlot3();
        appt.setScheduledAt(selected);
        appt.setStatus("CONFIRMED");
        return appointmentRepository.save(appt);
    }

    @Transactional
    public Appointment initiateSession(Long id, boolean isFree) {
        Appointment appt = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Institutional record not found."));
        appt.setIsFree(isFree);
        
        if (isFree) {
            String secureId = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            appt.setRoomId("lzy-room-" + secureId);
            appt.setStatus("PAID");
        } else {
            appt.setStatus("AWAITING_PAYMENT");
        }
        
        return appointmentRepository.save(appt);
    }

    @Transactional
    public Appointment acceptProposal(Long id) {
        Appointment appt = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Institutional record not found."));
        
        // Reset any discount if just accepted normally
        appt.setDiscountPercent(0.0);
        appt.setFee(appt.getBaseFee() + appt.getPlatformFee());
        appt.setStatus("CONFIRMED");
        Appointment saved = appointmentRepository.save(appt);
        
        notificationService.sendNotification(
            appt.getClientUid(), 
            "Appointment Confirmed", 
            "Your appointment has been confirmed by the professional.", 
            "APPOINTMENT", 
            "/dashboard"
        );
        
        if (!appt.getClientUid().equals(appt.getExpertUid())) {
            notificationService.sendNotification(
                appt.getExpertUid(), 
                "Appointment Confirmed", 
                "An appointment has been confirmed by the client.", 
                "APPOINTMENT", 
                "/dashboard"
            );
        }
        
        return saved;
    }

    @Transactional
    public Appointment acceptWithDiscount(Long id) {
        Appointment appt = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Institutional record not found."));
        
        double discount = appt.getDiscountPercent() != null ? appt.getDiscountPercent() : 0.0;
        double reduction = appt.getBaseFee() * (discount / 100.0);
        double newBase = appt.getBaseFee() - reduction;
        
        appt.setBaseFee(newBase);
        appt.setFee(newBase + appt.getPlatformFee());
        appt.setStatus("CONFIRMED");
        Appointment saved = appointmentRepository.save(appt);
        
        notificationService.sendNotification(
            appt.getClientUid(), 
            "Discounted Appointment Confirmed", 
            "Your appointment was accepted with the proposed discount.", 
            "APPOINTMENT", 
            "/dashboard"
        );
        
        return saved;
    }

    @Transactional
    public Appointment rejectProposal(Long id, String reason) {
        Appointment appt = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Institutional record not found."));
        appt.setStatus("CANCELLED");
        appt.setRejectionReason(reason);
        return appointmentRepository.save(appt);
    }

    @Transactional
    public Appointment createRoom(Long appointmentId) {
        return initiateSession(appointmentId, false);
    }

    @Transactional
    public Appointment updateStatus(Long appointmentId, String status) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment dossier not found."));
        
        // Protocol Guard: If session is already PAID or COMPLETED, prevent regression to CANCELLED 
        // unless high-authority override (not implemented yet)
        if ("CANCELLED".equalsIgnoreCase(status) && 
            ("PAID".equalsIgnoreCase(appointment.getStatus()) || "COMPLETED".equalsIgnoreCase(appointment.getStatus()))) {
            throw new IllegalStateException("Security Breach: Cannot revoke an appointment that has been financially synchronized.");
        }

        appointment.setStatus(status.toUpperCase());
        appointment.setUpdatedAt(LocalDateTime.now());
        
        // Institutional Auto-Bridge: If status becomes PAID, ensure a Room ID exists for the consultation
        if ("PAID".equalsIgnoreCase(status) && (appointment.getRoomId() == null || appointment.getRoomId().isEmpty())) {
            String secureId = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            appointment.setRoomId("lzy-room-" + secureId);
        }
        
        return appointmentRepository.save(appointment);
    }

    @Transactional
    public Appointment submitReview(com.LawEZY.user.dto.ReviewDTO reviewDto) {
        Long appointmentId = reviewDto.getAppointmentId();
        if (appointmentId == null) throw new IllegalArgumentException("Appointment ID is required for review submission");
        
        Appointment appt = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Institutional record not found."));
        
        try {
            // 1. Create Review Entity
            com.LawEZY.user.entity.Review review = new com.LawEZY.user.entity.Review();
            review.setAppointmentId(appt.getId());
            review.setClientUid(appt.getClientUid());
            review.setExpertUid(appt.getExpertUid());
            review.setRating(reviewDto.getRating());
            review.setComment(reviewDto.getComment());
            review.setIsAnonymous(reviewDto.getIsAnonymous() != null ? reviewDto.getIsAnonymous() : false);
            reviewRepository.save(review);
            
            // 2. Recalculate Expert Rating (Institutional Alignment)
            updateExpertRating(appt.getExpertUid(), reviewDto.getRating());
        } catch (Exception e) {
            // Institutional Resilience: Mark as COMPLETED even if rating sync fails to prevent ledger blockage
            log.error("[INSTITUTIONAL ERROR] Failed to synchronize expert rating for session Ref-{}: {}", appt.getId(), e.getMessage());
        }
        
        // 3. Finalize Appointment
        appt.setStatus("COMPLETED");
        appt.setUpdatedAt(LocalDateTime.now());
        return appointmentRepository.save(appt);
    }

    private void updateExpertRating(String expertUid, Double newRating) {
        if (expertUid == null || newRating == null) return;
        log.info("[INSTITUTIONAL SYNC] Updating performance rating for expert UID: {}", expertUid);
        
        // 1. Try Lawyer Profile
        lawyerProfileRepository.findByUidIgnoreCase(expertUid).ifPresent(p -> {
            Double currentRating = p.getRating();
            Integer count = p.getReviewCount();
            double total = (currentRating != null ? currentRating : 0.0) * (count != null ? count : 0);
            p.setReviewCount((count != null ? count : 0) + 1);
            p.setRating((total + newRating) / p.getReviewCount());
            lawyerProfileRepository.save(p);
            log.info("[INSTITUTIONAL SYNC] Lawyer rating updated successfully.");
        });

        // 2. Try CA Profile
        caProfileRepository.findByUidIgnoreCase(expertUid).ifPresent(p -> {
            Double currentRating = p.getRating();
            Integer count = p.getReviewCount();
            double total = (currentRating != null ? currentRating : 0.0) * (count != null ? count : 0);
            p.setReviewCount((count != null ? count : 0) + 1);
            p.setRating((total + newRating) / p.getReviewCount());
            caProfileRepository.save(p);
            log.info("[INSTITUTIONAL SYNC] CA rating updated successfully.");
        });

        // 3. Try CFA Profile
        cfaProfileRepository.findByUidIgnoreCase(expertUid).ifPresent(p -> {
            Double currentRating = p.getRating();
            Integer count = p.getReviewCount();
            double total = (currentRating != null ? currentRating : 0.0) * (count != null ? count : 0);
            p.setReviewCount((count != null ? count : 0) + 1);
            p.setRating((total + newRating) / p.getReviewCount());
            cfaProfileRepository.save(p);
            log.info("[INSTITUTIONAL SYNC] CFA rating updated successfully.");
        });

        // 4. Try Professional Profile (Universal fallback)
        professionalProfileRepository.findByUidIgnoreCase(expertUid).ifPresent(p -> {
            Double currentRating = p.getRating();
            Integer count = p.getReviewsCount();
            double total = (currentRating != null ? currentRating : 0.0) * (count != null ? count : 0);
            p.setReviewsCount((count != null ? count : 0) + 1);
            p.setRating((total + newRating) / p.getReviewsCount());
            professionalProfileRepository.save(p);
            log.info("[INSTITUTIONAL SYNC] Professional rating updated successfully.");
        });
    }

    @Transactional
    public Appointment negotiateFee(Long id, Double newBaseFee) {
        Appointment appt = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Institutional record not found."));
        
        appt.setBaseFee(newBaseFee);
        appt.setFee(newBaseFee + (appt.getPlatformFee() != null ? appt.getPlatformFee() : 100.0));
        appt.setStatus("COUNTERED");
        appt.setUpdatedAt(LocalDateTime.now());
        
        return appointmentRepository.save(appt);
    }

    public Appointment getByChatSession(String chatSessionId) {
        return appointmentRepository.findByChatSessionId(chatSessionId)
                .orElse(null);
    }
}
