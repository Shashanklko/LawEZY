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
    public ResponseEntity<?> getAllProfessionals(
            @org.springframework.data.web.PageableDefault(size = 20) org.springframework.data.domain.Pageable pageable) {
        // Institutional Check: If page/size params are missing, Spring might still provide a default Pageable.
        // We only trigger pagination if explicitly requested or to optimize large lists.
        return ResponseEntity.ok(userService.getAllProfessionalsPaginated(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProfessionalProfileDTO> getProfessionalById(@PathVariable String id) {
        return ResponseEntity.ok(userService.getProfessionalById(id));
    }

    @org.springframework.web.bind.annotation.PatchMapping("/{id}/status")
    public ResponseEntity<Void> updateStatus(@PathVariable String id, @org.springframework.web.bind.annotation.RequestBody java.util.Map<String, Boolean> body) {
        userService.updateProfessionalStatus(id, body.get("online"));
        return ResponseEntity.ok().build();
    }
}
