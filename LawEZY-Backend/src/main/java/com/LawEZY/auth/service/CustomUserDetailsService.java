package com.LawEZY.auth.service;

import com.LawEZY.auth.dto.CustomUserDetails;
import com.LawEZY.user.entity.User;
import com.LawEZY.user.repository.UserRepository;
import com.LawEZY.user.repository.ProfessionalProfileRepository;
import com.LawEZY.user.repository.ClientProfileRepository;
import com.LawEZY.user.enums.Role;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service 
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ProfessionalProfileRepository professionalProfileRepository;
    @Autowired
    private ClientProfileRepository clientProfileRepository;
    @Autowired
    private com.LawEZY.user.repository.LawyerProfileRepository lawyerProfileRepository;
    @Autowired
    private com.LawEZY.user.repository.CAProfileRepository caProfileRepository;
    @Autowired
    private com.LawEZY.user.repository.CFAProfileRepository cfaProfileRepository;

    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        
        // 🛡️ TRIPLE IDENTITY RESOLUTION: Find user by Email OR Institutional ID OR Custom Login ID
        User user = userRepository.findByEmailOrIdOrLoginId(identifier, identifier, identifier)
                .orElseThrow(() -> new UsernameNotFoundException("Identity not found for: " + identifier));

        // 3. Wrap in CustomUserDetails to preserve the ID for the JWT layer
        return new CustomUserDetails(
                user.getId(),
                user.getEmail(),
                user.getPassword(),
                user.isEnabled(), 
                true, 
                true, 
                true, 
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }
}
