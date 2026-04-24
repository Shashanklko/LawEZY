package com.LawEZY.user.repository;

import com.LawEZY.user.entity.FinancialTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FinancialTransactionRepository extends JpaRepository<FinancialTransaction, String> {
    List<FinancialTransaction> findByUserIdOrderByTimestampDesc(String userId);
    List<FinancialTransaction> findByStatusOrderByTimestampAsc(String status);
    void deleteByUserId(String userId);
    void deleteByTimestampBefore(java.time.LocalDateTime timestamp);
}
