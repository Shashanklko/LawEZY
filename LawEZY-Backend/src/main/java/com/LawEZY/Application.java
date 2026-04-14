package com.LawEZY;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 🏛️ LAWEZY ELITE SERVER
 * The central nervous system of the LawEZY SaaS legal platform.
 * Features: Multi-modulo scanning, Real-time WebSockets, and Automated Content.
 */
@SpringBootApplication
@EnableScheduling
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
        System.out.println("🏛️ LawEZY Server is Now Online & Elite.");
    }
}
