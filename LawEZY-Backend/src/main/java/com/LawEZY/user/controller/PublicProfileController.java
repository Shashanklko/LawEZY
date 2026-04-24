package com.LawEZY.user.controller;

import com.LawEZY.user.dto.ProfessionalProfileDTO;
import com.LawEZY.user.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/p")
public class PublicProfileController {

    @Autowired
    private UserService userService;

    @GetMapping("/{slug}")
    public ResponseEntity<ProfessionalProfileDTO> getPublicProfile(@PathVariable String slug) {
        // Fetch the profile via slug. This endpoint is unauthenticated.
        ProfessionalProfileDTO profile = userService.getProfessionalBySlug(slug);
        
        // Security logic: We could sanitize the DTO here to remove sensitive fields
        // But ProfessionalProfileDTO is already designed for public/semi-public viewing.
        // We'll ensure it doesn't leak private user data.
        
        return ResponseEntity.ok(profile);
    }
}
