package com.LawEZY.common.repository;

import com.LawEZY.common.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByEventTypeOrderByTimestampDesc(String eventType);
    List<AuditLog> findByUserIdOrderByTimestampDesc(String userId);
    @Modifying
    @Transactional
    @Query("DELETE FROM AuditLog a WHERE a.timestamp < :timestamp")
    void deleteByTimestampBefore(LocalDateTime timestamp);

    @Modifying
    @Transactional
    @Query("DELETE FROM AuditLog a WHERE a.eventType = :eventType")
    void deleteByEventType(String eventType);

    @Modifying
    @Transactional
    @Query("DELETE FROM AuditLog a WHERE a.eventType IN :eventTypes")
    void deleteByEventTypeIn(Collection<String> eventTypes);
}
