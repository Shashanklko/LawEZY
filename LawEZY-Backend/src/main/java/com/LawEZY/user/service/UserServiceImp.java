package com.LawEZY.user.service;

import com.LawEZY.user.dto.UserRequest;
import com.LawEZY.user.dto.UserResponse;
import com.LawEZY.user.dto.ProfessionalProfileDTO;
import com.LawEZY.user.entity.User;
import com.LawEZY.common.exception.ResourceNotFoundException;
import com.LawEZY.user.repository.UserRepository;
import com.LawEZY.user.enums.Role;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.LawEZY.user.repository.ProfessionalProfileRepository;
import com.LawEZY.user.repository.ClientProfileRepository;
import com.LawEZY.user.repository.WalletRepository;
import com.LawEZY.user.entity.ProfessionalProfile;
import com.LawEZY.user.entity.ClientProfile;
import com.LawEZY.user.entity.Wallet;
import com.LawEZY.user.entity.LawyerProfile;
import com.LawEZY.user.entity.CAProfile;
import com.LawEZY.user.entity.CFAProfile;
import com.LawEZY.user.entity.BaseProfile;
import com.LawEZY.user.repository.LawyerProfileRepository;
import com.LawEZY.user.repository.CAProfileRepository;
import com.LawEZY.user.repository.CFAProfileRepository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Map;
import java.util.Arrays;
import java.util.stream.Collectors;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageImpl;


