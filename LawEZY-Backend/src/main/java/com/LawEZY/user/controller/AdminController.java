package com.LawEZY.user.controller;

import com.LawEZY.user.entity.SystemConfig;
import com.LawEZY.user.entity.Report;
import com.LawEZY.user.entity.User;
import com.LawEZY.user.entity.Wallet;
import com.LawEZY.user.entity.FinancialTransaction;
import com.LawEZY.user.entity.ClientProfile;
import com.LawEZY.user.repository.ReportRepository;
import com.LawEZY.user.repository.SystemConfigRepository;
import com.LawEZY.user.repository.UserRepository;
import com.LawEZY.user.repository.FinancialTransactionRepository;
import com.LawEZY.user.repository.WalletRepository;
import com.LawEZY.user.repository.AppointmentRepository;
import com.LawEZY.user.repository.ReviewRepository;
import com.LawEZY.user.repository.ProfessionalProfileRepository;
import com.LawEZY.common.repository.AuditLogRepository;
import com.LawEZY.common.entity.AuditLog;
import com.LawEZY.user.enums.Role;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import com.LawEZY.user.service.AdminBroadcastService;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.UUID;
import com.LawEZY.common.service.EmailService;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Arrays;
import java.util.Collections;
import org.springframework.data.domain.Sort;
import com.LawEZY.content.repository.ResourceRepository;
import com.LawEZY.blog.repository.PostRepository;
import com.LawEZY.user.dto.ProfessionalProfileDTO;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:8080"})
public class AdminController {

    private final UserRepository userRepository;
    private final ReportRepository reportRepository;
    private final SystemConfigRepository systemConfigRepository;
    private final FinancialTransactionRepository financialTransactionRepository;
    private final WalletRepository walletRepository;
    private final AuditLogRepository auditLogRepository;
    private final AppointmentRepository appointmentRepository;
    private final com.LawEZY.notification.service.NotificationService notificationService;
    private final AdminBroadcastService adminBroadcastService;
    private final com.LawEZY.user.service.UserService userService;
    private final ResourceRepository resourceRepository;
    private final PostRepository postRepository;
    private final com.LawEZY.user.repository.LawyerProfileRepository lawyerProfileRepository;
    private final com.LawEZY.user.repository.CAProfileRepository caProfileRepository;
    private final com.LawEZY.user.repository.CFAProfileRepository cfaProfileRepository;
    private final com.LawEZY.user.repository.ClientProfileRepository clientProfileRepository;
    private final EmailService emailService;
    private final com.LawEZY.user.service.WalletService walletService;
    private final com.LawEZY.auth.service.OtpService otpService;
    private final ReviewRepository reviewRepository;
    private final ProfessionalProfileRepository professionalProfileRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public AdminController(UserRepository userRepository,
                           ReportRepository reportRepository,
                           SystemConfigRepository systemConfigRepository,
                           FinancialTransactionRepository financialTransactionRepository,
                           WalletRepository walletRepository,
                           AuditLogRepository auditLogRepository,
                           AppointmentRepository appointmentRepository,
                           com.LawEZY.notification.service.NotificationService notificationService,
                           AdminBroadcastService adminBroadcastService,
                           com.LawEZY.user.service.UserService userService,
                           ResourceRepository resourceRepository,
                           PostRepository postRepository,
                           com.LawEZY.user.repository.LawyerProfileRepository lawyerProfileRepository,
                           com.LawEZY.user.repository.CAProfileRepository caProfileRepository,
                           com.LawEZY.user.repository.CFAProfileRepository cfaProfileRepository,
                            com.LawEZY.user.repository.ClientProfileRepository clientProfileRepository,
                           ProfessionalProfileRepository professionalProfileRepository,
                           EmailService emailService,
                           com.LawEZY.user.service.WalletService walletService,
                           com.LawEZY.auth.service.OtpService otpService,
                           ReviewRepository reviewRepository,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.reportRepository = reportRepository;
        this.systemConfigRepository = systemConfigRepository;
        this.financialTransactionRepository = financialTransactionRepository;
        this.walletRepository = walletRepository;
        this.auditLogRepository = auditLogRepository;
        this.appointmentRepository = appointmentRepository;
        this.notificationService = notificationService;
        this.adminBroadcastService = adminBroadcastService;
        this.userService = userService;
        this.resourceRepository = resourceRepository;
        this.postRepository = postRepository;
        this.lawyerProfileRepository = lawyerProfileRepository;
        this.caProfileRepository = caProfileRepository;
        this.cfaProfileRepository = cfaProfileRepository;
        this.clientProfileRepository = clientProfileRepository;
        this.professionalProfileRepository = professionalProfileRepository;
        this.emailService = emailService;
        this.walletService = walletService;
        this.otpService = otpService;
        this.reviewRepository = reviewRepository;
        this.passwordEncoder = passwordEncoder;
    }

    private void validatePermission(String permission) {
        String email = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("Institutional Identity missing"));
        
        // Master Admin has absolute authority
        if (user.getRole() == Role.MASTER_ADMIN || "lawezy76".equals(user.getId()) || "21LZ76AD".equals(user.getId())) {
            return;
        }

        String perms = (user.getPermissions() != null ? user.getPermissions() : "").toUpperCase();
        if (perms.contains("ALL") || perms.contains("FULL ACCESS")) return;

