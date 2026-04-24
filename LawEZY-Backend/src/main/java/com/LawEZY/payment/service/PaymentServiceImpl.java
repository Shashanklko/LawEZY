package com.LawEZY.payment.service;

import com.LawEZY.user.service.WalletService;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.Utils;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.HashMap;
import java.util.Map;

@Service
public class PaymentServiceImpl implements PaymentService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(PaymentServiceImpl.class);

    private final WalletService walletService;

    public PaymentServiceImpl(WalletService walletService) {
        this.walletService = walletService;
    }

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    private RazorpayClient razorpayClient;

    @PostConstruct
    public void init() throws Exception {
        if (razorpayKeyId != null && !razorpayKeyId.isEmpty() && !razorpayKeyId.contains("YOUR_")) {
            this.razorpayClient = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
        } else {
            log.warn("Razorpay Keys not configured. Payment system will operate in MOCK mode.");
        }
    }

    @Override
    public Map<String, Object> createOrder(Double amount, String userId) throws Exception {
        log.info("Creating Razorpay order for user: {} amount: {}", userId, amount);
        
        if (razorpayClient == null) {
            // Mock implementation if keys are missing
            Map<String, Object> mockOrder = new HashMap<>();
            mockOrder.put("id", "order_mock_" + System.currentTimeMillis());
            mockOrder.put("amount", (int)(amount * 100));
            mockOrder.put("currency", "INR");
            mockOrder.put("status", "created");
            return mockOrder;
        }

        JSONObject orderRequest = new JSONObject();
        orderRequest.put("amount", (int)(amount * 100)); // amount in paise
        orderRequest.put("currency", "INR");
        orderRequest.put("receipt", "txn_" + System.currentTimeMillis());
        orderRequest.put("payment_capture", 1);

        Order order = razorpayClient.orders.create(orderRequest);
        
        Map<String, Object> response = new HashMap<>();
        response.put("id", order.get("id"));
        response.put("amount", order.get("amount"));
        response.put("currency", order.get("currency"));
        response.put("status", order.get("status"));
        
        return response;
    }

    @Override
    public boolean verifyPayment(String orderId, String paymentId, String signature) {
        if (razorpayClient == null) {
            log.info("Mock verification successful for order: {}", orderId);
            return true;
        }

        try {
            JSONObject attributes = new JSONObject();
            attributes.put("razorpay_order_id", orderId);
            attributes.put("razorpay_payment_id", paymentId);
            attributes.put("razorpay_signature", signature);
            return Utils.verifyPaymentSignature(attributes, razorpayKeySecret);
        } catch (Exception e) {
            log.error("Payment verification failed: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public void processSuccessfulPayment(String userId, Double amount, String type) {
        log.info("Processing successful payment: User={}, Amount={}, Type={}", userId, amount, type);
        // Unified Financial Governance: All payments are now wallet deposits
        walletService.deposit(userId, amount);
    }
}
