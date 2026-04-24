package com.LawEZY.user.service;

import com.LawEZY.user.entity.Appointment;
import com.LawEZY.user.entity.User;
import com.LawEZY.user.repository.AppointmentRepository;
import com.LawEZY.common.exception.ResourceNotFoundException;
import com.LawEZY.notification.service.NotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class AppointmentService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AppointmentService.class);

    private final AppointmentRepository appointmentRepository;
    private final com.LawEZY.chat.repository.ChatSessionRepository chatSessionRepository;
    private final com.LawEZY.user.repository.ReviewRepository reviewRepository;
    private final com.LawEZY.user.repository.ProfessionalProfileRepository professionalProfileRepository;
    private final com.LawEZY.user.repository.LawyerProfileRepository lawyerProfileRepository;
    private final com.LawEZY.user.repository.CAProfileRepository caProfileRepository;
    private final com.LawEZY.user.repository.CFAProfileRepository cfaProfileRepository;
    private final com.LawEZY.user.repository.UserRepository userRepository;
    private final com.LawEZY.user.service.WalletService walletService;
    private final NotificationService notificationService;
    private final com.LawEZY.common.service.EmailService emailService;

    public AppointmentService(
            AppointmentRepository appointmentRepository,
            com.LawEZY.chat.repository.ChatSessionRepository chatSessionRepository,
            com.LawEZY.user.repository.ReviewRepository reviewRepository,
            com.LawEZY.user.repository.ProfessionalProfileRepository professionalProfileRepository,
            com.LawEZY.user.repository.LawyerProfileRepository lawyerProfileRepository,
            com.LawEZY.user.repository.CAProfileRepository caProfileRepository,
            com.LawEZY.user.repository.CFAProfileRepository cfaProfileRepository,
            com.LawEZY.user.repository.UserRepository userRepository,
            com.LawEZY.user.service.WalletService walletService,
            NotificationService notificationService,
            com.LawEZY.common.service.EmailService emailService
    ) {
        this.appointmentRepository = appointmentRepository;
        this.chatSessionRepository = chatSessionRepository;
        this.reviewRepository = reviewRepository;
        this.professionalProfileRepository = professionalProfileRepository;
        this.lawyerProfileRepository = lawyerProfileRepository;
        this.caProfileRepository = caProfileRepository;
        this.cfaProfileRepository = cfaProfileRepository;
        this.userRepository = userRepository;
        this.walletService = walletService;
        this.notificationService = notificationService;
        this.emailService = emailService;
    }

    @Transactional(readOnly = true)
    public List<Appointment> getAppointmentsForExpert(String expertId) {
        return appointmentRepository.findByExpert_IdOrderByScheduledAtDesc(expertId);
    }
    
    @Transactional(readOnly = true)
    public List<Appointment> getAppointmentsForClient(String clientId) {
        return appointmentRepository.findByClient_IdOrderByScheduledAtDesc(clientId);
    }

    @Transactional
    public Appointment createAppointment(Appointment appointment) {
        if (appointment.getScheduledAt() == null) appointment.setScheduledAt(LocalDateTime.now());
        if (appointment.getExpiresAt() == null) appointment.setExpiresAt(LocalDateTime.now().plusMonths(1));
        return appointmentRepository.save(appointment);
    }

    @Transactional
    public Appointment createProposal(Appointment proposal) {
        log.info("[INSTITUTIONAL] Processing appointment proposal. Client: {}, Expert: {}", 
                 proposal.getClient() != null ? proposal.getClient().getId() : "NULL",
                 proposal.getExpert() != null ? proposal.getExpert().getId() : "NULL");

        if (proposal.getExpert() == null || proposal.getClient() == null || 
            proposal.getExpert().getId() == null || proposal.getClient().getId() == null) {
             throw new IllegalArgumentException("Expert and Client (with valid IDs) are mandatory for institutional records.");
        }

        // Hardening: Load actual managed entities to prevent Detached/Transient errors
        User client = userRepository.findById(proposal.getClient().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Client record not found in institutional archives."));
        User expert = userRepository.findById(proposal.getExpert().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Expert record not found in institutional archives."));

        proposal.setClient(client);
        proposal.setExpert(expert);
        
        Double baseFee = proposal.getBaseFee() != null ? proposal.getBaseFee() : 500.0;
        
        // Institutional Fee Governance (500 - 10000)
        if (baseFee < 500.0) baseFee = 500.0;
        if (baseFee > 10000.0) baseFee = 10000.0;
        
        proposal.setBaseFee(baseFee);
        // Formula: Base (Expert share) + 15% commission + 5% handling = 20% Total Platform Earning
        proposal.setFee(Math.round(baseFee * 1.20));
        proposal.setPlatformFee(Math.round(baseFee * 0.20));
        
        proposal.setStatus("PROPOSED");
        proposal.setExpiresAt(LocalDateTime.now().plusHours(24));
        
        // Institutional Auto-Bridge
        try {
            if (proposal.getChatSessionId() == null || proposal.getChatSessionId().isEmpty()) {
                List<com.LawEZY.chat.model.ChatSession> sessions = chatSessionRepository.findByProfessionalId(expert.getId());
                if (sessions != null) {
                    sessions.stream()
                        .filter(s -> s.getUserId() != null && s.getUserId().equals(client.getId()))
                        .findFirst()
                        .ifPresent(s -> proposal.setChatSessionId(s.getId()));
                }
            }
        } catch (Exception e) {
            log.warn("Institutional Auto-Bridge failed: {}", e.getMessage());
        }
        
        log.info("[INSTITUTIONAL] Saving appointment proposal...");
        Appointment saved = appointmentRepository.save(proposal);
        
        // NOTIFICATION
        String targetId = (proposal.getInitiatorId() != null && proposal.getInitiatorId().equals(expert.getId())) 
                            ? client.getId() : expert.getId();
        
        try {
            notificationService.sendNotification(
                targetId, 
                "📅 New Appointment Proposal",
                "You have received a new consultation proposal. Please check the Appointment Center.",
                "APPOINTMENT", "GENERAL", "/appointments"
            );

            // EMAIL NOTIFICATION
            User target = userRepository.findById(targetId).orElse(null);
            if (target != null) {
                java.util.Map<String, Object> model = new java.util.HashMap<>();
                model.put("title", "NEW PROPOSAL");
                model.put("status", "ACTION REQUIRED");
                model.put("greeting", "Hello, you have a new appointment proposal awaiting your review.");
                model.put("expertName", expert.getFirstName() + " " + expert.getLastName());
                model.put("date", "Review Dashboard");
                model.put("time", "Multiple Slots");
                model.put("duration", "Consultation");
                model.put("amount", "₹" + saved.getFee());
                
                emailService.sendHtmlEmail(target.getEmail(), "LawEZY: New Appointment Proposal", "emails/appointment-alert", model);
            }
        } catch (Exception e) {
            log.error("Notification delivery failed: {}", e.getMessage());
        }
        
        return saved;
    }

    @Transactional
    public Appointment counterOffer(Long id, LocalDateTime s1, LocalDateTime s2, LocalDateTime s3, Double newBaseFee) {
        Appointment appt = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Institutional record not found."));
        appt.setProposedSlot1(s1);
        appt.setProposedSlot2(s2);
        appt.setProposedSlot3(s3);
        
        if (newBaseFee != null && newBaseFee > 0) {
            // Enforce Limits
            if (newBaseFee < 500.0) newBaseFee = 500.0;
            if (newBaseFee > 10000.0) newBaseFee = 10000.0;
            
            appt.setBaseFee(newBaseFee);
            appt.setFee(Math.round(newBaseFee * 1.20));
            appt.setPlatformFee(Math.round(newBaseFee * 0.20));
        }
        
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
        
        // Auto-advance to AWAITING_PAYMENT to remove manual initiation steps
        appt.setStatus(appt.getIsFree() != null && appt.getIsFree() ? "PAID" : "AWAITING_PAYMENT");
        Appointment saved = appointmentRepository.save(appt);
        
        notificationService.sendNotification(
            appt.getClient().getId(), 
            "✅ Appointment Confirmed", 
            "Your appointment request has been approved by the professional. Proceed to payment in your dashboard.", 
            "APPOINTMENT", "ENGAGEMENT", "/dashboard"
        );
        
        notificationService.sendNotification(
            appt.getExpert().getId(), 
            "📋 Appointment Approved", 
            "You have approved a consultation request. Awaiting client payment.", 
            "APPOINTMENT", "ENGAGEMENT", "/dashboard"
        );

        // EMAIL NOTIFICATION TO CLIENT
        try {
            java.util.Map<String, Object> model = new java.util.HashMap<>();
            model.put("title", "APPOINTMENT CONFIRMED");
            model.put("status", "AWAITING PAYMENT");
            model.put("greeting", "Hello " + appt.getClient().getFirstName() + ", your appointment has been approved. Please complete the payment to secure the session.");
            model.put("expertName", appt.getExpert().getFirstName() + " " + appt.getExpert().getLastName());
            model.put("date", appt.getScheduledAt() != null ? appt.getScheduledAt().toLocalDate().toString() : "TBD");
            model.put("time", appt.getScheduledAt() != null ? appt.getScheduledAt().toLocalTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")) : "TBD");
            model.put("duration", "Consultation Session");
            model.put("amount", "₹" + appt.getFee());
            
            emailService.sendHtmlEmail(appt.getClient().getEmail(), "LawEZY: Appointment Approved", "emails/appointment-alert", model);
        } catch (Exception e) {
            log.warn("Failed to send confirmation email: {}", e.getMessage());
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
        
        // Auto-advance to AWAITING_PAYMENT to remove manual initiation steps
        appt.setStatus(appt.getIsFree() != null && appt.getIsFree() ? "PAID" : "AWAITING_PAYMENT");
        Appointment saved = appointmentRepository.save(appt);
        
        notificationService.sendNotification(
            appt.getClient().getId(), 
            "🎯 Discounted Appointment Confirmed", 
            "Your appointment was accepted with the proposed discount. Proceed to payment.", 
            "APPOINTMENT", "ENGAGEMENT", "/dashboard"
        );
        
        notificationService.sendNotification(
            appt.getExpert().getId(), 
            "📋 Discounted Appointment Approved", 
            "You approved a consultation with a discount. Awaiting client payment.", 
            "APPOINTMENT", "ENGAGEMENT", "/dashboard"
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
    public Appointment markAsCompletedByExpert(Long id) {
        Appointment appt = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Institutional record not found."));
        
        if (!"PAID".equals(appt.getStatus())) {
            throw new IllegalStateException("Only paid appointments can be marked as completed.");
        }

        appt.setCompletedByExpertAt(LocalDateTime.now());
        appt.setStatus("COMPLETION_REQUESTED"); // Intermediate status
        
        notificationService.sendNotification(
            appt.getClient().getId(), 
            "🏁 Consultation Marked Completed", 
            "Professional has marked the session as completed. Please confirm to release payment.", 
            "APPOINTMENT", "ENGAGEMENT", "/dashboard"
        );
        
        return appointmentRepository.save(appt);
    }

    @Transactional
    public Appointment createRoom(Long appointmentId) {
        return initiateSession(appointmentId, false);
    }

    @Transactional
    public Appointment updateStatus(Long appointmentId, String status) {
        return updateStatus(appointmentId, status, null);
    }

    @Transactional
    public Appointment updateStatus(Long appointmentId, String status, String callerUserId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment dossier not found."));
        
        if ("CANCELLED".equalsIgnoreCase(status) && 
            ("PAID".equalsIgnoreCase(appointment.getStatus()) || "COMPLETED".equalsIgnoreCase(appointment.getStatus()))) {
            throw new IllegalStateException("Security Breach: Cannot revoke an appointment that has been financially synchronized.");
        }

        if ("PAID".equalsIgnoreCase(status) && "PAID".equalsIgnoreCase(appointment.getStatus())) {
            log.info("Institutional Sync: Appointment Ref-{} is already PAID. Skipping redundant ledger entry.", appointmentId);
            return appointment;
        }

        appointment.setStatus(status.toUpperCase());
        appointment.setUpdatedAt(LocalDateTime.now());
        
        if ("PAID".equalsIgnoreCase(status)) {
            if (appointment.getRoomId() == null || appointment.getRoomId().isEmpty()) {
                String secureId = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
                appointment.setRoomId("lzy-room-" + secureId);
            }
            
            // SIMPLIFIED LEDGER: Use direct associations
            if (callerUserId != null) {
                walletService.logAppointmentTransactionByUserId(appointment, callerUserId);
            } else {
                // Use the ID from the association directly
                walletService.logAppointmentTransactionByUserId(appointment, appointment.getClient().getId());
            }

            notificationService.sendNotification(
                appointment.getExpert().getId(), 
                "💳 Payment Received", 
                "Client has completed the escrow payment. You can now initiate the consultation room.", 
                "PAYMENT", "FINANCIAL", "/dashboard"
            );

            notificationService.sendNotification(
                appointment.getClient().getId(), 
                "✅ Payment Successful", 
                "Your payment has been secured. Awaiting expert to start the session.", 
                "PAYMENT", "FINANCIAL", "/dashboard"
            );

            // EMAIL NOTIFICATIONS
            try {
                // To Client
                java.util.Map<String, Object> clientModel = new java.util.HashMap<>();
                clientModel.put("title", "PAYMENT SECURED");
                clientModel.put("status", "PAID & SECURED");
                clientModel.put("greeting", "Payment successful! Your consultation is now fully confirmed.");
                clientModel.put("expertName", appointment.getExpert().getFirstName() + " " + appointment.getExpert().getLastName());
                clientModel.put("date", appointment.getScheduledAt() != null ? appointment.getScheduledAt().toLocalDate().toString() : "N/A");
                clientModel.put("time", appointment.getScheduledAt() != null ? appointment.getScheduledAt().toLocalTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")) : "N/A");
                clientModel.put("duration", "Active Session");
                clientModel.put("amount", "₹" + appointment.getFee());
                emailService.sendHtmlEmail(appointment.getClient().getEmail(), "LawEZY: Payment Successful", "emails/appointment-alert", clientModel);

                // To Expert
                java.util.Map<String, Object> expertModel = new java.util.HashMap<>();
                expertModel.put("title", "CLIENT PAID");
                expertModel.put("status", "READY TO START");
                expertModel.put("greeting", "The client has completed the payment. You can now start the session.");
                expertModel.put("expertName", "Consultation with " + appointment.getClient().getFirstName());
                expertModel.put("date", appointment.getScheduledAt() != null ? appointment.getScheduledAt().toLocalDate().toString() : "N/A");
                expertModel.put("time", appointment.getScheduledAt() != null ? appointment.getScheduledAt().toLocalTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")) : "N/A");
                expertModel.put("duration", "Active Session");
                expertModel.put("amount", "₹" + appointment.getFee());
                emailService.sendHtmlEmail(appointment.getExpert().getEmail(), "LawEZY: Client Payment Received", "emails/appointment-alert", expertModel);
            } catch (Exception e) {
                log.warn("Failed to send payment emails: {}", e.getMessage());
            }

            // 🛡️ INSTITUTIONAL SYNC: Unlock Chat Session for messaging
            if (appointment.getChatSessionId() != null && !appointment.getChatSessionId().isEmpty()) {
                try {
                    chatSessionRepository.findById(appointment.getChatSessionId()).ifPresent(session -> {
                        session.setIsAppointmentPaid(true);
                        // Clear any pending trial/refill expiry to allow appointment-based governance
                        session.setExpiryTime(null); 
                        chatSessionRepository.save(session);
                        log.info("[GOVERNANCE] Chat Session {} unlocked via Appointment Ref-{}", session.getId(), appointment.getId());
                    });
                } catch (Exception e) {
                    log.error("[GOVERNANCE ERROR] Failed to unlock chat session for appointment Ref-{}: {}", appointment.getId(), e.getMessage());
                }
            }
        }
        
        return appointmentRepository.save(appointment);
    }

    @Transactional
    public Appointment submitReview(com.LawEZY.user.dto.ReviewDTO reviewDto) {
        Long appointmentId = reviewDto.getAppointmentId();
        if (appointmentId == null) throw new IllegalArgumentException("Appointment ID is required for review submission");
        
        Appointment appt = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Institutional record not found."));
        
        // 1. Check for existing review to prevent unique constraint violation
        reviewRepository.findByAppointmentId(appointmentId).ifPresent(existing -> {
            log.warn("[INSTITUTIONAL] Review already exists for session Ref-{}. Skipping creation.", appointmentId);
        });

        if (reviewRepository.findByAppointmentId(appointmentId).isEmpty()) {
            try {
                // Create Review Entity
                com.LawEZY.user.entity.Review review = new com.LawEZY.user.entity.Review();
                review.setAppointmentId(appt.getId());
                review.setClient(appt.getClient());
                review.setExpert(appt.getExpert());
                review.setRating(reviewDto.getRating());
                review.setComment(reviewDto.getComment());
                review.setIsAnonymous(reviewDto.getIsAnonymous() != null ? reviewDto.getIsAnonymous() : false);
                reviewRepository.save(review);
                
                // 2. Recalculate Expert Rating (Unified Identity)
                try {
                    updateExpertRating(appt.getExpert().getId(), reviewDto.getRating());
                } catch (Exception ratingEx) {
                    log.error("[INSTITUTIONAL ERROR] Failed to synchronize expert rating for session Ref-{}: {}", appt.getId(), ratingEx.getMessage());
                }
            } catch (Exception e) {
                log.error("[INSTITUTIONAL ERROR] Failed to save review ledger for session Ref-{}: {}", appt.getId(), e.getMessage());
                throw new RuntimeException("Feedback ledger synchronization failed: " + e.getMessage());
            }
        }
        
        // 3. Finalize Appointment Status & Release Payout
        appt.setStatus("COMPLETED");
        appt.setUpdatedAt(LocalDateTime.now());
        
        if (!appt.getPayoutReleased()) {
            walletService.releaseEscrow(appt);
            appt.setPayoutReleased(true);
        }
        
        return appointmentRepository.save(appt);
    }

    /**
     * Auto-Release Payout for appointments marked completed by expert 48 hours ago
     */
    @Transactional
    public void processAutoReleases() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(2);
        List<Appointment> pending = appointmentRepository.findPendingAutoReleases(cutoff);

        for (Appointment a : pending) {
            log.info("[GOVERNANCE] Auto-releasing payout for Ref-{} (48h inactivity)", a.getId());
            walletService.releaseEscrow(a);
            a.setPayoutReleased(true);
            a.setStatus("COMPLETED");
            appointmentRepository.save(a);
        }
    }

    private void updateExpertRating(String expertId, Double newRating) {
        if (expertId == null || newRating == null) return;
        log.info("[IDENTITY SYNC] Updating performance rating for expert ID: {}", expertId);
        
        // 1. Try Lawyer Profile (Direct ID)
        lawyerProfileRepository.findById(expertId).ifPresent(p -> {
            Double currentRating = p.getRating();
            Integer count = p.getReviewCount();
            double total = (currentRating != null ? currentRating : 0.0) * (count != null ? count : 0);
            p.setReviewCount((count != null ? count : 0) + 1);
            p.setRating((total + newRating) / p.getReviewCount());
            lawyerProfileRepository.save(p);
            log.info("[IDENTITY SYNC] Lawyer rating updated.");
        });

        // 2. Try CA Profile (Direct ID)
        caProfileRepository.findById(expertId).ifPresent(p -> {
            Double currentRating = p.getRating();
            Integer count = p.getReviewCount();
            double total = (currentRating != null ? currentRating : 0.0) * (count != null ? count : 0);
            p.setReviewCount((count != null ? count : 0) + 1);
            p.setRating((total + newRating) / p.getReviewCount());
            caProfileRepository.save(p);
            log.info("[IDENTITY SYNC] CA rating updated.");
        });

        // 3. Try CFA Profile (Direct ID)
        cfaProfileRepository.findById(expertId).ifPresent(p -> {
            Double currentRating = p.getRating();
            Integer count = p.getReviewCount();
            double total = (currentRating != null ? currentRating : 0.0) * (count != null ? count : 0);
            p.setReviewCount((count != null ? count : 0) + 1);
            p.setRating((total + newRating) / p.getReviewCount());
            cfaProfileRepository.save(p);
            log.info("[INSTITUTIONAL SYNC] CFA rating updated successfully.");
        });

        // 4. Try Professional Profile (Direct ID - Universal fallback)
        professionalProfileRepository.findById(expertId).ifPresent(p -> {
            Double currentRating = p.getRating();
            Integer count = p.getReviewsCount();
            double total = (currentRating != null ? currentRating : 0.0) * (count != null ? count : 0);
            p.setReviewsCount((count != null ? count : 0) + 1);
            p.setRating((total + newRating) / p.getReviewsCount());
            professionalProfileRepository.save(p);
            log.info("[IDENTITY SYNC] Professional rating updated.");
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

    @Transactional
    public Appointment getByChatSession(String chatSessionId) {
        if (chatSessionId == null || chatSessionId.trim().isEmpty() || chatSessionId.equalsIgnoreCase("null")) {
            return null;
        }

        log.info("[INSTITUTIONAL] Discovery handshake initiated for Session: {}", chatSessionId);
        
        try {
            // 1. Primary Search: Direct link via chatSessionId
            java.util.Optional<Appointment> primaryMatch = appointmentRepository.findByChatSessionId(chatSessionId);
            if (primaryMatch.isPresent()) {
                Appointment match = primaryMatch.get();
                // Security Audit: Verify participants (expert/client) exist before returning
                if (match.getExpert() != null && match.getClient() != null) {
                    return match;
                }
            }

            // 2. Secondary Search (Discovery Fallback): Find by Expert/Client Pair via ChatSession metadata
            com.LawEZY.chat.model.ChatSession session = chatSessionRepository.findById(chatSessionId).orElse(null);
            if (session != null) {
                String expertId = session.getProfessionalId();
                String clientId = session.getUserId();

                if (expertId != null && clientId != null) {
                    // Optimized lookup: Filter active/proposed sessions directly in stream
                    List<Appointment> candidateAppts = appointmentRepository.findByExpert_Id(expertId);
                    Appointment discovered = (candidateAppts == null) ? null : candidateAppts.stream()
                        .filter(a -> a.getClient() != null && a.getClient().getId().equals(clientId))
                        .filter(a -> !"COMPLETED".equals(a.getStatus()) && !"CANCELLED".equals(a.getStatus()) && !"REVOKED".equals(a.getStatus()))
                        .findFirst()
                        .orElse(null);

                    if (discovered != null) {
                        log.info("[INSTITUTIONAL AUTO-LINK] Synchronizing Appointment Ref-{} to ChatSession-{}", discovered.getId(), chatSessionId);
                        discovered.setChatSessionId(chatSessionId);
                        return appointmentRepository.save(discovered);
                    }
                }
            }
        } catch (Exception e) {
            log.error("[INSTITUTIONAL ERROR] Handshake Failure for session {}: {}", chatSessionId, e.getMessage());
        }

        return null;
    }
}
