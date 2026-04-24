package com.LawEZY.config.database;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableMongoRepositories(
    basePackages = {
        "com.LawEZY.chat.repository",
        "com.LawEZY.blog.repository",
        "com.LawEZY.content.repository",
        "com.LawEZY.notification.repository",
        "com.LawEZY.ai.repository",
        "com.LawEZY.auth.repository"
    }
)
public class UnifiedMongoConfig {
    // This class leverages Spring Boot's auto-configuration for the single 'spring.data.mongodb.uri'
    // It eliminates the need for 5 separate connection pools, saving memory and improving performance.
}
