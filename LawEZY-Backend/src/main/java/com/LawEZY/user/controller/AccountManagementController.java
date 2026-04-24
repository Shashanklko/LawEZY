package com.LawEZY.user.controller;

import com.LawEZY.common.service.AuditLogService;
import com.LawEZY.user.service.FinancialService;
import com.LawEZY.user.service.AppointmentService;
import com.LawEZY.user.entity.FinancialTransaction;
import com.LawEZY.common.entity.AuditLog;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/account")
public class AccountManagementController {

    private final AuditLogService auditLogService;
    private final FinancialService financialService;
    private final AppointmentService appointmentService;

    public AccountManagementController(AuditLogService auditLogService, FinancialService financialService, AppointmentService appointmentService) {
        this.auditLogService = auditLogService;
        this.financialService = financialService;
        this.appointmentService = appointmentService;
    }

    @GetMapping("/sessions")
    public ResponseEntity<List<AuditLog>> getMySessions() {
        String userId = getCurrentUserId();
        return ResponseEntity.ok(auditLogService.getLogsByUserId(userId, 5));
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<FinancialTransaction>> getMyTransactions() {
        String userId = getCurrentUserId();
        return ResponseEntity.ok(financialService.getTransactionsByUserId(userId));
    }

    @PostMapping("/deposit")
    public ResponseEntity<FinancialTransaction> depositFunds(@RequestBody Map<String, Double> payload) {
        String userId = getCurrentUserId();
        Double amount = payload.get("amount");
        return ResponseEntity.ok(financialService.recordTransaction(userId, "Wallet Deposit (Institutional Funding)", amount, "COMPLETED", "CREDIT"));
    }

    @PostMapping("/withdraw")
    public ResponseEntity<FinancialTransaction> requestWithdrawal(@RequestBody Map<String, Double> payload) {
        String userId = getCurrentUserId();
        Double amount = payload.get("amount");
        return ResponseEntity.ok(financialService.createWithdrawalRequest(userId, amount));
    }

    @PostMapping("/admin/approve-payout/{transactionId}")
    public ResponseEntity<FinancialTransaction> approvePayout(@PathVariable String transactionId) {
        // Simulating admin approval
        return ResponseEntity.ok(financialService.recordTransaction(getCurrentUserId(), "Payout Processed: Institutional Liquidation", 0.0, "PAID", "DEBIT"));
    }

    @PostMapping("/pay-appointment/{id}")
    public ResponseEntity<com.LawEZY.user.entity.Appointment> payForAppointment(@PathVariable Long id) {
        String userId = getCurrentUserId();
        com.LawEZY.user.entity.Appointment appt = appointmentService.getAppointmentsForClient(userId)
                .stream().filter(a -> a.getId().equals(id)).findFirst()
                .orElseThrow(() -> new com.LawEZY.common.exception.ResourceNotFoundException("Appointment not found."));

        if (!"AWAITING_PAYMENT".equals(appt.getStatus())) {
            throw new RuntimeException("This appointment is not awaiting payment.");
        }

        // 1. Financial Validation
        financialService.validateSufficientFunds(userId, -appt.getFee());

        // 2. Ledger Update
        financialService.recordTransaction(userId, "Institutional Appointment Payment - ID: " + id, -appt.getFee(), "COMPLETED", "DEBIT");

        // 3. Status Escalation & Room Activation
        appt.setStatus("PAID");
        String secureId = java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        appt.setRoomId("lzy-room-" + secureId);
        
        return ResponseEntity.ok(appointmentService.updateStatus(id, "PAID"));
    }

    @PostMapping("/purchase-tokens")
    public ResponseEntity<com.LawEZY.user.entity.Wallet> purchaseTokens(@RequestBody Map<String, Object> payload) {
        String userId = getCurrentUserId();
        Integer tokens = Integer.valueOf(payload.getOrDefault("tokens", 15).toString());
        Double cost = Double.valueOf(payload.getOrDefault("cost", 100.0).toString());
        return ResponseEntity.ok(financialService.purchaseTokens(userId, tokens, cost));
    }

    @PostMapping("/book-appointment")
    public ResponseEntity<FinancialTransaction> bookAppointment(@RequestBody Map<String, Object> payload) {
        String userId = getCurrentUserId();
        String expertUid = (String) payload.get("expertUid");
        Double fee = Double.valueOf(payload.get("fee").toString());

        // Institutional Protocol: Verify sufficient institutional capital before booking
        financialService.validateSufficientFunds(userId, -fee);
        // Register institutional appointment in the official registry
        com.LawEZY.user.entity.Appointment appt = new com.LawEZY.user.entity.Appointment();
        appt.setClientId(userId);
        appt.setExpertId(expertUid);
        appt.setFee(fee);
        appt.setStatus("PAID");
        appointmentService.createAppointment(appt);

        return ResponseEntity.ok(financialService.recordTransaction(userId, "Appointment Booked - Expert UID: " + expertUid, -fee, "COMPLETED", "DEBIT"));
    }


    private String getCurrentUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new RuntimeException("Unauthorized access to institutional dossier.");
        }
        
        Object principal = auth.getPrincipal();
        if (principal instanceof com.LawEZY.auth.dto.CustomUserDetails) {
            return ((com.LawEZY.auth.dto.CustomUserDetails) principal).getId();
        }
        
        return auth.getName();
    }
}
