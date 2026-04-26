package com.LawEZY.user.repository;

import com.LawEZY.user.entity.Wallet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface WalletRepository extends JpaRepository<Wallet, String> {
    Optional<Wallet> findByUserId(String userId);
    void deleteByUserId(String userId);

    @org.springframework.data.jpa.repository.Query(value = 
        "SELECT COALESCE(SUM(w.earned_balance), 0) FROM wallets w " +
        "JOIN users u ON w.id = u.id " +
        "WHERE u.role IN ('LAWYER', 'CA', 'CFA')", nativeQuery = true)
    double sumTotalExpertEarnedBalance();
}
