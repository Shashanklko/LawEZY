package com.LawEZY.user.repository;

import com.LawEZY.user.entity.FinancialTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FinancialTransactionRepository extends JpaRepository<FinancialTransaction, String> {
    List<FinancialTransaction> findByUserIdOrderByTimestampDesc(String userId);
    List<FinancialTransaction> findByStatusOrderByTimestampAsc(String status);
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteByUserId(String userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteByTimestampBefore(java.time.LocalDateTime timestamp);

    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(t.amount), 0) FROM FinancialTransaction t WHERE t.amount > 0 AND t.description LIKE %:keyword%")
    double sumAmountByDescriptionKeyword(String keyword);

    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(t.amount), 0) FROM FinancialTransaction t WHERE t.amount > 0 AND (" +
            "t.description LIKE '%Commission%' OR " +
            "t.description LIKE '%Platform Fee%' OR " +
            "t.description LIKE '%Institutional Fee%' OR " +
            "t.description LIKE '%AI Token%' OR " +
            "t.description LIKE '%Document Audit%' OR " +
            "t.description LIKE '%AI Intelligence%' OR " +
            "t.description LIKE '%Auditor Refill%' OR " +
            "t.description LIKE '%Message Service%' OR " +
            "t.description LIKE '%Platform Earning%')")
    double sumTotalPlatformRevenue();

    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(t.amount), 0) FROM FinancialTransaction t WHERE t.amount > 0 AND t.timestamp > :since AND (" +
            "t.description LIKE '%Commission%' OR " +
            "t.description LIKE '%Platform Fee%' OR " +
            "t.description LIKE '%Institutional Fee%' OR " +
            "t.description LIKE '%AI Token%' OR " +
            "t.description LIKE '%Document Audit%' OR " +
            "t.description LIKE '%AI Intelligence%' OR " +
            "t.description LIKE '%Auditor Refill%' OR " +
            "t.description LIKE '%Message Service%' OR " +
            "t.description LIKE '%Platform Earning%')")
    double sumPlatformRevenueSince(java.time.LocalDateTime since);
}
