package com.LawEZY.common.controller;

import com.LawEZY.common.service.EmailService;
import com.LawEZY.common.response.ApiResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/contact")
public class ContactController {

    @Autowired
    private EmailService emailService;

    @Autowired
    private com.LawEZY.common.repository.ContactInquiryRepository inquiryRepository;

    @Value("${spring.gmail.user-email:lawezy2025@gmail.com}")
    private String adminEmail;

    @PostMapping("/submit")
    public ResponseEntity<ApiResponse<String>> submitContact(@RequestBody Map<String, String> payload) {
        String name = payload.get("name");
        String email = payload.get("email");
        String role = payload.get("role");
        String message = payload.get("message");

        // 1. Persistence First (Institutional Governance)
        com.LawEZY.common.entity.ContactInquiry inquiry = new com.LawEZY.common.entity.ContactInquiry();
        inquiry.setName(name);
        inquiry.setEmail(email);
        inquiry.setRole(role);
        inquiry.setMessage(message);
        
        try {
            inquiryRepository.save(inquiry);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ApiResponse.error("Failed to record inquiry."));
        }

        Map<String, Object> templateModel = new HashMap<>();
        templateModel.put("name", name);
        templateModel.put("email", email);
        templateModel.put("role", role);
        templateModel.put("message", message);

        try {
            // 2. Tactical Email Dispatch
            emailService.sendHtmlEmail(adminEmail, "New Institutional Inquiry: " + name, "emails/contact-inquiry", templateModel);
            
            inquiry.setEmailDispatched(true);
            inquiryRepository.save(inquiry);

            return ResponseEntity.ok(ApiResponse.success(null, "Message dispatched successfully."));
        } catch (Exception e) {
            // Even if email fails, we return 200 because the lead is saved in DB
            return ResponseEntity.ok(ApiResponse.success(null, "Inquiry recorded. (Note: Email notification delayed)"));
        }
    }
}
