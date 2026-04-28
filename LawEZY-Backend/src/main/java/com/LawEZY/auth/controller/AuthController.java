package com.LawEZY.auth.controller;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.LawEZY.auth.dto.AuthRequest;
import com.LawEZY.auth.dto.AuthResponse;
import com.LawEZY.auth.service.CustomUserDetailsService;
import com.LawEZY.auth.util.JwtUtil;
import com.LawEZY.common.response.ApiResponse;
import com.LawEZY.user.enums.Role;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private AuthenticationManager authManager;
    @Autowired
    private CustomUserDetailsService UserDetailsService;
    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private com.LawEZY.user.service.UserService userService;

    @Autowired
    private com.LawEZY.common.service.AuditLogService auditLogService;

    @Autowired
    private com.LawEZY.user.service.AdminBroadcastService adminBroadcastService;

    @Autowired
    private com.LawEZY.common.util.RateLimiter rateLimiter;

    @Autowired
    private com.LawEZY.auth.service.OtpService otpService;

    @Autowired
    private com.LawEZY.user.repository.UserRepository userRepository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<com.LawEZY.user.dto.UserResponse>> register(
            @RequestBody com.LawEZY.user.dto.UserRequest userRequest, 
            @org.springframework.web.bind.annotation.RequestParam(required = false) String otp,
            jakarta.servlet.http.HttpServletRequest request) {
        
        String ip = request.getRemoteAddr();
        // Limit: 5 registrations per hour per IP
        if (!rateLimiter.isAllowed("REG_" + ip, 5, 3600000)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(ApiResponse.error("Registration threshold exceeded. Please try again later."));
        }
        
        // 🔐 OTP VERIFICATION (Mandatory for Registration)
        if (otp == null || !otpService.validateOtp(userRequest.getEmail(), otp, "REGISTRATION")) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error("INVALID_OTP: Please provide a valid verification code."));
        }
        
        log.info("New registration attempt for email: {}", userRequest.getEmail());
        com.LawEZY.user.dto.UserResponse response = userService.createUser(userRequest);
        return ResponseEntity.ok(ApiResponse.success(response, "Registration successful"));
    }

    @PostMapping("/request-otp")
    public ResponseEntity<ApiResponse<Void>> requestOtp(@RequestBody Map<String, String> payload, jakarta.servlet.http.HttpServletRequest request) {
        String email = payload.get("email");
        String purpose = payload.getOrDefault("purpose", "REGISTRATION");
        String ip = request.getRemoteAddr();

        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error("Email is required"));
        }

        // Rate limit OTP requests (3 per 10 mins per IP)
        if (!rateLimiter.isAllowed("OTP_" + ip, 3, 600000)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(ApiResponse.error("Too many OTP requests. Please wait."));
        }

        try {
            otpService.generateAndSendOtp(email, purpose);
            return ResponseEntity.ok(ApiResponse.success(null, "Security code dispatched to " + email));
        } catch (Exception e) {
            log.error("OTP Dispatch Failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error("Failed to send verification code."));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@RequestBody AuthRequest authRequest, jakarta.servlet.http.HttpServletRequest request){
        String email = authRequest.getEmail() != null ? authRequest.getEmail().toLowerCase().trim() : null;
        String ip = request.getRemoteAddr();

        // 🛡️ SECURITY GUARD: Rate Limit Login Attempts (10 per 15 mins)
        if (!rateLimiter.isAllowed("LOGIN_" + ip, 10, 900000)) {
             return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(ApiResponse.error("Too many login attempts. Please wait 15 minutes."));
        }
        
        try{
            // 🔍 TEMP DEBUG: Direct password check before Spring Security
            try {
                var dbUser = userRepository.findByEmail(email);
                if (dbUser.isPresent()) {
                    var u = dbUser.get();
                    boolean pwMatch = passwordEncoder.matches(authRequest.getPassword(), u.getPassword());
                    log.info("[LOGIN-DEBUG] User: {} | ID: {} | Enabled: {} | PW-Match: {} | InputLen: {}", 
                        email, u.getId(), u.isEnabled(), pwMatch, 
                        authRequest.getPassword() != null ? authRequest.getPassword().length() : -1);
                } else {
                    log.warn("[LOGIN-DEBUG] NO USER FOUND for email: {}", email);
                }
            } catch (Exception dbg) {
                log.warn("[LOGIN-DEBUG] Check failed: {}", dbg.getMessage());
            }

            authManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, authRequest.getPassword()));
            
            // On success, reset the limiter for this IP
            rateLimiter.reset("LOGIN_" + ip);
            
            log.info("Login SUCCESS for email: {} | IP: {}", email, ip);
            
            UserDetails userDetails = UserDetailsService.loadUserByUsername(email);
            final String jwt = jwtUtil.generateToken(userDetails);

            com.LawEZY.user.dto.UserResponse user = userService.getUserByEmail(email);
            if (user == null) {
                throw new RuntimeException("Identity resolution failed for: " + email);
            }

            try {
                auditLogService.logAudit("LOGIN_SUCCESS", "User logged in successfully", ip, email, user.getRole().name());
            } catch (Exception e) {
                log.warn("Secondary Audit Log Failed: {}", e.getMessage());
            }
            
            // 🚀 REAL-TIME BROADCAST: Update Admin Portal
            try {
                adminBroadcastService.broadcastAdminEvent("LOGIN_SUCCESS", Map.of(
                    "userId", email,
                    "summary", "User logged in: " + email,
                    "ipAddress", ip,
                    "userRole", user.getRole().name()
                ));
            } catch (Exception e) {
                log.warn("Admin broadcast failed for login: {}", e.getMessage());
            }
            
            if (user.getRole() != Role.CLIENT) {
                log.info("[MFA] Login successful, but challenge required for {} role: {}", user.getRole(), email);
                try {
                    otpService.generateAndSendOtp(email, "LOGIN_MFA");
                } catch (Exception mfaEx) {
                    log.error("[MFA] Failed to dispatch OTP email for {}: {}", email, mfaEx.getMessage());
                    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body(ApiResponse.error("MFA_EMAIL_FAILED: Login credentials verified, but the verification email could not be sent. Please try again shortly."));
                }
                return ResponseEntity.ok(ApiResponse.success(null, "MFA_REQUIRED: A verification code has been sent to your registered email."));
            }

            AuthResponse authResponse = new AuthResponse(
                jwt, 
                "Login successful", 
                user.getId(),
                user.getFirstName(), 
                user.getLastName(), 
                user.getRole()
            );

            return ResponseEntity.ok(ApiResponse.success(authResponse, "Login successful"));
            
        } catch(BadCredentialsException e){
            log.warn("Login FAILED for email: {} | IP: {}", email, ip);
            try {
                auditLogService.logSecurityAlert("Login Failed", "Incorrect password attempted", ip, email, "UNDEFINED");
            } catch (Exception ex) {}
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Credential incorrect"));
        } catch(org.springframework.security.core.AuthenticationException e) {
            log.warn("Login Auth Exception: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Credential incorrect"));
        } catch(Exception e) {
            log.error("CRITICAL LOGIN ERROR for email: {} | Cause: {} | Root: {}", email, e.getMessage(), e.getClass().getName());
            try {
                auditLogService.logCriticalError("Login System Error", e.getMessage());
            } catch (Exception ex) {}
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error("An unexpected error occurred. Please try again later."));
        }
    }

    @PostMapping("/mfa-verify")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyMfa(@RequestBody Map<String, String> payload, jakarta.servlet.http.HttpServletRequest request) {
        String email = payload.get("email");
        String code = payload.get("otp");
        String ip = request.getRemoteAddr();

        if (!otpService.validateOtp(email, code, "LOGIN_MFA")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("INVALID_OTP: Verification failed."));
        }

        // OTP Validated: Issue Final JWT
        UserDetails userDetails = UserDetailsService.loadUserByUsername(email);
        final String jwt = jwtUtil.generateToken(userDetails);
        com.LawEZY.user.dto.UserResponse user = userService.getUserByEmail(email);

        auditLogService.logAudit("MFA_SUCCESS", "MFA verification successful", ip, email, user.getRole().name());

        AuthResponse authResponse = new AuthResponse(
            jwt, "MFA Verified", user.getId(), user.getFirstName(), user.getLastName(), user.getRole()
        );
        return ResponseEntity.ok(ApiResponse.success(authResponse, "Access granted."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@RequestBody com.LawEZY.auth.dto.ResetPasswordRequest resetRequest) {
        if (!otpService.validateOtp(resetRequest.getEmail(), resetRequest.getOtp(), "FORGOT_PASSWORD")) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error("INVALID_OTP: Password reset failed."));
        }

        // Logic to update password in UserService
        userService.updatePassword(resetRequest.getEmail(), resetRequest.getNewPassword());
        log.info("[AUTH] Password reset successful for: {}", resetRequest.getEmail());
        
        return ResponseEntity.ok(ApiResponse.success(null, "Password has been updated successfully."));
    }
}
