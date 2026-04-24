package com.LawEZY.user.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
@Component
public class IdentityMigrationRunner implements CommandLineRunner {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(IdentityMigrationRunner.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        log.info("🚀 [MIGRATION] Starting Institutional Identity Migration (UID -> ID)...");
        
        try {
            // 1. Migrate Appointments
            jdbcTemplate.execute("UPDATE appointments SET client_id = client_uid WHERE client_id IS NULL AND client_uid IS NOT NULL");
            jdbcTemplate.execute("UPDATE appointments SET expert_id = expert_uid WHERE expert_id IS NULL AND expert_uid IS NOT NULL");
            log.info("✅ [MIGRATION] Appointments identity ledger synchronized.");

            // 2. Migrate Reviews
            jdbcTemplate.execute("UPDATE reviews SET client_id = client_uid WHERE client_id IS NULL AND client_uid IS NOT NULL");
            jdbcTemplate.execute("UPDATE reviews SET expert_id = expert_uid WHERE expert_id IS NULL AND expert_uid IS NOT NULL");
            log.info("✅ [MIGRATION] Reviews identity ledger synchronized.");
            
            // 3. Migrate Base Profiles (if needed, but we removed the field)
            // The PK 'id' already contains the Institutional ID, so no migration needed for profiles.

        } catch (Exception e) {
            log.warn("⚠️ [MIGRATION] Identity migration skipped or columns not yet ready: {}", e.getMessage());
        }
    }
}
