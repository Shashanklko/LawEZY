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
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        
        // 1. Find user in MySQL
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        // 2. Resolve public UID from profile
        String uid = null;
        if (user.getRole() == Role.CLIENT) {
            uid = clientProfileRepository.findById(user.getId()).map(p -> p.getUid()).orElse(null);
        } else {
            // Priority 1: Check specialized profile tables for active public UID
            if (user.getRole() == Role.LAWYER) {
                uid = lawyerProfileRepository.findById(user.getId()).map(p -> p.getUid()).orElse(null);
            } else if (user.getRole() == Role.CA) {
                uid = caProfileRepository.findById(user.getId()).map(p -> p.getUid()).orElse(null);
            } else if (user.getRole() == Role.CFA) {
                uid = cfaProfileRepository.findById(user.getId()).map(p -> p.getUid()).orElse(null);
            }
            
            // Priority 2: Fallback to base unified professional profile
            if (uid == null) {
                uid = professionalProfileRepository.findById(user.getId()).map(p -> p.getUid()).orElse(null);
            }
        }
        
        // Fallback to internal ID if UID not yet generated (should be rare)
        if (uid == null) uid = user.getId();

        // 3. Wrap in CustomUserDetails to preserve the ID and UID for the JWT layer
        return new CustomUserDetails(
                user.getId(),
                uid,
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
