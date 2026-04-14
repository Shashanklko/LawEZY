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
    basePackages = "com.LawEZY.blog.repository",
    mongoTemplateRef = "communityMongoTemplate"
)
public class CommunityMongoConfig {

    @Bean
    @ConfigurationProperties(prefix = "spring.data.mongodb.community")
    public MongoProperties communityMongoProperties() {
        return new MongoProperties();
    }

    @Bean
    public MongoDatabaseFactory communityMongoDatabaseFactory() {
        return new SimpleMongoClientDatabaseFactory(communityMongoProperties().getUri());
    }

    @Bean(name = "communityMongoTemplate")
    public MongoTemplate communityMongoTemplate() {
        return new MongoTemplate(communityMongoDatabaseFactory());
    }
}
