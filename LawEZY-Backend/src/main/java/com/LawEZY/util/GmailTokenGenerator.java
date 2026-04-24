package com.LawEZY.util;

import com.google.api.client.extensions.java6.auth.oauth2.AuthorizationCodeInstalledApp;
import com.google.api.client.extensions.jetty.auth.oauth2.LocalServerReceiver;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.store.FileDataStoreFactory;
import com.google.api.services.gmail.GmailScopes;

import java.io.IOException;
import java.io.InputStreamReader;
import java.security.GeneralSecurityException;
import java.util.Collections;
import java.util.List;

/**
 * 🛠️ INSTITUTIONAL OAUTH2 TOKEN GENERATOR
 * Run this class as a Java Application to generate a fresh Google OAuth2 Refresh Token.
 * It will open a browser window for authentication and print the tokens to the console.
 */
public class GmailTokenGenerator {

    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static final List<String> SCOPES = Collections.singletonList(GmailScopes.GMAIL_SEND);
    private static final String TOKENS_DIRECTORY_PATH = "tokens";

    // 🔐 Load from environment for security and push-protection compliance
    private static final String CLIENT_ID = System.getenv("GMAIL_CLIENT_ID");
    private static final String CLIENT_SECRET = System.getenv("GMAIL_CLIENT_SECRET");


    public static void main(String[] args) throws IOException, GeneralSecurityException {
        final NetHttpTransport HTTP_TRANSPORT = GoogleNetHttpTransport.newTrustedTransport();
        
        GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
                HTTP_TRANSPORT, JSON_FACTORY, CLIENT_ID, CLIENT_SECRET, SCOPES)
                .setDataStoreFactory(new FileDataStoreFactory(new java.io.File(TOKENS_DIRECTORY_PATH)))
                .setAccessType("offline")
                .build();
                
        LocalServerReceiver receiver = new LocalServerReceiver.Builder().setPort(8888).build();
        
        System.out.println("🚀 [OAUTH] Launching browser for LawEZY Institutional Authorization...");
        System.out.println("Scope: " + SCOPES);
        
        AuthorizationCodeInstalledApp app = new AuthorizationCodeInstalledApp(flow, receiver);
        app.authorize("user");

        System.out.println("\n✅ [SUCCESS] Authorization Complete!");
        System.out.println("----------------------------------------------------------------");
        System.out.println("Copy the following values to your application.yml:");
        System.out.println("----------------------------------------------------------------");
        // Note: The credential itself contains the refresh token if 'offline' access was requested.
        // Since we are using FileDataStore, it might be stored there.
        // We can access it via flow.loadCredential("user").getRefreshToken()
        String refreshToken = flow.loadCredential("user").getRefreshToken();
        System.out.println("spring.gmail.refresh-token: " + refreshToken);
        System.out.println("----------------------------------------------------------------");
        
        System.exit(0);
    }
}
