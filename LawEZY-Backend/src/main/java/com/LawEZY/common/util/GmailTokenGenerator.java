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

import java.io.File;
import java.util.Collections;
import java.util.List;

/**
 * 🛠️ LawEZY INSTITUTIONAL UTILITY: GMAIL TOKEN GENERATOR
 * 
 * USE CASE: If the Gmail API "Refresh Token" in application.yml ever expires or stops working, 
 * run this utility to generate a fresh one.
 * 
 * IMPORTANT: This version forces re-consent to guarantee a NEW refresh token.
 * It also clears any cached tokens to avoid returning stale ones.
 * 
 * HOW TO RUN:
 * 1. Set environment variables: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET
 * 2. Run: mvn exec:java "-Dexec.mainClass=com.LawEZY.common.util.GmailTokenGenerator"
 * 3. A browser window will open — sign in and grant permission.
 * 4. Copy the new refresh token into application.yml / Render env vars.
 */
public class GmailTokenGenerator {
    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static final List<String> SCOPES = Collections.singletonList(GmailScopes.GMAIL_SEND);

    // 🔐 Institutional Credentials (load from environment for push-protection)
    private static final String CLIENT_ID = System.getenv("GMAIL_CLIENT_ID");
    private static final String CLIENT_SECRET = System.getenv("GMAIL_CLIENT_SECRET");

    public static void main(String[] args) throws Exception {

        // ─── Step 0: Clear any cached tokens from previous runs ───
        File tokensDir = new File("tokens");
        if (tokensDir.exists()) {
            File[] files = tokensDir.listFiles();
            if (files != null) {
                for (File f : files) {
                    f.delete();
                }
            }
            tokensDir.delete();
            System.out.println("🧹 Cleared cached tokens directory.");
        }

        if (CLIENT_ID == null || CLIENT_SECRET == null) {
            System.err.println("❌ ERROR: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET environment variables must be set!");
            System.err.println("   Example (PowerShell):");
            System.err.println("   $env:GMAIL_CLIENT_ID=\"your-client-id\"");
            System.err.println("   $env:GMAIL_CLIENT_SECRET=\"your-client-secret\"");
            System.exit(1);
        }

        final HttpTransport HTTP_TRANSPORT = GoogleNetHttpTransport.newTrustedTransport();

        // ─── Key: setApprovalPrompt("force") ensures Google issues a BRAND NEW refresh token ───
        GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
                HTTP_TRANSPORT, JSON_FACTORY, CLIENT_ID, CLIENT_SECRET, SCOPES)
                .setAccessType("offline")
                .setApprovalPrompt("force")
                .build();

        LocalServerReceiver receiver = new LocalServerReceiver.Builder().setPort(8888).build();
        
        System.out.println("\n🚀 [OAUTH] Launching browser for LawEZY Institutional Authorization...");
        System.out.println("   Scope: " + SCOPES);
        System.out.println("   ⚠️  You MUST re-grant consent to get a new token!\n");

        Credential credential = new AuthorizationCodeInstalledApp(flow, receiver).authorize("user");

        String refreshToken = credential.getRefreshToken();

        System.out.println("\n" + "=".repeat(60));
        if (refreshToken == null || refreshToken.isEmpty()) {
            System.out.println("❌ FAILED: No refresh token received!");
            System.out.println("   Make sure you clicked 'Allow' on the consent screen.");
            System.out.println("   If the problem persists, revoke app access at:");
            System.out.println("   https://myaccount.google.com/permissions");
            System.out.println("   Then run this generator again.");
        } else {
            System.out.println("✅ NEW INSTITUTIONAL REFRESH TOKEN GENERATED");
            System.out.println("=".repeat(60));
            System.out.println("\nCopy this value to your application.yml and Render env vars:\n");
            System.out.println("GMAIL_REFRESH_TOKEN=" + refreshToken);
            System.out.println("\n(In application.yml format):");
            System.out.println("spring.gmail.refresh-token: " + refreshToken);
        }
        System.out.println("=".repeat(60));
        
        System.exit(0);
    }
}
