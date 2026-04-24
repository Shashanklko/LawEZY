package com.LawEZY.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@Service
@Slf4j
public class SupabaseStorageService {

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.key}")
    private String supabaseKey;

    @Value("${supabase.bucket:legal-docs}")
    private String bucketName;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Uploads a file to Supabase Storage and returns the public download URL.
     * This provides elite, production-ready cloud storage with zero egress fees.
     */
    public String uploadFile(MultipartFile file) throws IOException {
        String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        // Clean filename for URL safety: only allow alphanumeric, dots, dashes, and underscores
        fileName = fileName.replaceAll("[^a-zA-Z0-9._-]", "");
        
        String uploadUrl = String.format("%s/storage/v1/object/%s/%s", supabaseUrl, bucketName, fileName);

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + supabaseKey);
        headers.set("apikey", supabaseKey);
        headers.setContentType(MediaType.parseMediaType(file.getContentType()));

        HttpEntity<byte[]> entity = new HttpEntity<>(file.getBytes(), headers);

        try {
            log.info("📡 [SUPABASE] Uploading asset: {} to bucket: {}", fileName, bucketName);
            ResponseEntity<String> response = restTemplate.exchange(uploadUrl, HttpMethod.POST, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                // Construct the Public URL for immediate consumption
                // Format: [URL]/storage/v1/object/public/[BUCKET]/[PATH]
                String publicUrl = String.format("%s/storage/v1/object/public/%s/%s", supabaseUrl, bucketName, fileName);
                log.info("✅ [SUPABASE] Asset live at: {}", publicUrl);
                return publicUrl;
            } else {
                log.error("❌ [SUPABASE] Payload rejected: {}", response.getBody());
                throw new IOException("Supabase rejection: " + response.getBody());
            }
        } catch (Exception e) {
            log.error("❌ [SUPABASE] Tactical failure: {}", e.getMessage());
            throw new IOException("Institutional storage failure: " + e.getMessage());
        }
    }
}
