package com.LawEZY.auth.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;
import org.springframework.security.core.userdetails.UserDetails;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component // Tells Spring to create one instance of this utility we can use anywhere
public class JwtUtil {

    @org.springframework.beans.factory.annotation.Value("${jwt.secret}")
    private String secretKeyString;
    
    @org.springframework.beans.factory.annotation.Value("${jwt.expirationMs}")
    private long expirationTime;

    private SecretKey getSecretKey() {
        return Keys.hmacShaKeyFor(secretKeyString.getBytes(StandardCharsets.UTF_8));
    }

    // 1. EXTRACT USERNAME (Email) FROM TOKEN
    public String extractUsername(String token) {
        final Claims claims = extractAllClaims(token);
        return claims.getSubject();
    }

    // 2. EXTRACT EXPIRATION DATE FROM TOKEN
    public Date extractExpiration(String token) {
        final Claims claims = extractAllClaims(token);
        return claims.getExpiration();
    }

    // Generic method to pull any specific piece of data (Claim) out of the token
    public <T> T extractClaim(String token, String claimName, Class<T> requiredType) {
        final Claims claims = extractAllClaims(token);
        return claims.get(claimName, requiredType);
    }

    // The core method that reads the token using our secret key
    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSecretKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    // Check if the token has expired
    public Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    // 3. GENERATE A NEW TOKEN FOR A USER
    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>(); 
        
        // Institutional Identity Bridge: Extract Hex ID from our Custom wrapper
        if (userDetails instanceof com.LawEZY.auth.dto.CustomUserDetails) {
            com.LawEZY.auth.dto.CustomUserDetails custom = (com.LawEZY.auth.dto.CustomUserDetails) userDetails;
            claims.put("id", custom.getId());
        }
        
        String role = userDetails.getAuthorities().stream().findFirst().map(auth -> auth.getAuthority()).orElse("ROLE_CLIENT");
        claims.put("role", role);
        return createToken(claims, userDetails.getUsername());
    }

    // The core method that builds and cryptographically signs the final Token string
    private String createToken(Map<String, Object> claims, String subject) {
        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expirationTime))
                .signWith(getSecretKey())
                .compact();
    }

    // 4. VALIDATE TOKEN (Check if it belongs to the user and is not expired)
    public Boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }
}
