package com.LawEZY.config.database;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.MongoTemplate;
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

    @Value("${spring.data.mongodb.uri:}")
    private String mongoUri;

    @Bean
    public MongoClient mongoClient() {
        String uriToUse = mongoUri;

        // Strip quotes if present (often caused by copy-pasting into Render)
        if (uriToUse != null) {
            uriToUse = uriToUse.trim();
            if (uriToUse.startsWith("\"") && uriToUse.endsWith("\"")) {
                uriToUse = uriToUse.substring(1, uriToUse.length() - 1);
            }
        }

        // Fallback to the production URI if the environment variable is empty or null.
        if (uriToUse == null || uriToUse.isEmpty()) {
            uriToUse = "mongodb+srv://lawezy2025:Shashank321@lawezy.gfeffjz.mongodb.net/lawezy_main?appName=Lawezy";
        }
                
        ConnectionString connectionString = new ConnectionString(uriToUse);
        MongoClientSettings mongoClientSettings = MongoClientSettings.builder()
            .applyConnectionString(connectionString)
            .build();
        
        return MongoClients.create(mongoClientSettings);
    }

    @Bean
    public MongoTemplate mongoTemplate() {
        return new MongoTemplate(mongoClient(), "lawezy_main");
    }
}
