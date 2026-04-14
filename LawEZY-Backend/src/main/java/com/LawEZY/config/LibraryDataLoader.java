package com.LawEZY.config;

import com.LawEZY.content.dto.ResourceRequest;
import com.LawEZY.content.service.ResourceService;
import com.LawEZY.user.entity.User;
import com.LawEZY.user.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class LibraryDataLoader {

    @Bean
    CommandLineRunner seedLibrary(ResourceService resourceService, UserRepository userRepository) {
        return args -> {
            // Seeding disabled - Library now relies on live expert submissions.
        };
    }
}
