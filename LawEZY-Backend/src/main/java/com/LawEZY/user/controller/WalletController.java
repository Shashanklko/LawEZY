package com.LawEZY.user.controller;

import com.LawEZY.user.entity.FinancialTransaction;
import com.LawEZY.user.entity.Wallet;
import com.LawEZY.user.service.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/wallet")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    @GetMapping("/balance")
    public ResponseEntity<Wallet> getBalance() {
        return ResponseEntity.ok(walletService.getWalletByUserId(getCurrentUserId()));
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<FinancialTransaction>> getTransactions() {
        return ResponseEntity.ok(walletService.getTransactionHistory(getCurrentUserId()));
    }

    @PostMapping("/deposit")
    public ResponseEntity<FinancialTransaction> deposit(@RequestBody Map<String, Double> payload) {
        Double amount = payload.get("amount");
        return ResponseEntity.ok(walletService.deposit(getCurrentUserId(), amount));
    }

    @PostMapping("/withdraw")
    public ResponseEntity<FinancialTransaction> withdraw(@RequestBody Map<String, Double> payload) {
        Double amount = payload.get("amount");
        return ResponseEntity.ok(walletService.withdraw(getCurrentUserId(), amount));
    }

    @PostMapping("/purchase-tokens-direct")
    public ResponseEntity<FinancialTransaction> purchaseTokensDirect(@RequestBody Map<String, String> payload) {
        String packageType = payload.get("packageType");
        return ResponseEntity.ok(walletService.purchaseTokensDirectly(getCurrentUserId(), packageType));
    }

    private String getCurrentUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
