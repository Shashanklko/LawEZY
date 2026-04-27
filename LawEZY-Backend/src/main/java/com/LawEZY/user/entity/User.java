package com.LawEZY.user.entity;

import jakarta.persistence.*;
import com.LawEZY.user.enums.Role;

@Entity
@Table(name="users")
public class User {
    @Id
    @Column(length = 25)
    private String id;
    private String email;
    @Column(name = "first_name")
    private String firstName;
    @Column(name = "last_name")
    private String lastName;
    private String password;
    @Enumerated(EnumType.STRING)
    private Role role;
    private boolean enabled = true;
    @Column(columnDefinition = "TEXT")
    private String permissions = "ALL"; // Default for legacy/master
    @Column(name = "login_id", unique = true)
    private String loginId;

    public User() {}
    public User(String id, String email, String firstName, String lastName, String password, Role role, boolean enabled) {
        this.id = id;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.password = password;
        this.role = role;
        this.enabled = enabled;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getPermissions() { return permissions; }
    public void setPermissions(String permissions) { this.permissions = permissions; }
    public String getLoginId() { return loginId; }
    public void setLoginId(String loginId) { this.loginId = loginId; }

    public String getName() {
        if (firstName != null && !firstName.isEmpty()) {
            return firstName + (lastName != null ? " " + lastName : "");
        }
        return email;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("status")
    public String getStatus() {
        return enabled ? "ACTIVE" : "BLOCKED";
    }
}
