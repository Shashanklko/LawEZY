package com.LawEZY.config.database;

import com.LawEZY.user.dto.UserRequest;
import com.LawEZY.user.enums.Role;
import com.LawEZY.user.service.UserService;
import com.LawEZY.user.repository.UserRepository;
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
        seedUser("Master Admin", "lawezy2025@gmail.com", adminPass, Role.MASTER_ADMIN);
        log.info("✅ Institutional Data Seeding Complete.");
    }

    private void seedUser(String fullName, String email, String password, Role role) {
        if (userRepository.existsByEmail(email)) {
            // For MASTER_ADMIN, we force-update the password to ensure recovery
            if (role == Role.MASTER_ADMIN) {
                log.info("🔄 [RECOVERY] Force-updating password for Master Admin: {}", email);
                userRepository.findByEmail(email).ifPresent(user -> {
                    user.setPassword(passwordEncoder.encode(password));
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
            request.setPassword(password);
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
