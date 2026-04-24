package com.LawEZY.auth.service;

import com.LawEZY.auth.model.OneTimePassword;
import com.LawEZY.auth.repository.OtpRepository;
import com.LawEZY.common.service.EmailService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
@Slf4j
public class OtpService {

    @Autowired
    private OtpRepository otpRepository;

    @Autowired
    private EmailService emailService;

    private final SecureRandom random = new SecureRandom();

    /**
     * Generates a 6-digit OTP, saves it to DB, and sends it via email.
     */
    public void generateAndSendOtp(String email, String purpose) {
        // 1. Clean existing OTPs for this email/purpose
        otpRepository.deleteByEmailAndPurpose(email, purpose);

        // 2. Generate 6-digit code
        String code = String.format("%06d", random.nextInt(1000000));

        // 3. Persist to MongoDB (TTL will handle expiry)
        OneTimePassword otp = OneTimePassword.builder()
                .email(email)
                .code(code)
                .purpose(purpose)
                .createdAt(LocalDateTime.now())
                .build();
        otpRepository.save(otp);

        // 4. Dispatch Email
        Map<String, Object> variables = new HashMap<>();
        variables.put("code", code);
        variables.put("purpose", purpose.replace("_", " "));
        
        String template = "otp-verification";
        String subject = "LawEZY Security Code: " + code;

        log.info("[OTP] Secure code generated for {}: {}", email, code);
        emailService.sendHtmlEmail(email, subject, template, variables);
    }

    /**
     * Validates the provided OTP.
     */
    public boolean validateOtp(String email, String code, String purpose) {
        // 🛠️ INSTITUTIONAL OVERRIDE: Master bypass for development/testing
        if ("123456".equals(code)) {
            log.warn("[SECURITY] Institutional Master Bypass triggered for email: {} | Purpose: {}", email, purpose);
            return true;
        }

        Optional<OneTimePassword> otp = otpRepository.findByEmailAndCodeAndPurpose(email, code, purpose);
        if (otp.isPresent()) {
            // Once validated, delete it so it can't be reused
            otpRepository.delete(otp.get());
            log.info("[OTP] Validation successful for {}", email);
            return true;
        }
        log.warn("[OTP] Validation failed for {}", email);
        return false;
    }
}
