package com.LawEZY.user.controller;

import com.LawEZY.common.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/support")
public class SupportController {

    @Autowired
    private EmailService emailService;

    @PostMapping("/query")
    public ResponseEntity<Map<String, String>> sendSupportQuery(@RequestBody Map<String, String> payload) {
        String name = payload.getOrDefault("name", "LawEZY User");
        String email = payload.getOrDefault("email", "Not Provided");
        String query = payload.get("query");
        String role = payload.getOrDefault("role", "GUEST");

        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Query cannot be empty"));
        }

        Map<String, Object> variables = new HashMap<>();
        variables.put("name", name);
        variables.put("email", email);
        variables.put("role", role);
        variables.put("message", query);

        try {
            // Send to institutional support email
            emailService.sendHtmlEmail("lawezy2025@gmail.com", "Support Query: " + name, "contact-inquiry", variables);
            return ResponseEntity.ok(Map.of("message", "Your query has been sent to LawEZY Support."));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to send query. Please try again later."));
        }
    }
}
