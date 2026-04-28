package com.LawEZY.config.database;

import com.LawEZY.user.dto.UserRequest;
import com.LawEZY.user.enums.Role;
import com.LawEZY.user.service.UserService;
import com.LawEZY.user.repository.UserRepository;
import com.LawEZY.user.repository.PlatformTreasuryRepository;
import com.LawEZY.user.entity.PlatformTreasury;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true", matchIfMissing = true)
public class DataSeeder implements CommandLineRunner {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(DataSeeder.class);

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Autowired
    private PlatformTreasuryRepository platformTreasuryRepository;

    @Override
    public void run(String... args) throws Exception {
        log.info("🏛️ Starting Institutional Data Seeding...");

        // Hardcoded passwords to eliminate config-resolution ambiguity
        seedUser("shekhar Singh", "shekhar@test.com", "shekhar123", Role.CLIENT);
        seedUser("shashi shekhar", "teach2005shashank@gmail.com", "shashi123", Role.LAWYER);
        seedUser("System Administrator", "lawezy2025@gmail.com", "Abhinav123", Role.MASTER_ADMIN);
        
        seedTreasury();
        
        log.info("✅ Institutional Data Seeding Complete.");
    }

    private void seedTreasury() {
        if (!platformTreasuryRepository.existsById("SYSTEM_TREASURY")) {
            log.info("🏛️ Initializing Platform Treasury...");
            PlatformTreasury treasury = new PlatformTreasury();
            treasury.setId("SYSTEM_TREASURY");
            treasury.setTotalEarnings(0.0);
            treasury.setCommissionEarnings(0.0);
            treasury.setPlatformFeeEarnings(0.0);
            treasury.setAiChatEarnings(0.0);
            treasury.setAiAuditEarnings(0.0);
            treasury.setLastUpdatedAt(java.time.LocalDateTime.now());
            platformTreasuryRepository.save(treasury);
        }
    }

    private void seedUser(String fullName, String email, String plainPassword, Role role) {
        if (userRepository.existsByEmail(email)) {
            // Force-update password for ALL seeded users to stay in sync
            log.info("🔄 [SYNC] Force-updating password for: {} | Role: {} | PasswordLen: {}", email, role, plainPassword.length());
            userRepository.findByEmail(email).ifPresent(user -> {
                String encoded = passwordEncoder.encode(plainPassword);
                user.setPassword(encoded);
                userRepository.save(user);
                // Verification: confirm the password we just saved actually matches
                boolean verified = passwordEncoder.matches(plainPassword, encoded);
                log.info("✅ [SYNC] Password verified for {}: matches={}", email, verified);
            });
            return;
        }

        try {
            String[] names = fullName.split(" ", 2);
            String first = names[0];
            String last = names.length > 1 ? names[1] : "";

            UserRequest request = new UserRequest();
            request.setEmail(email);
            request.setPassword(plainPassword);
            request.setFirstName(first);
            request.setLastName(last);
            request.setRole(role);

            userService.createUser(request);
            log.info("✨ Successfully seeded account: {} | Role: {} | PasswordLen: {}", email, role, plainPassword.length());
        } catch (Exception e) {
            log.error("❌ Failed to seed account: {} | Error: {}", email, e.getMessage());
        }
    }
}

