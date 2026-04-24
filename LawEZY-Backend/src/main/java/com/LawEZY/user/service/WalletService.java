package com.LawEZY.user.service;

import com.LawEZY.user.entity.FinancialTransaction;
import com.LawEZY.user.entity.Wallet;
import com.LawEZY.user.entity.User;
import com.LawEZY.user.repository.FinancialTransactionRepository;
import com.LawEZY.user.repository.WalletRepository;
import com.LawEZY.user.repository.UserRepository;
import com.LawEZY.user.repository.ClientProfileRepository;
import com.LawEZY.user.repository.ProfessionalProfileRepository;
import com.LawEZY.notification.service.NotificationService;
import com.LawEZY.common.exception.ResourceNotFoundException;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.LawEZY.user.entity.Appointment;
import java.time.LocalDateTime;
import java.time.DayOfWeek;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class WalletService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(WalletService.class);

    private final WalletRepository walletRepository;
    private final FinancialTransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final ClientProfileRepository clientProfileRepository;
    private final ProfessionalProfileRepository professionalProfileRepository;
    private final NotificationService notificationService;
    private final com.LawEZY.common.service.EmailService emailService;

    public WalletService(
            WalletRepository walletRepository,
            FinancialTransactionRepository transactionRepository,
            UserRepository userRepository,
            ClientProfileRepository clientProfileRepository,
            ProfessionalProfileRepository professionalProfileRepository,
            NotificationService notificationService,
            com.LawEZY.common.service.EmailService emailService
    ) {
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.clientProfileRepository = clientProfileRepository;
        this.professionalProfileRepository = professionalProfileRepository;
        this.notificationService = notificationService;
        this.emailService = emailService;
    }

    @Transactional
    public Wallet getWalletByUserId(String identifier) {
        String userId = resolveToUserId(identifier);
        return walletRepository.findById(userId)
                .orElseGet(() -> createDefaultWallet(userId));
    }

    private String resolveToUserId(String identifier) {
        if (identifier == null) return null;
        
        // 1. Direct Primary Key Match
        if (userRepository.existsById(identifier)) return identifier;

        // 2. Email Identity Bridge
        if (identifier.contains("@")) {
            return userRepository.findByEmail(identifier)
                    .map(User::getId)
                    .orElse(identifier);
        }
        
        // 3. SEO Slug Bridge
        return professionalProfileRepository.findBySlug(identifier)
                .map(p -> p.getId())
                .orElse(identifier);
    }

    @Transactional(readOnly = true)
    public List<FinancialTransaction> getTransactionHistory(String identifier) {
        String userId = resolveToUserId(identifier);
        return transactionRepository.findByUserIdOrderByTimestampDesc(userId);
    }

    @Transactional
    public FinancialTransaction deposit(String identifier, Double amount) {
        String userId = resolveToUserId(identifier);
        Wallet wallet = getWalletByUserId(userId);
        wallet.setCashBalance(wallet.getCashBalance() + amount);
        walletRepository.save(wallet);

        FinancialTransaction txn = createTxn(wallet.getUser(), "Institutional Top-up", amount, "PAID");
        FinancialTransaction saved = transactionRepository.save(txn);

        // 🔔 Financial Notification
        try {
            notificationService.sendNotification(userId,
                "💰 Deposit Received",
                String.format("₹%.0f has been credited to your institutional wallet. New balance: ₹%.0f", amount, wallet.getCashBalance()),
                "PAYMENT", "FINANCIAL", "/wallet");
        } catch (Exception e) { log.warn("Notification dispatch failed for deposit: {}", e.getMessage()); }

        return saved;
    }

    // DECOMMISSIONED: purchaseTokensDirectly removed in favor of unified wallet deposits and time-based service.

    @Transactional
    public void logAppointmentTransaction(Appointment appt) {
        if (appt == null || appt.getClient() == null) return;
        
        String clientId = appt.getClient().getId();
        Wallet wallet = getWalletByUserId(clientId);

        Double fee = appt.getFee() != null ? appt.getFee() : 0.0;
        Double cashBalance = wallet.getCashBalance() != null ? wallet.getCashBalance() : 0.0;

        if (cashBalance < fee) {
            throw new RuntimeException("Insufficient Main Balance to pay for Appointment Ref: " + appt.getId());
        }

        wallet.setCashBalance(cashBalance - fee);
        walletRepository.save(wallet);

        User user = wallet.getUser();
        String expertId = appt.getExpert() != null ? appt.getExpert().getId() : "N/A";
        String desc = String.format("Consultation Fee (Ref: %d) - Expert: %s", appt.getId(), expertId);
        FinancialTransaction txn = createTxn(user, desc, -fee, "COMPLETED");
        transactionRepository.save(txn);

        if (appt.getExpert() != null) {
            Wallet expertWallet = getWalletByUserId(appt.getExpert().getId());
            double platformCut = appt.getPlatformFee() != null ? appt.getPlatformFee() : 100.0;
            double expertEarned = fee - platformCut;
            if (expertEarned < 0) expertEarned = 0;
            
            expertWallet.setEarnedBalance(expertWallet.getEarnedBalance() + expertEarned);
            walletRepository.save(expertWallet);

            User expertUser = expertWallet.getUser();
            String expertDesc = String.format("Consultation Earned (Ref: %d) - Client: %s", appt.getId(), clientId);
            FinancialTransaction expertTxn = createTxn(expertUser, expertDesc, expertEarned, "COMPLETED");
            transactionRepository.save(expertTxn);

            // 🛡️ Institutional Audit: Explicit Platform Commission Log (Attributed to Master Admin)
            User masterAdmin = userRepository.findByRole(com.LawEZY.user.enums.Role.MASTER_ADMIN).stream().findFirst().orElse(user);
            String platformDesc = String.format("Platform Fee (Ref: %d) - Client: %s", appt.getId(), clientId);
            FinancialTransaction platformTxn = createTxn(masterAdmin, platformDesc, platformCut, "COMPLETED");
            transactionRepository.save(platformTxn);
        }
    }

    /**
     * Preferred overload: uses the authenticated caller's actual DB User ID directly,
     * bypassing the uid->userId resolution chain that may fail for unmapped profile UIDs.
     */
    @Transactional
    public void logAppointmentTransactionByUserId(Appointment appt, String identifier) {
        if (appt == null || identifier == null) return;
        
        // Institutional Guard: Resolve the identifier (which could be ID, UID, or Email) to the actual User ID
        String userId = resolveUid(identifier);
        
        Wallet wallet = walletRepository.findById(userId)
                .orElseGet(() -> createDefaultWallet(userId));

        Double fee = appt.getFee() != null ? appt.getFee() : 0.0;
        Double cashBalance = wallet.getCashBalance() != null ? wallet.getCashBalance() : 0.0;

        if (cashBalance < fee) {
            throw new RuntimeException("Insufficient Main Balance to pay for Appointment Ref: " + appt.getId());
        }

        // Deduct from client
        wallet.setCashBalance(cashBalance - fee);
        walletRepository.save(wallet);

        User user = wallet.getUser();
        String expertId = appt.getExpert() != null ? appt.getExpert().getId() : "N/A";
        String desc = String.format("Consultation Fee (Ref: %d) - Expert: %s", appt.getId(), expertId);
        FinancialTransaction txn = createTxn(user, desc, -fee, "COMPLETED");
        transactionRepository.save(txn);

        if (appt.getExpert() != null) {
            Wallet expertWallet = walletRepository.findById(appt.getExpert().getId())
                    .orElseGet(() -> createDefaultWallet(appt.getExpert().getId()));
            double platformCut = appt.getPlatformFee() != null ? appt.getPlatformFee() : (fee * 0.20);
            double expertEarned = fee - platformCut;
            if (expertEarned < 0) expertEarned = 0;
            
            User expertUser = expertWallet.getUser();
            String expertDesc = String.format("Consultation SECURED (Vault: %d) - Client: %s", appt.getId(), userId);
            
            // Move to Escrow instead of direct Earned Balance
            expertWallet.setEscrowBalance(expertWallet.getEscrowBalance() + expertEarned);
            walletRepository.save(expertWallet);

            FinancialTransaction expertTxn = createTxn(expertUser, expertDesc, expertEarned, "ESCROW");
            transactionRepository.save(expertTxn);

            // 🛡️ Institutional Audit: Explicit Platform Commission Log (Attributed to Master Admin)
            User masterAdmin = userRepository.findByRole(com.LawEZY.user.enums.Role.MASTER_ADMIN).stream().findFirst().orElse(user);
            String platformDesc = String.format("Platform Fee (Ref: %d) - Client: %s", appt.getId(), userId);
            FinancialTransaction platformTxn = createTxn(masterAdmin, platformDesc, platformCut, "COMPLETED");
            transactionRepository.save(platformTxn);
        }
        log.info("[WALLET] Appointment Ref-{} payment processed: Client deducted ₹{} via direct User ID.", appt.getId(), fee);
    }

    @Transactional
    public void releaseEscrow(Appointment appt) {
        if (appt == null || appt.getExpert() == null || appt.getPayoutReleased()) return;

        Wallet expertWallet = walletRepository.findById(appt.getExpert().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Expert wallet not found"));

        Double fee = appt.getFee() != null ? appt.getFee() : 0.0;
        Double platformCut = appt.getPlatformFee() != null ? appt.getPlatformFee() : 100.0;
        Double expertEarned = fee - platformCut;
        if (expertEarned < 0) expertEarned = 0.0;

        // Verify if enough in escrow to prevent double-dipping or inconsistencies
        if (expertWallet.getEscrowBalance() < expertEarned) {
            log.warn("[WALLET] Escrow balance low for Ref-{}, release may be partial or already processed.", appt.getId());
            // We still proceed if it's a valid release, but adjust to what's available
            expertEarned = Math.min(expertEarned, expertWallet.getEscrowBalance());
        }

        expertWallet.setEscrowBalance(expertWallet.getEscrowBalance() - expertEarned);
        expertWallet.setEarnedBalance(expertWallet.getEarnedBalance() + expertEarned);
        walletRepository.save(expertWallet);

        String desc = String.format("Consultation RELEASED (Ref: %d) - From Vault", appt.getId());
        FinancialTransaction txn = createTxn(expertWallet.getUser(), desc, expertEarned, "COMPLETED");
        transactionRepository.save(txn);
        
        // 🔔 EMAIL NOTIFICATION TO EXPERT
        try {
            java.util.Map<String, Object> model = new java.util.HashMap<>();
            model.put("greeting", "Hello " + expertWallet.getUser().getFirstName() + ", your consultation payout has been released.");
            model.put("amount", "₹" + String.format("%.2f", expertEarned));
            model.put("refId", appt.getId().toString());
            model.put("sessionType", "Institutional Appointment");
            
            emailService.sendHtmlEmail(expertWallet.getUser().getEmail(), "LawEZY: Payout Released", "emails/payout-notification", model);
        } catch (Exception e) {
            log.warn("Failed to dispatch payout release email: {}", e.getMessage());
        }
        
        log.info("[WALLET] Escrow released for Appointment Ref-{}. Amount: ₹{}", appt.getId(), expertEarned);
    }

    @Transactional
    public FinancialTransaction withdraw(String identifier, Double amount) {
        String uid = resolveUid(identifier);
        Wallet wallet = getWalletByUserId(uid);
        if (wallet.getEarnedBalance() < amount) {
            throw new RuntimeException("Insufficient funds for institutional liquidation.");
        }

        wallet.setEarnedBalance(wallet.getEarnedBalance() - amount);
        walletRepository.save(wallet);

        FinancialTransaction txn = createTxn(wallet.getUser(), "Withdrawal Request (Expert Payout)", -amount, "PENDING");
        FinancialTransaction saved = transactionRepository.save(txn);

        // 🔔 Withdrawal Notification
        try {
            notificationService.sendNotification(uid,
                "💸 Withdrawal Initiated",
                String.format("₹%.0f payout request submitted. Admin settles expert payouts at week-end.", amount),
                "PAYMENT", "FINANCIAL", "/wallet");
        } catch (Exception e) { log.warn("Notification dispatch failed for withdrawal: {}", e.getMessage()); }

        return saved;
    }

    @Transactional(readOnly = true)
    public List<FinancialTransaction> getPendingExpertWithdrawals() {
        return transactionRepository.findByStatusOrderByTimestampAsc("PENDING")
                .stream()
                .filter(tx -> tx.getDescription() != null && tx.getDescription().contains("Withdrawal Request (Expert Payout)"))
                .collect(Collectors.toList());
    }

    @Transactional
    public FinancialTransaction markWithdrawalPaid(String transactionRefId) {
        if (!isWeeklySettlementWindow()) {
            throw new RuntimeException("Weekly payout settlement is allowed only on Saturday or Sunday.");
        }

        FinancialTransaction txn = transactionRepository.findById(transactionRefId)
                .orElseThrow(() -> new ResourceNotFoundException("Withdrawal transaction not found: " + transactionRefId));

        if (!"PENDING".equalsIgnoreCase(txn.getStatus())) {
            throw new RuntimeException("Withdrawal is not pending for payout settlement.");
        }
        if (txn.getDescription() == null || !txn.getDescription().contains("Withdrawal Request (Expert Payout)")) {
            throw new RuntimeException("Transaction is not an expert payout withdrawal request.");
        }

        txn.setStatus("PAID");
        return transactionRepository.save(txn);
    }

    private boolean isWeeklySettlementWindow() {
        DayOfWeek day = LocalDateTime.now().getDayOfWeek();
        return day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY;
    }

    // DECOMMISSIONED: creditTokens removed. Use deposit() for all financial inflows.

    private Wallet createDefaultWallet(String userId) {
        User user = userRepository.findById(userId)
                .or(() -> userRepository.findByEmail(userId))
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        Wallet wallet = new Wallet();
        wallet.setId(user.getId()); // Ensure the wallet ID uses the proper UID
        wallet.setUser(user);
        wallet.setFreeAiTokens(5);
        wallet.setFreeChatTokens(0); // Legacy trial disabled in favor of 5-min time window
        wallet.setFreeDocTokens(5);
        wallet.setAiTokenLimit(5);
        wallet.setDocTokenLimit(5);
        wallet.setCashBalance(0.0);   // Explicit initialization to prevent NPE
        wallet.setEarnedBalance(0.0);
        wallet.setEscrowBalance(0.0);
        wallet.setCurrency("INR");
        return walletRepository.save(wallet);
    }

    private FinancialTransaction createTxn(User user, String desc, Double amount, String status) {
        String refId = "TXN-" + (1000 + (int)(Math.random() * 9000));
        String tid = "LZY-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase() + "-" + (1000 + (int)(Math.random() * 9000));
        return new FinancialTransaction(refId, tid, LocalDateTime.now(), desc, amount, status, user);
    }

    /** Alias for resolveToUserId for legacy call compatibility. */
    private String resolveUid(String identifier) {
        return resolveToUserId(identifier);
    }

    @Transactional
    public void resetWallet(String identifier) {
        String uid = resolveUid(identifier);
        Wallet wallet = getWalletByUserId(uid);
        
        wallet.setCashBalance(0.0);
        wallet.setEarnedBalance(0.0);
        wallet.setEscrowBalance(0.0);
        wallet.setFreeAiTokens(0);
        wallet.setFreeChatTokens(0);
        wallet.setFreeDocTokens(0);
        wallet.setAiTokenLimit(5);
        wallet.setDocTokenLimit(5);
        wallet.setTokenBalance(0);
        walletRepository.save(wallet);
        
        transactionRepository.deleteByUserId(uid);
        log.info("Institutional Ledger Reset for UID: {}", uid);
    }

    @Transactional
    public Wallet purchasePackage(String userId, String packageType) {
        Wallet wallet = getWalletByUserId(userId);
        double cost = 0;
        int tokens = 0;
        String desc = "";

        if ("AI_15".equalsIgnoreCase(packageType)) {
            cost = 150.0;
            tokens = 15;
            desc = "AI Intelligence Refill (15 Queries)";
            if (wallet.getCashBalance() < cost) throw new RuntimeException("Insufficient balance for AI refill.");
            wallet.setCashBalance(wallet.getCashBalance() - cost);
            wallet.setFreeAiTokens((wallet.getFreeAiTokens() != null ? wallet.getFreeAiTokens() : 0) + tokens);
            wallet.setAiTokenLimit((wallet.getAiTokenLimit() != null ? wallet.getAiTokenLimit() : 5) + tokens);
        } else if ("DOC_5".equalsIgnoreCase(packageType)) {
            cost = 250.0;
            tokens = 25; // 5 Document Audits * 5 Tokens/Audit = 25 Tokens
            desc = "Document Auditor Refill (5 Reviews)";
            if (wallet.getCashBalance() < cost) throw new RuntimeException("Insufficient balance for Document Auditor refill.");
            wallet.setCashBalance(wallet.getCashBalance() - cost);
            wallet.setFreeDocTokens((wallet.getFreeDocTokens() != null ? wallet.getFreeDocTokens() : 0) + tokens);
            wallet.setDocTokenLimit((wallet.getDocTokenLimit() != null ? wallet.getDocTokenLimit() : 5) + tokens);
        } else {
            throw new RuntimeException("Invalid package type.");
        }

        walletRepository.save(wallet);
        FinancialTransaction txn = createTxn(wallet.getUser(), desc, -cost, "COMPLETED");
        transactionRepository.save(txn);

        log.info("[WALLET] Package purchased: {} by user: {}", packageType, userId);
        return wallet;
    }
}
