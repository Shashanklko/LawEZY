package com.LawEZY.config.database;

import com.LawEZY.user.dto.UserRequest;
import com.LawEZY.user.enums.Role;
import com.LawEZY.user.service.UserService;
import com.LawEZY.user.repository.UserRepository;
import com.LawEZY.user.repository.PlatformTreasuryRepository;
import com.LawEZY.user.entity.PlatformTreasury;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${app.seed.admin-password:admin123}")
    private String adminPass;

    @Value("${app.seed.expert-password:expert123}")
    private String expertPass;

    @Value("${app.seed.client-password:client123}")
    private String clientPass;

    @Override
    public void run(String... args) throws Exception {
        log.info("🏛️ Starting Institutional Data Seeding...");

       seedUser("shekhar Singh", "shekhar@test.com", clientPass, Role.CLIENT);
       seedUser("shashi shekhar", "teach2005shashank@gmail.com", expertPass, Role.LAWYER);
        seedUser("System Administrator", "lawezy2025@gmail.com", adminPass, Role.MASTER_ADMIN);
        
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

    private void seedUser(String fullName, String email, String password, Role role) {
        // 🔐 EMERGENCY RECOVERY: Hardcode password for Master Admin to bypass shell mangling of '$'
        String finalPassword = password;
        if ("lawezy2025@gmail.com".equals(email)) {
            finalPassword = "Abhinav123";
        }

        if (userRepository.existsByEmail(email)) {
            // For MASTER_ADMIN, we force-update the password to ensure recovery
            if (role == Role.MASTER_ADMIN) {
                log.info("🔄 [RECOVERY] Force-updating password for Master Admin: {}", email);
                String finalPass = finalPassword;
                userRepository.findByEmail(email).ifPresent(user -> {
                    user.setPassword(passwordEncoder.encode(finalPass));
                    userRepository.save(user);
                });
            } else {
                log.info("⏭️ Identity registry already contains: {}", email);
            }
            return;
        }

        try {
            String[] names = fullName.split(" ", 2);
            String first = names[0];
            String last = names.length > 1 ? names[1] : "";

            UserRequest request = new UserRequest();
            request.setEmail(email);
            request.setPassword(finalPassword);
            request.setFirstName(first);
            request.setLastName(last);
            request.setRole(role);

            userService.createUser(request);
            log.info("✨ Successfully seeded account: {} | Role: {}", email, role);
        } catch (Exception e) {
            log.error("❌ Failed to seed account: {} | Error: {}", email, e.getMessage());
        }
    }
}
