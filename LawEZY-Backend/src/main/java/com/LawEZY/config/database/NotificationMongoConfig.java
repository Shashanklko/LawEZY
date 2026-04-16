package com.LawEZY.config.database;

import org.springframework.boot.autoconfigure.mongo.MongoProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.SimpleMongoClientDatabaseFactory;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableMongoRepositories(
    basePackages = "com.LawEZY.notification.repository",
    mongoTemplateRef = "notificationMongoTemplate"
)
public class NotificationMongoConfig {

    @Bean
    @ConfigurationProperties(prefix = "spring.data.mongodb.notification")
    public MongoProperties notificationMongoProperties() {
        return new MongoProperties();
    }

    @Bean
    public MongoDatabaseFactory notificationMongoDatabaseFactory() {
        String uri = notificationMongoProperties().getUri();
        if (uri == null) throw new IllegalStateException("Notification MongoDB URI must not be null");
        return new SimpleMongoClientDatabaseFactory(uri);
    }

    @Bean(name = "notificationMongoTemplate")
    public MongoTemplate notificationMongoTemplate() {
        return new MongoTemplate(notificationMongoDatabaseFactory());
    }
}
