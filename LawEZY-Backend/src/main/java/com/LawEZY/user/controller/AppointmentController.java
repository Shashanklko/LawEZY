package com.LawEZY.user.controller;

import com.LawEZY.user.entity.Appointment;
import com.LawEZY.user.service.AppointmentService;
import com.LawEZY.auth.dto.CustomUserDetails;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {
    private final AppointmentService appointmentService;

    public AppointmentController(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    @GetMapping("/expert")
    public ResponseEntity<List<Appointment>> getExpertAppointments(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(appointmentService.getAppointmentsForExpert(userDetails.getId()));
    }

    @GetMapping("/client")
    public ResponseEntity<List<Appointment>> getClientAppointments(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(appointmentService.getAppointmentsForClient(userDetails.getId()));
    }

    @PostMapping("/propose")
    public ResponseEntity<Appointment> proposeAppointment(@RequestBody Appointment proposal) {
        return ResponseEntity.ok(appointmentService.createProposal(proposal));
    }

    @PostMapping("/{id}/accept")
    public ResponseEntity<Appointment> acceptAppointment(@PathVariable Long id) {
        return ResponseEntity.ok(appointmentService.acceptProposal(id));
    }

    @PostMapping("/{id}/accept-with-discount")
    public ResponseEntity<Appointment> acceptWithDiscount(@PathVariable Long id) {
        return ResponseEntity.ok(appointmentService.acceptWithDiscount(id));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<Appointment> rejectAppointment(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(appointmentService.rejectProposal(id, body.get("reason")));
    }

    @PostMapping("/{id}/counter")
    public ResponseEntity<Appointment> counterAppointment(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        java.time.LocalDateTime s1 = java.time.LocalDateTime.parse(payload.get("slot1").toString());
        java.time.LocalDateTime s2 = java.time.LocalDateTime.parse(payload.get("slot2").toString());
        java.time.LocalDateTime s3 = java.time.LocalDateTime.parse(payload.get("slot3").toString());
        Double newBaseFee = payload.containsKey("newBaseFee") ? Double.valueOf(payload.get("newBaseFee").toString()) : null;
        return ResponseEntity.ok(appointmentService.counterOffer(id, s1, s2, s3, newBaseFee));
    }

    @PostMapping("/{id}/finalize")
    public ResponseEntity<Appointment> finalizeAppointment(@PathVariable Long id, @RequestParam Integer slotIndex) {
        return ResponseEntity.ok(appointmentService.finalizeSelection(id, slotIndex));
    }

    @PostMapping("/{id}/initiate")
    public ResponseEntity<Appointment> initiateAppointment(@PathVariable Long id, @RequestParam(defaultValue = "false") boolean isFree) {
        return ResponseEntity.ok(appointmentService.initiateSession(id, isFree));
    }

    @PostMapping("/{id}/negotiate")
    public ResponseEntity<Appointment> negotiateAppointment(@PathVariable Long id, @RequestParam Double baseFee) {
        return ResponseEntity.ok(appointmentService.negotiateFee(id, baseFee));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Appointment> updateStatus(
            @PathVariable Long id, 
            @RequestParam String status,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        // Pass the authenticated user's actual DB User ID to ensure wallet resolution works
        String callerUserId = userDetails != null ? userDetails.getId() : null;
        return ResponseEntity.ok(appointmentService.updateStatus(id, status, callerUserId));
    }

    @PostMapping("/{id}/mark-completed")
    public ResponseEntity<Appointment> markCompletedByExpert(@PathVariable Long id) {
        return ResponseEntity.ok(appointmentService.markAsCompletedByExpert(id));
    }

    @PostMapping("/review")
    public ResponseEntity<Appointment> submitReview(@RequestBody com.LawEZY.user.dto.ReviewDTO reviewDto) {
        return ResponseEntity.ok(appointmentService.submitReview(reviewDto));
    }

    @GetMapping("/session/{chatSessionId}")
    public ResponseEntity<Appointment> getBySession(@PathVariable String chatSessionId) {
        Appointment appt = appointmentService.getByChatSession(chatSessionId);
        if (appt == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(appt);
    }
}
