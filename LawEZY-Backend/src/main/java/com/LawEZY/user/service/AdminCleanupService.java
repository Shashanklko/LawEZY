package com.LawEZY.user.service;

import com.LawEZY.user.entity.User;
import com.LawEZY.user.enums.Role;
import com.LawEZY.user.repository.*;
import com.LawEZY.common.repository.AuditLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;

import java.util.Arrays;
import java.util.List;

@Service
@Slf4j
public class AdminCleanupService {

    @Autowired private UserRepository userRepository;
    @Autowired private WalletRepository walletRepository;
    @Autowired private FinancialTransactionRepository financialTransactionRepository;
    @Autowired private AppointmentRepository appointmentRepository;
    @Autowired private ReviewRepository reviewRepository;
    @Autowired private ProfessionalProfileRepository professionalProfileRepository;
    @Autowired private ClientProfileRepository clientProfileRepository;

    @org.springframework.context.annotation.Lazy
    @Autowired private AdminCleanupService self;

    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void onApplicationReady() {
        try {
            self.cleanup();
        } catch (Exception e) {
            log.error("❌ INSTITUTIONAL CLEANUP: Final failure in startup purge.", e);
        }
    }

    @Transactional
    public void cleanup() {
        List<String> idsToDelete = Arrays.asList("21LZ76AD", "25MA01MA");
        log.info("🛡️ INSTITUTIONAL CLEANUP: Starting purge for redundant administrative identities: {}", idsToDelete);
        
        for (String id : idsToDelete) {
            try {
                performSurgicalDelete(id);
            } catch (Exception e) {
                log.error("❌ Cleanup failed for ID: {}", id, e);
            }
        }
    }

    @Transactional
    public void performSurgicalDelete(String id) {
        userRepository.findById(id).ifPresent(user -> {
            log.info("🔥 Purging identity: {} ({})", user.getEmail(), id);
            
            // 🛡️ Cascade Purge
            walletRepository.deleteByUserId(id);
            financialTransactionRepository.deleteByUserId(id);
            appointmentRepository.deleteByExpert_Id(id);
            appointmentRepository.deleteByClient_Id(id);
            reviewRepository.deleteByExpert_Id(id);
            reviewRepository.deleteByClient_Id(id);
            professionalProfileRepository.deleteByUserId(id);
            clientProfileRepository.deleteById(id);
            
            userRepository.delete(user);
            log.info("✅ Identity {} purged successfully.", id);
        });
    }
}
