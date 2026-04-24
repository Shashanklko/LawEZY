package com.LawEZY.common.service;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.Message;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.UserCredentials;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.binary.Base64;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Map;
import java.util.Properties;

/**
 * 📧 INSTITUTIONAL EMAIL SERVICE (GMAIL API EDITION)
 * This service uses OAuth2 and the Gmail API for high-reliability production dispatch.
 * It bypasses the vulnerabilities and IP blocking associated with standard SMTP.
 */
@Service
@Slf4j
public class EmailService {

    @Autowired
    private TemplateEngine templateEngine;

    @Value("${spring.gmail.client-id}")
    private String clientId;

    @Value("${spring.gmail.client-secret}")
    private String clientSecret;

    @Value("${spring.gmail.refresh-token}")
    private String refreshToken;

    @Value("${spring.gmail.user-email:lawezy2025@gmail.com}")
    private String fromEmail;

    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();

    /**
     * Sends a professional HTML email using a Thymeleaf template via Gmail API.
     */
    public void sendHtmlEmail(String to, String subject, String templateName, Map<String, Object> variables) {
        try {
            log.info("[EMAIL] Dispatching institutional mail via GMAIL API to: {} | Subject: {}", to, subject);

            Context context = new Context();
            context.setVariables(variables);
            
            // Normalize template name
            String fullTemplatePath = templateName.startsWith("emails/") ? templateName : "emails/" + templateName;
            String htmlContent = templateEngine.process(fullTemplatePath, context);

            // 1. Create JavaMail MimeMessage
            Properties props = new Properties();
            Session session = Session.getDefaultInstance(props, null);
            MimeMessage email = new MimeMessage(session);
            
            email.setFrom(new InternetAddress(fromEmail, "LawEZY Institutional"));
            email.addRecipient(jakarta.mail.Message.RecipientType.TO, new InternetAddress(to));
            email.setSubject(subject);
            email.setContent(htmlContent, "text/html; charset=utf-8");

            // 2. Encode to Base64 (Gmail API requirement)
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            email.writeTo(buffer);
            byte[] rawMessageBytes = buffer.toByteArray();
            String encodedEmail = Base64.encodeBase64URLSafeString(rawMessageBytes);
            
            Message message = new Message();
            message.setRaw(encodedEmail);

            // 3. Execute Secure Dispatch
            getGmailService().users().messages().send("me", message).execute();

            log.info("[EMAIL] Gmail API secure dispatch successful.");

        } catch (Exception e) {
            if (e.getMessage().contains("invalid_grant")) {
                log.error("[EMAIL CRITICAL] OAuth2 Refresh Token has EXPIRED or been REVOKED. " +
                        "Please regenerate the token using Google OAuth2 Playground and update application.yml.");
            } else {
                log.error("[EMAIL ERROR] Gmail API Failure: {}", e.getMessage());
            }
            throw new RuntimeException("Gmail API service failure: " + e.getMessage());
        }
    }

    /**
     * Initializes the Gmail Service with OAuth2 Refresh Token credentials.
     */
    private Gmail getGmailService() throws IOException, GeneralSecurityException {
        NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();
        
        UserCredentials credentials = UserCredentials.newBuilder()
                .setClientId(clientId)
                .setClientSecret(clientSecret)
                .setRefreshToken(refreshToken)
                .build();

        return new Gmail.Builder(httpTransport, JSON_FACTORY, new HttpCredentialsAdapter(credentials))
                .setApplicationName("LawEZY-Institutional")
                .build();
    }
}
