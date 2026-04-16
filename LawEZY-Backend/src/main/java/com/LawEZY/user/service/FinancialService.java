package com.LawEZY.user.service;

import com.LawEZY.user.entity.FinancialTransaction;
import com.LawEZY.user.repository.FinancialTransactionRepository;
import com.LawEZY.user.repository.UserRepository;
import com.LawEZY.user.repository.WalletRepository;
import com.LawEZY.user.entity.User;
import com.LawEZY.user.entity.Wallet;
import com.LawEZY.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FinancialService {

    private final FinancialTransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final WalletService walletService;

    @Transactional(readOnly = true)
    public List<FinancialTransaction> getTransactionsByUserId(String userId) {
        return transactionRepository.findByUserIdOrderByTimestampDesc(userId);
    }

    @Transactional
    public FinancialTransaction createWithdrawalRequest(String userId, Double amount) {
        User user = findUserByIdentifier(userId);
        
        // Institutional Liquidation Check
        validateSufficientFunds(user.getId(), amount);

        String refId = "TXN-" + (1000 + (int)(Math.random() * 9000));
        String tid = "LZY-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase() + "-" + (1000 + (int)(Math.random() * 9000));

        FinancialTransaction txn = FinancialTransaction.builder()
                .id(refId)
                .transactionId(tid)
                .timestamp(LocalDateTime.now())
                .description("Withdrawal Request")
                .amount(-Math.abs(amount))
                .status("PENDING")
                .user(user)
                .build();
        
        // Update Actual Wallet Reserves
        Wallet wallet = walletService.getWalletByUserId(user.getId());
        wallet.setEarnedBalance(wallet.getEarnedBalance() - Math.abs(amount));
        walletRepository.save(wallet);

        return transactionRepository.save(txn);
    }

    public void validateSufficientFunds(String userId, Double amountRequired) {
        // Institutional Override for Privileged Tester
        if ("11SS01CL".equals(userId)) return;

        Wallet wallet = walletService.getWalletByUserId(userId);
        // If amountRequired is positive, we are checking Earned Balance (Withdrawal)
        // If amountRequired is negative, we are checking Token Balance (Booking)
        if (amountRequired < 0) {
            if (wallet.getTokenBalance().doubleValue() < Math.abs(amountRequired)) {
                throw new RuntimeException("Institutional protocol failure: Insufficient Institutional Tokens (Required: " + Math.abs(amountRequired) + ")");
            }
        } else {
            if (wallet.getEarnedBalance() < amountRequired) {
                throw new RuntimeException("Institutional protocol failure: Insufficient Earned Balance (Available: " + wallet.getEarnedBalance() + ")");
            }
        }
    }

    @Transactional
    public Wallet purchaseTokens(String userId, Integer tokenCount, Double cost) {
        Wallet wallet = walletService.getWalletByUserId(userId);
        
        // 1. Identify Funding Source (Expert utilizes Revenue, Client utilizes Cash)
        User user = wallet.getUser();
        boolean isExpert = List.of("LAWYER", "CA", "CFA", "ROLE_LAWYER", "ROLE_CA", "ROLE_CFA")
                .contains(user.getRole().name());

        Double availableFunds = isExpert ? wallet.getEarnedBalance() + wallet.getCashBalance() : wallet.getCashBalance();

        if (availableFunds < cost) {
            throw new RuntimeException("Insufficient Funds. Available: " + availableFunds + ", Required: " + cost);
        }

        // Institutional Deduction
        if (isExpert && wallet.getEarnedBalance() >= cost) {
            wallet.setEarnedBalance(wallet.getEarnedBalance() - cost);
        } else {
            wallet.setCashBalance(wallet.getCashBalance() - cost);
        }

        // 3. Quota Refill
        wallet.setTokenBalance(wallet.getTokenBalance() + tokenCount);
        
        // 4. Ledger Entry
        recordTransaction(userId, "Institutional Token Purchase: " + tokenCount + " Credits", -cost, "COMPLETED", "DEBIT");
        
        return walletRepository.save(wallet);
    }

    @Transactional
    public FinancialTransaction recordTransaction(String userId, String description, Double amount, String status, String type) {
        User user = findUserByIdentifier(userId);

        String refId = "TXN-" + (1000 + (int)(Math.random() * 9000));
        String tid = "LZY-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase() + "-" + (1000 + (int)(Math.random() * 9000));

        FinancialTransaction txn = FinancialTransaction.builder()
                .id(refId)
                .transactionId(tid)
                .timestamp(LocalDateTime.now())
                .description(description)
                .amount(amount)
                .status(status)
                .user(user)
                .build();

        // Perform Ledger Synchronization if transaction is finalized
        if ("COMPLETED".equalsIgnoreCase(status) || "PAID".equalsIgnoreCase(status)) {
            // Bypass Protocol: No deductions for Privileged Tester (11SS01CL)
            if ("11SS01CL".equals(user.getId()) && amount < 0) {
                return transactionRepository.save(txn);
            }

            Wallet wallet = walletService.getWalletByUserId(user.getId());
            if (amount < 0) {
                // Client deduction (Institutional Tokens)
                if (description.contains("Appointment") || description.contains("Session")) {
                    // Actual cash deduction for appointments
                    wallet.setCashBalance(wallet.getCashBalance() - Math.abs(amount));
                } else {
                    wallet.setTokenBalance(wallet.getTokenBalance() - (int)Math.abs(amount));
                }
            } else {
                // Expert Revenue vs Client Deposit
                boolean isExpert = List.of("LAWYER", "CA", "CFA", "ROLE_LAWYER", "ROLE_CA", "ROLE_CFA")
                        .contains(user.getRole().name());
                
                if (description.contains("Wallet Deposit")) {
                    wallet.setCashBalance(wallet.getCashBalance() + amount);
                } else if (isExpert) {
                    wallet.setEarnedBalance(wallet.getEarnedBalance() + amount);
                } else {
                    wallet.setCashBalance(wallet.getCashBalance() + amount);
                }
            }
            walletRepository.save(wallet);
        }

        return transactionRepository.save(txn);
    }

    private User findUserByIdentifier(String identifier) {
        return userRepository.findById(identifier)
                .or(() -> userRepository.findByEmail(identifier))
                .orElseThrow(() -> new ResourceNotFoundException("Institutional record not found for: " + identifier));
    }
}
