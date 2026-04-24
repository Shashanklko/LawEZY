package com.LawEZY.user.service;

import com.LawEZY.user.entity.*;
import com.LawEZY.user.enums.Role;
import com.LawEZY.user.repository.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;

@Service
public class ProfileServiceImpl implements ProfileService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(ProfileServiceImpl.class);

    @Autowired private UserRepository userRepository;
    @Autowired private LawyerProfileRepository lawyerRepo;
    @Autowired private CAProfileRepository caRepo;
    @Autowired private CFAProfileRepository cfaRepo;
    @Autowired private ClientProfileRepository clientRepo;
    @Autowired private WalletRepository walletRepo;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private AdminBroadcastService adminBroadcastService;

    private boolean objectsEqual(Object a, Object b) {
        String s1 = (a == null) ? "" : a.toString().trim();
        String s2 = (b == null) ? "" : b.toString().trim();
        
        // Handle JSON array variations (e.g. null vs [])
        if (s1.equals("[]") && s2.isEmpty()) return true;
        if (s2.equals("[]") && s1.isEmpty()) return true;
        
        return s1.equals(s2);
    }

    @Override
    public Object getMyProfile(String email) {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found: " + email));
        String userId = user.getId();
        Role role = user.getRole();

        Object profile = null;
        if (role == Role.LAWYER) profile = lawyerRepo.findByUserId(userId).orElse(new LawyerProfile());
        else if (role == Role.CA) profile = caRepo.findByUserId(userId).orElse(new CAProfile());
        else if (role == Role.CFA) profile = cfaRepo.findByUserId(userId).orElse(new CFAProfile());
        else if (role == Role.CLIENT) profile = clientRepo.findByUserId(userId).orElse(new ClientProfile());

        return enrichProfileResponse(profile, user);
    }

    private Map<String, Object> enrichProfileResponse(Object profile, User user) {
        if (profile == null) return null;
        Map<String, Object> response = objectMapper.convertValue(profile, new TypeReference<Map<String, Object>>() {});
        response.put("email", user.getEmail());
        String userId = user.getId();
        Role role = user.getRole();

        // Inject Role-Specific Identifiers into a generic field for the UI
        if (profile instanceof LawyerProfile) response.put("licenseNumber", ((LawyerProfile) profile).getBarLicenseNumber());
        else if (profile instanceof CAProfile) response.put("licenseNumber", ((CAProfile) profile).getMembershipNumber());
        else if (profile instanceof CFAProfile) response.put("licenseNumber", ((CFAProfile) profile).getCharterNumber());

        // Ensure Institutional Identity is mirrored from User record if missing in Profile
        if (response.get("firstName") == null || ((String)response.get("firstName")).isEmpty()) 
            response.put("firstName", user.getFirstName());
        if (response.get("lastName") == null || ((String)response.get("lastName")).isEmpty()) 
            response.put("lastName", user.getLastName());

        // Explicitly sync verified status flags to avoid Jackson mapping ambiguity
        boolean verifiedStatus = false;
        if (profile instanceof LawyerProfile) verifiedStatus = ((LawyerProfile) profile).isVerified();
        else if (profile instanceof CAProfile) verifiedStatus = ((CAProfile) profile).isVerified();
        else if (profile instanceof CFAProfile) verifiedStatus = ((CFAProfile) profile).isVerified();
        
        response.put("verified", verifiedStatus);
        response.put("isVerified", verifiedStatus);

        // Inject Wallet Institutional Data
        walletRepo.findById(userId).ifPresent(w -> {
            response.put("walletBalance", w.getEarnedBalance());
            response.put("tokenBalance", w.getTokenBalance());
            response.put("freeChatTokens", w.getFreeChatTokens());
            response.put("freeAiTokens", w.getFreeAiTokens());
            response.put("cashBalance", w.getCashBalance());
            response.put("earnedBalance", w.getEarnedBalance());
        });


        if (role == Role.LAWYER || role == Role.CA || role == Role.CFA) {
            response.put("domains", parseJson(getDomainString(profile)));
            response.put("educationList", parseJson(getEduString(profile)));
            response.put("experienceList", parseJson(getExpString(profile)));
            response.put("experienceSnapshots", parseJson(getSnapshotString(profile)));
        }
        return response;
    }

    private String getSnapshotString(Object p) {
        if (p instanceof LawyerProfile) return ((LawyerProfile) p).getExperienceSnapshots();
        if (p instanceof CAProfile) return ((CAProfile) p).getExperienceSnapshots();
        if (p instanceof CFAProfile) return ((CFAProfile) p).getExperienceSnapshots();
        return "[]";
    }

    private String getDomainString(Object p) {
        if (p instanceof LawyerProfile) return ((LawyerProfile) p).getDomains();
        if (p instanceof CAProfile) return ((CAProfile) p).getDomains();
        if (p instanceof CFAProfile) return ((CFAProfile) p).getDomains();
        return "[]";
    }
    private String getEduString(Object p) {
        if (p instanceof LawyerProfile) return ((LawyerProfile) p).getEducationHistory();
        if (p instanceof CAProfile) return ((CAProfile) p).getEducationHistory();
        if (p instanceof CFAProfile) return ((CFAProfile) p).getEducationHistory();
        return "[]";
    }
    private String getExpString(Object p) {
        if (p instanceof LawyerProfile) return ((LawyerProfile) p).getExperienceHistory();
        if (p instanceof CAProfile) return ((CAProfile) p).getExperienceHistory();
        if (p instanceof CFAProfile) return ((CFAProfile) p).getExperienceHistory();
        return "[]";
    }

    private Object parseJson(String json) {
        try {
            if (json == null || json.isEmpty()) return new java.util.ArrayList<>();
            return objectMapper.readValue(json, Object.class);
        } catch (Exception e) {
            return new java.util.ArrayList<>();
        }
    }

    @Override
    @Transactional
    public Object updateMyProfile(String email, Map<String, Object> data) {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found: " + email));
        String userId = user.getId();
        Role role = user.getRole();

        Object savedProfile = null;

        if (role == Role.LAWYER) {
            LawyerProfile p = lawyerRepo.findByUserId(userId).orElse(new LawyerProfile());
            
            // Capture state for re-verification audit
            String oldLic = p.getBarLicenseNumber();
            String oldAuth = p.getIssuingAuthority();
            String oldLink = p.getLicenseDriveLink();
            String oldEdu = p.getEducationHistory();

            p.setId(userId); p.setUser(user);
            updateBaseFields(p, data);
            validateProfessionalMandatories(data, "Bar License Number");
            
            String newLic = (String) data.getOrDefault("licenseNumber", data.get("barLicenseNumber"));
            String newAuth = (String) data.get("issuingAuthority");
            String newLink = (String) data.get("licenseDriveLink");
            String newEdu = json(data.get("educationList"));

            // CHANGE DETECTION: Reset verification if critical identity data changed
            boolean criticalChange = !objectsEqual(oldLic, newLic) || 
                                     !objectsEqual(oldAuth, newAuth) || 
                                     !objectsEqual(oldLink, newLink) || 
                                     !objectsEqual(oldEdu, newEdu);

            p.setBarLicenseNumber(newLic);
            p.setIssuingAuthority(newAuth);
            p.setLicenseDriveLink(newLink);
            p.setYoutubeLink((String) data.get("youtubeLink"));
            p.setLinkedinLink((String) data.get("linkedinLink"));
            p.setWebsiteLink((String) data.get("websiteLink"));
            p.setConsultationFee(data.get("consultationFee") != null ? Double.valueOf(data.get("consultationFee").toString()) : 499.0);
            p.setDomains(json(data.get("domains")));
            p.setEducationHistory(newEdu);
            p.setExperienceHistory(json(data.get("experienceList")));
            p.setExperienceSnapshots(json(data.get("experienceSnapshots")));
            
            if (criticalChange) {
                p.setVerified(false);
                log.warn("[GOVERNANCE] Profile {} updated critical credentials. Verification status reset to PENDING.", userId);
            }
            
            savedProfile = lawyerRepo.save(p);
        }

        else if (role == Role.CA) {
            CAProfile p = caRepo.findByUserId(userId).orElse(new CAProfile());
            
            String oldLic = p.getMembershipNumber();
            String oldAuth = p.getIssuingAuthority();
            String oldLink = p.getLicenseDriveLink();
            String oldEdu = p.getEducationHistory();

            p.setId(userId); p.setUser(user);
            updateBaseFields(p, data);
            validateProfessionalMandatories(data, "Membership Number");
            
            String newLic = (String) data.getOrDefault("licenseNumber", data.get("membershipNumber"));
            String newAuth = (String) data.get("issuingAuthority");
            String newLink = (String) data.get("licenseDriveLink");
            String newEdu = json(data.get("educationList"));

            boolean criticalChange = !objectsEqual(oldLic, newLic) || 
                                     !objectsEqual(oldAuth, newAuth) || 
                                     !objectsEqual(oldLink, newLink) || 
                                     !objectsEqual(oldEdu, newEdu);

            p.setMembershipNumber(newLic);
            p.setIssuingAuthority(newAuth);
            p.setLicenseDriveLink(newLink);
            p.setConsultationFee(data.get("consultationFee") != null ? Double.valueOf(data.get("consultationFee").toString()) : 499.0);
            p.setDomains(json(data.get("domains")));
            p.setEducationHistory(newEdu);
            p.setExperienceHistory(json(data.get("experienceList")));
            p.setExperienceSnapshots(json(data.get("experienceSnapshots")));

            if (criticalChange) {
                p.setVerified(false);
                log.warn("[GOVERNANCE] Profile {} updated critical credentials. Verification status reset to PENDING.", userId);
            }

            savedProfile = caRepo.save(p);
        }
        
        else if (role == Role.CFA) {
            CFAProfile p = cfaRepo.findByUserId(userId).orElse(new CFAProfile());
            
            String oldLic = p.getCharterNumber();
            String oldAuth = p.getIssuingAuthority();
            String oldLink = p.getLicenseDriveLink();
            String oldEdu = p.getEducationHistory();

            p.setId(userId); p.setUser(user);
            updateBaseFields(p, data);
            validateProfessionalMandatories(data, "Charter Number");
            
            String newLic = (String) data.getOrDefault("licenseNumber", data.get("charterNumber"));
            String newAuth = (String) data.get("issuingAuthority");
            String newLink = (String) data.get("licenseDriveLink");
            String newEdu = json(data.get("educationList"));

            boolean criticalChange = !objectsEqual(oldLic, newLic) || 
                                     !objectsEqual(oldAuth, newAuth) || 
                                     !objectsEqual(oldLink, newLink) || 
                                     !objectsEqual(oldEdu, newEdu);

            p.setCharterNumber(newLic);
            p.setIssuingAuthority(newAuth);
            p.setLicenseDriveLink(newLink);
            p.setConsultationFee(data.get("consultationFee") != null ? Double.valueOf(data.get("consultationFee").toString()) : 499.0);
            p.setDomains(json(data.get("domains")));
            p.setEducationHistory(newEdu);
            p.setExperienceHistory(json(data.get("experienceList")));
            p.setExperienceSnapshots(json(data.get("experienceSnapshots")));
            
            if (criticalChange) {
                p.setVerified(false);
                log.warn("[GOVERNANCE] Profile {} updated critical credentials. Verification status reset to PENDING.", userId);
            }
            
            savedProfile = cfaRepo.save(p);
        }

        else if (role == Role.CLIENT) {
            ClientProfile p = clientRepo.findByUserId(userId).orElse(new ClientProfile());
            p.setId(userId); p.setUser(user);
            updateBaseFields(p, data);
            p.setPhoneNumber((String) data.get("phone"));
            p.setAddress((String) data.get("address"));
            savedProfile = clientRepo.save(p);
        }

        // 🚀 REAL-TIME BROADCAST: Update Admin Portal for Professional Updates
        if (role != Role.CLIENT) {
            try {
                String name = (String) data.getOrDefault("firstName", user.getFirstName()) + " " + 
                              (String) data.getOrDefault("lastName", user.getLastName());
                adminBroadcastService.broadcastAdminEvent("PROFILE_UPDATE", Map.of(
                    "userId", userId,
                    "name", name,
                    "role", role.name(),
                    "summary", "Expert updated their professional dossier. Audit may be required."
                ));
            } catch (Exception e) {
                log.warn("Institutional Broadcast failed for profile update: {}", e.getMessage());
            }
        }

        return enrichProfileResponse(savedProfile, user);
    }

    private void validateProfessionalMandatories(Map<String, Object> data, String licLabel) {
        Object lic = data.getOrDefault("licenseNumber", 
                     data.getOrDefault("barLicenseNumber", 
                     data.getOrDefault("membershipNumber", 
                     data.get("charterNumber"))));

        if (isEmpty(lic)) throw new RuntimeException("Validation Failed: " + licLabel + " is missing from your dossier.");
        if (isEmpty(data.get("issuingAuthority"))) throw new RuntimeException("Validation Failed: Issuing Authority is mandatory for institutional trust.");
        if (isEmpty(data.get("licenseDriveLink"))) throw new RuntimeException("Validation Failed: Public license verification link (Drive/Dropbox) is required for our audit.");
        if (isEmpty(data.get("location"))) throw new RuntimeException("Validation Failed: Your official practice location (City, State) is mandatory.");
        if (isEmpty(data.get("domains"))) throw new RuntimeException("Validation Failed: At least one Practice Domain must be selected for client matching.");
        if (isEmpty(data.get("bio")) || data.get("bio").toString().length() < 50) 
            throw new RuntimeException("Validation Failed: Professional Biography must be high-density (min 50 chars).");
        if (isEmpty(data.get("educationList"))) throw new RuntimeException("Validation Failed: Your Academic Pedigree (Education) is required for verification.");
        
        // Institutional Bank Settlement Validation
        if (isEmpty(data.get("bankName"))) throw new RuntimeException("Validation Failed: Bank Name is mandatory for institutional payouts.");
        if (isEmpty(data.get("accountNumber"))) throw new RuntimeException("Validation Failed: Account Number is mandatory for payouts.");
        if (isEmpty(data.get("ifscCode"))) throw new RuntimeException("Validation Failed: IFSC Code is mandatory for bank transfers.");
        if (isEmpty(data.get("accountHolderName"))) throw new RuntimeException("Validation Failed: Account Holder Name is mandatory.");
        if (isEmpty(data.get("upiId"))) throw new RuntimeException("Validation Failed: UPI ID is mandatory for rapid settlements.");
        
        // Fee validation - ensure it's a valid number before parsing
        Object fee = data.get("consultationFee");
        if (isEmpty(fee)) throw new RuntimeException("Validation Failed: Base Consultation Fee is required.");
        try {
            if (Double.parseDouble(fee.toString()) < 99) 
                throw new RuntimeException("Validation Failed: Minimum consultation fee is ₹99.");
        } catch (NumberFormatException e) {
            throw new RuntimeException("Validation Failed: Invalid fee format detected in dossier.");
        }
    }

    private boolean isEmpty(Object val) {
        if (val == null) return true;
        if (val instanceof String) return ((String) val).trim().isEmpty();
        if (val instanceof java.util.Collection) return ((java.util.Collection<?>) val).isEmpty();
        if (val instanceof java.util.Map) return ((java.util.Map<?, ?>) val).isEmpty();
        return false;
    }

    private void updateBaseFields(BaseProfile p, Map<String, Object> data) {
        if (data == null) return;
        String fn = (String) data.getOrDefault("firstName", data.getOrDefault("firstname", p.getFirstName()));
        String ln = (String) data.getOrDefault("lastName", data.getOrDefault("lastname", p.getLastName()));
        
        if (fn != null) p.setFirstName(fn.toUpperCase().trim());
        if (ln != null) p.setLastName(ln.toUpperCase().trim());
        
        p.setTitle((String) data.getOrDefault("title", p.getTitle()));
        p.setLocation((String) data.getOrDefault("location", p.getLocation()));
        p.setBio((String) data.getOrDefault("bio", p.getBio()));
        p.setPhoneNumber((String) data.getOrDefault("phone", data.getOrDefault("phoneNumber", p.getPhoneNumber())));
        p.setExperience((String) data.getOrDefault("experience", p.getExperience()));
        
        // INSTITUTIONAL FEE SYNC: Persist time-based consultation settings
        if (data.containsKey("textChatFee")) {
            try {
                p.setTextChatFee(Double.valueOf(data.get("textChatFee").toString()));
            } catch (Exception e) {
                log.warn("[GOVERNANCE] Invalid textChatFee format for user {}: {}", p.getId(), data.get("textChatFee"));
            }
        }
        
        if (data.containsKey("chatDurationMinutes")) {
            try {
                p.setChatDurationMinutes(Integer.valueOf(data.get("chatDurationMinutes").toString()));
            } catch (Exception e) {
                log.warn("[GOVERNANCE] Invalid chatDurationMinutes format for user {}: {}", p.getId(), data.get("chatDurationMinutes"));
            }
        }
        
        if (data.containsKey("customGreeting")) {
            p.setCustomGreeting((String) data.get("customGreeting"));
        }

        // SYNC BANKING COORDINATES
        p.setBankName((String) data.getOrDefault("bankName", p.getBankName()));
        p.setAccountNumber((String) data.getOrDefault("accountNumber", p.getAccountNumber()));
        p.setIfscCode((String) data.getOrDefault("ifscCode", p.getIfscCode()));
        p.setAccountHolderName((String) data.getOrDefault("accountHolderName", p.getAccountHolderName()));
        p.setUpiId((String) data.getOrDefault("upiId", p.getUpiId()));
    }

    private String json(Object obj) {
        if (obj == null) return "[]";
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "[]";
        }
    }
}
