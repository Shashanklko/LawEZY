package com.LawEZY.user.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.LawEZY.user.enums.Role;

@Entity
@Table(name="users")
@Data
@NoArgsConstructor // hibernate will create java object when load data from database.
@AllArgsConstructor // it let us to create object easily
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

    public String getName() {
        if (firstName != null && !firstName.isEmpty()) {
            return firstName + (lastName != null ? " " + lastName : "");
        }
        return email;
    }
}
