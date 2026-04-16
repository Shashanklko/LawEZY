package com.LawEZY.auth.dto;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Data;

import com.LawEZY.user.enums.Role;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    private String token;
    private String message;
    private String id;        // Internal Database ID (e.g., 12SN01CL)
    private String publicUid; // Institutional Public Identifier (e.g., AP34SHLW)
    private String firstName;
    private String lastName;
    private Role role;
}