// @Service tells Spring: "This is a special class that holds business logic." 
// Spring will automatically create an object of this class when the app starts.
@Service
public class UserServiceImp implements UserService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(UserServiceImp.class);

    // @Autowired tells Spring: "Look for a UserRepository bean and plug it in here automatically."
    // This connects our Service layer to the Database layer without needing 'new UserRepository()'.
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private ProfessionalProfileRepository professionalProfileRepository;
    @Autowired
    private ClientProfileRepository clientProfileRepository;
    @Autowired
    private WalletRepository walletRepository;
    @Autowired
    private LawyerProfileRepository lawyerProfileRepository;
    @Autowired
    private CAProfileRepository caProfileRepository;
    @Autowired
    private CFAProfileRepository cfaProfileRepository;
    @Autowired
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    @Autowired 
    private com.LawEZY.user.repository.ReviewRepository reviewRepository;
    @Autowired
    private AdminBroadcastService adminBroadcastService;

    
    @jakarta.annotation.PostConstruct
    public void init() {
        log.info("[IDENTITY-BRIDGE] Institutional Backend Ready. UID Identity Engine Active.");
    }

    // --- CREATE A NEW USER (Multi-Table Industrial Save) ---
    @Override
    @Transactional
    public UserResponse createUser(UserRequest userRequest) {
        
        // 1. Uniqueness check
        if (userRepository.existsByEmail(userRequest.getEmail())) {
            throw new RuntimeException("Email already in use: " + userRequest.getEmail());
        }

        // 2. Map to Auth Root (User)
        User authUser = new User();
        String normalizedEmail = userRequest.getEmail().toLowerCase().trim();
        String normalizedFN = userRequest.getFirstName().toUpperCase().trim();
        String normalizedLN = userRequest.getLastName().toUpperCase().trim();
        
        authUser.setEmail(normalizedEmail);
        authUser.setFirstName(normalizedFN);
        authUser.setLastName(normalizedLN);
        authUser.setPassword(passwordEncoder.encode(userRequest.getPassword()));
        authUser.setRole(userRequest.getRole());
        
        // 3. GENERATE INSTITUTIONAL ID
        String institutionalId;
        if (normalizedEmail.equals("shekhar@test.com")) {
            institutionalId = "11SS01CL";
            log.warn("[INSTITUTIONAL OVERRIDE] Reserved testing identity detected for {}. Mapping to 11SS01CL.", normalizedEmail);
        } else if (normalizedEmail.equals("lawezy2025@gmail.com")) {
            institutionalId = "lawezy76";
            log.warn("[INSTITUTIONAL OVERRIDE] Master Identity detected for {}. Mapping to lawezy76.", normalizedEmail);
        } else {
            institutionalId = generateInstitutionalId(userRequest.getFirstName(), userRequest.getLastName(), userRequest.getRole());
        }
        authUser.setId(institutionalId);
        
        // 4. Save Auth Root
        User savedAuth = userRepository.save(authUser);

        // 5. Create Universal Wallet
        Wallet wallet = new Wallet();
        wallet.setId(institutionalId);
        wallet.setUser(savedAuth);
        wallet.setFreeAiTokens(5); // Tiered Free AI Quota
        wallet.setFreeChatTokens(5); // Tiered Free Chat Quota
        wallet.setFreeDocTokens(5); // 5 Free Institutional Document Analysis Units
        wallet.setAiTokenLimit(5);
        wallet.setDocTokenLimit(5);
        
        // Institutional Unlimited Flag for Testing Accounts
        if (institutionalId.equals("11SS01CL")) {
            wallet.setIsUnlimited(true);
            log.warn("[INSTITUTIONAL OVERRIDE] Account {} ({}) granted UNLIMITED institutional credit.", institutionalId, normalizedEmail);
        }

        
        walletRepository.save(wallet);

        // 6. Create Profile Profile
        if (savedAuth.getRole() == Role.LAWYER || savedAuth.getRole() == Role.CA || savedAuth.getRole() == Role.CFA) {
            createProfessionalProfile(savedAuth, userRequest);
        } else {
            createClientProfile(savedAuth, userRequest);
        }
        
        log.info("Industrial Registration SUCCESS: {} (ID: {})", savedAuth.getEmail(), savedAuth.getId());
        
        // 🚀 REAL-TIME BROADCAST: Update Admin Portal
        try {
            adminBroadcastService.broadcastAdminEvent("NEW_USER", Map.of(
                "userId", savedAuth.getId(),
                "email", savedAuth.getEmail(),
                "role", savedAuth.getRole().name(),
                "name", savedAuth.getFirstName() + " " + savedAuth.getLastName()
            ));
        } catch (Exception e) {
            log.warn("Institutional Broadcast failed for new user: {}", e.getMessage());
        }

        return mapToResponse(savedAuth, userRequest.getFirstName(), userRequest.getLastName()); 
    }

    private String generateInstitutionalId(String first, String last, Role role) {
        String day = String.format("%02d", java.time.LocalDate.now().getDayOfMonth());
        char fInit = (first != null && !first.isEmpty()) ? first.toUpperCase().charAt(0) : 'X';
        char lInit = (last != null && !last.isEmpty()) ? last.toUpperCase().charAt(0) : 'X';
        String prefix = day + fInit + lInit;
        
        // Find the highest Serial Number already existing for this prefix
        String lastId = userRepository.findMaxIdByPrefix(prefix + "%");
        int nextSerial = 1;
        
        if (lastId != null && lastId.length() >= 7) {
            try {
                // Institutional ID Pattern: [DD][FI][LI][SS][RC]
                // Serial starts at index 5 and is 2 digits long
                String lastSerialStr = lastId.substring(5, 7);
                nextSerial = Integer.parseInt(lastSerialStr) + 1;
            } catch (Exception e) {
                log.warn("Failed to parse serial from lastId: {}, starting at 01", lastId);
            }
        }
        
        String serial = String.format("%02d", nextSerial);
        
        String roleCode = "CL";
        if (role == Role.LAWYER) roleCode = "LA";
        else if (role == Role.CA) roleCode = "CA";
        else if (role == Role.CFA) roleCode = "CF";
        else if (role == Role.ADMIN) roleCode = "AD";
        else if (role == Role.MASTER_ADMIN) roleCode = "MA";
        
        return prefix + serial + roleCode;
    }

    private void createClientProfile(User user, UserRequest request) {
        ClientProfile profile = new ClientProfile();
        profile.setId(user.getId());
        profile.setUser(user);
        profile.setFirstName(request.getFirstName());
        profile.setLastName(request.getLastName());
        clientProfileRepository.save(profile);
    }

    private void createProfessionalProfile(User user, UserRequest request) {
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(user.getId()); 
        profile.setUser(user);
        profile.setFirstName(request.getFirstName());
        profile.setLastName(request.getLastName());
        profile.setCategory(user.getRole());
        
        // Provide defaults for active UI stability
        profile.setTitle(user.getRole() == Role.LAWYER ? "Legal Consultant" : "Financial Advisor");
        profile.setExperience("0-1 Years");
        profile.setLocation("India");
        profile.setBioSmall("Newly joined elite professional at LawEZY.");
        profile.setDomains(user.getRole() == Role.LAWYER ? "Legal Advice" : "Financial Planning");
        
        // Generate and Persist the public Institutional UID
        profile.setSlug(generateSlug(request.getFirstName(), request.getLastName(), user.getRole()));
        
        professionalProfileRepository.save(profile);
    }

    // --- GET ONE USER BY ID ---
    @Override
    public UserResponse getUserById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return mapToResponse(user);
    }

    // --- GET ALL USERS ---
    @Override
    public List<UserResponse> getAllUsers() {
        // 1. Get a list of ALL User entities directly from the database table.
        List<User> users = userRepository.findAll();
        
        // 2. We have a List of Entities, but we need to return a List of DTOs.
        // .stream() opens the list so we can loop through it.
        // .map(this::mapToResponse) translates EVERY single Entity in the list into a DTO.
        // .collect(Collectors.toList()) packs them all back up into a brand new List.
        return users.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public UserResponse getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
        return mapToResponse(user);
    }

    // --- UPDATE AN EXISTING USER (Atomic Industrial Update) ---
    @Override
    @Transactional
    public UserResponse updateUser(String id, UserRequest userRequest) {
        
        User existingUser = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // 1. Update Profile based on Role
        if (existingUser.getRole() == Role.CLIENT) {
            ClientProfile cp = clientProfileRepository.findById(id).orElse(new ClientProfile());
            cp.setId(id);
            cp.setUser(existingUser);
            cp.setFirstName(userRequest.getFirstName());
            cp.setLastName(userRequest.getLastName());
            clientProfileRepository.save(cp);
        } else {
            ProfessionalProfile pp = professionalProfileRepository.findById(id).orElse(new ProfessionalProfile());
            pp.setId(id);
            pp.setUser(existingUser);
            pp.setFirstName(userRequest.getFirstName());
            pp.setLastName(userRequest.getLastName());
            pp.setCategory(existingUser.getRole());
            if (pp.getSlug() == null) pp.setSlug(generateSlug(userRequest.getFirstName(), userRequest.getLastName(), existingUser.getRole()));
            professionalProfileRepository.save(pp);
        }

        // 2. Update Auth Info
        if (!existingUser.getEmail().equalsIgnoreCase(userRequest.getEmail())) {
            if (userRepository.existsByEmail(userRequest.getEmail())) {
                throw new RuntimeException("Email already in use");
            }
            existingUser.setEmail(userRequest.getEmail());
        }
        existingUser.setFirstName(userRequest.getFirstName());
        existingUser.setLastName(userRequest.getLastName());
        existingUser.setPassword(passwordEncoder.encode(userRequest.getPassword()));
        existingUser.setRole(userRequest.getRole());

        userRepository.save(existingUser);
        log.info("Industrial Update SUCCESS for ID: {}", id);
        
        return mapToResponse(existingUser, userRequest.getFirstName(), userRequest.getLastName());
    }

    @Override
    public void deleteUser(String id) {
        userRepository.deleteById(id);
        log.info("USER deleted successfully: ID {}", id);
    }

    @Override
    @Transactional
    public void changePassword(String userId, String currentPassword, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new RuntimeException("Current credentials do not match our institutional records.");
        }
        
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        log.info("AUTHENTICATION SYNC: Password updated for user {}", userId);
    }

    @Override
    @Transactional
    public void disableUser(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setEnabled(false);
        userRepository.save(user);
        log.warn("GOVERNANCE ACTION: Account disabled for ID {}", userId);
    }

    @Override
    @Transactional
    public List<ProfessionalProfileDTO> getAllProfessionals() {
        List<User> proUsers = userRepository.findByRoleIn(Arrays.asList(Role.LAWYER, Role.CA, Role.CFA));
        
        return proUsers.stream().map(this::mapUserToProfessionalDTO)
        .filter(java.util.Objects::nonNull)
        .collect(Collectors.toList());
    }

    @Override
    public Page<ProfessionalProfileDTO> getAllProfessionalsPaginated(Pageable pageable) {
        Page<User> proUsers = userRepository.findByRoleIn(Arrays.asList(Role.LAWYER, Role.CA, Role.CFA), pageable);
        
        List<ProfessionalProfileDTO> dtos = proUsers.getContent().stream().map(this::mapUserToProfessionalDTO)
        .filter(java.util.Objects::nonNull)
        .collect(Collectors.toList());

        return new PageImpl<>(dtos, pageable, proUsers.getTotalElements());
    }

    private ProfessionalProfileDTO mapUserToProfessionalDTO(User user) {
        Object profile = null;
        if (user.getRole() == Role.LAWYER) profile = lawyerProfileRepository.findById(user.getId()).orElse(null);
        else if (user.getRole() == Role.CA) profile = caProfileRepository.findById(user.getId()).orElse(null);
        else if (user.getRole() == Role.CFA) profile = cfaProfileRepository.findById(user.getId()).orElse(null);
        
        if (profile == null) {
            profile = professionalProfileRepository.findById(user.getId()).orElse(null);
        }

        if (profile == null) return null;
        BaseProfile bp = (BaseProfile) profile;

        if (bp.getSlug() == null || bp.getSlug().isEmpty()) {
            String newSlug = generateSlug(user.getFirstName(), user.getLastName(), user.getRole());
            bp.setSlug(newSlug);
            if (bp instanceof LawyerProfile) lawyerProfileRepository.save((LawyerProfile) bp);
            else if (bp instanceof CAProfile) caProfileRepository.save((CAProfile) bp);
            else if (bp instanceof CFAProfile) cfaProfileRepository.save((CFAProfile) bp);
            else if (bp instanceof ProfessionalProfile) professionalProfileRepository.save((ProfessionalProfile) bp);
        }

        return mapAnyProfileToProfessionalDTO(user, bp, false);
    }

    private ProfessionalProfileDTO mapAnyProfileToProfessionalDTO(User user, BaseProfile p, boolean fullEnrichment) {
        ProfessionalProfileDTO dto = new ProfessionalProfileDTO();
        dto.setId(user.getId());
        dto.setEmail(user.getEmail());
        dto.setCategory(user.getRole() != null ? user.getRole().name() : "OTHER");
        dto.setOnline(p.getOnline() != null ? p.getOnline() : true);
        
        // 🛡️ GOVERNANCE STATUS CALCULATION
        if (!user.isEnabled()) {
            dto.setStatus("BLOCKED");
        } else if (p.getOnline() != null && !p.getOnline()) {
            dto.setStatus("INACTIVE"); // Temporary Unavailable
        } else {
            dto.setStatus("ACTIVE");
        }
        
        if (p instanceof com.LawEZY.user.entity.BaseProfile) {
            com.LawEZY.user.entity.BaseProfile bp = (com.LawEZY.user.entity.BaseProfile) p;
            
            // Robust Name Hydration
            String fName = bp.getFirstName() != null ? bp.getFirstName().trim() : "";
            String lName = bp.getLastName() != null ? bp.getLastName().trim() : "";
            String fullName = (fName + " " + lName).trim();
            dto.setName(fullName.isEmpty() ? "Expert Counsel" : fullName);
            
            dto.setTitle(bp.getTitle());
            dto.setLocation(bp.getLocation());
            dto.setBio(bp.getBio());
            dto.setPhoneNumber(bp.getPhoneNumber());
            dto.setAvatar(bp.getAvatar());
            
            String bio = bp.getBio();
            dto.setBioSmall(bio != null && bio.length() > 100 ? bio.substring(0, 97) + "..." : bio);
            // UID is now deprecated in favor of primary ID
            dto.setSlug(bp.getSlug());
            dto.setTextChatFee(bp.getTextChatFee());
            dto.setChatDurationMinutes(bp.getChatDurationMinutes());
            dto.setCustomGreeting(bp.getCustomGreeting());
            dto.setBankName(bp.getBankName());
            dto.setAccountNumber(bp.getAccountNumber());
            dto.setIfscCode(bp.getIfscCode());
            dto.setAccountHolderName(bp.getAccountHolderName());
            dto.setUpiId(bp.getUpiId());
        }

        if (p instanceof com.LawEZY.user.entity.LawyerProfile) {
            com.LawEZY.user.entity.LawyerProfile lp = (com.LawEZY.user.entity.LawyerProfile) p;
            dto.setPrice(lp.getConsultationFee());
            dto.setRating(lp.getRating());
            dto.setReviewsCount(lp.getReviewCount());
            dto.setDomains(parseJsonList(lp.getDomains()));
            dto.setEducationList(parseJsonAnyList(lp.getEducationHistory()));
            dto.setExperienceList(parseJsonAnyList(lp.getExperienceHistory()));
            dto.setSnapshots(parseJsonAnyList(lp.getExperienceSnapshots()));
            dto.setLicenseNo(lp.getBarLicenseNumber());
            dto.setLicenseDriveLink(lp.getLicenseDriveLink());
            dto.setIsVerified(lp.isVerified());
        } else if (p instanceof com.LawEZY.user.entity.CAProfile) {
            com.LawEZY.user.entity.CAProfile cp = (com.LawEZY.user.entity.CAProfile) p;
            dto.setPrice(cp.getConsultationFee());
            dto.setRating(cp.getRating());
            dto.setReviewsCount(cp.getReviewCount());
            dto.setDomains(parseJsonList(cp.getDomains()));
            dto.setEducationList(parseJsonAnyList(cp.getEducationHistory()));
            dto.setExperienceList(parseJsonAnyList(cp.getExperienceHistory()));
            dto.setSnapshots(parseJsonAnyList(cp.getExperienceSnapshots()));
            dto.setLicenseNo(cp.getMembershipNumber());
            dto.setLicenseDriveLink(cp.getLicenseDriveLink());
            dto.setIsVerified(cp.isVerified());
        } else if (p instanceof com.LawEZY.user.entity.CFAProfile) {
            com.LawEZY.user.entity.CFAProfile cp = (com.LawEZY.user.entity.CFAProfile) p;
            dto.setPrice(cp.getConsultationFee());
            dto.setRating(cp.getRating());
            dto.setReviewsCount(cp.getReviewCount());
            dto.setDomains(parseJsonList(cp.getDomains()));
            dto.setEducationList(parseJsonAnyList(cp.getEducationHistory()));
            dto.setExperienceList(parseJsonAnyList(cp.getExperienceHistory()));
            dto.setSnapshots(parseJsonAnyList(cp.getExperienceSnapshots()));
            dto.setLicenseNo(cp.getCharterNumber());
            dto.setLicenseDriveLink(cp.getLicenseDriveLink());
            dto.setIsVerified(cp.isVerified());
        } else if (p instanceof com.LawEZY.user.entity.ProfessionalProfile) {
            com.LawEZY.user.entity.ProfessionalProfile pp = (com.LawEZY.user.entity.ProfessionalProfile) p;
            dto.setPrice(pp.getConsultationFee());
            dto.setRating(pp.getRating());
            dto.setReviewsCount(pp.getReviewsCount());
            dto.setBioSmall(pp.getBioSmall());
            if (pp.getDomains() != null) dto.setDomains(Arrays.asList(pp.getDomains().split(",")));
        }

        // --- INSTITUTIONAL ENRICHMENT (Only for detailed views) ---
        if (fullEnrichment) {
            // Wallet enrichment
            walletRepository.findById(user.getId()).ifPresent(w -> {
                dto.setCashBalance(w.getCashBalance());
                dto.setEarnedBalance(w.getEarnedBalance());
            });

            // Review enrichment
            if (user.getId() != null) {
                dto.setTestimonials(fetchSanitizedReviews(user.getId()));
            }
        }

        // Final refinement: Bulletproof Identity Resolution
        String derivedName = dto.getName();
        if (derivedName == null || derivedName.trim().isEmpty() || derivedName.contains("null")) {
            derivedName = user.getFirstName() + " " + user.getLastName();
        }
        
        String cleanName = (derivedName != null && !derivedName.trim().isEmpty() && !derivedName.contains("null")) 
                           ? derivedName.trim() 
                           : "LawEZY Expert";
                           
        dto.setName(cleanName);
        
        // Safety-First Initials Generation
        String firstChar = "X";
        String lastChar = "Y";
        
        String[] nameParts = cleanName.split("\\s+");
        if (nameParts.length > 0 && !nameParts[0].isEmpty()) {
            firstChar = nameParts[0].substring(0, 1).toUpperCase();
            if (nameParts.length > 1 && !nameParts[1].isEmpty()) {
                lastChar = nameParts[1].substring(0, 1).toUpperCase();
            } else if (nameParts[0].length() > 1) {
                lastChar = nameParts[0].substring(1, 2).toUpperCase();
            }
        }
        
        String avatarInitials = firstChar + lastChar;
        dto.setAvatar("https://ui-avatars.com/api/?name=" + avatarInitials + "&background=0D1B2A&color=E0C389&bold=true&length=2");

        return dto;
    }

    private List<com.LawEZY.user.dto.ReviewDTO> fetchSanitizedReviews(String expertId) {
        return reviewRepository.findByExpert_IdOrderByCreatedAtDesc(expertId).stream()
            .map(r -> {
                com.LawEZY.user.dto.ReviewDTO rdto = new com.LawEZY.user.dto.ReviewDTO();
                rdto.setAppointmentId(r.getAppointmentId());
                rdto.setRating(r.getRating());
                rdto.setComment(r.getComment());
                rdto.setIsAnonymous(r.getIsAnonymous() != null ? r.getIsAnonymous() : false);
                rdto.setCreatedAt(r.getCreatedAt() != null ? r.getCreatedAt().toString() : java.time.LocalDateTime.now().toString());
                
                if (Boolean.TRUE.equals(rdto.getIsAnonymous())) {

                    rdto.setClientName("Anonymous Professional Client");
                } else {
                    // Try to fetch real name from Client Profile
                    clientProfileRepository.findById(r.getClient().getId()).ifPresent(p -> {
                        rdto.setClientName(p.getFirstName() + " " + p.getLastName());
                    });
                    if (rdto.getClientName() == null) rdto.setClientName("Verified LawEZY Client");
                }
                return rdto;
            })
            .collect(Collectors.toList());
    }

    private List<String> parseJsonList(String json) {
        try {
            if (json == null || json.isEmpty()) return Arrays.asList("General Practice");
            return objectMapper.readValue(json, new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
        } catch (Exception e) {
            return Arrays.asList("General Practice");
        }
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public ProfessionalProfileDTO getProfessionalById(String id) {
        User user = userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Expert not found"));
        BaseProfile profile = null;
        
        if (user.getRole() == Role.LAWYER) profile = lawyerProfileRepository.findById(id).orElse(null);
        else if (user.getRole() == Role.CA) profile = caProfileRepository.findById(id).orElse(null);
        else if (user.getRole() == Role.CFA) profile = cfaProfileRepository.findById(id).orElse(null);
        
        if (profile == null) {
            profile = professionalProfileRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Profile not found for ID: " + id));
        }

        // JIT Slug Generation: Ensure Name-URLs work for existing experts
        if (profile.getSlug() == null || profile.getSlug().isEmpty()) {
            String newSlug = generateSlug(user.getFirstName(), user.getLastName(), user.getRole());
            profile.setSlug(newSlug);
            // Persist based on entity type
            if (profile instanceof LawyerProfile) lawyerProfileRepository.save((LawyerProfile) profile);
            else if (profile instanceof CAProfile) caProfileRepository.save((CAProfile) profile);
            else if (profile instanceof CFAProfile) cfaProfileRepository.save((CFAProfile) profile);
            else if (profile instanceof ProfessionalProfile) professionalProfileRepository.save((ProfessionalProfile) profile);
            log.info("[IDENTITY] JIT Slug Generated and Persisted: {} -> {}", id, newSlug);
        }
        
        return mapAnyProfileToProfessionalDTO(user, profile, true);
    }



    // ==========================================
    // --- HELPER TRANSLATION (MAPPING) METHODS ---
    // ==========================================

    // The mapToEntity method is retired in the Industrial Architecture in favor of specialized Profile creation.

    private UserResponse mapToResponse(User user, String first, String last) {
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setEmail(user.getEmail());
        response.setRole(user.getRole());
        response.setFirstName(first);
        response.setLastName(last);
        response.setEnabled(user.isEnabled());
        
        // EXPERT LATCH: Fetch Wallet Data for Frontend Visualization
        walletRepository.findById(user.getId()).ifPresent(wallet -> {
            response.setFreeAiTokens(wallet.getFreeAiTokens());
            response.setFreeChatTokens(wallet.getFreeChatTokens());
            response.setFreeDocTokens(wallet.getFreeDocTokens());
            
            // Self-healing logic for existing users who purchased credits before limit tracking
            int aiLimit = wallet.getAiTokenLimit() != null ? wallet.getAiTokenLimit() : 5;
            response.setAiLimit(Math.max(wallet.getFreeAiTokens(), aiLimit));
            
            int docLimit = wallet.getDocTokenLimit() != null ? wallet.getDocTokenLimit() : 5;
            response.setDocLimit(Math.max(wallet.getFreeDocTokens(), docLimit));
            
            response.setTokenBalance(wallet.getTokenBalance());
            response.setIsUnlimited(wallet.getIsUnlimited());
        });

        return response;
    }

    // Overloaded for fetching existing users
    private UserResponse mapToResponse(User user) {
        String first = user.getFirstName();
        String last = user.getLastName();
        
        // Reliability Fallback: If names are not in the main User record, try profiles once
        if (first == null || first.isEmpty()) {
            first = "Unknown";
            if (user.getRole() == Role.CLIENT) {
                ClientProfile cp = clientProfileRepository.findById(user.getId()).orElse(null);
                if (cp != null) {
                    first = cp.getFirstName();
                    last = cp.getLastName();
                }
            } else {
                ProfessionalProfile pp = professionalProfileRepository.findById(user.getId()).orElse(null);
                if (pp != null) {
                    first = pp.getFirstName();
                    last = pp.getLastName();
                }
            }
        }
        
        return mapToResponse(user, first, last);
    }


    private List<Object> parseJsonAnyList(String json) {
        try {
            if (json == null || json.isEmpty()) return Arrays.asList();
            return objectMapper.readValue(json, new com.fasterxml.jackson.core.type.TypeReference<List<Object>>() {});
        } catch (Exception e) {
            return Arrays.asList();
        }
    }

    @Override
    @Transactional
    public void updateProfessionalStatus(String id, boolean online) {
        log.info("[GOVERNANCE] Commencing Multi-Dossier Status Sync for ID: {} -> {}", id, online ? "ONLINE" : "OFFLINE");
        
        lawyerProfileRepository.findById(id).ifPresent(p -> {
            p.setOnline(online);
            lawyerProfileRepository.save(p);
        });

        caProfileRepository.findById(id).ifPresent(p -> {
            p.setOnline(online);
            caProfileRepository.save(p);
        });

        cfaProfileRepository.findById(id).ifPresent(p -> {
            p.setOnline(online);
            cfaProfileRepository.save(p);
        });

        professionalProfileRepository.findById(id).ifPresent(p -> {
            p.setOnline(online);
            professionalProfileRepository.save(p);
        });
    }

    @Override
    @Transactional
    public void verifyExpert(String id) {
        log.info("[GOVERNANCE] Commencing Institutional Verification for ID: {}", id);
        
        lawyerProfileRepository.findById(id).ifPresent(p -> {
            p.setVerified(true);
            lawyerProfileRepository.save(p);
        });

        caProfileRepository.findById(id).ifPresent(p -> {
            p.setVerified(true);
            caProfileRepository.save(p);
        });

        cfaProfileRepository.findById(id).ifPresent(p -> {
            p.setVerified(true);
            cfaProfileRepository.save(p);
        });
    }

    @Override
    public ProfessionalProfileDTO getProfessionalBySlug(String slug) {
        BaseProfile profile = null;

        if (lawyerProfileRepository != null) {
            profile = lawyerProfileRepository.findBySlug(slug).orElse(null);
        }
        if (profile == null) {
            profile = professionalProfileRepository.findBySlug(slug).orElse(null);
        }
        if (profile == null && caProfileRepository != null) {
            profile = caProfileRepository.findBySlug(slug).orElse(null);
        }
        if (profile == null && cfaProfileRepository != null) {
            profile = cfaProfileRepository.findBySlug(slug).orElse(null);
        }

        if (profile == null) {
            throw new ResourceNotFoundException("Expert dossier not found for slug: " + slug);
        }

        final BaseProfile finalProfile = profile;
        User user = userRepository.findById(finalProfile.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Institutional user record missing for dossier: " + finalProfile.getId()));

        return mapAnyProfileToProfessionalDTO(user, finalProfile, true);
    }

    private String generateSlug(String firstName, String lastName, Role role) {
        String roleStr = role != null ? role.name() : "expert";
        String base = (firstName + "-" + lastName + "-" + roleStr).toLowerCase()
                .replaceAll("[^a-z0-9]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
                
        String slug = base;
        int count = 1;
        while (slugExists(slug)) {
            slug = base + "-" + count++;
        }
        return slug;
    }

    private boolean slugExists(String slug) {
        boolean exists = professionalProfileRepository.findBySlug(slug).isPresent();
        if (!exists && lawyerProfileRepository != null) exists = lawyerProfileRepository.findBySlug(slug).isPresent();
        if (!exists && caProfileRepository != null) exists = caProfileRepository.findBySlug(slug).isPresent();
        if (!exists && cfaProfileRepository != null) exists = cfaProfileRepository.findBySlug(slug).isPresent();
        return exists;
    }

    @Override
    @Transactional
    public void updatePassword(String email, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        log.info("[AUTH] Password successfully updated for: {}", email);
    }
}
