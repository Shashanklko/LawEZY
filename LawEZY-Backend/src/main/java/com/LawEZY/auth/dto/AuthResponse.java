package com.LawEZY.auth.dto;

import com.LawEZY.user.enums.Role;

public class AuthResponse {
    private String token;
    private String message;
    private String id;        // Internal Database ID (e.g., 12SN01CL)
    private String firstName;
    private String lastName;
    private Role role;

    public AuthResponse() {}

    public AuthResponse(String token, String message, String id, String firstName, String lastName, Role role) {
        this.token = token;
        this.message = message;
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.role = role;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
}
