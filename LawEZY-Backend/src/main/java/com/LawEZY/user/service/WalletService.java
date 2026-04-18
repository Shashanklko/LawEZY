package com.LawEZY.user.service;

import com.LawEZY.user.entity.FinancialTransaction;
import com.LawEZY.user.entity.Wallet;
import com.LawEZY.user.entity.User;
import com.LawEZY.user.repository.FinancialTransactionRepository;
import com.LawEZY.user.repository.WalletRepository;
import com.LawEZY.user.repository.UserRepository;
import com.LawEZY.notification.service.NotificationService;
import com.LawEZY.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.LawEZY.user.entity.Appointment;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class WalletService {

    private final WalletRepository walletRepository;
    private final FinancialTransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public Wallet getWalletByUserId(String identifier) {
        String uid = resolveUid(identifier);
        return walletRepository.findById(uid)
                .orElseGet(() -> createDefaultWallet(uid));
    }

    private String resolveUid(String identifier) {
        // If it looks like a UID (no @), return as is
        if (!identifier.contains("@")) return identifier;
        
        // Otherwise, find user by email and get their real institutional UID
        return userRepository.findByEmail(identifier)
                .map(User::getId)
                .orElse(identifier); // Fallback to whatever was provided
    }

    @Transactional(readOnly = true)
    public List<FinancialTransaction> getTransactionHistory(String identifier) {
        String uid = resolveUid(identifier);
        return transactionRepository.findByUserIdOrderByTimestampDesc(uid);
    }

    @Transactional
    public FinancialTransaction deposit(String identifier, Double amount) {
        String uid = resolveUid(identifier);
        Wallet wallet = getWalletByUserId(uid);
        wallet.setEarnedBalance(wallet.getEarnedBalance() + amount);
        walletRepository.save(wallet);

        FinancialTransaction txn = createTxn(wallet.getUser(), "Wallet Deposit (Top-up)", amount, "COMPLETED");
        FinancialTransaction saved = transactionRepository.save(txn);

        // 🔔 Financial Notification
        try {
            notificationService.sendNotification(uid,
                "💰 Deposit Received",
                String.format("₹%.0f has been credited to your wallet. New balance: ₹%.0f", amount, wallet.getEarnedBalance()),
                "PAYMENT", "FINANCIAL", "/wallet");
        } catch (Exception e) { log.warn("Notification dispatch failed for deposit: {}", e.getMessage()); }

        return saved;
    }

    @Transactional
    public FinancialTransaction purchaseTokensDirectly(String identifier, String packageType) {
        String uid = resolveUid(identifier);
        Wallet wallet = getWalletByUserId(uid);
        
        int tokensToAdd = 0;
        double cost = 0.0;
        String description = "";

        if ("AI_REFILL".equalsIgnoreCase(packageType)) {
            tokensToAdd = 10;
            cost = 100.0;
            description = "LawinoAI Token Refill (Direct Acquisition)";
            wallet.setFreeAiTokens(wallet.getFreeAiTokens() + tokensToAdd);
        } else if ("CHAT_REFILL".equalsIgnoreCase(packageType)) {
            tokensToAdd = 10;
            cost = 100.0;
            description = "Expert Chat Token Refill (Direct Acquisition)";
            wallet.setTokenBalance(wallet.getTokenBalance() + tokensToAdd);
        } else if ("DOC_REFILL".equalsIgnoreCase(packageType)) {
            tokensToAdd = 5;
            cost = 250.0;
            description = "Document Auditor Refill (Direct Acquisition)";
            wallet.setFreeDocTokens(wallet.getFreeDocTokens() + tokensToAdd);
        } else {
            throw new IllegalArgumentException("Invalid institutional package: " + packageType);
        }

        walletRepository.save(wallet);

        // Record the transaction in the ledger
        FinancialTransaction txn = createTxn(wallet.getUser(), description, cost, "COMPLETED");
        FinancialTransaction saved = transactionRepository.save(txn);

        // 🔔 Token Purchase Notification
        try {
            notificationService.sendNotification(uid,
                "🎫 Tokens Acquired",
                String.format("%d tokens added via %s. Ready to use.", tokensToAdd, description),
                "PAYMENT", "FINANCIAL", "/wallet");
        } catch (Exception e) { log.warn("Notification dispatch failed for token purchase: {}", e.getMessage()); }

        return saved;
    }

    @Transactional
    public void logAppointmentTransaction(Appointment appt) {
        if (appt == null || appt.getClientUid() == null) return;
        
        User user = userRepository.findById(appt.getClientUid())
                .or(() -> userRepository.findByEmail(appt.getClientUid()))
                .orElse(null);
                
        if (user == null) return;

        String desc = String.format("Consultation Fee (Ref: %d) - Expert: %s", appt.getId(), appt.getExpertUid());
        FinancialTransaction txn = createTxn(user, desc, appt.getFee(), "COMPLETED");
        transactionRepository.save(txn);
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
                String.format("₹%.0f payout requested. Processing within 3-5 business days.", amount),
                "PAYMENT", "FINANCIAL", "/wallet");
        } catch (Exception e) { log.warn("Notification dispatch failed for withdrawal: {}", e.getMessage()); }

        return saved;
    }

    private Wallet createDefaultWallet(String userId) {
        User user = userRepository.findById(userId)
                .or(() -> userRepository.findByEmail(userId))
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        Wallet wallet = new Wallet();
        wallet.setId(user.getId()); // Ensure the wallet ID uses the proper UID
        wallet.setUser(user);
        wallet.setTokenBalance(5);
        wallet.setEarnedBalance(0.0);
        wallet.setCurrency("INR");
        return walletRepository.save(wallet);
    }

    private FinancialTransaction createTxn(User user, String desc, Double amount, String status) {
        String refId = "TXN-" + (1000 + (int)(Math.random() * 9000));
        String tid = "LZY-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase() + "-" + (1000 + (int)(Math.random() * 9000));

        return FinancialTransaction.builder()
                .id(refId)
                .transactionId(tid)
                .timestamp(LocalDateTime.now())
                .description(desc)
                .amount(amount)
                .status(status)
                .user(user)
                .build();
    }
}
