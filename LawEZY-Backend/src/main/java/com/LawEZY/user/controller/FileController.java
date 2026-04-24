package com.LawEZY.user.controller;

import com.LawEZY.service.SupabaseStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
@Slf4j
public class FileController {

    private final SupabaseStorageService supabaseStorageService;

    /**
     * Institutional File Upload: Persists a file to Supabase Cloud Storage.
     */
    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            // Tactical limit: 10MB (Governed by 500MB Atlas limit)
            if (file.getSize() > 10 * 1024 * 1024) {
                return ResponseEntity.badRequest().body("Institutional breach: File exceeds 10MB tactical limit.");
            }

            log.info("[FILE-SERVICE] Uploading tactical asset to Supabase: {}", file.getOriginalFilename());

            String downloadUrl = supabaseStorageService.uploadFile(file);

            Map<String, Object> response = new HashMap<>();
            response.put("fileName", file.getOriginalFilename());
            response.put("contentType", file.getContentType());
            response.put("size", file.getSize());
            response.put("downloadUrl", downloadUrl);

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            log.error("[FILE-SERVICE] Upload failure: {}", e.getMessage());
            return ResponseEntity.internalServerError().body("Institutional storage failure.");
        }
    }

    /**
     * Institutional File Retrieval: Files are now accessed directly via Supabase public URLs.
     */
    @GetMapping("/download/**")
    public ResponseEntity<?> downloadFile() {
        return ResponseEntity.badRequest().body("Use direct Supabase URL provided in the upload response.");
    }
}
