package com.LawEZY.auth.dto;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;

import java.util.Collection;

/**
 * Institutional Security Wrapper
 * Extends default Spring User to carry the internal Hex ID into the JWT pipeline.
 */
public class CustomUserDetails extends User {
    private final String id;

    public CustomUserDetails(String id, String email, String password, boolean enabled, 
                             boolean accountNonExpired, boolean credentialsNonExpired, 
                             boolean accountNonLocked, Collection<? extends GrantedAuthority> authorities) {
        super(email, password, enabled, accountNonExpired, credentialsNonExpired, accountNonLocked, authorities);
        this.id = id;
    }

    public String getId() {
        return id;
    }
}
