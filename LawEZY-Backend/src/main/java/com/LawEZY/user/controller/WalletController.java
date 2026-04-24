package com.LawEZY.user.controller;

import com.LawEZY.user.entity.FinancialTransaction;
import com.LawEZY.user.entity.Wallet;
import com.LawEZY.user.service.WalletService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/wallet")
public class WalletController {
    private final WalletService walletService;

    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    @GetMapping("/balance")
    public ResponseEntity<Wallet> getBalance() {
        return ResponseEntity.ok(walletService.getWalletByUserId(getCurrentUserId()));
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<FinancialTransaction>> getTransactions() {
        return ResponseEntity.ok(walletService.getTransactionHistory(getCurrentUserId()));
    }

    // NOTE: Direct deposit is disabled for security. Use /api/payments/verify instead.

    @PostMapping("/withdraw")
    public ResponseEntity<FinancialTransaction> withdraw(@RequestBody Map<String, Double> payload) {
        Double amount = payload.get("amount");
        return ResponseEntity.ok(walletService.withdraw(getCurrentUserId(), amount));
    }


    @PostMapping("/reset")
    public ResponseEntity<Void> resetWallet() {
        walletService.resetWallet(getCurrentUserId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/purchase-package")
    public ResponseEntity<Wallet> purchasePackage(@RequestBody Map<String, String> payload) {
        String packageType = payload.get("packageType");
        return ResponseEntity.ok(walletService.purchasePackage(getCurrentUserId(), packageType));
    }

    @GetMapping("/admin/pending-withdrawals")
    public ResponseEntity<List<FinancialTransaction>> getPendingWithdrawalsForAdmin() {
        ensureAdmin();
        return ResponseEntity.ok(walletService.getPendingExpertWithdrawals());
    }

    @PostMapping("/admin/mark-paid/{transactionRefId}")
    public ResponseEntity<FinancialTransaction> markWithdrawalPaid(@PathVariable String transactionRefId) {
        ensureAdmin();
        return ResponseEntity.ok(walletService.markWithdrawalPaid(transactionRefId));
    }

    private String getCurrentUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }

    private void ensureAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = auth != null && auth.getAuthorities() != null &&
                auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equalsIgnoreCase(a.getAuthority()) || "ADMIN".equalsIgnoreCase(a.getAuthority()));
        if (!isAdmin) {
            throw new RuntimeException("Admin access required for payout settlement actions.");
        }
    }
}
