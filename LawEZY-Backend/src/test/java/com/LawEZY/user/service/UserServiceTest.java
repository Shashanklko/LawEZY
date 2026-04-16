package com.LawEZY.user.service;

import com.LawEZY.user.dto.UserRequest;
import com.LawEZY.user.dto.UserResponse;
import com.LawEZY.user.entity.User;
import com.LawEZY.user.entity.ProfessionalProfile;
import com.LawEZY.user.enums.Role;
import com.LawEZY.user.repository.UserRepository;
import com.LawEZY.user.repository.ProfessionalProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProfessionalProfileRepository professionalProfileRepository;

    @Mock
    private com.LawEZY.user.repository.ClientProfileRepository clientProfileRepository;

    @Mock
    private com.LawEZY.user.repository.WalletRepository walletRepository;

    @Mock
    private com.LawEZY.user.repository.LawyerProfileRepository lawyerProfileRepository;

    @Mock
    private com.LawEZY.user.repository.CAProfileRepository caProfileRepository;

    @Mock
    private com.LawEZY.user.repository.CFAProfileRepository cfaProfileRepository;

    @Mock
    private com.LawEZY.user.repository.ReviewRepository reviewRepository;

    @Mock
    private com.LawEZY.chat.repository.ChatSessionRepository chatSessionRepository;

    @Mock
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserServiceImp userService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void createUser_Client_ShouldNotCreateProfile() {
        UserRequest request = new UserRequest();
        request.setEmail("client@test.com");
        request.setPassword("password123");
        request.setFirstName("Test");
        request.setLastName("Client");
        request.setRole(Role.CLIENT);

        User user = new User();
        user.setId("11TC01CL");
        user.setEmail(request.getEmail());
        user.setRole(Role.CLIENT);

        when(passwordEncoder.encode(any())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(user);

        UserResponse response = userService.createUser(request);

        assertNotNull(response);
        verify(professionalProfileRepository, never()).save(any(ProfessionalProfile.class));
    }

    @Test
    void createUser_Lawyer_ShouldCreateProfile() {
        UserRequest request = new UserRequest();
        request.setEmail("lawyer@test.com");
        request.setPassword("password123");
        request.setFirstName("Test");
        request.setLastName("Lawyer");
        request.setRole(Role.LAWYER);

        User user = new User();
        user.setId("11XA01LA");
        user.setEmail(request.getEmail());
        user.setRole(Role.LAWYER);

        when(passwordEncoder.encode(any())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(user);

        UserResponse response = userService.createUser(request);

        assertNotNull(response);
        verify(professionalProfileRepository, times(1)).save(any(ProfessionalProfile.class));
    }
}
