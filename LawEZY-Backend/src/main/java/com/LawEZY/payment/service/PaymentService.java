package com.LawEZY.payment.service;

import java.util.Map;

public interface PaymentService {
    Map<String, Object> createOrder(Double amount, String userId) throws Exception;
    boolean verifyPayment(String orderId, String paymentId, String signature);
    void processSuccessfulPayment(String userId, Double amount, String type);
}
