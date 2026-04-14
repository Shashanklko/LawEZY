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
    basePackages = "com.LawEZY.content.repository",
    mongoTemplateRef = "resourceMongoTemplate"
)
public class ResourceMongoConfig {

    @Bean
    @ConfigurationProperties(prefix = "spring.data.mongodb.resource")
    public MongoProperties resourceMongoProperties() {
        return new MongoProperties();
    }

    @Bean
    public MongoDatabaseFactory resourceMongoDatabaseFactory() {
        return new SimpleMongoClientDatabaseFactory(resourceMongoProperties().getUri());
    }

    @Bean(name = "resourceMongoTemplate")
    public MongoTemplate resourceMongoTemplate() {
        return new MongoTemplate(resourceMongoDatabaseFactory());
    }
}
