package com.LawEZY.user.controller;

import com.LawEZY.user.entity.SystemConfig;
import com.LawEZY.user.repository.SystemConfigRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.Map;

@RestController
@RequestMapping("/api/system")
public class SystemController {

    private final SystemConfigRepository systemConfigRepository;

    @Autowired
    public SystemController(SystemConfigRepository systemConfigRepository) {
        this.systemConfigRepository = systemConfigRepository;
    }

    @GetMapping("/mode")
    public ResponseEntity<Map<String, String>> getSystemMode() {
        String mode = systemConfigRepository.findById("SYSTEM_MODE")
                .map(SystemConfig::getConfigValue)
                .orElse("ACTIVE");
        return ResponseEntity.ok(Map.of("mode", mode));
    }
}
