package com.LawEZY.user.repository;

import com.LawEZY.user.entity.Report;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportRepository extends JpaRepository<Report, String> {
    long countByStatus(String status);
}
