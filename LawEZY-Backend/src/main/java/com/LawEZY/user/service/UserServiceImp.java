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
import java.util.Arrays;
import java.util.stream.Collectors;
import java.util.Optional;


// @Service tells Spring: "This is a special class that holds business logic." 
// Spring will automatically create an object of this class when the app starts.
@Service
@lombok.extern.slf4j.Slf4j
public class UserServiceImp implements UserService {

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
        wallet.setFreeDocTokens(2); // 2 Free Institutional Document Analysis Units
        
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
        
        return prefix + serial + roleCode;
    }

    private void createClientProfile(User user, UserRequest request) {
        ClientProfile profile = new ClientProfile();
        profile.setId(user.getId());
        profile.setUser(user);
        profile.setFirstName(request.getFirstName());
        profile.setLastName(request.getLastName());
        
        // Generate and Persist the public Institutional UID
        profile.setUid(generatePublicUid(user, request.getFirstName(), request.getLastName()));
        
        clientProfileRepository.save(profile);
    }

    private String generatePublicUid(User user, String firstName, String lastName) {
        String month = java.time.LocalDate.now().getMonth().toString().substring(0, 2).toUpperCase();
        
        // Institutional logic: Use first initial of First Name and first initial of Last Name
        // Fallback to "US" if names are insufficient
        String f = (firstName != null && !firstName.isEmpty()) ? firstName.substring(0, 1).toUpperCase() : "";
        String l = (lastName != null && !lastName.isEmpty()) ? lastName.substring(0, 1).toUpperCase() : "";
        
        String initials = (f + l).length() >= 2 ? (f + l) : (f.length() == 1 ? f + "S" : "US");
        
        String suffix = "CL";
        if (user.getRole() == Role.LAWYER) suffix = "LW";
        else if (user.getRole() == Role.CA) suffix = "CA";
        else if (user.getRole() == Role.CFA) suffix = "CF";
        
        // Use part of the institutional ID as a random-like seed for uniqueness
        String seed = user.getId().substring(user.getId().length() - 2);
        
        return month + seed + initials + suffix;
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
        profile.setUid(generatePublicUid(user, request.getFirstName(), request.getLastName()));
        
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
            if (cp.getUid() == null) cp.setUid(generatePublicUid(existingUser, userRequest.getFirstName(), userRequest.getLastName()));
            clientProfileRepository.save(cp);
        } else {
            ProfessionalProfile pp = professionalProfileRepository.findById(id).orElse(new ProfessionalProfile());
            pp.setId(id);
            pp.setUser(existingUser);
            pp.setFirstName(userRequest.getFirstName());
            pp.setLastName(userRequest.getLastName());
            if (pp.getUid() == null) pp.setUid(generatePublicUid(existingUser, userRequest.getFirstName(), userRequest.getLastName()));
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
        
        return proUsers.stream().map(user -> {
            Object profile = null;
            if (user.getRole() == Role.LAWYER) profile = lawyerProfileRepository.findById(user.getId()).orElse(null);
            else if (user.getRole() == Role.CA) profile = caProfileRepository.findById(user.getId()).orElse(null);
            else if (user.getRole() == Role.CFA) profile = cfaProfileRepository.findById(user.getId()).orElse(null);
            
            // Fallback to legacy if specialized not found
            if (profile == null) {
                profile = professionalProfileRepository.findById(user.getId()).orElse(null);
            }

            if (profile == null) return null;
            // Optimised: Skip expensive enrichment for list view
            return mapAnyProfileToProfessionalDTO(user, (BaseProfile) profile, false); 
        })
        .filter(java.util.Objects::nonNull)
        .collect(Collectors.toList());
    }

    private ProfessionalProfileDTO mapAnyProfileToProfessionalDTO(User user, BaseProfile p, boolean fullEnrichment) {
        ProfessionalProfileDTO dto = new ProfessionalProfileDTO();
        dto.setId(user.getId());
        dto.setEmail(user.getEmail());
        dto.setCategory(user.getRole() != null ? user.getRole().name() : "OTHER");
        dto.setOnline(p.getOnline() != null ? p.getOnline() : true);
        
        if (p instanceof com.LawEZY.user.entity.BaseProfile) {
            com.LawEZY.user.entity.BaseProfile bp = (com.LawEZY.user.entity.BaseProfile) p;
            dto.setName(bp.getFirstName() + " " + bp.getLastName());
            dto.setTitle(bp.getTitle());
            dto.setLocation(bp.getLocation());
            dto.setBio(bp.getBio());
            dto.setBioSmall(bp.getBio() != null && bp.getBio().length() > 100 ? bp.getBio().substring(0, 97) + "..." : bp.getBio());
            dto.setUid(bp.getUid());
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
            if (dto.getUid() != null) {
                dto.setTestimonials(fetchSanitizedReviews(dto.getUid()));
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

    private List<com.LawEZY.user.dto.ReviewDTO> fetchSanitizedReviews(String expertUid) {
        return reviewRepository.findByExpertUidOrderByCreatedAtDesc(expertUid).stream()
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
                    clientProfileRepository.findByUidIgnoreCase(r.getClientUid()).ifPresent(p -> {
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
    public ProfessionalProfileDTO getProfessionalById(String id) {
        User user = userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Expert not found"));
        Object profile = null;
        if (user.getRole() == Role.LAWYER) profile = lawyerProfileRepository.findById(id).orElse(null);
        else if (user.getRole() == Role.CA) profile = caProfileRepository.findById(id).orElse(null);
        else if (user.getRole() == Role.CFA) profile = cfaProfileRepository.findById(id).orElse(null);
        
        ProfessionalProfile pp = professionalProfileRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Profile not found"));
        return mapAnyProfileToProfessionalDTO(user, (BaseProfile) pp, true);
    }

    @Override
    public ProfessionalProfileDTO getProfessionalByUid(String uid) {
        // SEARCH ALL PROFILE TABLES - Lawyer, CA, CFA, and base Professional
        BaseProfile profile = null;
        User user = null;

        // Priority 1: Lawyer profile
        if (lawyerProfileRepository != null) {
            Optional<LawyerProfile> lp = lawyerProfileRepository.findByUidIgnoreCase(uid);
            if (lp.isPresent()) { profile = lp.get(); }
        }

        // Priority 2: Generic Professional profile
        if (profile == null) {
            Optional<ProfessionalProfile> pp = professionalProfileRepository.findByUidIgnoreCase(uid);
            if (pp.isPresent()) { profile = pp.get(); }
        }

        // Priority 3: CA profile
        if (profile == null && caProfileRepository != null) {
            Optional<CAProfile> cp = caProfileRepository.findByUidIgnoreCase(uid);
            if (cp.isPresent()) { profile = cp.get(); }
        }

        // Priority 4: CFA profile
        if (profile == null && cfaProfileRepository != null) {
            Optional<CFAProfile> cfap = cfaProfileRepository.findByUidIgnoreCase(uid);
            if (cfap.isPresent()) { profile = cfap.get(); }
        }

        if (profile == null) {
            throw new ResourceNotFoundException("Expert profile not found for UID: " + uid);
        }

        final String finalProfileId = profile.getId();
        if (finalProfileId == null) throw new ResourceNotFoundException("Profile has no associated ID for UID: " + uid);
        
        user = userRepository.findById(finalProfileId)
            .orElseThrow(() -> new ResourceNotFoundException("Associated expert user not found for profile: " + finalProfileId));

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
        
        // Fetch UID for Privacy-First Secure Logic - PREVENT 11SS01LA LEAKAGE
        String publicUid = null;
        if (user.getRole() == Role.CLIENT) {
            publicUid = clientProfileRepository.findById(user.getId()).map(p -> p.getUid()).orElse(null);
        } else {
            publicUid = professionalProfileRepository.findById(user.getId()).map(p -> p.getUid()).orElse(null);
        }
        
        // Reliability Shield: Generate if missing to avoid exposing Internal ID
        if (publicUid == null) {
            publicUid = generatePublicUid(user, first, last);
        }
        
        response.setUid(publicUid);

        // EXPERT LATCH: Fetch Wallet Data for Frontend Visualization
        walletRepository.findById(user.getId()).ifPresent(wallet -> {
            response.setFreeAiTokens(wallet.getFreeAiTokens());
            response.setFreeChatTokens(wallet.getFreeChatTokens());
            response.setFreeDocTokens(wallet.getFreeDocTokens());
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
    public void updateProfessionalStatus(String uid, boolean online) {
        log.info("[GOVERNANCE] Commencing Multi-Dossier Status Sync for UID: {} -> {}", uid, online ? "ONLINE" : "OFFLINE");
        
        // 1. Update Lawyer Dossiers
        lawyerProfileRepository.findByUidIgnoreCase(uid).ifPresent(p -> {
            p.setOnline(online);
            lawyerProfileRepository.save(p);
            log.info("[GOVERNANCE] Lawyer Ledger Synchronized.");
        });

        // 2. Update CA Dossiers
        caProfileRepository.findByUidIgnoreCase(uid).ifPresent(p -> {
            p.setOnline(online);
            caProfileRepository.save(p);
            log.info("[GOVERNANCE] CA Ledger Synchronized.");
        });

        // 3. Update CFA Dossiers
        cfaProfileRepository.findByUidIgnoreCase(uid).ifPresent(p -> {
            p.setOnline(online);
            cfaProfileRepository.save(p);
            log.info("[GOVERNANCE] CFA Ledger Synchronized.");
        });

        // 4. Update Base Professional Dossiers
        professionalProfileRepository.findByUidIgnoreCase(uid).ifPresent(p -> {
            p.setOnline(online);
            professionalProfileRepository.save(p);
            log.info("[GOVERNANCE] Base Professional Ledger Synchronized.");
        });
    }
}
