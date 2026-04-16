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
    basePackages = "com.LawEZY.ai.repository",
    mongoTemplateRef = "lawinoMongoTemplate"
)
public class LawinoMongoConfig {

    @Bean
    @ConfigurationProperties(prefix = "spring.data.mongodb.lawino")
    public MongoProperties lawinoMongoProperties() {
        return new MongoProperties();
    }

    @Bean
    public MongoDatabaseFactory lawinoMongoDatabaseFactory() {
        String uri = lawinoMongoProperties().getUri();
        if (uri == null) throw new IllegalStateException("Lawino MongoDB URI must not be null");
        return new SimpleMongoClientDatabaseFactory(uri);
    }

    @Bean(name = "lawinoMongoTemplate")
    public MongoTemplate lawinoMongoTemplate() {
        return new MongoTemplate(lawinoMongoDatabaseFactory());
    }
}
