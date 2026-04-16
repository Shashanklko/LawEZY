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

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class ChatServiceImp implements ChatService {

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
    private com.LawEZY.user.repository.LawyerProfileRepository lawyerProfileRepository;

    @Autowired
    private com.LawEZY.user.service.UserService userService;

    private void verifySessionAccess(ChatSession session) {
        String currentId = getCurrentAuthenticatedId();
        Set<String> myIdentities = getUniversalIdentities(currentId);
        
        boolean isParticipant = myIdentities.contains(session.getUserId()) || 
                               myIdentities.contains(session.getProfessionalId()) ||
                               myIdentities.contains(session.getProUid());
                               
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
        log.info("[INSTITUTIONAL START] Initializing session. User: {} | Prof: {}", request.getUserId(), request.getProfessionalId());
        
        String resolvedUser = resolveInternalId(request.getUserId());
        String resolvedProf = resolveInternalId(request.getProfessionalId());

        if (resolvedUser == null || resolvedProf == null) {
            log.error("[INSTITUTIONAL ERROR] Handshake Failed. Identity resolution returned NULL. User: {} -> {} | Prof: {} -> {}", 
                      request.getUserId(), resolvedUser, request.getProfessionalId(), resolvedProf);
            throw new IllegalArgumentException("Could not resolve institutional identities. Handshake aborted.");
        }

        // --- DUPLICATE PREVENTION LOGIC ---
        // Check for existing active or awaiting reply sessions
        List<ChatSession> existingSessions = chatSessionRepository.findByUserIdAndProfessionalIdAndStatus(resolvedUser, resolvedProf, ChatStatus.ACTIVE);
        if (existingSessions.isEmpty()) {
            existingSessions = chatSessionRepository.findByUserIdAndProfessionalIdAndStatus(resolvedUser, resolvedProf, ChatStatus.AWAITING_REPLY);
        }
        if (existingSessions.isEmpty()) {
            existingSessions = chatSessionRepository.findByUserIdAndProUidAndStatus(resolvedUser, resolvedProf, ChatStatus.ACTIVE);
        }
        
        if (!existingSessions.isEmpty()) {
            ChatSession existing = existingSessions.get(0);
            log.info("[INSTITUTIONAL REUSE] Found existing active session {}. Returning for continuity.", existing.getId());
            return mapToSessionResponse(existing, false, null, null);
        }

        ChatSession session = new ChatSession();
        session.setUserId(resolvedUser);
        session.setProfessionalId(resolvedProf);
        
        // Capture UID for ledger consistency
        if (resolvedProf != null) {
            professionalProfileRepository.findById(resolvedProf).ifPresent(p -> session.setProUid(p.getUid()));
            if (session.getProUid() == null) {
                // Fallback: try finding by UID if resolvedProf was already a UID
                professionalProfileRepository.findByUidIgnoreCase(resolvedProf).ifPresent(p -> {
                    session.setProfessionalId(p.getId());
                    session.setProUid(p.getUid());
                });
            }
        }
        
        session.setStatus(ChatStatus.AWAITING_REPLY);
        session.setTokensGranted(0);
        session.setTokensConsumed(0);
        session.setCreatedAt(LocalDateTime.now());
        session.setLastUpdateAt(LocalDateTime.now());

        ChatSession savedSession = chatSessionRepository.save(session);
        log.info("[INSTITUTIONAL SYNC] Secure Channel Established. Session ID: {} | User: {} | Prof: {} | Public UID: {}", 
                 savedSession.getId(), savedSession.getUserId(), savedSession.getProfessionalId(), savedSession.getProUid());
        
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

        // WAVE 2: Profile-Based Resolution (If identifier is a UID or Phone)
        if (user == null) {
            professionalProfileRepository.findByUidIgnoreCase(identifier).ifPresent(p -> identities.add(p.getId()));
            professionalProfileRepository.findByPhoneNumber(identifier).ifPresent(p -> identities.add(p.getId()));
            clientProfileRepository.findByUidIgnoreCase(identifier).ifPresent(p -> identities.add(p.getId()));
            clientProfileRepository.findByPhoneNumber(identifier).ifPresent(p -> identities.add(p.getId()));
            
            // Re-attempt User resolution if ID was found in profiles
            for (String id : new ArrayList<>(identities)) {
                if (user == null && id != null) user = userRepository.findById(id).orElse(null);
            }
        }

        // WAVE 3: Identity Aggregation
        if (user != null) {
            String uid = user.getId();
            identities.add(uid);
            if (user.getEmail() != null) identities.add(user.getEmail());
            
            // 🛡️ INSTITUTIONAL FIX: Always use findByUserId to bridge User -> Profile
            professionalProfileRepository.findByUserId(uid).ifPresent(p -> {
                if (p.getUid() != null) {
                    identities.add(p.getUid());
                    identities.add(p.getUid().toUpperCase());
                    identities.add(p.getUid().toLowerCase());
                }
                if (p.getPhoneNumber() != null) identities.add(p.getPhoneNumber());
            });
            clientProfileRepository.findByUserId(uid).ifPresent(p -> {
                if (p.getUid() != null) {
                    identities.add(p.getUid());
                    identities.add(p.getUid().toUpperCase());
                    identities.add(p.getUid().toLowerCase());
                }
                if (p.getPhoneNumber() != null) identities.add(p.getPhoneNumber());
            });
            if (uid != null) {
                lawyerProfileRepository.findById(uid).ifPresent(p -> {
                    // LawyerProfile usually uses UserID as ID, but we check UID specifically
                    if (p.getUid() != null) {
                        identities.add(p.getUid());
                        identities.add(p.getUid().toUpperCase());
                        identities.add(p.getUid().toLowerCase());
                    }
                    if (p.getPhoneNumber() != null) identities.add(p.getPhoneNumber());
                });
            }
        }

        log.info("[INSTITUTIONAL SYNC] Final Resolved Identities for {}: {}", identifier, identities);
        return identities;
    }



    private String resolveInternalId(String identifier) {
        if (identifier == null || identifier.trim().isEmpty() || identifier.equalsIgnoreCase("null")) return null;
        
        // 🚀 Aggressive Resolution
        // 1. Check ID directly
        if (userRepository.existsById(identifier)) return identifier;

        // 2. Check Email
        Optional<User> byEmail = userRepository.findByEmail(identifier);
        if (byEmail.isPresent()) return byEmail.get().getId();

        // 3. Check Phone (Professionals)
        Optional<ProfessionalProfile> byPhonePro = professionalProfileRepository.findByPhoneNumber(identifier);
        if (byPhonePro.isPresent()) return byPhonePro.get().getId();

        // 4. Check Phone (Clients)
        Optional<com.LawEZY.user.entity.ClientProfile> byPhoneCli = clientProfileRepository.findByPhoneNumber(identifier);
        if (byPhoneCli.isPresent()) return byPhoneCli.get().getId();

        // 5. Check UID
        Optional<ProfessionalProfile> byUidPro = professionalProfileRepository.findByUidIgnoreCase(identifier);
        if (byUidPro.isPresent()) return byUidPro.get().getId();
        
        Optional<com.LawEZY.user.entity.ClientProfile> byUidCli = clientProfileRepository.findByUidIgnoreCase(identifier);
        if (byUidCli.isPresent()) return byUidCli.get().getId();

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
        // Blocking is BYPASSED if an official appointment has been scheduled and paid.
        boolean isPaid = session.getIsAppointmentPaid() != null && session.getIsAppointmentPaid();
        if (!isPaid && content != null && !content.trim().isEmpty()) {
            String aiSafetyResult = aiService.checkSafety(content);

            if (aiSafetyResult != null && aiSafetyResult.contains("BLOCKED")) {
                auditLogService.logAiBlock(
                    "Contact details blocked",
                    "Content: " + content,
                    senderId,
                    "USER" // Fallback role
                );
                log.warn("AI Blocked a message containing contact details: {}", content);
                throw new RuntimeException("Sharing contact details is strictly blocked. Please schedule an appointment to exchange verified contact info.");
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

        // Token logic for User messages (Now using Industrial Wallet)
        if (senderId != null && senderId.equals(session.getUserId())) {
            Wallet wallet = walletRepository.findById(senderId)
                    .orElseThrow(() -> new ResourceNotFoundException("Wallet not found for user: " + senderId));
            
            Integer balance = wallet.getTokenBalance();
            if (balance == null || balance <= 0) {
                throw new RuntimeException("Insufficient tokens. Please unlock this reply to continue.");
            }
            
            wallet.setTokenBalance(balance - 1);
            Integer consumedCount = session.getTokensConsumed();
            session.setTokensConsumed(consumedCount != null ? consumedCount + 1 : 1);
            walletRepository.save(wallet);
            
            // 📊 Record Real Transaction
            financialService.recordTransaction(senderId, "AI Credit Consumption: Msg Session " + session.getId().substring(0, 4), -1.0, "COMPLETED", "DEBIT");
            
            log.info("[TOKENS] Deducted 1 token from Wallet of User {}. New Balance: {}", senderId, wallet.getTokenBalance());
        }

        // Locked reply logic for Lawyer's initial response
        if (senderId != null && senderId.equals(session.getProfessionalId()) && session.getStatus() == ChatStatus.AWAITING_REPLY) {
            message.setIsLocked(true);
            session.setStatus(ChatStatus.LOCKED_REPLY);
        }

        session.setLastUpdateAt(LocalDateTime.now());
        chatSessionRepository.save(session);
        log.info("[CHAT] MESSAGE SENT in Session: {} | Sender: {} | Type: {}", sId, senderId, request.getType());
        
        ChatMessage savedMessage = chatMessageRepository.save(message);
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

        
        // ROLLOVER LOGIC
        Integer granted = session.getTokensGranted();
        Integer consumed = session.getTokensConsumed();
        int leftover = (granted != null ? granted : 0) - (consumed != null ? consumed : 0);
        
        if (leftover > 0) {
            String userId = session.getUserId();
            if (userId != null) {
                walletRepository.findById(userId).ifPresent(wallet -> {
                    Integer balance = wallet.getTokenBalance();
                    wallet.setTokenBalance(balance != null ? balance + leftover : leftover);
                    walletRepository.save(wallet);
                });
            }
        }
        
        chatSessionRepository.save(session);
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
    public void unlockReply(@NonNull String sessionId) {
        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        verifySessionAccess(session);
        if (session.getStatus() == ChatStatus.LOCKED_REPLY) {

            session.setStatus(ChatStatus.ACTIVE);
            Integer grantedCount = session.getTokensGranted();
            session.setTokensGranted(grantedCount != null ? grantedCount + 10 : 10);
            
            String professionalId = session.getProfessionalId();
            if (professionalId != null) {
                // Resolve Internal ID from UID if needed
                ProfessionalProfile prof = professionalProfileRepository.findById(professionalId)
                        .orElseGet(() -> professionalProfileRepository.findByUidIgnoreCase(professionalId).orElse(null));
                
                if (prof != null && prof.getId() != null) {
                    String internalId = prof.getId();
                    Wallet wallet = walletRepository.findById(internalId).orElse(null);
                    
                    if (wallet != null) {
                        Double fee = prof.getChatUnlockFee();
                        double earnings = (fee != null ? fee : 99.0) * 0.8;
                        Double currentBalance = wallet.getEarnedBalance();
                        wallet.setEarnedBalance(currentBalance != null ? currentBalance + earnings : earnings);
                        walletRepository.save(wallet);
    
                        // 📊 Record Real Transaction for Expert
                        String userId = session.getUserId();
                        String clientUid = "UNKNOWN-CLIENT";
                        if (userId != null) {
                            clientUid = clientProfileRepository.findById(userId)
                                    .map(p -> p.getUid()).orElse("UNKNOWN-CLIENT");
                        }
                        financialService.recordTransaction(internalId, "Expert Consultation - Client: " + clientUid, earnings, "COMPLETED", "CREDIT");
                        
                        log.info("Professional ID: {} credited with earnings: {} for Session ID: {}", internalId, earnings, sessionId);
                    }
                }
            }

            chatSessionRepository.save(session);
            log.info("[CHAT] Session ID: {} UNLOCKED and set to ACTIVE.", sessionId);
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
        res.setCreatedAt(session.getCreatedAt());
        res.setLastUpdateAt(session.getLastUpdateAt());
        res.setProUid(session.getProUid());

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
                    
                    String name = (client.getFirstName() != null ? client.getFirstName() : "Client") + 
                                  (client.getLastName() != null ? " " + client.getLastName() : "");
                    res.setOtherPartyName(name);
                    res.setOtherPartyAvatar("https://ui-avatars.com/api/?name=" + name.charAt(0) + "&background=0D1B2A&color=E0C389&bold=true");
                }
            } catch (Exception e) {
                res.setOtherPartyName("Institutional Client " + (session.getUserId() != null ? session.getUserId() : ""));
            }
        } else {
            // Client View -> Get Expert Name (Cached)
            try {
                com.LawEZY.user.dto.ProfessionalProfileDTO profDTO;
                String targetUid = session.getProUid() != null ? session.getProUid() : session.getProfessionalId();
                
                if (proCache != null && proCache.containsKey(targetUid)) {
                    profDTO = proCache.get(targetUid);
                } else {
                    try {
                        // Priority 1: Direct Internal ID Lookup
                        profDTO = userService.getProfessionalById(targetUid);
                    } catch (Exception e1) {
                        try {
                            // Priority 2: Public UID Lookup
                            profDTO = userService.getProfessionalByUid(targetUid);
                        } catch (Exception e2) {
                            // Priority 3: Internal ID via resolveInternalId
                            String proId = resolveInternalId(targetUid);
                            profDTO = userService.getProfessionalById(proId);
                        }
                    }
                    if (proCache != null) proCache.put(targetUid, profDTO);
                }
                
                res.setOtherPartyName(profDTO.getName());
                res.setOtherPartyAvatar(profDTO.getAvatar());
                res.setProUid(profDTO.getUid());
            } catch (Exception e) {
                log.error("[INSTITUTIONAL ERROR] Name resolution failed for Target: {}. Defaulting to Expert Counsel.", 
                           session.getProUid() != null ? session.getProUid() : session.getProfessionalId());
                res.setOtherPartyName("Expert Counsel"); 
                res.setOtherPartyAvatar("https://ui-avatars.com/api/?name=Expert&background=0D1B2A&color=E0C389&bold=true");
            }
        }

        // Get Last Message
        chatMessageRepository.findTopByChatSessionIdOrderByTimestampDesc(session.getId()).ifPresent(m -> {
            res.setLastMessage(m.getContent());
            res.setLastMessageTime("Active");
        });

        // --- INSTITUTIONAL LIQUIDITY SYNC ---
        // Fetch peer's token balance for transparency
        try {
            String peerId = isProView ? session.getUserId() : session.getProfessionalId();
            if (peerId != null && !peerId.equals("null")) {
                walletRepository.findById(peerId).ifPresent(w -> res.setPeerTokenBalance(w.getTokenBalance()));
            }
        } catch (Exception e) {
            log.warn("[INSTITUTIONAL SYNC] Could not resolve peer liquidity for session {}", session.getId());
        }

        res.setUnreadCount(0);
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
        log.info("[INSTITUTIONAL AUDIT] Session {} successfully marked as RESOLVED.", sessionId);
    }

}
