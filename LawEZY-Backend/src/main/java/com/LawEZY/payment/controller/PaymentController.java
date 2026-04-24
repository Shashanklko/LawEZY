package com.LawEZY.payment.controller;

import com.LawEZY.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/order")
    public ResponseEntity<?> createOrder(@RequestBody Map<String, Object> request) {
        try {
            Double amount = Double.valueOf(request.get("amount").toString());
            String userId = getCurrentUserId();
            return ResponseEntity.ok(paymentService.createOrder(amount, userId));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Institutional Order Creation Failed: " + e.getMessage());
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(@RequestBody Map<String, String> request) {
        String orderId = request.get("razorpay_order_id");
        String paymentId = request.get("razorpay_payment_id");
        String signature = request.get("razorpay_signature");
        String userId = getCurrentUserId();
        
        // Custom params for processing
        String type = request.getOrDefault("type", "TOPUP");
        Double amount = request.get("amount") != null ? Double.valueOf(request.get("amount")) : 0.0;

        boolean isValid = paymentService.verifyPayment(orderId, paymentId, signature);
        
        if (isValid) {
            paymentService.processSuccessfulPayment(userId, amount, type);
            return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "Payment verified and wallet updated."));
        } else {
            return ResponseEntity.status(400).body(Map.of("status", "FAILED", "message", "Invalid payment signature."));
        }
    }

    private String getCurrentUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "anonymous";
    }
}