        if (!perms.contains(permission.toUpperCase())) {
            throw new org.springframework.security.access.AccessDeniedException("Insufficient institutional permissions: " + permission);
        }
    }

    @GetMapping("/dashboard-stats")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();

        long totalUsers = userRepository.count();
        List<Role> professionalRoles = Arrays.asList(Role.LAWYER, Role.CA, Role.CFA);
        long totalExperts = userRepository.countByRoleIn(professionalRoles);
        long totalClients = userRepository.countByRoleIn(Arrays.asList(Role.CLIENT));
        long subAdmins = userRepository.countByRoleIn(Arrays.asList(Role.ADMIN));
        long masterAdmins = userRepository.countByRoleIn(Arrays.asList(Role.MASTER_ADMIN));

        // Calculate verified vs unverified experts
        long verifiedLawyers = lawyerProfileRepository.findAll().stream().filter(com.LawEZY.user.entity.LawyerProfile::isVerified).count();
        long verifiedCAs = caProfileRepository.findAll().stream().filter(com.LawEZY.user.entity.CAProfile::isVerified).count();
        long verifiedCFAs = cfaProfileRepository.findAll().stream().filter(com.LawEZY.user.entity.CFAProfile::isVerified).count();
        
        long totalVerified = verifiedLawyers + verifiedCAs + verifiedCFAs;
        long totalUnverified = totalExperts - totalVerified;

        long pendingComplaints = reportRepository.countByStatus("PENDING");
        long totalAppointments = appointmentRepository.count();
        long totalResources = resourceRepository.count();
        long totalPosts = postRepository.count();

        // Calculate platform revenue (sum of all commissions/fees/AI tokens)
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime todayStart = now.toLocalDate().atStartOfDay();
        LocalDateTime weekStart = now.minusDays(7);
        LocalDateTime monthStart = now.minusDays(30);

        List<FinancialTransaction> allTransactions = financialTransactionRepository.findAll();
        
        double platformRevenue = allTransactions.stream()
                .filter(this::isPlatformIncome)
                .mapToDouble(tx -> Math.abs(tx.getAmount()))
                .sum();

        // 📊 Granular Service Revenue Breakdown
        double aiRevenue = allTransactions.stream()
                .filter(tx -> isPlatformIncome(tx) && (tx.getDescription().contains("AI") || tx.getDescription().contains("Audit")))
                .mapToDouble(tx -> Math.abs(tx.getAmount()))
                .sum();

        double chatRevenue = allTransactions.stream()
                .filter(tx -> isPlatformIncome(tx) && tx.getDescription().contains("Chat"))
                .mapToDouble(tx -> Math.abs(tx.getAmount()))
                .sum();

        double appointmentRevenue = allTransactions.stream()
                .filter(tx -> isPlatformIncome(tx) && (tx.getDescription().contains("Appointment") || tx.getDescription().contains("LZY-")))
                .mapToDouble(tx -> Math.abs(tx.getAmount()))
                .sum();

        double platformDaily = allTransactions.stream()
                .filter(tx -> isPlatformIncome(tx) && tx.getTimestamp().isAfter(todayStart))
                .mapToDouble(tx -> Math.abs(tx.getAmount()))
                .sum();

        double platformWeekly = allTransactions.stream()
                .filter(tx -> isPlatformIncome(tx) && tx.getTimestamp().isAfter(weekStart))
                .mapToDouble(tx -> Math.abs(tx.getAmount()))
                .sum();

        double platformMonthly = allTransactions.stream()
                .filter(tx -> isPlatformIncome(tx) && tx.getTimestamp().isAfter(monthStart))
                .mapToDouble(tx -> Math.abs(tx.getAmount()))
                .sum();

        // Calculate Overall Payable Balance (Sum of all experts' earned balances)
        double overallPayable = walletRepository.findAll().stream()
                .filter(w -> {
                    User u = userRepository.findById(w.getId()).orElse(null);
                    return u != null && (u.getRole() == Role.LAWYER || u.getRole() == Role.CA || u.getRole() == Role.CFA);
                })
                .mapToDouble(w -> w.getEarnedBalance() != null ? w.getEarnedBalance() : 0.0)
                .sum();

        String systemMode = systemConfigRepository.findById("SYSTEM_MODE")
                .map(SystemConfig::getConfigValue)
                .orElse("ACTIVE");

        stats.put("totalUsers", totalUsers);
        stats.put("totalExperts", totalExperts);
        stats.put("verifiedExperts", totalVerified);
        stats.put("unverifiedExperts", totalUnverified);
        stats.put("totalClients", totalClients);
        stats.put("subAdmins", subAdmins);
        stats.put("masterAdmins", masterAdmins);
        stats.put("pendingComplaints", pendingComplaints);
        stats.put("totalAppointments", totalAppointments);
        stats.put("platformRevenue", platformRevenue);
        stats.put("aiRevenue", aiRevenue);
        stats.put("chatRevenue", chatRevenue);
        stats.put("appointmentRevenue", appointmentRevenue);
        stats.put("platformDaily", platformDaily);
        stats.put("platformWeekly", platformWeekly);
        stats.put("platformMonthly", platformMonthly);
        stats.put("overallPayable", overallPayable);
        stats.put("systemUptime", "100%"); 
        stats.put("systemMode", systemMode);
        stats.put("totalResources", totalResources);
        stats.put("totalPosts", totalPosts);

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/clients")
    public ResponseEntity<List<User>> getClients() {
        List<User> clients = userRepository.findByRoleIn(Collections.singletonList(Role.CLIENT));
        return ResponseEntity.ok(clients);
    }

    @GetMapping("/complaints")
    public ResponseEntity<List<Report>> getComplaints() {
        return ResponseEntity.ok(reportRepository.findAll());
    }

    @GetMapping("/wallets")
    public ResponseEntity<List<Wallet>> getWallets() {
        return ResponseEntity.ok(walletRepository.findAll());
    }

    @GetMapping("/ledger")
    public ResponseEntity<List<FinancialTransaction>> getLedger() {
        validatePermission("FINANCIAL LEDGER");
        return ResponseEntity.ok(financialTransactionRepository.findAll(Sort.by(Sort.Direction.DESC, "timestamp")));
    }

    @GetMapping("/logs")
    public ResponseEntity<List<AuditLog>> getLogs() {
        validatePermission("SYSTEM LOGS");
        return ResponseEntity.ok(auditLogRepository.findAll(Sort.by(Sort.Direction.DESC, "timestamp")));
    }

    @GetMapping("/admin-actions")
    public ResponseEntity<List<AuditLog>> getAdminActions() {
        validatePermission("SYSTEM LOGS");
        List<AuditLog> allLogs = auditLogRepository.findAll(Sort.by(Sort.Direction.DESC, "timestamp"));
        List<AuditLog> adminLogs = allLogs.stream()
                .filter(log -> "ADMIN".equals(log.getUserRole()) || "MASTER_ADMIN".equals(log.getUserRole()))
                .toList();
        return ResponseEntity.ok(adminLogs);
    }

    @PutMapping("/system-mode")
    public ResponseEntity<Map<String, String>> updateSystemMode(@RequestBody Map<String, String> request) {
        validatePermission("SYSTEM LOGS");
        String newMode = request.get("mode");
        if (newMode == null || (!newMode.equals("ACTIVE") && !newMode.equals("TESTING") && !newMode.equals("MAINTENANCE"))) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid mode"));
        }

        SystemConfig config = systemConfigRepository.findById("SYSTEM_MODE")
                .orElse(new SystemConfig("SYSTEM_MODE", "ACTIVE"));
        
        String oldMode = config.getConfigValue();
        config.setConfigValue(newMode);
        systemConfigRepository.save(config);

        // 🚀 REAL-TIME BROADCAST: Update Admin Portal and all Clients instantly
        adminBroadcastService.broadcastAdminEvent("SYSTEM_MODE_CHANGE", Map.of("newMode", newMode, "oldMode", oldMode));
        adminBroadcastService.broadcastSystemStatus(newMode);

        // If switching to MAINTENANCE, broadcast a notification
        if ("MAINTENANCE".equals(newMode) && !"MAINTENANCE".equals(oldMode)) {
            new Thread(() -> {
                userRepository.findAll().forEach(user -> {
                    try {
                        notificationService.sendNotification(
                            user.getId(),
                            "🚧 System Maintenance Alert",
                            "The platform is currently undergoing emergency maintenance. Certain features like dashboard and messaging are blocked until further notice.",
                            "SYSTEM", "SYSTEM", "/"
                        );
                    } catch (Exception e) {
                        // ignore failures for individual users
                    }
                });
            }).start();
        }

        return ResponseEntity.ok(Map.of("message", "System mode updated to " + newMode, "mode", newMode));
    }
    @PutMapping("/users/{id}/block")
    public ResponseEntity<Map<String, String>> blockUser(@PathVariable String id) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();
        user.setEnabled(false);
        userRepository.save(user);
        
        // Log action
        AuditLog log = new AuditLog();
        log.setTimestamp(java.time.LocalDateTime.now());
        log.setUserRole("ADMIN");
        log.setEventType("BLOCK_USER");
        log.setSummary("Blocked user: " + id);
        log.setUserId("SYSTEM");
        auditLogRepository.save(log);
        
        // 🚀 REAL-TIME BROADCAST: Alert Admin Portal
        adminBroadcastService.broadcastAdminEvent("USER_BLOCKED", Map.of("userId", id, "timestamp", log.getTimestamp()));
        
        return ResponseEntity.ok(Map.of("message", "User blocked successfully"));
    }

    @PutMapping("/users/{id}/unblock")
    public ResponseEntity<Map<String, String>> unblockUser(@PathVariable String id) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();
        user.setEnabled(true);
        userRepository.save(user);

        // Log action
        AuditLog log = new AuditLog();
        log.setTimestamp(java.time.LocalDateTime.now());
        log.setUserRole("ADMIN");
        log.setEventType("UNBLOCK_USER");
        log.setSummary("Unblocked user: " + id);
        log.setUserId("SYSTEM");
        auditLogRepository.save(log);

        return ResponseEntity.ok(Map.of("message", "User unblocked successfully"));
    }

    @PutMapping("/experts/{id}/verify")
    public ResponseEntity<Map<String, String>> verifyExpert(@PathVariable String id, @RequestParam(required = false) Boolean status) {
        if (status != null && !status) {
            // Optional: userService.unverifyExpert(id);
            return ResponseEntity.ok(Map.of("message", "Expert verification suspended (Logic TBD)"));
        }
        
        userService.verifyExpert(id);
        
        // Log governance action
        AuditLog log = new AuditLog();
        log.setTimestamp(java.time.LocalDateTime.now());
        log.setUserRole("ADMIN");
        log.setEventType("VERIFY_EXPERT");
        log.setSummary("Verified expert credentials for ID: " + id);
        log.setUserId("SYSTEM");
        auditLogRepository.save(log);
        
        return ResponseEntity.ok(Map.of("message", "Expert verified successfully"));
    }

    @PutMapping("/complaints/{id}/resolve")
    public ResponseEntity<Map<String, String>> resolveComplaint(@PathVariable String id) {
        Report report = reportRepository.findById(id).orElse(null);
        if (report == null) return ResponseEntity.notFound().build();
        
        report.setStatus("RESOLVED");
        report.setResolvedAt(java.time.LocalDateTime.now());
        reportRepository.save(report);
        
        // Log governance action
        AuditLog log = new AuditLog();
        log.setTimestamp(java.time.LocalDateTime.now());
        log.setUserRole("ADMIN");
        log.setEventType("RESOLVE_COMPLAINT");
        log.setSummary("Resolved complaint ID: " + id);
        log.setUserId("SYSTEM");
        auditLogRepository.save(log);
        
        return ResponseEntity.ok(Map.of("message", "Complaint resolved successfully"));
    }

    @PostMapping("/experts/{id}/wallet/reset")
    public ResponseEntity<Map<String, String>> resetExpertWallet(@PathVariable String id) {
        walletRepository.findByUserId(id).ifPresent(w -> {
            w.setEarnedBalance(0.0);
            walletRepository.save(w);
        });

        AuditLog log = new AuditLog();
        log.setTimestamp(LocalDateTime.now());
        log.setUserRole("ADMIN");
        log.setEventType("WALLET_RESET");
        log.setSummary("Admin manually reset earned balance for Expert: " + id);
        log.setUserId(id);
        auditLogRepository.save(log);

        return ResponseEntity.ok(Map.of("message", "Professional wallet balance synchronized to zero"));
    }

    @GetMapping("/experts/{id}/logs")
    public ResponseEntity<List<Map<String, Object>>> getExpertLogs(@PathVariable String id) {
        List<AuditLog> auditLogs = auditLogRepository.findByUserIdOrderByTimestampDesc(id);
        List<FinancialTransaction> transactions = financialTransactionRepository.findByUserIdOrderByTimestampDesc(id);

        java.util.List<Map<String, Object>> unifiedLogs = new java.util.ArrayList<>();

        // Map AuditLogs
        for (AuditLog log : auditLogs) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("id", "AUDIT-" + log.getId());
            entry.put("type", "SESSION"); // Categorize as session/security
            entry.put("action", log.getEventType());
            entry.put("timestamp", log.getTimestamp());
            entry.put("details", log.getSummary());
            unifiedLogs.add(entry);
        }

        // Map Transactions
        for (FinancialTransaction tx : transactions) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("id", "FIN-" + tx.getId());
            entry.put("type", "FINANCE");
            entry.put("action", tx.getDescription());
            entry.put("timestamp", tx.getTimestamp());
            entry.put("amount", tx.getAmount());
            entry.put("details", "Transaction ID: " + tx.getTransactionId() + " Status: " + tx.getStatus());
            unifiedLogs.add(entry);
        }

        // Sort by timestamp descending
        unifiedLogs.sort((a, b) -> ((java.time.LocalDateTime) b.get("timestamp")).compareTo((java.time.LocalDateTime) a.get("timestamp")));

        return ResponseEntity.ok(unifiedLogs);
    }
    @GetMapping("/experts/{id}")
    public ResponseEntity<ProfessionalProfileDTO> getExpertProfile(@PathVariable String id) {
        return ResponseEntity.ok(userService.getProfessionalById(id));
    }

    @PutMapping("/experts/{id}")
    public ResponseEntity<Map<String, String>> updateExpertProfile(@PathVariable String id, @RequestBody Map<String, Object> payload) {
        // Fetch specialized profile
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        
        // This is a high-density update that targets the specific profile tables
        if (user.getRole() == Role.LAWYER) {
            com.LawEZY.user.entity.LawyerProfile p = lawyerProfileRepository.findById(id).orElseThrow();
            if (payload.containsKey("firstName")) p.setFirstName((String) payload.get("firstName"));
            if (payload.containsKey("lastName")) p.setLastName((String) payload.get("lastName"));
            if (payload.containsKey("consultationFee")) p.setConsultationFee(Double.valueOf(payload.get("consultationFee").toString()));
            if (payload.containsKey("barCouncilId")) p.setBarLicenseNumber((String) payload.get("barCouncilId"));
            if (payload.containsKey("bio")) p.setBio((String) payload.get("bio"));
            if (payload.containsKey("location")) p.setLocation((String) payload.get("location"));
            if (payload.containsKey("title")) p.setTitle((String) payload.get("title"));
            if (payload.containsKey("experience")) p.setExperience((String) payload.get("experience"));
            if (payload.containsKey("domains")) p.setDomains(payload.get("domains").toString());
            if (payload.containsKey("textChatFee")) p.setTextChatFee(Double.valueOf(payload.get("textChatFee").toString()));
            if (payload.containsKey("chatDurationMinutes")) p.setChatDurationMinutes(Integer.valueOf(payload.get("chatDurationMinutes").toString()));
            if (payload.containsKey("customGreeting")) p.setCustomGreeting((String) payload.get("customGreeting"));
            if (payload.containsKey("bankName")) p.setBankName((String) payload.get("bankName"));
            if (payload.containsKey("accountNumber")) p.setAccountNumber((String) payload.get("accountNumber"));
            if (payload.containsKey("ifscCode")) p.setIfscCode((String) payload.get("ifscCode"));
            if (payload.containsKey("accountHolderName")) p.setAccountHolderName((String) payload.get("accountHolderName"));
            if (payload.containsKey("upiId")) p.setUpiId((String) payload.get("upiId"));
            lawyerProfileRepository.save(p);
        } else if (user.getRole() == Role.CA) {
            com.LawEZY.user.entity.CAProfile p = caProfileRepository.findById(id).orElseThrow();
            if (payload.containsKey("firstName")) p.setFirstName((String) payload.get("firstName"));
            if (payload.containsKey("lastName")) p.setLastName((String) payload.get("lastName"));
            if (payload.containsKey("consultationFee")) p.setConsultationFee(Double.valueOf(payload.get("consultationFee").toString()));
            if (payload.containsKey("membershipNumber")) p.setMembershipNumber((String) payload.get("membershipNumber"));
            if (payload.containsKey("bio")) p.setBio((String) payload.get("bio"));
            if (payload.containsKey("location")) p.setLocation((String) payload.get("location"));
            if (payload.containsKey("title")) p.setTitle((String) payload.get("title"));
            if (payload.containsKey("experience")) p.setExperience((String) payload.get("experience"));
            if (payload.containsKey("domains")) p.setDomains(payload.get("domains").toString());
            if (payload.containsKey("textChatFee")) p.setTextChatFee(Double.valueOf(payload.get("textChatFee").toString()));
            if (payload.containsKey("chatDurationMinutes")) p.setChatDurationMinutes(Integer.valueOf(payload.get("chatDurationMinutes").toString()));
            if (payload.containsKey("customGreeting")) p.setCustomGreeting((String) payload.get("customGreeting"));
            if (payload.containsKey("bankName")) p.setBankName((String) payload.get("bankName"));
            if (payload.containsKey("accountNumber")) p.setAccountNumber((String) payload.get("accountNumber"));
            if (payload.containsKey("ifscCode")) p.setIfscCode((String) payload.get("ifscCode"));
            if (payload.containsKey("accountHolderName")) p.setAccountHolderName((String) payload.get("accountHolderName"));
            if (payload.containsKey("upiId")) p.setUpiId((String) payload.get("upiId"));
            caProfileRepository.save(p);
        } else if (user.getRole() == Role.CFA) {
            com.LawEZY.user.entity.CFAProfile p = cfaProfileRepository.findById(id).orElseThrow();
            if (payload.containsKey("firstName")) p.setFirstName((String) payload.get("firstName"));
            if (payload.containsKey("lastName")) p.setLastName((String) payload.get("lastName"));
            if (payload.containsKey("consultationFee")) p.setConsultationFee(Double.valueOf(payload.get("consultationFee").toString()));
            if (payload.containsKey("charterNumber")) p.setCharterNumber((String) payload.get("charterNumber"));
            if (payload.containsKey("bio")) p.setBio((String) payload.get("bio"));
            if (payload.containsKey("location")) p.setLocation((String) payload.get("location"));
            if (payload.containsKey("title")) p.setTitle((String) payload.get("title"));
            if (payload.containsKey("experience")) p.setExperience((String) payload.get("experience"));
            if (payload.containsKey("domains")) p.setDomains(payload.get("domains").toString());
            if (payload.containsKey("textChatFee")) p.setTextChatFee(Double.valueOf(payload.get("textChatFee").toString()));
            if (payload.containsKey("chatDurationMinutes")) p.setChatDurationMinutes(Integer.valueOf(payload.get("chatDurationMinutes").toString()));
            if (payload.containsKey("customGreeting")) p.setCustomGreeting((String) payload.get("customGreeting"));
            if (payload.containsKey("bankName")) p.setBankName((String) payload.get("bankName"));
            if (payload.containsKey("accountNumber")) p.setAccountNumber((String) payload.get("accountNumber"));
            if (payload.containsKey("ifscCode")) p.setIfscCode((String) payload.get("ifscCode"));
            if (payload.containsKey("accountHolderName")) p.setAccountHolderName((String) payload.get("accountHolderName"));
            if (payload.containsKey("upiId")) p.setUpiId((String) payload.get("upiId"));
            cfaProfileRepository.save(p);
        }

        // Sync back to User record for consistency
        if (payload.containsKey("firstName")) user.setFirstName((String) payload.get("firstName"));
        if (payload.containsKey("lastName")) user.setLastName((String) payload.get("lastName"));
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Expert profile synchronized with institutional records"));
    }

    // ═══════════════════════════════════════════════════════
    // 👤 CLIENT AUDIT ENDPOINTS (Mirror Expert Architecture)
    // ═══════════════════════════════════════════════════════

    @GetMapping("/clients/{id}")
    public ResponseEntity<Map<String, Object>> getClientProfile(@PathVariable String id) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();

        Wallet wallet = walletRepository.findByUserId(id).orElse(null);

        Map<String, Object> profile = new HashMap<>();
        profile.put("id", user.getId());
        profile.put("firstName", user.getFirstName());
        profile.put("lastName", user.getLastName());
        profile.put("email", user.getEmail());
        profile.put("role", user.getRole().name());
        profile.put("enabled", user.isEnabled());

        // Wallet data
        if (wallet != null) {
            profile.put("cashBalance", wallet.getCashBalance());
            profile.put("earnedBalance", wallet.getEarnedBalance());
            profile.put("tokenBalance", wallet.getTokenBalance());
            profile.put("freeAiTokens", wallet.getFreeAiTokens());
            profile.put("freeChatTokens", wallet.getFreeChatTokens());
            profile.put("freeDocTokens", wallet.getFreeDocTokens());
            profile.put("isUnlimited", wallet.getIsUnlimited());
        }

        // Identification Enrichment
        ClientProfile cp = clientProfileRepository.findById(id).orElse(null);
        if (cp != null) {
            profile.put("phoneNumber", cp.getPhoneNumber());
            profile.put("location", cp.getLocation());
            profile.put("bankName", cp.getBankName());
            profile.put("accountNumber", cp.getAccountNumber());
            profile.put("ifscCode", cp.getIfscCode());
            profile.put("accountHolderName", cp.getAccountHolderName());
            profile.put("upiId", cp.getUpiId());
        }

        // Appointment stats
        List<com.LawEZY.user.entity.Appointment> appointments = appointmentRepository.findByClient_IdOrderByScheduledAtDesc(id);
        profile.put("totalAppointments", appointments.size());
        profile.put("completedAppointments", appointments.stream().filter(a -> "COMPLETED".equals(a.getStatus())).count());
        profile.put("pendingAppointments", appointments.stream().filter(a -> "PROPOSED".equals(a.getStatus()) || "CONFIRMED".equals(a.getStatus())).count());

        // Total spent
        double totalSpent = financialTransactionRepository.findByUserIdOrderByTimestampDesc(id).stream()
                .filter(tx -> tx.getAmount() < 0)
                .mapToDouble(tx -> Math.abs(tx.getAmount()))
                .sum();
        profile.put("totalSpent", totalSpent);

        return ResponseEntity.ok(profile);
    }

    @GetMapping("/clients/{id}/logs")
    public ResponseEntity<List<Map<String, Object>>> getClientLogs(@PathVariable String id) {
        List<AuditLog> auditLogs = auditLogRepository.findByUserIdOrderByTimestampDesc(id);
        List<FinancialTransaction> transactions = financialTransactionRepository.findByUserIdOrderByTimestampDesc(id);

        java.util.List<Map<String, Object>> unifiedLogs = new java.util.ArrayList<>();

        for (AuditLog log : auditLogs) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("id", "AUDIT-" + log.getId());
            entry.put("type", "SESSION");
            entry.put("action", log.getEventType());
            entry.put("timestamp", log.getTimestamp());
            entry.put("details", log.getSummary());
            unifiedLogs.add(entry);
        }

        for (FinancialTransaction tx : transactions) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("id", "FIN-" + tx.getId());
            entry.put("type", "FINANCE");
            entry.put("action", tx.getDescription());
            entry.put("timestamp", tx.getTimestamp());
            entry.put("amount", tx.getAmount());
            entry.put("details", "Transaction ID: " + tx.getTransactionId() + " Status: " + tx.getStatus());
            unifiedLogs.add(entry);
        }

        unifiedLogs.sort((a, b) -> ((java.time.LocalDateTime) b.get("timestamp")).compareTo((java.time.LocalDateTime) a.get("timestamp")));
        return ResponseEntity.ok(unifiedLogs);
    }

    @GetMapping("/clients/{id}/appointments")
    public ResponseEntity<List<Map<String, Object>>> getClientAppointments(@PathVariable String id) {
        List<com.LawEZY.user.entity.Appointment> appointments = appointmentRepository.findByClient_IdOrderByScheduledAtDesc(id);
        java.util.List<Map<String, Object>> result = new java.util.ArrayList<>();

        for (com.LawEZY.user.entity.Appointment apt : appointments) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("id", apt.getId());
            entry.put("status", apt.getStatus());
            entry.put("scheduledAt", apt.getScheduledAt());
            entry.put("createdAt", apt.getCreatedAt());
            entry.put("fee", apt.getFee());
            entry.put("baseFee", apt.getBaseFee());
            entry.put("durationMinutes", apt.getDurationMinutes());
            entry.put("reason", apt.getReason());
            if (apt.getExpert() != null) {
                entry.put("expertId", apt.getExpert().getId());
                entry.put("expertName", apt.getExpert().getName());
            }
            result.add(entry);
        }
        return ResponseEntity.ok(result);
    }

    @PutMapping("/clients/{id}")
    public ResponseEntity<Map<String, String>> updateClientProfile(@PathVariable String id, @RequestBody Map<String, Object> payload) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("Client not found"));

        if (payload.containsKey("firstName")) user.setFirstName((String) payload.get("firstName"));
        if (payload.containsKey("lastName")) user.setLastName((String) payload.get("lastName"));
        if (payload.containsKey("email")) user.setEmail((String) payload.get("email"));
        userRepository.save(user);

        // Sync to ClientProfile
        clientProfileRepository.findById(id).ifPresent(cp -> {
            if (payload.containsKey("firstName")) cp.setFirstName((String) payload.get("firstName"));
            if (payload.containsKey("lastName")) cp.setLastName((String) payload.get("lastName"));
            if (payload.containsKey("phoneNumber")) cp.setPhoneNumber((String) payload.get("phoneNumber"));
            if (payload.containsKey("location")) cp.setLocation((String) payload.get("location"));
            if (payload.containsKey("bankName")) cp.setBankName((String) payload.get("bankName"));
            if (payload.containsKey("accountNumber")) cp.setAccountNumber((String) payload.get("accountNumber"));
            if (payload.containsKey("ifscCode")) cp.setIfscCode((String) payload.get("ifscCode"));
            if (payload.containsKey("accountHolderName")) cp.setAccountHolderName((String) payload.get("accountHolderName"));
            if (payload.containsKey("upiId")) cp.setUpiId((String) payload.get("upiId"));
            clientProfileRepository.save(cp);
        });

        // Log governance action
        AuditLog log = new AuditLog();
        log.setTimestamp(java.time.LocalDateTime.now());
        log.setUserRole("ADMIN");
        log.setEventType("UPDATE_CLIENT_PROFILE");
        log.setSummary("Admin updated client profile for ID: " + id);
        log.setUserId("SYSTEM");
        auditLogRepository.save(log);

        return ResponseEntity.ok(Map.of("message", "Client profile synchronized with institutional records"));
    }

    @PostMapping("/broadcast-alert")
    public ResponseEntity<Map<String, String>> broadcastAlert(@RequestBody Map<String, String> payload) {
        String message = payload.get("message");
        String level = payload.getOrDefault("level", "INFO");
        
        adminBroadcastService.broadcastPublicAlert(message, level);
        
        // Also log for admin records
        adminBroadcastService.broadcastAdminEvent("SYSTEM_ALERT_SENT", Map.of(
            "message", message,
            "level", level
        ));
        
        return ResponseEntity.ok(Map.of("message", "Alert broadcasted successfully"));
    }

    @DeleteMapping("/logs/clear")
    @Transactional
    public ResponseEntity<Map<String, String>> clearLogs(
            @RequestParam(required = false) String duration,
            @RequestParam(required = false) String category) {
        
        try {
            if (category != null) {
            // Institutional Category Purging
            String logSummary;
            if ("SECURITY".equals(category)) {
                auditLogRepository.deleteByEventTypeIn(Arrays.asList("SECURITY_ALERT", "UNAUTHORIZED_ACCESS", "AUTH_FAILURE"));
                logSummary = "Purged all Security Alert logs";
            } else if ("SYSTEM".equals(category)) {
                auditLogRepository.deleteByEventType("SYSTEM_ERROR");
                logSummary = "Purged all System Error logs";
            } else if ("AUTH".equals(category)) {
                auditLogRepository.deleteByEventTypeIn(Arrays.asList("LOGIN_EVENT", "LOGIN_SUCCESS", "LOGIN_FAILURE", "LOGOUT_EVENT"));
                logSummary = "Purged all Authentication/Login logs";
            } else if ("AI".equals(category)) {
                auditLogRepository.deleteByEventTypeIn(Arrays.asList("AI_BLOCK", "AI_QUERY", "AI_SAFETY_ALERT"));
                logSummary = "Purged all AI Interaction and Logic logs";
            } else {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid category. Use SECURITY, SYSTEM, AUTH, or AI."));
            }

            // Log the selective purge action
            AuditLog auditEntry = new AuditLog();
            auditEntry.setTimestamp(LocalDateTime.now());
            auditEntry.setUserRole("ADMIN");
            auditEntry.setEventType("PURGE_LOGS");
            auditEntry.setSummary(logSummary);
            auditEntry.setUserId("SYSTEM");
            auditLogRepository.save(auditEntry);

            return ResponseEntity.ok(Map.of("message", logSummary + " successfully"));
        }

        // Fallback to Temporal Purging
        if (duration == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Either duration or category parameter is required."));
        }

        LocalDateTime threshold;
        if ("2_WEEKS".equals(duration)) {
            threshold = LocalDateTime.now().minusWeeks(2);
        } else if ("1_MONTH".equals(duration)) {
            threshold = LocalDateTime.now().minusMonths(1);
        } else if ("1_YEAR".equals(duration)) {
            threshold = LocalDateTime.now().minusYears(1);
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid duration. Use '2_WEEKS', '1_MONTH', or '1_YEAR'."));
        }

        auditLogRepository.deleteByTimestampBefore(threshold);

        // Log the purge action itself
        AuditLog log = new AuditLog();
        log.setTimestamp(LocalDateTime.now());
        log.setUserRole("ADMIN");
        log.setEventType("PURGE_LOGS");
        log.setSummary("Purged audit logs older than " + duration.replace("_", " "));
        log.setUserId("SYSTEM");
        auditLogRepository.save(log);

        return ResponseEntity.ok(Map.of("message", "Logs older than " + duration.replace("_", " ") + " cleared successfully"));
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(AdminController.class).error("FAILED TO CLEAR LOGS: ", e);
            return ResponseEntity.status(500).body(Map.of("error", "Internal Server Error: " + e.getMessage()));
        }
    }

    @DeleteMapping("/ledger/clear")
    @Transactional
    public ResponseEntity<Map<String, String>> clearLedger(@RequestParam String duration) {
        LocalDateTime threshold;
        if ("1_YEAR".equals(duration)) {
            threshold = LocalDateTime.now().minusYears(1);
        } else if ("6_MONTHS".equals(duration)) {
            threshold = LocalDateTime.now().minusMonths(6);
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid duration. Use '6_MONTHS' or '1_YEAR'."));
        }

        try {
            financialTransactionRepository.deleteByTimestampBefore(threshold);
            
            // Log governance action
            AuditLog auditEntry = new AuditLog();
            auditEntry.setTimestamp(LocalDateTime.now());
            auditEntry.setUserRole("ADMIN");
            auditEntry.setEventType("PURGE_LEDGER");
            auditEntry.setSummary("Purged financial ledger entries older than " + duration.replace("_", " "));
            auditEntry.setUserId("SYSTEM");
            auditLogRepository.save(auditEntry);

            return ResponseEntity.ok(Map.of("message", "Ledger entries older than " + duration.replace("_", " ") + " cleared successfully"));
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(AdminController.class).error("FAILED TO CLEAR LEDGER: ", e);
            return ResponseEntity.status(500).body(Map.of("error", "Institutional maintenance failure: " + e.getMessage()));
        }
    }

    @PostMapping("/experts/{id}/payout/invoice")
    public ResponseEntity<Map<String, String>> sendPayoutInvoice(@PathVariable String id, @RequestBody Map<String, Object> payload) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();

        Double amount = Double.valueOf(payload.getOrDefault("amount", 0.0).toString());
        
        Map<String, Object> model = new HashMap<>();
        model.put("greeting", "Hello " + user.getFirstName() + " " + user.getLastName());
        model.put("amount", "₹" + String.format("%,.2f", amount));
        model.put("period", LocalDateTime.now().getMonth().name() + " " + LocalDateTime.now().getYear());

        emailService.sendHtmlEmail(user.getEmail(), "LawEZY: Your Payout Summary (Invoice)", "emails/invoice-notification", model);

        return ResponseEntity.ok(Map.of("message", "Invoice email dispatched to " + user.getEmail()));
    }

    @PostMapping("/experts/{id}/payout/confirm")
    @Transactional
    public ResponseEntity<Map<String, String>> confirmPayout(@PathVariable String id, @RequestBody Map<String, Object> payload) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();

        Double amount = Double.valueOf(payload.getOrDefault("amount", 0.0).toString());
        
        // 1. Log the Settlement in Ledger
        String tid = "SETTLE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        FinancialTransaction settlementTx = new FinancialTransaction(
            "PAY-" + (1000 + (int)(Math.random() * 9000)),
            tid,
            LocalDateTime.now(),
            "Payout Settled - Transferred to Account",
            -amount,
            "PAID",
            user
        );
        financialTransactionRepository.save(settlementTx);

        // 2. Send Confirmation Email
        Map<String, Object> model = new HashMap<>();
        model.put("greeting", "Hello " + user.getFirstName() + ", your payout has been successfully processed.");
        model.put("amount", "₹" + String.format("%,.2f", amount));
        model.put("refId", tid);
        model.put("sessionType", "Institutional Payout Settlement");

        emailService.sendHtmlEmail(user.getEmail(), "LawEZY: Payout Confirmation", "emails/payout-notification", model);

        // 3. Subtract from Wallet's Earned Balance to sync
        walletRepository.findByUserId(id).ifPresent(w -> {
            double current = w.getEarnedBalance() != null ? w.getEarnedBalance() : 0.0;
            w.setEarnedBalance(Math.max(0, current - amount));
            walletRepository.save(w);
        });

        return ResponseEntity.ok(Map.of("message", "Payout confirmed and email dispatched."));
    }

    // 👑 MASTER ADMIN GOVERNANCE (lawezy76)
    // ═══════════════════════════════════════════════════════

    @DeleteMapping("/users/{id}")
    @Transactional
    public ResponseEntity<Map<String, String>> deleteProfile(@PathVariable String id, @RequestParam String adminId) {
        // Governance Check: Strictly limited to MASTER_ADMIN or the primary hardcoded master ID
        String requesterEmail = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        User requester = userRepository.findByEmail(requesterEmail).orElse(null);
        
        if (requester == null || (requester.getRole() != Role.MASTER_ADMIN && !"lawezy76".equals(requester.getId()))) {
            return ResponseEntity.status(403).body(Map.of("error", "Access Denied: Master Identity required for user purge"));
        }

        User target = userRepository.findById(id).orElse(null);
        if (target == null) return ResponseEntity.notFound().build();

        // Prevent self-deletion
        if (id.equals(adminId)) return ResponseEntity.badRequest().body(Map.of("error", "Security Breach: Self-deletion blocked"));

        // Cleanup associated records (Comprehensive Purge)
        walletRepository.deleteByUserId(id);
        financialTransactionRepository.deleteByUserId(id);
        appointmentRepository.deleteByExpert_Id(id);
        appointmentRepository.deleteByClient_Id(id);
        reviewRepository.deleteByExpert_Id(id);
        reviewRepository.deleteByClient_Id(id);
        professionalProfileRepository.deleteByUserId(id);
        
        // Role-Specific Profile cleanup
        if (target.getRole() == Role.LAWYER) lawyerProfileRepository.deleteByUserId(id);
        else if (target.getRole() == Role.CA) caProfileRepository.deleteByUserId(id);
        else if (target.getRole() == Role.CFA) cfaProfileRepository.deleteByUserId(id);
        else if (target.getRole() == Role.CLIENT) clientProfileRepository.deleteByUserId(id);

        userRepository.delete(target);

        // Log Governance Event
        AuditLog log = new AuditLog();
        log.setTimestamp(LocalDateTime.now());
        log.setUserRole("ADMIN");
        log.setEventType("DELETE_PROFILE");
        log.setSummary("Permanently deleted profile: " + id + " (" + target.getEmail() + ") by admin: " + adminId);
        log.setUserId(adminId);
        auditLogRepository.save(log);

        return ResponseEntity.ok(Map.of("message", "Profile and associated data purged successfully"));
    }

    @PostMapping("/master/otp")
    public ResponseEntity<Map<String, String>> sendMasterOtp(@RequestParam String masterId) {
        if (!"lawezy76".equals(masterId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access Denied: Master Identity mismatch"));
        }

        // All master OTPs go to this specific secure email
        otpService.generateAndSendOtp("lawezy2025@gmail.com", "MASTER_ADMIN_ACTION");
        return ResponseEntity.ok(Map.of("message", "Security code dispatched to secure institutional terminal"));
    }

    @PostMapping("/master/create-admin")
    public ResponseEntity<Map<String, String>> createAdmin(
            @RequestParam String masterId,
            @RequestParam String otp,
            @RequestBody Map<String, String> payload) {
        
        if (!"lawezy76".equals(masterId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access Denied: Master Identity mismatch"));
        }

        if (!otpService.validateOtp("lawezy2025@gmail.com", otp, "MASTER_ADMIN_ACTION")) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid Security Code"));
        }

        String email = payload.get("email");
        String firstName = payload.get("firstName");
        String lastName = payload.get("lastName");
        String password = payload.get("password"); // Should be encrypted in production

        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email already registered"));
        }

        User newAdmin = new User();
        
        // 🆔 SYSTEM ID (Primary Key): Always follows the 21[FirstInitial][Serial]SAD pattern
        String firstInit = (firstName != null && !firstName.isEmpty() ? firstName.substring(0, 1) : "A").toUpperCase();
        String serial = String.format("%02d", new java.util.Random().nextInt(100));
        newAdmin.setId("21" + firstInit + serial + "SAD");

        // 🛡️ AUTH ALIAS (Login ID): Custom choice provided by Master Admin
        String customLoginId = payload.get("loginId");
        if (customLoginId != null && !customLoginId.trim().isEmpty()) {
            if (userRepository.existsByLoginId(customLoginId.trim())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Login Alias already in use"));
            }
            newAdmin.setLoginId(customLoginId.trim());
        }
        
        newAdmin.setEmail(email);
        newAdmin.setFirstName(firstName);
        newAdmin.setLastName(lastName);
        newAdmin.setPassword(passwordEncoder.encode(password)); // Encrypt password
        newAdmin.setRole(Role.ADMIN);
        newAdmin.setEnabled(true);
        newAdmin.setPermissions(payload.getOrDefault("permissions", "VIEW_ONLY"));
        userRepository.save(newAdmin);

        // Log Master Action
        AuditLog log = new AuditLog();
        log.setTimestamp(LocalDateTime.now());
        log.setUserRole("MASTER_ADMIN");
        log.setEventType("CREATE_ADMIN");
        log.setSummary("Master Admin created new admin account: " + email + " with permissions: " + payload.getOrDefault("permissions", "VIEW_ONLY"));
        log.setUserId("lawezy76");
        auditLogRepository.save(log);

        return ResponseEntity.ok(Map.of("message", "Institutional Admin account provisioned successfully", "adminId", newAdmin.getId()));
    }

    @DeleteMapping("/administrators/{id}")
    @Transactional
    public ResponseEntity<?> deleteAdministrator(@PathVariable String id, @RequestParam String masterId) {
        if (!"lawezy76".equals(masterId) && !"21LZ76AD".equals(masterId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access Denied: Master Identity mismatch"));
        }

        User admin = userRepository.findById(id).orElse(null);
        if (admin == null || admin.getRole() != Role.ADMIN) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid administrative identity"));
        }

        if ("lawezy76".equals(id) || "21LZ76AD".equals(id)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Cannot revoke Master Admin identity"));
        }

        // 🛡️ INSTITUTIONAL PURGE: Delete all associated dependencies to avoid FK constraints
        walletRepository.deleteByUserId(id);
        financialTransactionRepository.deleteByUserId(id);
        appointmentRepository.deleteByExpert_Id(id);
        appointmentRepository.deleteByClient_Id(id);
        reviewRepository.deleteByExpert_Id(id);
        reviewRepository.deleteByClient_Id(id);
        professionalProfileRepository.deleteByUserId(id);
        
        clientProfileRepository.deleteByUserId(id);
        lawyerProfileRepository.deleteByUserId(id);
        caProfileRepository.deleteByUserId(id);
        cfaProfileRepository.deleteByUserId(id);

        userRepository.delete(admin);

        // Log Governance Event
        AuditLog log = new AuditLog();
        log.setTimestamp(LocalDateTime.now());
        log.setUserRole("MASTER_ADMIN");
        log.setEventType("REVOKE_ADMIN");
        log.setSummary("Master Admin permanently revoked administrative access for: " + admin.getEmail());
        log.setUserId(masterId);
        auditLogRepository.save(log);

        return ResponseEntity.ok(Map.of("message", "Administrative identity revoked and purged successfully"));
    }

    @GetMapping("/administrators")
    public ResponseEntity<List<User>> getAdministrators() {
        List<User> admins = userRepository.findByRoleIn(Arrays.asList(Role.ADMIN, Role.MASTER_ADMIN));
        // Decorate Master Admin with absolute authority in response
        admins.forEach(u -> {
            if ("21LZ76AD".equals(u.getId()) || "lawezy76".equals(u.getId())) {
                u.setPermissions("FULL ACCESS");
            }
        });
        return ResponseEntity.ok(admins);
    }

    @PutMapping("/administrators/{id}/permissions")
    public ResponseEntity<Map<String, String>> updateAdminPermissions(
            @PathVariable String id,
            @RequestParam String masterId,
            @RequestBody Map<String, String> payload) {
        
        if (!"lawezy76".equals(masterId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access Denied: Master Identity mismatch"));
        }

        User admin = userRepository.findById(id).orElse(null);
        if (admin == null || admin.getRole() != Role.ADMIN) {
            return ResponseEntity.badRequest().body(Map.of("error", "Target user is not an administrator"));
        }

        String newPermissions = payload.get("permissions");
        admin.setPermissions(newPermissions);
        userRepository.save(admin);

        // Log Governance Action
        AuditLog log = new AuditLog();
        log.setTimestamp(LocalDateTime.now());
        log.setUserRole("MASTER_ADMIN");
        log.setEventType("UPDATE_ADMIN_PERMISSIONS");
        log.setSummary("Master Admin updated permissions for " + admin.getEmail() + " to: " + newPermissions);
        log.setUserId("lawezy76");
        auditLogRepository.save(log);

        return ResponseEntity.ok(Map.of("message", "Administrative permissions updated successfully"));
    }

    @PostMapping("/experts/{id}/wallet/recalculate")
    @Transactional
    public ResponseEntity<?> recalculateWallet(@PathVariable String id) {
        validatePermission("FINANCIAL LEDGER");
        // 1. Get all completed transactions for this user
        List<FinancialTransaction> txs = financialTransactionRepository.findByUserIdOrderByTimestampDesc(id);
        double calculatedEarned = txs.stream()
            .filter(t -> "COMPLETED".equals(t.getStatus()))
            .mapToDouble(FinancialTransaction::getAmount)
            .sum();
        
        // 2. Update wallet
        Wallet wallet = walletRepository.findByUserId(id).orElse(null);
        if (wallet != null) {
            wallet.setEarnedBalance(calculatedEarned);
            walletRepository.save(wallet);
        }
        
        return ResponseEntity.ok(Map.of("message", "Wallet balance reconciled with ledger truth", "newBalance", calculatedEarned));
    }
    
    private boolean isPlatformIncome(FinancialTransaction tx) {
        if (tx.getDescription() == null) return false;
        String d = tx.getDescription();
        return d.contains("Commission") || 
               d.contains("Platform Fee") || 
               d.contains("Institutional Fee") ||
               d.contains("AI Token") ||
               d.contains("Document Audit") ||
               d.contains("AI Intelligence") ||
               d.contains("Auditor Refill") ||
               d.contains("Message Service") ||
               d.contains("Platform Earning");
    }
}
