package com.LawEZY.user.controller;

import com.LawEZY.user.dto.ProfessionalProfileDTO;
import com.LawEZY.user.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/professionals")
public class ProfessionalController {

    @Autowired
    private UserService userService;

    @GetMapping
    public ResponseEntity<List<ProfessionalProfileDTO>> getAllProfessionals() {
        return ResponseEntity.ok(userService.getAllProfessionals());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProfessionalProfileDTO> getProfessionalById(@PathVariable String id) {
        return ResponseEntity.ok(userService.getProfessionalById(id));
    }

    @org.springframework.web.bind.annotation.PatchMapping("/{uid}/status")
    public ResponseEntity<Void> updateStatus(@PathVariable String uid, @org.springframework.web.bind.annotation.RequestBody java.util.Map<String, Boolean> body) {
        userService.updateProfessionalStatus(uid, body.get("online"));
        return ResponseEntity.ok().build();
    }
}
