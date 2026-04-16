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

    @Autowired private UserRepository userRepository;
    @Autowired private LawyerProfileRepository lawyerRepo;
    @Autowired private CAProfileRepository caRepo;
    @Autowired private CFAProfileRepository cfaRepo;
    @Autowired private ClientProfileRepository clientRepo;
    @Autowired private WalletRepository walletRepo;
    @Autowired private ObjectMapper objectMapper;

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
            p.setId(userId); p.setUser(user);
            updateBaseFields(p, data);
            validateProfessionalMandatories(data, "Bar License Number");
            p.setBarLicenseNumber((String) data.getOrDefault("licenseNumber", data.get("barLicenseNumber")));
            p.setIssuingAuthority((String) data.get("issuingAuthority"));
            p.setLicenseDriveLink((String) data.get("licenseDriveLink"));
            p.setYoutubeLink((String) data.get("youtubeLink"));
            p.setLinkedinLink((String) data.get("linkedinLink"));
            p.setWebsiteLink((String) data.get("websiteLink"));
            p.setConsultationFee(data.get("consultationFee") != null ? Double.valueOf(data.get("consultationFee").toString()) : 499.0);
            p.setDomains(json(data.get("domains")));
            p.setEducationHistory(json(data.get("educationList")));
            p.setExperienceHistory(json(data.get("experienceList")));
            p.setExperienceSnapshots(json(data.get("experienceSnapshots")));
            
            // Allow explicit verification trigger while defaulting to false for normal updates
            boolean isExplicitAudit = data.containsKey("verified") && (Boolean) data.get("verified");
            p.setVerified(isExplicitAudit);
            
            savedProfile = lawyerRepo.save(p);
        }

        else if (role == Role.CA) {
            CAProfile p = caRepo.findByUserId(userId).orElse(new CAProfile());
            p.setId(userId); p.setUser(user);
            updateBaseFields(p, data);
            validateProfessionalMandatories(data, "Membership Number");
            p.setMembershipNumber((String) data.getOrDefault("licenseNumber", data.get("membershipNumber")));
            p.setIssuingAuthority((String) data.get("issuingAuthority"));
            p.setLicenseDriveLink((String) data.get("licenseDriveLink"));
            p.setConsultationFee(data.get("consultationFee") != null ? Double.valueOf(data.get("consultationFee").toString()) : 499.0);
            p.setDomains(json(data.get("domains")));
            p.setEducationHistory(json(data.get("educationList")));
            p.setExperienceHistory(json(data.get("experienceList")));
            p.setExperienceSnapshots(json(data.get("experienceSnapshots")));

            // Allow explicit verification trigger
            boolean isExplicitAudit = data.containsKey("verified") && (Boolean) data.get("verified");
            p.setVerified(isExplicitAudit);

            savedProfile = caRepo.save(p);
        }
        
        else if (role == Role.CFA) {
            CFAProfile p = cfaRepo.findByUserId(userId).orElse(new CFAProfile());
            p.setId(userId); p.setUser(user);
            updateBaseFields(p, data);
            validateProfessionalMandatories(data, "Charter Number");
            p.setCharterNumber((String) data.getOrDefault("licenseNumber", data.get("charterNumber")));
            p.setIssuingAuthority((String) data.get("issuingAuthority"));
            p.setLicenseDriveLink((String) data.get("licenseDriveLink"));
            p.setConsultationFee(data.get("consultationFee") != null ? Double.valueOf(data.get("consultationFee").toString()) : 499.0);
            p.setDomains(json(data.get("domains")));
            p.setEducationHistory(json(data.get("educationList")));
            p.setExperienceHistory(json(data.get("experienceList")));
            p.setExperienceSnapshots(json(data.get("experienceSnapshots")));
            
            // Allow explicit verification trigger
            boolean isExplicitAudit = data.containsKey("verified") && (Boolean) data.get("verified");
            p.setVerified(isExplicitAudit);
            
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
        p.setUid((String) data.getOrDefault("uid", p.getUid()));
        p.setPhoneNumber((String) data.getOrDefault("phone", data.getOrDefault("phoneNumber", p.getPhoneNumber())));
        p.setExperience((String) data.getOrDefault("experience", p.getExperience()));
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
