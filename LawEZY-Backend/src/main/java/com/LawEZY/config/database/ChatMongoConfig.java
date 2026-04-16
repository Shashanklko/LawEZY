package com.LawEZY.config.database;

import org.springframework.boot.autoconfigure.mongo.MongoProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.SimpleMongoClientDatabaseFactory;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableMongoRepositories(
    basePackages = {"com.LawEZY.chat.repository"},
    mongoTemplateRef = "chatMongoTemplate"
)
public class ChatMongoConfig {

    @Primary
    @Bean
    @ConfigurationProperties(prefix = "spring.data.mongodb.chat")
    public MongoProperties chatMongoProperties() {
        return new MongoProperties();
    }

    @Primary
    @Bean
    public MongoDatabaseFactory chatMongoDatabaseFactory() {
        String uri = chatMongoProperties().getUri();
        if (uri == null) throw new IllegalStateException("Chat MongoDB URI must not be null");
        return new SimpleMongoClientDatabaseFactory(uri);
    }

    @Primary
    @Bean(name = "chatMongoTemplate")
    public MongoTemplate chatMongoTemplate() {
        return new MongoTemplate(chatMongoDatabaseFactory());
    }
}
