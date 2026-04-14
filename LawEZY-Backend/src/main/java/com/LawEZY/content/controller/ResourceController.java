package com.LawEZY.content.controller;

import com.LawEZY.content.entity.LegalResource;
import com.LawEZY.content.service.ResourceService;
import com.LawEZY.content.dto.ResourceRequest;

import org.springframework.lang.NonNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/resources")
public class ResourceController {

    @Autowired
    private ResourceService resourceService;

    @GetMapping
    public ResponseEntity<List<LegalResource>> getResources(@RequestParam(required = false) String category) {
        return ResponseEntity.ok(resourceService.getAllResources(category));
    }

    @GetMapping("/{id}")
    public ResponseEntity<LegalResource> getResource(@PathVariable @NonNull String id) {
        return ResponseEntity.ok(resourceService.getResourceById(id));
    }

    @PostMapping
    public ResponseEntity<LegalResource> createResource(@RequestBody @NonNull ResourceRequest request) {
        return ResponseEntity.ok(resourceService.createResource(request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteResource(@PathVariable @NonNull String id) {
        resourceService.deleteResource(id);
        return ResponseEntity.noContent().build();
    }
}
