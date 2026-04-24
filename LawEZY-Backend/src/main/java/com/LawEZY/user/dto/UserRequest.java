package com.LawEZY.user.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import com.LawEZY.user.enums.Role;

public class UserRequest{
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = " Password is required")
    @Size(min = 8 , message = "Password must be at least 8 character long")
    private String password;

    @NotBlank(message = "First name is required")
    @JsonProperty("firstName")
    @JsonAlias("firstname")
    private String firstName;

    @JsonProperty("lastName")
    @JsonAlias("lastname")
    private String lastName;

    @NotNull(message = "Role is required")
    private Role role;

    public UserRequest() {}

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
}
