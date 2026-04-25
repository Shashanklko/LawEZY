package com.LawEZY.user.controller;

import com.LawEZY.user.entity.Report;
import com.LawEZY.user.repository.ReportRepository;
import com.LawEZY.user.service.AdminBroadcastService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportRepository reportRepository;
    private final AdminBroadcastService adminBroadcastService;

    @Autowired
    public ReportController(ReportRepository reportRepository, AdminBroadcastService adminBroadcastService) {
        this.reportRepository = reportRepository;
        this.adminBroadcastService = adminBroadcastService;
    }

    @PostMapping
    public ResponseEntity<?> submitReport(@RequestBody Report report) {
        if (report.getReporterId() == null || report.getTargetId() == null || report.getReason() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Incomplete report data"));
        }
        
        Report saved = reportRepository.save(report);
        
        // 🚀 REAL-TIME BROADCAST: Notify Admin Portal of the new complaint
        adminBroadcastService.broadcastAdminEvent("NEW_COMPLAINT", Map.of(
            "id", saved.getId(),
            "reporterId", saved.getReporterId(),
            "targetType", saved.getTargetType(),
            "targetId", saved.getTargetId(),
            "reason", saved.getReason(),
            "details", saved.getDetails() != null ? saved.getDetails() : "",
            "timestamp", saved.getCreatedAt()
        ));
        
        return ResponseEntity.ok(Map.of("success", true, "id", saved.getId()));
    }
}
