package com.LawEZY.chat.service;

import com.LawEZY.chat.enums.ChatStatus;
import com.LawEZY.chat.model.ChatSession;
import com.LawEZY.chat.repository.ChatMessageRepository;
import com.LawEZY.chat.repository.ChatSessionRepository;
import com.LawEZY.user.entity.ProfessionalProfile;
import com.LawEZY.user.entity.User;
import com.LawEZY.user.repository.ProfessionalProfileRepository;
import com.LawEZY.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.mockito.MockedStatic;
import com.LawEZY.auth.dto.CustomUserDetails;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ChatServiceTest {

    @Mock
    private ChatSessionRepository chatSessionRepository;

    @Mock
    private ChatMessageRepository chatMessageRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProfessionalProfileRepository professionalProfileRepository;

    @Mock
    private com.LawEZY.user.repository.WalletRepository walletRepository;

    @Mock
    private com.LawEZY.user.repository.ClientProfileRepository clientProfileRepository;

    @Mock
    private com.LawEZY.user.repository.LawyerProfileRepository lawyerProfileRepository;

    @Mock
    private com.LawEZY.user.repository.CAProfileRepository caProfileRepository;

    @Mock
    private com.LawEZY.user.repository.CFAProfileRepository cfaProfileRepository;

    @Mock
    private com.LawEZY.user.service.UserService userService;

    @Mock
    private com.LawEZY.user.service.FinancialService financialService;

    @Mock
    private com.LawEZY.common.service.AuditLogService auditLogService;

    @Mock
    private com.LawEZY.ai.service.AiService aiService;

    @Mock
    private com.LawEZY.user.service.WalletService walletService;

    @Mock
    private com.LawEZY.notification.service.NotificationService notificationService;

    @InjectMocks
    private ChatServiceImp chatService;

    private MockedStatic<SecurityContextHolder> securityContextHolderMock;
    private SecurityContext securityContext;
    private Authentication authentication;
    private CustomUserDetails customUserDetails;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        
        // Mock Security Context
        securityContext = mock(SecurityContext.class);
        authentication = mock(Authentication.class);
        customUserDetails = mock(CustomUserDetails.class);
        
        SecurityContextHolder.setContext(securityContext);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(customUserDetails);
    }

    @Test
    void unlockReply_ShouldCreditLawyerAndSetStatusToActive() {
        String sessionId = "session123";
        String professionalUserId = "11PR01LA";

        ChatSession session = new ChatSession();
        session.setId(sessionId);
        session.setProfessionalId(professionalUserId);
        session.setStatus(ChatStatus.LOCKED_REPLY);

        User professionalUser = new User();
        professionalUser.setId(professionalUserId);

        com.LawEZY.user.entity.Wallet wallet = new com.LawEZY.user.entity.Wallet();
        wallet.setId(professionalUserId);
        wallet.setEarnedBalance(100.0);

        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(professionalUserId);
        profile.setUser(professionalUser);
        profile.setChatUnlockFee(100.0);

        when(chatSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(walletService.getWalletByUserId(professionalUserId)).thenReturn(wallet);
        when(walletService.getWalletByUserId(customUserDetails.getId())).thenReturn(wallet); 
        
        com.LawEZY.user.dto.ProfessionalProfileDTO profDTO = new com.LawEZY.user.dto.ProfessionalProfileDTO();
        profDTO.setId(professionalUserId);
        profDTO.setName("Expert Lawyer");
        when(userService.getProfessionalById(professionalUserId)).thenReturn(profDTO);
        
        when(chatSessionRepository.save(any(ChatSession.class))).thenReturn(session);
        when(customUserDetails.getId()).thenReturn(professionalUserId);

        chatService.unlockReply(sessionId, 10);

        assertEquals(ChatStatus.ACTIVE, session.getStatus());
        assertEquals(180.0, wallet.getEarnedBalance()); // 100 + (100 * 0.8)
        verify(walletRepository, times(1)).save(wallet);
    }

    @Test
    void sendMessage_FromUser_ShouldDeductTokens() {
        String sessionId = "session123";
        String userId = "11CL01CL";
        
        ChatSession session = new ChatSession();
        session.setId(sessionId);
        session.setUserId(userId);
        
        User user = new User();
        user.setId(userId);

        com.LawEZY.user.entity.Wallet wallet = new com.LawEZY.user.entity.Wallet();
        wallet.setId(userId);
        wallet.setTokenBalance(10);
        
        com.LawEZY.chat.dto.SendMessageRequest request = new com.LawEZY.chat.dto.SendMessageRequest();
        request.setChatSessionId(sessionId);
        request.setSenderId(userId);
        request.setContent("Hello Lawyer");
        
        when(chatSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(walletRepository.findById(userId)).thenReturn(Optional.of(wallet));
        when(chatMessageRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);
        
        chatService.sendMessage(request);
        
        assertEquals(9, wallet.getTokenBalance());
        verify(walletRepository, times(1)).save(wallet);
    }

    @Test
    void sendMessage_FromProfessional_FirstTime_ShouldLockMessage() {
        String sessionId = "session123";
        String professionalId = "11PR01LA";
        
        ChatSession session = new ChatSession();
        session.setId(sessionId);
        session.setProfessionalId(professionalId);
        session.setStatus(ChatStatus.AWAITING_REPLY);
        
        com.LawEZY.chat.dto.SendMessageRequest request = new com.LawEZY.chat.dto.SendMessageRequest();
        request.setChatSessionId(sessionId);
        request.setSenderId(professionalId);
        request.setContent("I can help you");
        
        when(chatSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(chatMessageRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);
        
        com.LawEZY.chat.dto.ChatMessageResponse response = chatService.sendMessage(request);
        
        assertTrue(response.getIsLocked());
        assertEquals(ChatStatus.LOCKED_REPLY, session.getStatus());
    }

    @Test
    void sendMessage_WithBlockedContent_ShouldThrowException() {
        com.LawEZY.chat.dto.SendMessageRequest request = new com.LawEZY.chat.dto.SendMessageRequest();
        request.setChatSessionId("session123");
        request.setContent("Call me at 9876543210");
        
        ChatSession session = new ChatSession();
        when(chatSessionRepository.findById(anyString())).thenReturn(Optional.of(session));
        
        assertThrows(RuntimeException.class, () -> chatService.sendMessage(request));
    }
}
