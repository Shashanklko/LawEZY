package com.LawEZY.config.database;

import com.LawEZY.user.dto.UserRequest;
import com.LawEZY.user.enums.Role;
import com.LawEZY.user.service.UserService;
import com.LawEZY.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
@Component
public class DataSeeder implements CommandLineRunner {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(DataSeeder.class);

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Override
    public void run(String... args) throws Exception {
        log.info("🏛️ Starting Institutional Data Seeding...");

        seedUser("shekhar Singh", "shekhar@test.com", "shekhar123", Role.CLIENT);
        seedUser("shashi shekhar", "shashi@gmail.com", "shashi123", Role.LAWYER);
        log.info("✅ Institutional Data Seeding Complete.");
    }

    private void seedUser(String fullName, String email, String password, Role role) {
        if (userRepository.existsByEmail(email)) {
            log.info("⏭️ Identity registry already contains: {}", email);
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
