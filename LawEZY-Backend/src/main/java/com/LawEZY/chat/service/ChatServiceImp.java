package com.LawEZY.chat.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.lang.NonNull;



import com.LawEZY.chat.dto.ChatMessageResponse;
import com.LawEZY.chat.dto.ChatSessionResponse;
import com.LawEZY.chat.dto.SendMessageRequest;
import com.LawEZY.chat.dto.StartChatRequest;
import com.LawEZY.chat.enums.ChatStatus;
import com.LawEZY.chat.model.ChatMessage;
import com.LawEZY.chat.model.ChatSession;
import com.LawEZY.chat.repository.ChatMessageRepository;
import com.LawEZY.chat.repository.ChatSessionRepository;
import com.LawEZY.user.repository.ProfessionalProfileRepository;
import com.LawEZY.user.repository.UserRepository;
import com.LawEZY.user.repository.WalletRepository;
import com.LawEZY.user.entity.Wallet;
import com.LawEZY.user.entity.User;
import com.LawEZY.user.entity.ProfessionalProfile;

import com.LawEZY.common.exception.ResourceNotFoundException;

@Service
public class ChatServiceImp implements ChatService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(ChatServiceImp.class);

    @Autowired
    private ChatSessionRepository chatSessionRepository;
    @Autowired
    private ChatMessageRepository chatMessageRepository;
    @Autowired 
    private UserRepository userRepository;
    @Autowired 
    private ProfessionalProfileRepository professionalProfileRepository;
    @Autowired
    private com.LawEZY.user.repository.ClientProfileRepository clientProfileRepository;
    @Autowired
    private WalletRepository walletRepository;
    @Autowired
    private com.LawEZY.user.service.FinancialService financialService;
    
    @Autowired
    private com.LawEZY.user.service.WalletService walletService;
    
    @Autowired
    private com.LawEZY.user.repository.LawyerProfileRepository lawyerProfileRepository;

    @Autowired
    private com.LawEZY.user.repository.CAProfileRepository caProfileRepository;

    @Autowired
    private com.LawEZY.user.repository.CFAProfileRepository cfaProfileRepository;

    @Autowired
    private com.LawEZY.user.service.UserService userService;

    @Autowired
    private com.LawEZY.notification.service.NotificationService notificationService;

    @Autowired
    private com.LawEZY.chat.repository.TrialAuditRepository trialAuditRepository;

    @Autowired
    private com.LawEZY.user.service.AppointmentService appointmentService;

    @Autowired
    private com.LawEZY.common.service.EmailService emailService;

    private void verifySessionAccess(ChatSession session) {
        String currentId = getCurrentAuthenticatedId();
        Set<String> myIdentities = getUniversalIdentities(currentId);
        
        boolean isParticipant = myIdentities.contains(session.getUserId()) || 
                               myIdentities.contains(session.getProfessionalId());
                               
        if (!isParticipant) {
            log.error("[SECURITY] Unauthorized access attempt by user {} on session {}", currentId, session.getId());
            throw new AccessDeniedException("Identity access restricted. You are not a participant in this consultation.");
        }
    }

    private String getCurrentAuthenticatedId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new AccessDeniedException("Identity authentication failure.");
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof com.LawEZY.auth.dto.CustomUserDetails) {
            return ((com.LawEZY.auth.dto.CustomUserDetails) principal).getId();
        }
        return auth.getName();
    }




    @Override
    @NonNull
    public ChatSessionResponse startSession(@NonNull StartChatRequest request) {
        String resolvedUser = null;
        String resolvedProf = null;

        try {
            resolvedUser = resolveInternalId(request.getUserId());
            resolvedProf = resolveInternalId(request.getProfessionalId());
        } catch (Exception e) {
            log.error("[INSTITUTIONAL ERROR] Critical failure during Identity Resolution: {}", e.getMessage());
            throw new RuntimeException("Institutional Identity Engine failure. Handshake aborted.");
        }

        if (resolvedUser == null || resolvedProf == null) {
            String fault = (resolvedUser == null) ? "USER" : "PROFESSIONAL";
            String rawId = (resolvedUser == null) ? request.getUserId() : request.getProfessionalId();
            log.error("[INSTITUTIONAL ERROR] Handshake Failed. Could not resolve {} identity (Input: {}).", 
                      fault, rawId);
            throw new IllegalArgumentException("Institutional Handshake Failed: Could not resolve " + fault + " identity [" + rawId + "]. Check provided identifiers.");
        }

        final String finalUser = resolvedUser;
        final String finalProf = resolvedProf;

        // --- DUPLICATE PREVENTION LOGIC ---
        // Check for existing active or awaiting reply sessions
        List<ChatSession> existingSessions = chatSessionRepository.findByUserIdAndProfessionalIdAndStatus(resolvedUser, resolvedProf, ChatStatus.ACTIVE);
        if (existingSessions == null || existingSessions.isEmpty()) {
            existingSessions = chatSessionRepository.findByUserIdAndProfessionalIdAndStatus(resolvedUser, resolvedProf, ChatStatus.AWAITING_REPLY);
        }
        
        if (!existingSessions.isEmpty()) {
            ChatSession existing = existingSessions.get(0);
            log.info("[INSTITUTIONAL REUSE] Found existing active session {}. Returning for continuity.", existing.getId());
            return mapToSessionResponse(existing, false, null, null);
        }

        ChatSession session = new ChatSession();
        session.setUserId(resolvedUser);
        session.setProfessionalId(resolvedProf);
        
        // 🛡️ PERSISTENT TRIAL GOVERNANCE
        // Check if a trial has already been used between this pair in any previous (deleted) session
        trialAuditRepository.findByUserIdAndProfessionalId(finalUser, finalProf)
            .ifPresent(audit -> {
                log.info("[INSTITUTIONAL AUDIT] Trial already consumed for User: {} | Prof: {}. Flagging session as trial-ended.", finalUser, finalProf);
                session.setTrialEnded(true);
            });

        session.setStatus(ChatStatus.AWAITING_REPLY);
        
        // --- INSTITUTIONAL METADATA CACHE ---
        try {
            com.LawEZY.user.dto.ProfessionalProfileDTO prof = userService.getProfessionalById(resolvedProf);
            session.setTextChatFee(prof.getTextChatFee() != null ? prof.getTextChatFee() : 100.0);
            session.setChatDurationMinutes(prof.getChatDurationMinutes() != null ? prof.getChatDurationMinutes() : 20);
        } catch (Exception e) {
            log.warn("[INSTITUTIONAL WARN] Could not cache expert metadata for {}. Using defaults.", resolvedProf);
            session.setTextChatFee(100.0);
            session.setChatDurationMinutes(20);
        }

        session.setCreatedAt(LocalDateTime.now());
        session.setLastUpdateAt(LocalDateTime.now());

        ChatSession savedSession = chatSessionRepository.save(session);
        log.info("[INSTITUTIONAL SYNC] Secure Channel Established. Session ID: {} | User: {} | Prof: {}", 
                 savedSession.getId(), savedSession.getUserId(), savedSession.getProfessionalId());
        
        // Return mapped response for instant frontend latching
        return mapToSessionResponse(savedSession, false, null, null);
    }

    private Set<String> getUniversalIdentities(String identifier) {
        Set<String> identities = new HashSet<>();
        if (identifier == null || identifier.trim().isEmpty() || identifier.equalsIgnoreCase("null")) return identities;
        
        identities.add(identifier);

        // 🕸️ INSTITUTIONAL IDENTITY WEB RESOLUTION 🕸️
        // We resolve in waves to catch all linked keys: ID <-> Email <-> Phone <-> UID

        // WAVE 1: Primary User Resolution
        User user = userRepository.findById(identifier)
                .or(() -> userRepository.findByEmail(identifier))
                .orElse(null);

        // WAVE 2: Profile-Based Resolution (If identifier is a Phone)
        if (user == null) {
            professionalProfileRepository.findByPhoneNumber(identifier).ifPresent(p -> identities.add(p.getId()));
            lawyerProfileRepository.findByPhoneNumber(identifier).ifPresent(p -> identities.add(p.getId()));
            caProfileRepository.findByPhoneNumber(identifier).ifPresent(p -> identities.add(p.getId()));
            cfaProfileRepository.findByPhoneNumber(identifier).ifPresent(p -> identities.add(p.getId()));
            clientProfileRepository.findByPhoneNumber(identifier).ifPresent(p -> identities.add(p.getId()));
            
            // Re-attempt User resolution if ID was found in profiles
            for (String id : new ArrayList<>(identities)) {
                if (user == null && id != null) user = userRepository.findById(id).orElse(null);
            }
        }

        // WAVE 3: Identity Aggregation
        if (user != null) {
            String id = user.getId();
            identities.add(id);
            if (user.getEmail() != null) identities.add(user.getEmail());
            
            professionalProfileRepository.findByUserId(id).ifPresent(p -> {
                if (p.getPhoneNumber() != null) identities.add(p.getPhoneNumber());
            });
            lawyerProfileRepository.findById(id).ifPresent(p -> {
                if (p.getPhoneNumber() != null) identities.add(p.getPhoneNumber());
            });
            caProfileRepository.findById(id).ifPresent(p -> {
                if (p.getPhoneNumber() != null) identities.add(p.getPhoneNumber());
            });
            cfaProfileRepository.findById(id).ifPresent(p -> {
                if (p.getPhoneNumber() != null) identities.add(p.getPhoneNumber());
            });
            clientProfileRepository.findByUserId(id).ifPresent(p -> {
                if (p.getPhoneNumber() != null) identities.add(p.getPhoneNumber());
            });
        }

        log.info("[INSTITUTIONAL SYNC] Final Resolved Identities for {}: {}", identifier, identities);
        return identities;
    }



    private String resolveInternalId(String identifier) {
        if (identifier == null || identifier.trim().isEmpty() || identifier.equalsIgnoreCase("null") || identifier.equalsIgnoreCase("undefined")) return null;
        
        // 🚀 Aggressive Resolution
        // 1. Check ID directly
        if (userRepository.existsById(identifier)) return identifier;

        // 2. Check Email
        Optional<User> byEmail = userRepository.findByEmail(identifier);
        if (byEmail.isPresent()) return byEmail.get().getId();

        // 3. Check Phone (Experts)
        if (professionalProfileRepository.findByPhoneNumber(identifier).isPresent()) 
            return professionalProfileRepository.findByPhoneNumber(identifier).get().getId();
        if (lawyerProfileRepository.findByPhoneNumber(identifier).isPresent())
            return lawyerProfileRepository.findByPhoneNumber(identifier).get().getId();
        if (caProfileRepository.findByPhoneNumber(identifier).isPresent())
            return caProfileRepository.findByPhoneNumber(identifier).get().getId();
        if (cfaProfileRepository.findByPhoneNumber(identifier).isPresent())
            return cfaProfileRepository.findByPhoneNumber(identifier).get().getId();

        // 4. Check Phone (Clients)
        Optional<com.LawEZY.user.entity.ClientProfile> byPhoneCli = clientProfileRepository.findByPhoneNumber(identifier);
        if (byPhoneCli.isPresent()) return byPhoneCli.get().getId();

        return identifier;
    }



    @Autowired
    private com.LawEZY.common.service.AuditLogService auditLogService;

    @Autowired
    private com.LawEZY.ai.service.AiService aiService;

    @Override
    @NonNull
    public ChatMessageResponse sendMessage(@NonNull SendMessageRequest request) {
        String sId = request.getChatSessionId();
        if (sId == null) throw new RuntimeException("Session ID missing");

        ChatSession session = chatSessionRepository.findById(sId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat Session not found"));

        String content = request.getContent();
        
        // Resolve Institutional Identities for ledger operations
        String senderId = resolveInternalId(request.getSenderId());
        String receiverId = resolveInternalId(request.getReceiverId());

        // 🛡️ AI SECURITY GUARD (Python + Gemini Powered Delegate)
        boolean isProfessional = senderId != null && senderId.equals(session.getProfessionalId());
        boolean isPaid = session.getIsAppointmentPaid() != null && session.getIsAppointmentPaid();
        
        // --- INSTITUTIONAL GOVERNANCE: PERSONAL MESSAGING BLOCK ---
        // Experts are ALWAYS blocked from sharing contact details to prevent platform bypass.
        // Clients are only blocked if the consultation hasn't been officially paid/unlocked.
        boolean shouldEnforceSafety = isProfessional || !isPaid;

        if (shouldEnforceSafety && content != null && !content.trim().isEmpty()) {
            String aiSafetyResult = aiService.checkSafety(content);

            if (aiSafetyResult != null && aiSafetyResult.contains("BLOCKED")) {
                auditLogService.logAiBlock(
                    "Contact details blocked",
                    "Content: " + content,
                    senderId,
                    isProfessional ? "EXPERT" : "CLIENT"
                );
                log.warn("[GOVERNANCE] {} Blocked from sharing contact details in Session {}: {}", isProfessional ? "EXPERT" : "CLIENT", sId, content);
                
                String errorMsg = isProfessional 
                    ? "Sharing personal contact details is strictly prohibited for Experts to maintain platform integrity. Please use official consultation channels."
                    : "Sharing contact details is blocked. Please schedule an appointment to exchange verified contact info.";
                    
                throw new RuntimeException(errorMsg);
            }
        }

        ChatMessage message = new ChatMessage();
        message.setChatSessionId(sId);
        message.setSenderId(senderId);
        message.setReceiverId(receiverId);
        message.setContent(content);
        message.setType(request.getType());
        message.setTimestamp(LocalDateTime.now());

        // Appointment Metadata Handling
        if (request.getType() == com.LawEZY.chat.enums.MessageType.APPOINTMENT) {
            message.setAppointmentDate(request.getAppointmentDate());
            message.setAppointmentTime(request.getAppointmentTime());
            message.setAppointmentPrice(request.getAppointmentPrice());
            message.setAppointmentStatus(request.getAppointmentStatus() != null ? request.getAppointmentStatus() : "requested");
            
            // Institutional Unlock: If status is 'paid', mark session as appointment-paid to bypass AI safety guards
            if ("paid".equalsIgnoreCase(request.getAppointmentStatus())) {
                session.setIsAppointmentPaid(true);
                log.info("[INSTITUTIONAL UNLOCK] Session {} marked as PAID. AI safety bypassed for verified professional consultation.", sId);
            }
        }

        // --- INSTITUTIONAL GOVERNANCE: TIME-BASED BILLING ---
        LocalDateTime now = LocalDateTime.now();

        // 1. Expert's First Response (Grants 5 Minutes Free Trial IF NOT ALREADY USED)
        if (isProfessional && session.getStatus() == ChatStatus.AWAITING_REPLY && request.getType() == com.LawEZY.chat.enums.MessageType.TEXT) {
            boolean trialAlreadyUsed = Boolean.TRUE.equals(session.getTrialEnded());
            
            if (!trialAlreadyUsed) {
                log.info("[GOVERNANCE] Expert greeted. Granting 5-minute Free Trial to session {}", sId);
                session.setExpiryTime(now.plusMinutes(5));
                session.setTrialEnded(true);
                
                // 🛡️ Record trial usage in persistent audit to prevent re-trial after deletion
                if (trialAuditRepository.findByUserIdAndProfessionalId(session.getUserId(), session.getProfessionalId()).isEmpty()) {
                    trialAuditRepository.save(new com.LawEZY.chat.model.TrialAudit(session.getUserId(), session.getProfessionalId()));
                    log.info("[INSTITUTIONAL AUDIT] Permanent Trial Audit recorded for User: {} | Prof: {}", session.getUserId(), session.getProfessionalId());
                }
            } else {
                log.info("[GOVERNANCE] Expert greeted but trial already consumed. Session remains locked until payment.");
                // Session status will become ACTIVE but expiry remains NULL (locked) or past
            }
            
            session.setStatus(ChatStatus.ACTIVE);

            // --- AUTOMATED GREETING & PRICING SYNC ---
            try {
                com.LawEZY.user.dto.ProfessionalProfileDTO prof = userService.getProfessionalById(session.getProfessionalId());
                if (prof != null) {
                    // 1. Custom Greeting (if set)
                    if (prof.getCustomGreeting() != null && !prof.getCustomGreeting().trim().isEmpty()) {
                        ChatMessage greetingMsg = new ChatMessage();
                        greetingMsg.setChatSessionId(sId);
                        greetingMsg.setSenderId(session.getProfessionalId());
                        greetingMsg.setReceiverId(session.getUserId());
                        greetingMsg.setContent(prof.getCustomGreeting());
                        greetingMsg.setTimestamp(LocalDateTime.now().plusNanos(1000));
                        chatMessageRepository.save(greetingMsg);
                    }

                    // 2. Institutional Pricing Notice
                    Double fee10 = prof.getTextChatFee() != null ? prof.getTextChatFee() : 100.0;
                    Double fee20 = (double) Math.round(fee10 * 1.8); // 10% discount for 20 mins
                    
                    String noticeContent = trialAlreadyUsed 
                        ? String.format("📢 Consultation initiated. Free trial already consumed. To unlock interaction, please extend for 10 min (₹%.0f) or 20 min (₹%.0f).", fee10, fee20)
                        : String.format("🌟 5-Minute Free Trial Started. To continue after expiry, extend for 10 min (₹%.0f) or 20 min (₹%.0f - Best Value).", fee10, fee20);

                    ChatMessage pricingNotice = new ChatMessage();
                    pricingNotice.setChatSessionId(sId);
                    pricingNotice.setSenderId("SYSTEM");
                    pricingNotice.setType(com.LawEZY.chat.enums.MessageType.SYSTEM_NOTICE);
                    pricingNotice.setContent(noticeContent);
                    pricingNotice.setTimestamp(LocalDateTime.now().plusNanos(2000));
                    chatMessageRepository.save(pricingNotice);
                    
                    log.info("[GOVERNANCE] Trial/Pricing notice injected for session {}. TrialUsed: {}", sId, trialAlreadyUsed);
                }
            } catch (Exception e) {
                log.warn("[GOVERNANCE] Failed to inject custom greeting/pricing: {}", e.getMessage());
            }
        }

        // 2. Client Expiry Enforcement (Paid Window Check)
        if (!isProfessional) {
            if (isPaid) {
                // Hardened Appointment Governance: Check if the scheduled time + duration has passed
                try {
                    com.LawEZY.user.entity.Appointment appt = appointmentService.getByChatSession(sId);
                    if (appt != null && appt.getScheduledAt() != null) {
                        LocalDateTime endTime = appt.getScheduledAt().plusMinutes(appt.getDurationMinutes());
                        if (now.isAfter(endTime)) {
                            log.warn("[GOVERNANCE] Appointment Ref-{} expired for Client {}. Blocking outbound message.", appt.getId(), senderId);
                            throw new org.springframework.security.access.AccessDeniedException("APPOINTMENT_EXPIRED: Your scheduled consultation time has ended. Please schedule a new session to continue.");
                        }
                    }
                } catch (org.springframework.security.access.AccessDeniedException e) {
                    throw e; // Re-throw security exception
                } catch (Exception e) {
                    log.warn("[GOVERNANCE] Appointment verification bypass: {}", e.getMessage());
                }
            } else if (session.getExpiryTime() != null && now.isAfter(session.getExpiryTime())) {
                log.warn("[GOVERNANCE] Session {} expired for Client {}. Blocking outbound message.", sId, senderId);
                throw new org.springframework.security.access.AccessDeniedException("SESSION_EXPIRED: Your consultation window has concluded. Please refill to continue.");
            }
        }

        // Locked reply logic for Lawyer's initial response - DECOMMISSIONED

        session.setLastUpdateAt(LocalDateTime.now());
        chatSessionRepository.save(session);
        log.info("[CHAT] MESSAGE SENT in Session: {} | Sender: {} | Type: {}", sId, senderId, request.getType());
        
        ChatMessage savedMessage = chatMessageRepository.save(message);

        // 🔔 ENGAGEMENT NOTIFICATIONS
        try {
            boolean isFirstMessage = chatMessageRepository.countByChatSessionId(sId) <= 1;
            String senderName = "A Client";
            
            // Try to resolve a friendlier name for the notification
            try {
                User sender = userRepository.findById(senderId).orElse(null);
                if (sender != null) senderName = sender.getFirstName();
            } catch (Exception ignored) {}

            if (isFirstMessage && senderId.equals(session.getUserId())) {
                // New Client Arrival Notification
                notificationService.sendNotification(receiverId,
                    "🌟 New Consultation Request",
                    senderName + " has initiated a new consultation with you.",
                    "MESSAGE", "ENGAGEMENT", "/chat/" + sId);
            } else if (request.getType() == com.LawEZY.chat.enums.MessageType.APPOINTMENT) {
                // Appointment Proposal in Chat
                notificationService.sendNotification(receiverId,
                    "📅 Appointment Proposal",
                    senderName + " has sent a new appointment proposal in your chat.",
                    "APPOINTMENT", "ENGAGEMENT", "/chat/" + sId);
            } else {
                // Standard Message Notification
                notificationService.sendNotification(receiverId,
                    "💬 New Message from " + senderName,
                    content != null && content.length() > 50 ? content.substring(0, 47) + "..." : (content != null ? content : "Media shared"),
                    "MESSAGE", "ENGAGEMENT", "/chat/" + sId);
            }
        } catch (Exception e) {
            log.warn("[NOTIFICATION FAIL] Could not dispatch chat alert: {}", e.getMessage());
        }

        return mapToResponse(savedMessage, session.getStatus());
    }

    @Override
    @NonNull
    public List<ChatMessageResponse> getChatHistory(@NonNull String chatSessionId) {
        ChatSession session = chatSessionRepository.findById(chatSessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        
        verifySessionAccess(session);
        
        List<ChatMessageResponse> history = chatMessageRepository.findByChatSessionIdOrderByTimestampAsc(chatSessionId)
                .stream()
                .filter(java.util.Objects::nonNull)
                .map(msg -> mapToResponse(msg, session.getStatus()))
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());
        return history != null ? history : Collections.emptyList();
    }

    @Override
    public void endChatByUser(@NonNull String sId) {
        ChatSession session = chatSessionRepository.findById(sId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        verifySessionAccess(session);
        session.setStatus(ChatStatus.RESOLVED);
        
        chatSessionRepository.save(session);
        sendSessionSummary(session);
    }

    @Override
    public void endChatByProfessional(@NonNull String sessionId) {
        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        
        verifySessionAccess(session);
        session.setProfessionalEndedChat(true);
        session.setStatus(ChatStatus.PENDING_RESOLUTION);
        chatSessionRepository.save(session);
    }

    @Override
    @Transactional
    public void unlockReply(@NonNull String sessionId, int requestedMinutes) {
        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        verifySessionAccess(session);
        
        // --- INSTITUTIONAL GOVERNANCE: DYNAMIC TIME-BASED UNLOCK ---
        String clientId = session.getUserId();
        String professionalId = session.getProfessionalId();
        
        // Check balance before proceeding
        Wallet clientWallet = walletService.getWalletByUserId(clientId);
        
        // --- IDENTITY RESOLUTION ---
        // We use the userService to find the profile as it handles lookup across Lawyer, CA, CFA, and Professional tables.
        com.LawEZY.user.dto.ProfessionalProfileDTO prof = userService.getProfessionalById(professionalId);
        if (prof == null) {
            throw new ResourceNotFoundException("Professional Profile not found for ID: " + professionalId);
        }

        // --- DYNAMIC FEE RESOLUTION ---
        // We fetch the latest fees from the expert profile instead of using the session's cached values.
        Double baseFee = prof.getTextChatFee() != null ? prof.getTextChatFee() : 100.0;
        int baseDuration = prof.getChatDurationMinutes() != null ? prof.getChatDurationMinutes() : 10;
        
        Double fee;
        if (requestedMinutes == 20 && baseDuration == 10) {
            // Institutional Logic: 10% discount for double duration (100*2*0.9 = 180)
            fee = baseFee * 1.8;
            log.info("[GOVERNANCE] Applying bulk discount for 20m extension. Base: {}, Final: {}", baseFee, fee);
        } else {
            double multiplier = (double) requestedMinutes / baseDuration;
            fee = baseFee * multiplier;
        }
        
        if (clientWallet.getCashBalance() < fee) {
            throw new RuntimeException("BALANCE_INSUFFICIENT: ₹" + String.format("%.2f", fee) + " required for " + requestedMinutes + "-minute extension.");
        }

        double platformCut = fee * 0.20;
        double earnings = fee - platformCut;

        // 3. Update Session State
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime currentExpiry = session.getExpiryTime();
        
        // Extend from either now or current expiry, whichever is later
        LocalDateTime baseTime = (currentExpiry != null && currentExpiry.isAfter(now)) ? currentExpiry : now;
        session.setExpiryTime(baseTime.plusMinutes(requestedMinutes));
        session.setStatus(ChatStatus.ACTIVE);
        session.setIsAppointmentPaid(true); // Treat as paid window

        // 4. Record Transactions
        String profName = prof.getName() != null ? prof.getName() : "Expert";
        
        financialService.recordTransaction(clientId, "Chat Extension (" + requestedMinutes + "m) - Expert: " + profName, -fee, "COMPLETED", "DEBIT");
        financialService.recordTransaction(professionalId, "Chat Extension (" + requestedMinutes + "m) - Client: " + clientId, earnings, "COMPLETED", "CREDIT");
        
        // 🛡️ Institutional Audit: Explicit Platform Commission Log (Attributed to Master Admin)
        String masterAdminId = userRepository.findByRole(com.LawEZY.user.enums.Role.MASTER_ADMIN).stream().findFirst().map(com.LawEZY.user.entity.User::getId).orElse("lawezy76");
        financialService.recordTransaction(masterAdminId, "Message Service Platform Fee (Ref: " + sessionId + ")", platformCut, "COMPLETED", "CREDIT");

        // 5. Inject Automated Extension Message
        ChatMessage extMsg = new ChatMessage();
        extMsg.setChatSessionId(sessionId);
        extMsg.setSenderId("SYSTEM");
        extMsg.setContent("⚡ Consultation window extended by " + requestedMinutes + " minutes. Happy chatting!");
        extMsg.setTimestamp(LocalDateTime.now());
        chatMessageRepository.save(extMsg);

        chatSessionRepository.save(session);
        log.info("[GOVERNANCE] Session {} extended by {} minutes. Fee: ₹{}. Expert: {}", sessionId, requestedMinutes, fee, prof.getId());
        
        // 6. Trigger Financial Notification
        try {
            notificationService.sendNotification(professionalId,
                "💰 Extension Credits",
                "Consultation extended by " + requestedMinutes + "m. ₹" + String.format("%.2f", earnings) + " credited.",
                "PAYMENT", "FINANCIAL", "/chat/" + sessionId);
        } catch (Exception e) {
            log.warn("[GOVERNANCE] Extension notification failed: {}", e.getMessage());
        }
    }

    @Override
    @NonNull
    public List<ChatSessionResponse> getUserSessions(@NonNull String userId) {
        try {
            Set<String> identities = getUniversalIdentities(userId);
            log.info("[INSTITUTIONAL SYNC] Fetching user sessions for identity set: {}", identities);
            
            List<ChatSession> sessions = chatSessionRepository.findByUserIdIn(new java.util.ArrayList<>(identities));
            Map<String, com.LawEZY.user.dto.ProfessionalProfileDTO> proCache = new HashMap<>();

            List<ChatSessionResponse> resList = sessions.stream()
                    .filter(java.util.Objects::nonNull)
                    .map(s -> mapToSessionResponse(s, false, proCache, null))
                    .filter(java.util.Objects::nonNull)
                    .collect(Collectors.toList());
            return resList != null ? resList : Collections.emptyList();
        } catch (Exception e) {
            log.error("[INSTITUTIONAL RESILIENCE] Failed to fetch user sessions: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    @Override
    @NonNull
    public List<ChatSessionResponse> getProfessionalSessions(@NonNull String professionalId) {
        try {
            Set<String> identities = getUniversalIdentities(professionalId);
            log.info("[INSTITUTIONAL SYNC] Fetching professional sessions for identity set: {}", identities);
            
            List<ChatSession> sessions = chatSessionRepository.findByProfessionalIdIn(new ArrayList<>(identities));
            Map<String, com.LawEZY.user.dto.UserResponse> userCache = new HashMap<>();

            List<ChatSessionResponse> resList = sessions.stream()
                    .filter(java.util.Objects::nonNull)
                    .map(s -> mapToSessionResponse(s, true, null, userCache))
                    .filter(java.util.Objects::nonNull)
                    .collect(Collectors.toList());
            return resList != null ? resList : Collections.emptyList();
        } catch (Exception e) {
            log.error("[INSTITUTIONAL RESILIENCE] Failed to fetch professional sessions: {}", e.getMessage());
            return Collections.emptyList();
        }
    }




    private ChatSessionResponse mapToSessionResponse(ChatSession session, boolean isProView, 
                                                     Map<String, com.LawEZY.user.dto.ProfessionalProfileDTO> proCache,
                                                     Map<String, com.LawEZY.user.dto.UserResponse> userCache) {
        ChatSessionResponse res = new ChatSessionResponse();
        res.setId(session.getId());
        res.setUserId(session.getUserId());
        res.setProfessionalId(session.getProfessionalId());
        res.setStatus(session.getStatus());
        res.setExpiryTime(session.getExpiryTime());
        res.setTrialEnded(session.getTrialEnded() != null ? session.getTrialEnded() : false);
        res.setTextChatFee(session.getTextChatFee());
        res.setChatDurationMinutes(session.getChatDurationMinutes());
        res.setCreatedAt(session.getCreatedAt());
        res.setLastUpdateAt(session.getLastUpdateAt());

        if (isProView) {
            // Expert View -> Get Client Name (Cached)
            try {
                if (session.getUserId() == null || session.getUserId().equals("null")) {
                    res.setOtherPartyName("Anonymous Client");
                } else {
                    com.LawEZY.user.dto.UserResponse client;
                    if (userCache != null && userCache.containsKey(session.getUserId())) {
                        client = userCache.get(session.getUserId());
                    } else {
                        client = userService.getUserById(session.getUserId());
                        if (userCache != null) userCache.put(session.getUserId(), client);
                    }
                    
                    String fName = client.getFirstName() != null ? client.getFirstName().trim() : "";
                    String lName = client.getLastName() != null ? client.getLastName().trim() : "";
                    String fullName = (fName + " " + lName).trim();
                    if (fullName.isEmpty()) fullName = "Institutional Client";
                    
                    res.setOtherPartyName(fullName);
                    res.setOtherPartyAvatar("https://ui-avatars.com/api/?name=" + fullName.charAt(0) + "&background=0D1B2A&color=E0C389&bold=true");
                    res.setIsOtherPartyEnabled(client.getEnabled());
                }
            } catch (Exception e) {
                res.setOtherPartyName("Institutional Client " + (session.getUserId() != null ? session.getUserId() : ""));
                res.setIsOtherPartyEnabled(true);
            }
        } else {
            // Client View -> Get Expert Name (Cached)
            try {
                com.LawEZY.user.dto.ProfessionalProfileDTO profDTO;
                String targetId = session.getProfessionalId();
                
                if (proCache != null && proCache.containsKey(targetId)) {
                    profDTO = proCache.get(targetId);
                } else {
                    profDTO = userService.getProfessionalById(targetId);
                    if (proCache != null) proCache.put(targetId, profDTO);
                }
                
                res.setOtherPartyName(profDTO.getName());
                
                String avatar = profDTO.getAvatar();
                if (avatar == null || avatar.trim().isEmpty() || avatar.equals("null")) {
                    String nameForAvatar = profDTO.getName() != null ? profDTO.getName() : "Expert";
                    avatar = "https://ui-avatars.com/api/?name=" + nameForAvatar.charAt(0) + "&background=0D1B2A&color=E0C389&bold=true";
                }
                res.setOtherPartyAvatar(avatar);
                
                // Fetch user to check enabled status
                userRepository.findById(targetId).ifPresent(u -> res.setIsOtherPartyEnabled(u.isEnabled()));
            } catch (Exception e) {
                log.error("[INSTITUTIONAL ERROR] Name resolution failed for Target: {}. Defaulting to Expert Counsel.", 
                           session.getProfessionalId());
                res.setOtherPartyName("Expert Counsel"); 
                res.setOtherPartyAvatar("https://ui-avatars.com/api/?name=Expert&background=0D1B2A&color=E0C389&bold=true");
                res.setIsOtherPartyEnabled(true);
            }
        }

        // Get Last Message
        chatMessageRepository.findTopByChatSessionIdOrderByTimestampDesc(session.getId()).ifPresent(m -> {
            res.setLastMessage(m.getContent());
            res.setLastMessageTime("Active");
        });

        // --- INSTITUTIONAL LIQUIDITY SYNC ---
        // DECOMMISSIONED: Token balance sync removed in favor of time-based service

        // Get Unread Count for the current viewer
        String currentViewerId = isProView ? session.getProfessionalId() : session.getUserId();
        long unread = chatMessageRepository.countByChatSessionIdAndReceiverIdAndIsReadFalse(session.getId(), currentViewerId);
        res.setUnreadCount((int) unread);
        
        res.setExpiryTime(session.getExpiryTime());
        res.setTrialEnded(session.getTrialEnded());
        
        // Finalize fee resolution using latest expert profile data
        if (isProView) {
            // In Pro view, we stick to session cached values or fetch if needed
            res.setTextChatFee(session.getTextChatFee());
            res.setChatDurationMinutes(session.getChatDurationMinutes());
        } else {
            // In Client view, we always try to get the LATEST fees from the expert
            try {
                com.LawEZY.user.dto.ProfessionalProfileDTO profDTO = userService.getProfessionalById(session.getProfessionalId());
                res.setTextChatFee(profDTO.getTextChatFee() != null ? profDTO.getTextChatFee() : session.getTextChatFee());
                res.setChatDurationMinutes(profDTO.getChatDurationMinutes() != null ? profDTO.getChatDurationMinutes() : session.getChatDurationMinutes());
            } catch (Exception e) {
                res.setTextChatFee(session.getTextChatFee());
                res.setChatDurationMinutes(session.getChatDurationMinutes());
            }
        }
        return res;
    }

    @NonNull
    private ChatMessageResponse mapToResponse(@NonNull ChatMessage msg, ChatStatus status) {
        ChatMessageResponse res = new ChatMessageResponse();
        res.setId(msg.getId());
        res.setChatSessionId(msg.getChatSessionId());
        res.setSenderId(msg.getSenderId());
        res.setReceiverId(msg.getReceiverId());
        res.setType(msg.getType());
        res.setContent(msg.getContent());
        res.setIsLocked(msg.getIsLocked());
        res.setAppointmentDate(msg.getAppointmentDate());
        res.setAppointmentTime(msg.getAppointmentTime());
        res.setAppointmentPrice(msg.getAppointmentPrice());
        res.setAppointmentStatus(msg.getAppointmentStatus());
        res.setTimestamp(msg.getTimestamp());
        res.setStatus(status);
        res.setIsRead(msg.getIsRead());
        return res;
    }

    @Override
    public void deleteSession(@NonNull String sessionId) {
        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        
        verifySessionAccess(session);
        log.warn("[INSTITUTIONAL AUDIT] Permanent session deletion requested: {}", sessionId);
        chatMessageRepository.deleteAllByChatSessionId(sessionId);
        chatSessionRepository.deleteById(sessionId);
        log.info("[INSTITUTIONAL AUDIT] Session {} and associated history successfully expunged.", sessionId);
    }


    @Override
    public void resolveSession(@NonNull String sessionId) {
        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        
        verifySessionAccess(session);
        log.info("[INSTITUTIONAL AUDIT] Institutional consultation resolution requested for: {}", sessionId);
        session.setStatus(ChatStatus.RESOLVED);
        
        chatSessionRepository.save(session);
        sendSessionSummary(session);
        log.info("[INSTITUTIONAL AUDIT] Session {} successfully marked as RESOLVED.", sessionId);
    }

    private void sendSessionSummary(ChatSession session) {
        try {
            User client = userRepository.findById(session.getUserId()).orElse(null);
            com.LawEZY.user.dto.ProfessionalProfileDTO prof = userService.getProfessionalById(session.getProfessionalId());
            
            if (client != null && prof != null) {
                Map<String, Object> model = new HashMap<>();
                model.put("greeting", "Hello " + client.getFirstName() + ", your consultation with " + prof.getName() + " has ended.");
                model.put("expertName", prof.getName());
                model.put("duration", (session.getChatDurationMinutes() != null ? session.getChatDurationMinutes() : 20) + " Minutes");
                model.put("fee", "₹" + String.format("%.0f", (session.getTextChatFee() != null ? session.getTextChatFee() : 100.0)));
                model.put("sessionId", session.getId());
                model.put("feedbackUrl", "https://lawezy.com/dashboard?session=" + session.getId());

                emailService.sendHtmlEmail(client.getEmail(), "LawEZY: Consultation Summary", "emails/session-summary", model);
            }
        } catch (Exception e) {
            log.warn("Failed to dispatch session summary email: {}", e.getMessage());
        }
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void markAsRead(@NonNull String sessionId) {
        String currentId = getCurrentAuthenticatedId();
        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        
        verifySessionAccess(session);

        // Fetch only unread messages where the current user is the recipient
        List<com.LawEZY.chat.model.ChatMessage> unread = chatMessageRepository.findByChatSessionIdAndReceiverIdAndIsReadFalse(sessionId, currentId);
        
        if (!unread.isEmpty()) {
            unread.forEach(msg -> msg.setIsRead(true));
            chatMessageRepository.saveAll(unread);
            log.info("[CHAT] Marked {} messages as read in session {} for user {}", unread.size(), sessionId, currentId);
        }
    }

    @Override
    public long getTotalUnreadCount(@NonNull String userId) {
        return chatMessageRepository.countByReceiverIdAndIsReadFalse(userId);
    }
}
