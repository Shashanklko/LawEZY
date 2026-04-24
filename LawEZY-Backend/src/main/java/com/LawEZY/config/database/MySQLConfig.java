package com.LawEZY.config.database;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/**
 * 🏛️ MySQL Strategy Configuration
 * Ensures core business repositories are exclusively handled by JPA/MySQL.
 */
@Configuration
@EnableJpaRepositories(basePackages = {
    "com.LawEZY.user.repository",
    "com.LawEZY.common.repository"
})
public class MySQLConfig {
}
