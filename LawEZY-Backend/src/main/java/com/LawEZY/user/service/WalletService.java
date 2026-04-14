package com.LawEZY.user.service;

import com.LawEZY.user.entity.FinancialTransaction;
import com.LawEZY.user.entity.Wallet;
import com.LawEZY.user.entity.User;
import com.LawEZY.user.repository.FinancialTransactionRepository;
import com.LawEZY.user.repository.WalletRepository;
import com.LawEZY.user.repository.UserRepository;
import com.LawEZY.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WalletService {

    private final WalletRepository walletRepository;
    private final FinancialTransactionRepository transactionRepository;
    private final UserRepository userRepository;

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
        return transactionRepository.save(txn);
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

        FinancialTransaction txn = createTxn(wallet.getUser(), "Withdrawal Request (Strategic Payout)", -amount, "PENDING");
        return transactionRepository.save(txn);
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
