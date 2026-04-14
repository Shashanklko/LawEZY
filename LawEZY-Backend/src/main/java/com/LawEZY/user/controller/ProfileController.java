package com.LawEZY.user.controller;

import com.LawEZY.user.service.ProfileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/profiles")
public class ProfileController {

    @Autowired
    private ProfileService profileService;

    @GetMapping("/my")
    public ResponseEntity<Object> getMyProfile() {
        String userId = getCurrentUserId();
        return ResponseEntity.ok(profileService.getMyProfile(userId));
    }

    @PutMapping("/my")
    public ResponseEntity<Object> updateMyProfile(@RequestBody Map<String, Object> profileData) {
        String userId = getCurrentUserId();
        return ResponseEntity.ok(profileService.updateMyProfile(userId, profileData));
    }

    private String getCurrentUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new RuntimeException("Institutional Audit Failed: Identity context unavailable.");
        }
        return auth.getName();
    }
}
