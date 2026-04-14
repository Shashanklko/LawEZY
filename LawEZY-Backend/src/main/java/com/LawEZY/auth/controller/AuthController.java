package com.LawEZY.auth.controller;

import javax.management.BadBinaryOpValueExpException;

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

@RestController
@RequestMapping("/api/auth")
@lombok.extern.slf4j.Slf4j
public class AuthController {

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

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody com.LawEZY.user.dto.UserRequest userRequest) {
        log.info("New registration attempt for email: {}", userRequest.getEmail());
        return ResponseEntity.ok(userService.createUser(userRequest));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest authRequest, jakarta.servlet.http.HttpServletRequest request){
        String email = authRequest.getEmail() != null ? authRequest.getEmail().toLowerCase().trim() : null;
        String ip = request.getRemoteAddr();
        
        try{
            authManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, authRequest.getPassword()));
            
            log.info("Login SUCCESS for email: {} | IP: {}", email, ip);
            
            UserDetails userDetails = UserDetailsService.loadUserByUsername(email);
            final String jwt = jwtUtil.generateToken(userDetails);

            com.LawEZY.user.dto.UserResponse user = userService.getUserByEmail(email);
            if (user == null) {
                throw new RuntimeException("Identity resolution failed for: " + email);
            }

            auditLogService.logAudit("LOGIN_SUCCESS", "User logged in successfully", ip, email, user.getRole().name());
            
            return ResponseEntity.ok(new AuthResponse(
                jwt, 
                "Login successful", 
                user.getId(),
                user.getUid(),
                user.getFirstName(), 
                user.getLastName(), 
                user.getRole()
            ));
            
        } catch(BadCredentialsException e){
            log.warn("Login FAILED for email: {} | IP: {}", email, ip);
            auditLogService.logSecurityAlert("Login Failed", "Incorrect password attempted", ip, email, "UNDEFINED");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Incorrect email or password");
        } catch(Exception e) {
            log.error("CRITICAL LOGIN ERROR for email: {} | Cause: {} | Root: {}", email, e.getMessage(), e.getClass().getName());
            e.printStackTrace(); // This will print directly to the console logs where the user can see it
            auditLogService.logCriticalError("Login System Error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Login failed: " + e.getMessage());
        }
    }
    
}
