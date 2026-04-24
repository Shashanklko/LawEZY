package com.LawEZY.common.util;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.extensions.java6.auth.oauth2.AuthorizationCodeInstalledApp;
import com.google.api.client.extensions.jetty.auth.oauth2.LocalServerReceiver;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.gmail.GmailScopes;

import java.util.Collections;
import java.util.List;

/**
 * 🛠️ LawEZY INSTITUTIONAL UTILITY: GMAIL TOKEN GENERATOR
 * 
 * USE CASE: If the Gmail API "Refresh Token" in application.yml ever expires or stops working, 
 * run this utility to generate a fresh one.
 * 
 * HOW TO RUN:
 * Open terminal and run:
 * mvn exec:java "-Dexec.mainClass=com.LawEZY.common.util.GmailTokenGenerator"
 */
public class GmailTokenGenerator {
    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static final List<String> SCOPES = Collections.singletonList(GmailScopes.GMAIL_SEND);

    // 🔐 Institutional Credentials (load from environment for push-protection)
    private static final String CLIENT_ID = System.getenv("GMAIL_CLIENT_ID");
    private static final String CLIENT_SECRET = System.getenv("GMAIL_CLIENT_SECRET");


    public static void main(String[] args) throws Exception {
        final HttpTransport HTTP_TRANSPORT = GoogleNetHttpTransport.newTrustedTransport();

        GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
                HTTP_TRANSPORT, JSON_FACTORY, CLIENT_ID, CLIENT_SECRET, SCOPES)
                .setAccessType("offline")
                .build();

        // Standard callback on port 8888
        LocalServerReceiver receiver = new LocalServerReceiver.Builder().setPort(8888).build();
        Credential credential = new AuthorizationCodeInstalledApp(flow, receiver).authorize("user");

        System.out.println("\n" + "=".repeat(50));
        System.out.println("✅ NEW INSTITUTIONAL TOKEN GENERATED");
        System.out.println("=".repeat(50));
        System.out.println("Copy the following Refresh Token to your application.yml:");
        System.out.println("\n" + credential.getRefreshToken());
        System.out.println("\n" + "=".repeat(50));
        
        System.exit(0);
    }
}
