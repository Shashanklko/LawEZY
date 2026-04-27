import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import useAuthStore from '../../store/useAuthStore';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import './AdminPortal.css';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const AdminPortal = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [systemMode, setSystemMode] = useState('ACTIVE');

  const exportLedger = (title, headers, rows) => {
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LAWEZY_${title}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = (title, headers, rows) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("LawEZY Institutional Ledger", 14, 20);
    doc.setFontSize(12);
    doc.text(`Report: ${title}`, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 37);
    doc.text(`Platform Master: ${currentUser?.username || 'lawezy76'}`, 14, 44);

    doc.autoTable({
      startY: 55,
      head: [headers],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [13, 27, 42], textColor: [224, 195, 137] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    doc.save(`LAWEZY_${title}_${new Date().toISOString().slice(0,10)}.pdf`);
  };
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalExperts: 0,
    verifiedExperts: 0,
    unverifiedExperts: 0,
    totalClients: 0,
    subAdmins: 0,
    masterAdmins: 0,
    totalAppointments: 0,
    platformRevenue: 0,
    commissionRevenue: 0,
    platformFeeRevenue: 0,
    chatRevenue: 0,
    auditRevenue: 0,
    pendingComplaints: 0,
    systemUptime: "..."
  });
  const [financeView, setFinanceView] = useState('ledger');
  const [financeSubTab, setFinanceSubTab] = useState('dashboard');
  const [contentView, setContentView] = useState('resources');

  const [experts, setExperts] = useState([]);
  const [testEdit, setTestEdit] = useState(true);
  const [clients, setClients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [adminActions, setAdminActions] = useState([]);
  const [selectedExpert, setSelectedExpert] = useState(null);
  const [auditFormData, setAuditFormData] = useState({});
  const [showExpertLogsModal, setShowExpertLogsModal] = useState(false);
  const [expertLogs, setExpertLogs] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [logs, setLogs] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [treasuryLedger, setTreasuryLedger] = useState([]);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertLevel, setAlertLevel] = useState('INFO');
  const [purgeScope, setPurgeScope] = useState('ALL');
  const [purging, setPurging] = useState(null); 
  const [logFilter, setLogFilter] = useState('ALL'); 
  const [expertSearch, setExpertSearch] = useState('');
  const [adminAlert, setAdminAlert] = useState(null);
  const [isTabLoading, setIsTabLoading] = useState(false);

  // 📖 Institutional Pagination State
  const [pages, setPages] = useState({
    experts: { current: 0, total: 0 },
    clients: { current: 0, total: 0 },
    complaints: { current: 0, total: 0 },
    finance: { current: 0, total: 0 },
    logs: { current: 0, total: 0 },
    treasury: { current: 0, total: 0 }
  });
  
  const updatePage = (tab, current, total) => {
    setPages(prev => ({
      ...prev,
      [tab]: { current, total }
    }));
  };
  
  // Master Management State
  const [masterOtp, setMasterOtp] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [newAdminData, setNewAdminData] = useState({ 
    email: '', 
    firstName: '', 
    lastName: '', 
    password: '', 
    permissions: 'VIEW_ONLY',
    loginId: '' 
  });
  const [admins, setAdmins] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMaster = currentUser?.id?.toLowerCase() === 'lawezy76' || 
                   currentUser?.username?.toLowerCase() === 'lawezy76' || 
                   currentUser?.email?.toLowerCase() === 'lawezy2025@gmail.com' ||
                   currentUser?.id === '21LZ76AD' ||
                   currentUser?.role === 'MASTER_ADMIN';
  
  const hasPermission = (module) => {
    // 🛡️ Master Identity Handshake
    if (isMaster) return true;
    
    // 🛡️ Safe Fallback: If role is ADMIN but permissions are missing, default to ALL for continuity
    const perms = (currentUser?.permissions || (currentUser?.role === 'ADMIN' ? 'ALL' : '')).toUpperCase();
    
    if (perms.includes('FULL ACCESS') || perms.includes('ALL')) return true;
    if (perms.includes('READ-ONLY') && module === 'overview') return true;
    
    const permMap = {
      'overview': true,
      'experts': perms.includes('PROFILE AUDIT'),
      'clients': perms.includes('PROFILE AUDIT'),
      'complaints': perms.includes('COMPLAINTS'),
      'finance': perms.includes('FINANCIAL LEDGER'),
      'logs': perms.includes('SYSTEM LOGS'),
      'content': perms.includes('MODERATOR CONTENT'),
      'master': isMaster
    };
    return permMap[module] || false;
  };
  
  useEffect(() => {
    if (selectedExpert) {
      setAuditFormData({
        firstName: selectedExpert.firstName || selectedExpert.name?.split(' ')[0] || '',
        lastName: selectedExpert.lastName || selectedExpert.name?.split(' ')[1] || '',
        title: selectedExpert.title || selectedExpert.category || '',
        email: selectedExpert.email || '',
        phoneNumber: selectedExpert.phoneNumber || '',
        location: selectedExpert.location || '',
        experience: selectedExpert.experience || '',
        barLicenseNumber: selectedExpert.barLicenseNumber || selectedExpert.licenseNumber || '',
        issuingAuthority: selectedExpert.issuingAuthority || '',
        bio: selectedExpert.bio || '',
        consultationFee: selectedExpert.consultationFee || 0,
        licenseDriveLink: selectedExpert.licenseDriveLink || ''
      });
    }
  }, [selectedExpert]);

  const handleAuditFieldChange = (e) => {
    const { name, value } = e.target;
    setAuditFormData(prev => ({ ...prev, [name]: value }));
  };

  const fetchExpertLogs = async (id) => {
    navigate(`/admin/experts/${id}/logs`);
  };

  const PaginationControls = ({ tab }) => {
    const { current, total } = pages[tab];
    if (total <= 1) return null;

    return (
      <div className="pagination-controls glass">
        <button 
          disabled={current === 0} 
          onClick={() => fetchTabDetail(tab, current - 1)}
          className="btn-pagination"
        >
          ← Previous
        </button>
        <span className="page-indicator">
          Page <strong>{current + 1}</strong> of <strong>{total}</strong>
        </span>
        <button 
          disabled={current >= total - 1} 
          onClick={() => fetchTabDetail(tab, current + 1)}
          className="btn-pagination"
        >
          Next →
        </button>
      </div>
    );
  };

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const statsRes = await apiClient.get('/api/admin/dashboard-stats');
      if (statsRes.data) {
        setStats(statsRes.data);
        if (statsRes.data.systemMode) {
          setSystemMode(statsRes.data.systemMode);
        }
      }
    } catch (err) {
      console.error('Core admin sync failure:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'experts' && experts.length === 0) fetchTabDetail('experts');
    if (activeTab === 'clients' && clients.length === 0) fetchTabDetail('clients');
    if (activeTab === 'complaints' && complaints.length === 0) fetchTabDetail('complaints');
    if (activeTab === 'finance' && ledger.length === 0) {
       fetchTabDetail('finance');
       fetchTabDetail('treasury');
    }
    if (activeTab === 'logs' && logs.length === 0) fetchTabDetail('logs');
    if (activeTab === 'master' && admins.length === 0) fetchTabDetail('master');
  }, [activeTab]);

  const fetchTabDetail = async (tab, page = 0) => {
    setIsTabLoading(true);
    try {
      if (tab === 'experts') {
        // Note: Professionals endpoint currently returns a flat list, 
        // but for institutional consistency we wrap it.
        const res = await apiClient.get(`/api/professionals?page=${page}&size=20`);
        if (res.data.content) {
          setExperts(res.data.content);
          updatePage('experts', res.data.number, res.data.totalPages);
        } else {
          setExperts(res.data);
          updatePage('experts', 0, 1);
        }
      } else if (tab === 'clients') {
        const res = await apiClient.get(`/api/admin/clients?page=${page}&size=20`);
        setClients(res.data.content || []);
        updatePage('clients', res.data.number, res.data.totalPages);
      } else if (tab === 'complaints') {
        const res = await apiClient.get('/api/admin/complaints');
        setComplaints(res.data);
      } else if (tab === 'finance') {
        const [walletRes, ledgerRes] = await Promise.all([
          apiClient.get('/api/admin/wallets'),
          apiClient.get(`/api/admin/ledger?page=${page}&size=100`)
        ]);
        setWallets(walletRes.data);
        setLedger(ledgerRes.data.content || []);
        updatePage('finance', ledgerRes.data.number, ledgerRes.data.totalPages);
      } else if (tab === 'treasury') {
        const res = await apiClient.get(`/api/admin/treasury/ledger?page=${page}&size=100`);
        setTreasuryLedger(res.data.content || []);
        updatePage('treasury', res.data.number, res.data.totalPages);
      } else if (tab === 'logs') {
        const res = await apiClient.get(`/api/admin/logs?page=${page}&size=50`);
        setLogs(res.data.content || []);
        updatePage('logs', res.data.number, res.data.totalPages);
      } else if (tab === 'master') {
        const [adminRes, actionsRes] = await Promise.all([
          apiClient.get('/api/admin/administrators'),
          apiClient.get('/api/admin/admin-actions')
        ]);
        setAdmins(adminRes.data);
        setAdminActions(actionsRes.data);
      }
    } catch (err) {
      console.error(`Institutional relay error for tab ${tab}:`, err);
    } finally {
      setIsTabLoading(false);
    }
  };

  const fetchAdminData = () => {
    fetchInitialData();
    fetchTabDetail(activeTab);
  };

  // 🚀 REAL-TIME COMMAND CENTER: Socket Listener
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    const wsUrl = apiUrl.replace('/api', '') + '/ws';
    const socket = new SockJS(wsUrl);
    const stompClient = Stomp.over(socket);
    stompClient.debug = null;

    stompClient.connect({}, () => {
      stompClient.subscribe('/topic/admin', (message) => {
        const payload = JSON.parse(message.body);
        const { eventType, data, timestamp } = payload;

        console.log(`📡 Real-time Admin Event: ${eventType}`, data);

        // 1. Update Logs Feed
        setLogs(prev => [{
          id: Date.now(),
          timestamp: timestamp || new Date().toISOString(),
          eventType: eventType,
          summary: eventType === 'SYSTEM_MODE_CHANGE' 
                   ? `System migrated to ${data.newMode}` 
                   : eventType === 'USER_BLOCKED' 
                   ? `Auto-Governance: Blocked User ${data.userId}` 
                   : eventType === 'NEW_COMPLAINT'
                   ? `Dispute Alert: New complaint filed by ${data.reporterId}`
                   : `New System Event: ${eventType}`,
          userRole: 'SYSTEM'
        }, ...prev]);

        // 2. Update System Mode instantly
        if (eventType === 'SYSTEM_MODE_CHANGE') {
          setSystemMode(data.newMode);
        }

        // 3. Refresh critical stats optimistically or trigger a silent refresh
        if (eventType === 'NEW_USER' || eventType === 'USER_BLOCKED') {
           if (eventType === 'NEW_USER') {
             setAdminAlert({
               title: '🆕 New Institutional Joiner',
               message: `${data.name} has joined LawEZY as a ${data.role}.`,
               type: 'SUCCESS'
             });
             setTimeout(() => setAdminAlert(null), 10000);
           }
           fetchAdminData(); // Silently sync with DB for accuracy
        }

        // 🚀 REAL-TIME FINANCIAL SYNC
        if (['NEW_TRANSACTION', 'WITHDRAWAL_REQUEST', 'APPOINTMENT_CONFIRMED', 'APPOINTMENT_PAID', 'APPOINTMENT_COMPLETED'].includes(eventType)) {
            fetchAdminData();
        }

        // 5. Profile Update Alerts
        if (eventType === 'PROFILE_UPDATE') {
           setAdminAlert({
             title: '📋 Profile Audit Required',
             message: `${data.name} (${data.role}) has updated their professional dossier.`,
             type: 'INFO'
           });
           setTimeout(() => setAdminAlert(null), 10000);
           fetchAdminData();
        }
      });
    });

    return () => {
      if (stompClient.connected) stompClient.disconnect();
    };
  }, []);


  const handleApproveExpert = async (id) => {
    try {
      // Call institutional verification API with updated audit data
      await apiClient.put(`/api/admin/experts/${id}/verify`, auditFormData);
      
      // Optimistic Update
      setExperts(prev => prev.map(exp => exp.id === id ? { ...exp, ...auditFormData, isVerified: true } : exp));
      
      setLogs(prev => [{
        id: Date.now(),
        timestamp: new Date().toISOString(),
        action: 'VERIFY_USER',
        details: `Verified & Corrected account ID: ${id}`,
        user: 'ADMIN'
      }, ...prev]);
    } catch (err) {
      console.error("Verification failed", err);
      alert("Institutional Audit Relay Failed: Check backend connection.");
    }
  };

  const handleBlockUser = async (id) => {
    try {
      const userToUpdate = [...experts, ...clients].find(u => u.id === id);
      const isCurrentlyEnabled = userToUpdate?.enabled !== false && userToUpdate?.status !== 'BLOCKED';
      
      if (isCurrentlyEnabled) {
        await apiClient.put(`/api/admin/users/${id}/block`);
        alert("Account suspended successfully.");
      } else {
        await apiClient.put(`/api/admin/users/${id}/unblock`);
        alert("Account reactivated successfully.");
      }
      
      // Sync with DB
      fetchAdminData();
    } catch (err) {
      console.error("Governance action failed", err);
      alert("State transition failure: " + (err.response?.data?.message || err.message));
    }
  };

  const handleSendAlert = async () => {
    if (!alertMessage.trim()) return;
    try {
      await apiClient.post('/api/admin/broadcast-alert', { message: alertMessage, level: alertLevel });
      setAlertMessage('');
      alert("System-wide alert broadcasted.");
    } catch (err) {
      console.error("Alert failed", err);
      alert("Failed to broadcast alert.");
    }
  };

  const handleResolveComplaint = async (id) => {
    try {
      await apiClient.put(`/api/admin/complaints/${id}/resolve`);
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: 'RESOLVED' } : c));
      setStats(prev => ({ ...prev, pendingComplaints: Math.max(0, prev.pendingComplaints - 1) }));
      alert("Complaint resolved and archived.");
    } catch (err) {
      console.error("Resolution failed", err);
      alert("Failed to resolve complaint.");
    }
  };

  const handleModeChange = async (mode) => {
    if (window.confirm(`Switch platform to ${mode} mode? This will affect all connected users.`)) {
      try {
        await apiClient.put('/api/admin/system-mode', { mode });
        setSystemMode(mode);
        alert(`System state successfully migrated to ${mode} mode.`);
      } catch (err) {
        console.error("Failed to update system mode", err);
        alert("Failed to update system state. Check backend connection.");
      }
    }
  };

  const handleClearLogs = async (duration) => {
    const label = duration === '2_WEEKS' ? '2 weeks' : '1 month';
    if (window.confirm(`Are you sure you want to permanently delete all system logs older than ${label}? This action cannot be undone.`)) {
      setPurging(duration);
      try {
        await apiClient.delete(`/api/admin/logs/clear?duration=${duration}`);
        alert(`Institutional logs purged: Entries older than ${label} have been archived and removed.`);
        fetchAdminData(); // Refresh logs list
      } catch (err) {
        console.error("Purge failed", err);
        alert("Failed to clear logs. Institutional relay error.");
      } finally {
        setPurging(null);
      }
    }
  };

  const handleClearByCategory = async (category) => {
    const label = category.charAt(0) + category.slice(1).toLowerCase();
    if (window.confirm(`Are you sure you want to permanently delete ALL ${label} logs? This cannot be undone.`)) {
      setLoading(true);
      try {
        await apiClient.delete(`/api/admin/logs/clear?category=${category}`);
        alert(`Institutional Cleanup: All ${label} records have been purged.`);
        fetchAdminData();
      } catch (err) {
        console.error("Category purge failed", err);
        alert("Failed to clear specific logs.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleViewDashboard = (targetUser, mode) => {
    // Navigate to dashboard with viewAs params so the dashboard can render in admin-observer mode
    const userId = targetUser.id;
    navigate(`/dashboard?viewAs=${userId}&mode=${mode}&name=${encodeURIComponent(targetUser.name || targetUser.firstName || 'User')}`);
  };

  const handleMarkPaid = async (id, amount) => {
    if (window.confirm(`Mark ₹${amount.toLocaleString()} as PAID for this expert? This will settle their 'Total Payable' balance, send a confirmation email, and record the settlement.`)) {
      try {
        await apiClient.post(`/api/admin/experts/${id}/payout/confirm`, { amount });
        alert(`Payout of ₹${amount.toLocaleString()} confirmed. Settlement recorded and email dispatched.`);
        fetchAdminData();
      } catch (err) {
        console.error("Payout failed", err);
        alert("Failed to process payout.");
      }
    }
  };

  const handleSendInvoice = async (id, amount) => {
    try {
      await apiClient.post(`/api/admin/experts/${id}/payout/invoice`, { amount });
      alert(`Invoice summary for ₹${amount.toLocaleString()} sent to expert email.`);
    } catch (err) {
      console.error("Invoice failed", err);
      alert("Failed to send invoice.");
    }
  };

  const handleResetExpertWallet = async (id) => {
    if (window.confirm("Manually reset this expert's earned balance to zero? This is normally done automatically upon 'Mark Paid', but can be used for manual synchronization.")) {
      try {
        await apiClient.post(`/api/admin/experts/${id}/wallet/reset`);
        alert("Expert wallet balance synchronized to zero.");
        fetchAdminData();
      } catch (err) {
        console.error("Reset failed", err);
        alert("Failed to reset wallet.");
      }
    }
  };

  const handleRecalculateExpertWallet = async (id) => {
    if (window.confirm("Audit and recalculate this expert's balance based on ledger transaction truth? This will fix any balance drift.")) {
      try {
        const res = await apiClient.post(`/api/admin/experts/${id}/wallet/recalculate`);
        alert(`Institutional Audit Complete: Balance reconciled to ₹${res.data.newBalance.toLocaleString()}`);
        fetchAdminData();
      } catch (err) {
        console.error("Recalculation failed", err);
        alert("Failed to recalculate wallet.");
      }
    }
  };

  const handleClearLedger = async (duration) => {
    const label = duration === '1_YEAR' ? '1 year' : '6 months';
    if (window.confirm(`⚠️ PERMANENT DATA LOSS WARNING: You are about to permanently delete all financial ledger records older than ${label}. This action is IRREVERSIBLE and will affect your institutional audit trail. Do you want to proceed?`)) {
      try {
        await apiClient.delete(`/api/admin/ledger/clear?duration=${duration}`);
        alert(`Institutional Cleanup: Financial records older than ${label} have been purged.`);
        fetchAdminData();
      } catch (err) {
        console.error("Ledger purge failed", err);
        alert("Failed to clear ledger. Maintenance relay error.");
      }
    }
  };

  const handleDeleteProfile = async (id, name) => {
    if (window.confirm(`⚠️ CRITICAL GOVERNANCE ALERT: You are about to PERMANENTLY DELETE the profile for ${name}. This will also purge their wallet and transaction logs. This action is irreversible. Proceed?`)) {
      try {
        await apiClient.delete(`/api/admin/users/${id}`);
        alert(`Institutional Purge Complete: ${name} and all associated data have been removed.`);
        fetchAdminData();
      } catch (err) {
        console.error("Delete failed", err);
        alert("Failed to delete profile: " + (err.response?.data?.error || err.message));
      }
    }
  };

  const handleRequestMasterOtp = async () => {
    try {
      await apiClient.post(`/api/admin/master/otp`);
      setOtpSent(true);
      setAdminAlert({ 
        title: 'Security Dispatched', 
        message: 'Institutional Security Code sent to secure terminal (lawezy2025@gmail.com).', 
        type: 'SUCCESS' 
      });
    } catch (err) {
      setAdminAlert({ 
        title: 'Handshake Failed', 
        message: 'Master verification handshake failed. Identity mismatch.', 
        type: 'DANGER' 
      });
    }
  };

  const handleCreateAdmin = async () => {
    try {
      await apiClient.post(`/api/admin/master/create-admin?otp=${masterOtp}`, newAdminData);
      setAlertMessage("Institutional Admin account provisioned successfully.");
      setAlertLevel("SUCCESS");
      setOtpSent(false);
      setMasterOtp('');
      setNewAdminData({ email: '', firstName: '', lastName: '', password: '', permissions: 'VIEW_ONLY' });
      fetchAdminData();
    } catch (err) {
      setAlertMessage("Account provisioning failed: " + (err.response?.data?.error || err.message));
      setAlertLevel("DANGER");
    }
  };

  const handleUpdateAdminPermissions = async (adminId, permissions) => {
    try {
      await apiClient.put(`/api/admin/administrators/${adminId}/permissions`, { permissions });
      setAlertMessage("Administrative permissions updated successfully.");
      setAlertLevel("SUCCESS");
      fetchAdminData();
    } catch (err) {
      setAlertMessage("Failed to update permissions.");
      setAlertLevel("DANGER");
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if (!window.confirm("CRITICAL ACTION: Permanently revoke administrative access and purge this identity?")) return;
    try {
      await apiClient.delete(`/api/admin/administrators/${adminId}?otp=${masterOtp}`); // Added OTP to delete for safety if needed, or just remove if not needed. Wait, my backend change added OTP.
      setAlertMessage("Administrative identity revoked and purged.");
      setAlertLevel("SUCCESS");
      fetchAdminData();
    } catch (err) {
      setAlertMessage("Revocation failed: " + (err.response?.data?.error || err.message));
      setAlertLevel("DANGER");
    }
  };

  const handleResetTreasury = async () => {
    if (!otp) {
      setAdminAlert({ title: 'Security Required', message: 'Security Code (OTP) is mandatory for treasury liquidation.', type: 'DANGER' });
      return;
    }
    
    if (!window.confirm("CRITICAL WARNING: This will permanently zero out all platform earnings and reset the treasury. This action is irreversible. Proceed?")) {
      return;
    }

    try {
      const res = await apiClient.post(`/api/admin/treasury/reset?otp=${otp}&scope=${purgeScope}`);
setAdminAlert({ title: 'Liquidation Success', message: res.data.message, type: 'SUCCESS' });
      setOtp('');
      setOtpSent(false);
      fetchInitialData(); // Refresh stats
    } catch (err) {
      setAdminAlert({ title: 'Liquidation Failed', message: err.response?.data?.error || 'Security mismatch', type: 'DANGER' });
    }
  };

  return (
    <div className={`admin-portal-wrapper ${sidebarOpen ? 'sidebar-expanded' : ''}`}>
      {adminAlert && (
        <div className={`admin-notification-toast animate-slide-down ${adminAlert.type.toLowerCase()}`} onClick={() => setAdminAlert(null)}>
          <div className="toast-icon">⚡</div>
          <div className="toast-body">
            <strong>{adminAlert.title}</strong>
            <p>{adminAlert.message}</p>
          </div>
          <button className="btn-close-toast" onClick={(e) => { e.stopPropagation(); setAdminAlert(null); }}>×</button>
        </div>
      )}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-brand">
          <span className="lawezy-logo small">LAWEZY<span className="logo-dot">.</span></span>
          <span className="brand-separator">|</span>
          <span className="brand-suffix">Admin Control</span>
        </div>
        
        <nav className="admin-nav">
          {hasPermission('overview') && (
            <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => { setActiveTab('overview'); setSidebarOpen(false); }}>
              <span className="nav-icon">📊</span> Overview
            </button>
          )}
          {hasPermission('experts') && (
            <button className={activeTab === 'experts' ? 'active' : ''} onClick={() => { setActiveTab('experts'); setSidebarOpen(false); }}>
              <span className="nav-icon">⚖️</span> Expert Management
            </button>
          )}
          {hasPermission('clients') && (
            <button className={activeTab === 'clients' ? 'active' : ''} onClick={() => { setActiveTab('clients'); setSidebarOpen(false); }}>
              <span className="nav-icon">👤</span> Client Management
            </button>
          )}
          {hasPermission('complaints') && (
            <button className={activeTab === 'complaints' ? 'active' : ''} onClick={() => { setActiveTab('complaints'); setSidebarOpen(false); }} style={{ position: 'relative' }}>
              <span className="nav-icon">⚠️</span> Complaints Hub
              {complaints.filter(c => c.status !== 'RESOLVED').length > 0 && (
                <span style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: '#ef4444', color: 'white', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                  {complaints.filter(c => c.status !== 'RESOLVED').length}
                </span>
              )}
            </button>
          )}
          {hasPermission('finance') && (
            <button className={activeTab === 'finance' ? 'active' : ''} onClick={() => { setActiveTab('finance'); setSidebarOpen(false); }}>
              <span className="nav-icon">💳</span> Financial Dashboard
            </button>
          )}
          {hasPermission('logs') && (
            <button className={activeTab === 'logs' ? 'active' : ''} onClick={() => { setActiveTab('logs'); setSidebarOpen(false); }} style={{ position: 'relative' }}>
              <span className="nav-icon">📜</span> System Logs
              {logs.length > 0 && (
                <span style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {logs.length}
                </span>
              )}
            </button>
          )}
          {hasPermission('content') && (
            <button className={activeTab === 'content' ? 'active' : ''} onClick={() => { setActiveTab('content'); setSidebarOpen(false); }}>
              <span className="nav-icon">📝</span> Content Control
            </button>
          )}
          {hasPermission('master') && (
            <button className={activeTab === 'master' ? 'active' : ''} onClick={() => { setActiveTab('master'); setSidebarOpen(false); }}>
              <span className="nav-icon">🛡️</span> Admin Management
            </button>
          )}
        </nav>

        <div className="admin-sidebar-footer">
          <button className="btn-public-mode" onClick={() => navigate('/')}>
            🌐 Public Mode
          </button>
          <button className="btn-logout-admin" onClick={() => { localStorage.clear(); navigate('/login'); }}>
            Exit Command Center
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-top-bar">
          <div className="header-left">
            <button className="mobile-menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? '✕' : '☰'}
            </button>
            <div className="header-title">
              <h1>Platform Governance</h1>
              <p>Institutional Oversight & Control</p>
            </div>
          </div>
          <div className="admin-status-cluster">
            <div className={`system-status-indicator ${systemMode}`}>
              <div className="pulse-dot"></div>
              <span>Admin: {currentUser?.username || 'lawezy76'}</span>
            </div>
          </div>
        </header>

        <div className="admin-scroll-content">
          {activeTab === 'overview' && (
            <div className="admin-grid animate-fade-in">
              <div className="system-control-card glass animate-slide-up" style={{ gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>🛡️ Institutional Action Center</h3>
                  <div className="live-tag">REAL-TIME ALERTS</div>
                </div>
                <div className="action-center-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                  <div className="action-alert-box warning" style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '15px', borderRadius: '10px' }}>
                     <h4 style={{ color: '#f59e0b', fontSize: '0.85rem', marginBottom: '8px' }}>⚠️ Pending Expert Verifications</h4>
                     <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>{stats.unverifiedExperts || 0} experts are awaiting profile review and credential validation.</p>
                     <button className="btn-view-sm" onClick={() => { setActiveTab('experts'); setExpertSearch('pending:true'); }}>Open Verification Queue</button>
                  </div>
                  <div className="action-alert-box info" style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '15px', borderRadius: '10px' }}>
                     <h4 style={{ color: '#3b82f6', fontSize: '0.85rem', marginBottom: '8px' }}>💬 Active Disputes</h4>
                     <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>{stats.pendingComplaints || 0} unresolved complaints require institutional resolution.</p>
                     <button className="btn-view-sm" onClick={() => setActiveTab('complaints')}>Go to Disputes Hub</button>
                  </div>
                </div>
              </div>

              <div className="system-control-card glass animate-slide-up" style={{ gridColumn: 'span 2' }}>
                <h3>📢 Global Institutional Alert</h3>
                <p>Broadcast a real-time message to all active sessions on the platform.</p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <input 
                    type="text" 
                    value={alertMessage} 
                    onChange={(e) => setAlertMessage(e.target.value)}
                    placeholder="Enter urgent notification message..."
                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none' }}
                  />
                  <select 
                    value={alertLevel} 
                    onChange={(e) => setAlertLevel(e.target.value)}
                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(20,20,20,0.8)', color: 'white' }}
                  >
                    <option value="INFO">INFO</option>
                    <option value="WARNING">WARNING</option>
                    <option value="DANGER">CRITICAL</option>
                  </select>
                  <button 
                    onClick={handleSendAlert}
                    style={{ padding: '12px 25px', borderRadius: '8px', background: 'var(--elite-gold)', color: '#1a1a1a', border: 'none', fontWeight: 800, cursor: 'pointer' }}
                  >
                    Broadcast
                  </button>
                </div>
              </div>

              <div className="system-control-card glass animate-slide-up">
                <h3>Global Platform State</h3>
                <p>Toggle institutional access levels across all nodes.</p>
                <div className="mode-selector">
                  <button 
                    className={`mode-btn active ${systemMode === 'ACTIVE' ? 'selected' : ''}`}
                    onClick={() => handleModeChange('ACTIVE')}
                  >
                    ACTIVE
                  </button>
                  <button 
                    className={`mode-btn testing ${systemMode === 'TESTING' ? 'selected' : ''}`}
                    onClick={() => handleModeChange('TESTING')}
                  >
                    TESTING
                  </button>
                  <button 
                    className={`mode-btn maintenance ${systemMode === 'MAINTENANCE' ? 'selected' : ''}`}
                    onClick={() => handleModeChange('MAINTENANCE')}
                  >
                    MAINTENANCE
                  </button>
                </div>
              </div>
              
              <div className="stat-card-elite">
                  <label>LawEZY Registered Expert</label>
                  <h2>{stats.totalExperts}</h2>
                  <div className="card-meta" style={{marginTop:'10px', display:'flex', gap:'10px'}}>
                    <span className="meta-item success" style={{color:'#10b981', fontSize:'0.7rem'}}>● {stats.verifiedExperts} Verified</span>
                    <span className="meta-item danger" style={{color:'#ef4444', fontSize:'0.7rem'}}>● {stats.unverifiedExperts} Pending</span>
                  </div>
              </div>
              <div className="stat-card-elite">
                <label>Service Seekers (Clients)</label>
                <h2>{stats.totalClients || 0}</h2>
                <div className="stat-trend">Total Registered Clients</div>
              </div>
              <div className="stat-card-elite">
                <label>Administrative Staff</label>
                <h2>{(stats.subAdmins || 0) + (stats.masterAdmins || 0)}</h2>
                <div className="stat-trend">
                  {stats.subAdmins || 0} Sub-Admins | {stats.masterAdmins || 0} Master
                </div>
              </div>

            </div>
          )}

          {activeTab === 'experts' && ( /* Institutional Pagination Active */
            <div className="admin-list-container animate-slide-up">
              <div className="list-header">
                <h3>⚖️ Legal & Financial Expert Audit</h3>
                <div className="list-actions">
                  <button className="btn-filter">Filter: All Experts</button>
                  <input 
                    type="text" 
                    placeholder="Search Expert ID..." 
                    className="admin-search-input" 
                    value={expertSearch}
                    onChange={(e) => setExpertSearch(e.target.value)}
                  />
                  <button className="btn-export" onClick={() => exportLedger('EXPERTS', 
                    ['ID', 'Name', 'Email', 'Category', 'Verified', 'Status', 'Consultation Fee'],
                    experts.map(e => [e.id, e.firstName + ' ' + e.lastName, e.email, e.category, e.isVerified, e.status, e.consultationFee])
                  )}>⬇ Export Experts CSV</button>
                </div>
              </div>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Expert ID</th>
                    <th>Identity</th>
                    <th>Role</th>
                    <th>Verification</th>
                    <th>Account Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isTabLoading ? (
                    Array(8).fill(0).map((_, i) => (
                      <tr key={i}>
                        <td><div className="skeleton-pulse" style={{height:'20px', width:'80%', borderRadius:'4px'}}></div></td>
                        <td><div className="skeleton-pulse" style={{height:'20px', width:'150px', borderRadius:'4px'}}></div></td>
                        <td><div className="skeleton-pulse" style={{height:'20px', width:'60px', borderRadius:'4px'}}></div></td>
                        <td><div className="skeleton-pulse" style={{height:'20px', width:'80px', borderRadius:'4px'}}></div></td>
                        <td><div className="skeleton-pulse" style={{height:'20px', width:'100px', borderRadius:'4px'}}></div></td>
                        <td><div className="skeleton-pulse" style={{height:'32px', width:'120px', borderRadius:'8px'}}></div></td>
                      </tr>
                    ))
                  ) : (
                    experts
                      .filter(exp => {
                      if (!expertSearch) return true;
                      if (expertSearch === 'pending:true') return !exp.isVerified;
                      const searchStr = `${exp.firstName} ${exp.lastName} ${exp.id} ${exp.email}`.toLowerCase();
                      return searchStr.includes(expertSearch.toLowerCase());
                    })
                    .map(exp => (
                    <tr key={exp.id}>
                      <td className="id-cell"><code>UID-{exp.id.substring(0, 8)}</code></td>
                      <td className="user-cell">
                        <div className="user-info">
                          <div className="name">{exp.firstName ? `${exp.firstName} ${exp.lastName || ''}` : (exp.name || 'Anonymous Expert')}</div>
                        </div>
                      </td>
                      <td><span className={`tag ${exp.category}`}>{exp.category}</span></td>
                      <td>
                        {exp.isVerified ? 
                          <span className="status-badge verified">Verified</span> : 
                          <span className="status-badge pending">Awaiting Review</span>
                        }
                      </td>
                      <td>
                        <span className={`status-badge ${exp.status?.toLowerCase() || 'active'}`}>
                          {exp.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td>
                        <div className="action-stack">
                          <button 
                            className="btn-view-sm" 
                            onClick={() => navigate(`/admin/experts/${exp.id}/profile`)}
                            style={{ background: 'rgba(212,175,55,0.1)', color: 'var(--elite-gold)', border: '1px solid rgba(212,175,55,0.3)' }}
                          >
                            Audit Profile
                          </button>
                          <button className={`btn-suspend-sm ${(exp.enabled === false || exp.status === 'BLOCKED') ? 'reactivate' : ''}`} onClick={() => handleBlockUser(exp.id)}>
                            {(exp.enabled === false || exp.status === 'BLOCKED') ? 'Unblock' : 'Block'}
                          </button>
                          <button className="btn-audit-sm" onClick={() => fetchExpertLogs(exp.id)}>Logs</button>
                          <button className="btn-purge-sm" onClick={() => handleDeleteProfile(exp.id, exp.name || exp.firstName)} title="Permanent Delete">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'clients' && (
            <div className="admin-list-container animate-slide-up">
              <div className="list-header">
                <h3>👤 Client Identity Management</h3>
                <div className="list-actions">
                  <button className="btn-filter">Filter: Active</button>
                  <input type="text" placeholder="Search Client ID..." className="admin-search-input" />
                  <button className="btn-export" onClick={() => exportLedger('CLIENTS',
                    ['ID', 'Name', 'Email', 'Status', 'Wallet Balance'],
                    clients.map(c => [c.id, c.firstName + ' ' + c.lastName, c.email, c.enabled ? 'ACTIVE' : 'BLOCKED', wallets.find(w => w.id === c.id)?.cashBalance || 0])
                  )}>⬇ Export Clients CSV</button>
                </div>
              </div>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Client ID</th>
                    <th>Identity</th>
                    <th>Wallet Balance</th>
                    <th>Account Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isTabLoading ? (
                    Array(8).fill(0).map((_, i) => (
                      <tr key={i}>
                        <td><div className="skeleton-pulse" style={{height:'20px', width:'80%', borderRadius:'4px'}}></div></td>
                        <td><div className="skeleton-pulse" style={{height:'20px', width:'150px', borderRadius:'4px'}}></div></td>
                        <td><div className="skeleton-pulse" style={{height:'20px', width:'60px', borderRadius:'4px'}}></div></td>
                        <td><div className="skeleton-pulse" style={{height:'20px', width:'100px', borderRadius:'4px'}}></div></td>
                        <td><div className="skeleton-pulse" style={{height:'32px', width:'120px', borderRadius:'8px'}}></div></td>
                      </tr>
                    ))
                  ) : clients.map(cli => (
                    <tr key={cli.id}>
                      <td className="id-cell"><code>{cli.id}</code></td>
                      <td className="user-cell">
                        <div className="user-info">
                          <div className="name">{cli.firstName ? `${cli.firstName} ${cli.lastName || ''}` : (cli.name || cli.email || 'Anonymous Client')}</div>
                        </div>
                      </td>
                      <td><strong>₹{wallets.find(w => w.user?.id === cli.id)?.cashBalance || 0}</strong></td>
                      <td>
                        <span className={`status-badge ${(cli.status || 'ACTIVE').toLowerCase()}`}>{cli.status || 'ACTIVE'}</span>
                      </td>
                      <td>
                        <div className="action-stack">
                          <button 
                            className="btn-view-sm" 
                            onClick={() => navigate(`/admin/clients/${cli.id}/profile`)}
                            style={{ background: 'rgba(212,175,55,0.1)', color: 'var(--elite-gold)', border: '1px solid rgba(212,175,55,0.3)' }}
                          >
                            Audit Profile
                          </button>
                          <button className={`btn-suspend-sm ${(cli.enabled === false || cli.status === 'BLOCKED') ? 'reactivate' : ''}`} onClick={() => handleBlockUser(cli.id)}>
                            {(cli.enabled === false || cli.status === 'BLOCKED') ? 'Unblock' : 'Block'}
                          </button>
                          <button className="btn-audit-sm" onClick={() => navigate(`/admin/clients/${cli.id}/logs`)}>Logs</button>
                          <button className="btn-purge-sm" onClick={() => handleDeleteProfile(cli.id, cli.name || cli.firstName || cli.email)} title="Permanent Delete">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'complaints' && (
            <div className="admin-list-container animate-fade-in">
              <div className="list-header">
                <h3>Dispute & Complaints Resolution</h3>
              </div>
              <div className="complaints-grid">
                {complaints.map(complaint => (
                  <div className="complaint-card glass" key={complaint.id}>
                    <div className="complaint-header">
                      <span className={`priority-tag ${complaint.status === 'PENDING' ? 'HIGH' : 'LOW'}`}>{complaint.status === 'PENDING' ? 'HIGH' : 'LOW'} PRIORITY</span>
                      <span className="complaint-id">{complaint.id.substring(0, 8)}</span>
                    </div>
                    <div className="complaint-body">
                      <h4>{complaint.targetType}: {complaint.reporterId}</h4>
                      <p><strong>Reason:</strong> {complaint.reason}</p>
                      {complaint.details && <p className="complaint-details" style={{fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px', fontStyle: 'italic'}}>{complaint.details}</p>}
                    </div>
                    <div className="complaint-footer">
                      <span className={`status-text ${complaint.status}`}>{complaint.status}</span>
                      {complaint.status !== 'RESOLVED' && (
                        <button 
                          className="btn-resolve" 
                          onClick={() => handleResolveComplaint(complaint.id)}
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="admin-list-container animate-slide-up">
              {/* 📊 Log Distribution Visualization */}
              <div className="log-distribution-card" style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>📊 Institutional Event Distribution</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--elite-gold)' }}>{logs.length} Total Records</span>
                </div>
                
                {/* Multi-segmented Distribution Bar */}
                <div className="distribution-bar" style={{ height: '8px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', display: 'flex', overflow: 'hidden', marginBottom: '20px' }}>
                  <div title="Security Alerts" style={{ width: `${(logs.filter(l => l.eventType?.includes('ALERT')).length / (logs.length || 1)) * 100}%`, background: '#ef4444' }}></div>
                  <div title="System Errors" style={{ width: `${(logs.filter(l => l.eventType?.includes('ERROR')).length / (logs.length || 1)) * 100}%`, background: '#f59e0b' }}></div>
                  <div title="Login Events" style={{ width: `${(logs.filter(l => l.eventType?.toUpperCase().includes('LOGIN')).length / (logs.length || 1)) * 100}%`, background: '#3b82f6' }}></div>
                  <div title="AI Compliance" style={{ width: `${(logs.filter(l => l.eventType?.includes('AI_')).length / (logs.length || 1)) * 100}%`, background: '#10b981' }}></div>
                  <div title="Other" style={{ flex: 1, background: 'rgba(255,255,255,0.1)' }}></div>
                </div>

                <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '15px' }}>
                  <div 
                    className={`metric-box ${logFilter === 'SECURITY_ALERT' ? 'active-filter' : ''}`} 
                    onClick={() => setLogFilter(logFilter === 'SECURITY_ALERT' ? 'ALL' : 'SECURITY_ALERT')}
                    style={{ position: 'relative', cursor: 'pointer', transition: 'all 0.2s', padding: '10px', borderRadius: '8px', border: logFilter === 'SECURITY_ALERT' ? '1px solid #ef4444' : '1px solid transparent', background: logFilter === 'SECURITY_ALERT' ? 'rgba(239, 68, 68, 0.1)' : 'transparent' }}
                  >
                    <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>🔒 Security</label>
                    <p style={{ margin: '4px 0 0 0', fontSize: '1.1rem', fontWeight: 'bold' }}>{logs.filter(l => l.eventType?.includes('ALERT')).length}</p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleClearByCategory('SECURITY'); }}
                      style={{ position: 'absolute', top: '5px', right: '5px', background: 'none', border: 'none', color: '#ef4444', fontSize: '0.7rem', cursor: 'pointer', opacity: 0.5 }}
                      title="Clear Security Logs"
                    >🗑️</button>
                  </div>
                  <div 
                    className={`metric-box ${logFilter === 'SYSTEM_ERROR' ? 'active-filter' : ''}`} 
                    onClick={() => setLogFilter(logFilter === 'SYSTEM_ERROR' ? 'ALL' : 'SYSTEM_ERROR')}
                    style={{ position: 'relative', cursor: 'pointer', transition: 'all 0.2s', padding: '10px', borderRadius: '8px', border: logFilter === 'SYSTEM_ERROR' ? '1px solid #f59e0b' : '1px solid transparent', background: logFilter === 'SYSTEM_ERROR' ? 'rgba(245, 158, 11, 0.1)' : 'transparent' }}
                  >
                    <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>⚙️ System</label>
                    <p style={{ margin: '4px 0 0 0', fontSize: '1.1rem', fontWeight: 'bold' }}>{logs.filter(l => l.eventType?.includes('ERROR')).length}</p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleClearByCategory('SYSTEM'); }}
                      style={{ position: 'absolute', top: '5px', right: '5px', background: 'none', border: 'none', color: '#f59e0b', fontSize: '0.7rem', cursor: 'pointer', opacity: 0.5 }}
                      title="Clear System Logs"
                    >🗑️</button>
                  </div>
                  <div 
                    className={`metric-box ${logFilter === 'LOGIN_EVENT' ? 'active-filter' : ''}`} 
                    onClick={() => setLogFilter(logFilter === 'LOGIN_EVENT' ? 'ALL' : 'LOGIN_EVENT')}
                    style={{ position: 'relative', cursor: 'pointer', transition: 'all 0.2s', padding: '10px', borderRadius: '8px', border: logFilter === 'LOGIN_EVENT' ? '1px solid #3b82f6' : '1px solid transparent', background: logFilter === 'LOGIN_EVENT' ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}
                  >
                    <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>🔑 Auth/Login</label>
                    <p style={{ margin: '4px 0 0 0', fontSize: '1.1rem', fontWeight: 'bold' }}>{logs.filter(l => l.eventType?.toUpperCase().includes('LOGIN')).length}</p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleClearByCategory('AUTH'); }}
                      style={{ position: 'absolute', top: '5px', right: '5px', background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.7rem', cursor: 'pointer', opacity: 0.5 }}
                      title="Clear Auth Logs"
                    >🗑️</button>
                  </div>
                  <div 
                    className={`metric-box ${logFilter === 'AI_LOGIC' ? 'active-filter' : ''}`} 
                    onClick={() => setLogFilter(logFilter === 'AI_LOGIC' ? 'ALL' : 'AI_LOGIC')}
                    style={{ position: 'relative', cursor: 'pointer', transition: 'all 0.2s', padding: '10px', borderRadius: '8px', border: logFilter === 'AI_LOGIC' ? '1px solid #10b981' : '1px solid transparent', background: logFilter === 'AI_LOGIC' ? 'rgba(16, 185, 129, 0.1)' : 'transparent' }}
                  >
                    <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>🤖 AI Logic</label>
                    <p style={{ margin: '4px 0 0 0', fontSize: '1.1rem', fontWeight: 'bold' }}>{logs.filter(l => l.eventType?.includes('AI_')).length}</p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleClearByCategory('AI'); }}
                      style={{ position: 'absolute', top: '5px', right: '5px', background: 'none', border: 'none', color: '#10b981', fontSize: '0.7rem', cursor: 'pointer', opacity: 0.5 }}
                      title="Clear AI Logs"
                    >🗑️</button>
                  </div>
                  <div 
                    className={`metric-box ${logFilter === 'PURGE_ACTION' ? 'active-filter' : ''}`} 
                    onClick={() => setLogFilter(logFilter === 'PURGE_ACTION' ? 'ALL' : 'PURGE_ACTION')}
                    style={{ position: 'relative', cursor: 'pointer', transition: 'all 0.2s', padding: '10px', borderRadius: '8px', border: logFilter === 'PURGE_ACTION' ? '1px solid var(--elite-gold)' : '1px solid transparent', background: logFilter === 'PURGE_ACTION' ? 'rgba(212, 175, 55, 0.1)' : 'transparent' }}
                  >
                    <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>🧹 Maintenance</label>
                    <p style={{ margin: '4px 0 0 0', fontSize: '1.1rem', fontWeight: 'bold' }}>{logs.filter(l => l.eventType?.includes('PURGE')).length}</p>
                  </div>
                </div>
              </div>

              <div className="list-header">
                <div>
                  <h3>🔐 {logFilter === 'ALL' ? 'Centralized Audit Ledger' : `${logFilter.replace('_', ' ')} Details`}</h3>
                  <p style={{color:'rgba(255,255,255,0.3)',fontSize:'0.8rem',marginTop:'4px'}}>{logFilter === 'ALL' ? 'Comprehensive real-time tracking of security, system, and authentication events' : `Filtering results for ${logFilter.toLowerCase().replace('_', ' ')} events.`}</p>
                </div>
                <div className="list-actions" style={{ display: 'flex', gap: '10px' }}>
                  <div className="purge-actions" style={{ display: 'flex', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', overflow: 'hidden' }}>
                    <button 
                      className={`btn-purge-sm ${purging === '2_WEEKS' ? 'purging' : ''}`} 
                      onClick={() => handleClearLogs('2_WEEKS')}
                      disabled={purging !== null}
                      style={{ background: purging === '2_WEEKS' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '8px 12px', fontSize: '0.65rem', fontWeight: 800, cursor: purging ? 'wait' : 'pointer', borderRight: '1px solid rgba(239, 68, 68, 0.2)', transition: 'all 0.3s' }}
                    >
                      {purging === '2_WEEKS' ? '🕒 Purging...' : 'Purge > 2 Weeks'}
                    </button>
                    <button 
                      className={`btn-purge-sm ${purging === '1_MONTH' ? 'purging' : ''}`} 
                      onClick={() => handleClearLogs('1_MONTH')}
                      disabled={purging !== null}
                      style={{ background: purging === '1_MONTH' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '8px 12px', fontSize: '0.65rem', fontWeight: 800, cursor: purging ? 'wait' : 'pointer', transition: 'all 0.3s' }}
                    >
                      {purging === '1_MONTH' ? '🕒 Purging...' : 'Purge > 1 Month'}
                    </button>
                  </div>
                  <button className="btn-export" onClick={() => exportLedger('SYSTEM_AUDIT',
                    ['Timestamp','Event','Summary','User','Role','IP Address'],
                    logs.map(l => [l.timestamp, l.eventType, l.summary, l.userId, l.userRole, l.ipAddress])
                  )}>⬇ Export CSV</button>
                </div>
              </div>
              <table className="payout-table" style={{marginTop:'20px'}}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Event</th>
                    <th>Summary</th>
                    <th>User</th>
                    <th>Role</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {isTabLoading ? (
                    Array(10).fill(0).map((_, i) => (
                      <tr key={i}>
                        <td><div className="skeleton-pulse" style={{height:'20px', width:'60px', borderRadius:'4px'}}></div></td>
                        <td><div className="skeleton-pulse" style={{height:'20px', width:'120px', borderRadius:'4px'}}></div></td>
                        <td><div className="skeleton-pulse" style={{height:'20px', width:'180px', borderRadius:'4px'}}></div></td>
                        <td><div className="skeleton-pulse" style={{height:'20px', width:'100px', borderRadius:'4px'}}></div></td>
                        <td><div className="skeleton-pulse" style={{height:'20px', width:'80px', borderRadius:'4px'}}></div></td>
                        <td><div className="skeleton-pulse" style={{height:'20px', width:'80px', borderRadius:'4px'}}></div></td>
                      </tr>
                    ))
                  ) : logs
                    .filter(log => {
                      if (logFilter === 'ALL') return true;
                      if (logFilter === 'SECURITY_ALERT') return log.eventType?.includes('ALERT');
                      if (logFilter === 'SYSTEM_ERROR') return log.eventType?.includes('ERROR');
                      if (logFilter === 'LOGIN_EVENT') return log.eventType?.toUpperCase().includes('LOGIN');
                      if (logFilter === 'AI_LOGIC') return log.eventType?.includes('AI_');
                      if (logFilter === 'PURGE_ACTION') return log.eventType?.includes('PURGE');
                      return log.eventType === logFilter;
                    })
                    .map((log, i) => (
                    <tr key={log.id || i}>
                      <td style={{fontFamily:'monospace',color:'rgba(255,255,255,0.4)',fontSize:'0.8rem'}}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td>
                        <span className={`saas-pill ${log.eventType?.includes('ALERT') || log.eventType?.includes('ERROR') ? 'danger' : 'success'}`}>
                          {log.eventType}
                        </span>
                      </td>
                      <td className="expert-name-cell">{log.summary}</td>
                      <td style={{color:'rgba(255,255,255,0.5)',fontSize:'0.82rem'}}>{log.userId || 'System'}</td>
                      <td>
                        <span className="type-badge" style={log.userRole==='ADMIN'?{background:'rgba(212,175,55,0.1)',color:'var(--elite-gold)',border:'1px solid rgba(212,175,55,0.2)'}:{background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.08)'}}>
                          {log.userRole || 'N/A'}
                        </span>
                      </td>
                      <td style={{fontFamily:'monospace',color:'rgba(255,255,255,0.5)',fontSize:'0.82rem'}}>{log.ipAddress || '127.0.0.1'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="finance-saas-container animate-fade-in">
              <div className="finance-sub-navigation">
                <button className={financeSubTab === 'dashboard' ? 'active' : ''} onClick={() => setFinanceSubTab('dashboard')}>
                  📊 Home Dashboard
                </button>
                <button className={financeSubTab === 'operations' ? 'active' : ''} onClick={() => setFinanceSubTab('operations')}>
                  💸 Payouts & Wallets
                </button>
                <button className={financeSubTab === 'audit' ? 'active' : ''} onClick={() => setFinanceSubTab('audit')}>
                  🏦 Escrow & Audit
                </button>
                <button className={financeSubTab === 'treasury' ? 'active' : ''} onClick={() => setFinanceSubTab('treasury')}>
                  🪙 Treasury Ledger
                </button>
              </div>

              {(() => {
                const expertWallets = wallets.filter(w => {
                  const targetUser = w.user || [...experts, ...clients, ...admins].find(usr => usr.id === w.id);
                  const roleName = (targetUser?.role?.name || targetUser?.role || '').toString().toUpperCase(); 
                  return ['LAWYER', 'CA', 'CFA', 'ROLE_LAWYER', 'ROLE_CA', 'ROLE_CFA'].includes(roleName);
                });

                const overallPayable = expertWallets.reduce((acc, w) => acc + (w.earnedBalance || 0), 0);
                const escrowVault = expertWallets.reduce((acc, w) => acc + (w.escrowBalance || 0), 0);

                const isPlatformRev = (l) => {
                  if (!l.description) return false;
                  const desc = l.description.toLowerCase();
                  const isAcceptedStatus = (l.status === 'COMPLETED' || l.status === 'RELEASED' || l.status === 'LOCKED' || l.status === 'PAID');
                  
                  return isAcceptedStatus && (
                    desc.includes('commission') || 
                    desc.includes('fee') || 
                    desc.includes('institutional') ||
                    desc.includes('ai token') ||
                    desc.includes('document audit') ||
                    desc.includes('ai intelligence') ||
                    desc.includes('auditor refill') ||
                    desc.includes('message service') ||
                    desc.includes('platform earning')
                  );
                };

                // 📊 Dashboard Calculations (Source of Truth: Platform Treasury)
                const totalInflow = ledger
                  .filter(l => l.amount > 0 && (l.description.includes('Top-up') || l.description.includes('Deposit')))
                  .reduce((acc, l) => acc + l.amount, 0);

                const commissionRevenue = stats.commissionRevenue || 0;
                const aiRevenue = (stats.chatRevenue || 0) + (stats.auditRevenue || 0);
                const platformFeeRevenue = stats.platformFeeRevenue || 0;

                // Chart Data (Last 7 Days)
                const chartData = [...new Set(ledger.map(l => new Date(l.timestamp).toLocaleDateString()))]
                  .slice(0, 7)
                  .map(date => ({
                    date,
                    revenue: ledger
                      .filter(l => l.amount > 0 && isPlatformRev(l) && new Date(l.timestamp).toLocaleDateString() === date)
                      .reduce((acc, l) => acc + (l.amount || 0), 0)
                  }))
                  .reverse();

                const clientWallets = wallets.filter(w => {
                  const targetUser = w.user || [...experts, ...clients, ...admins].find(usr => usr.id === w.id);
                  const roleName = (targetUser?.role?.name || targetUser?.role || '').toString().toUpperCase(); 
                  return ['CLIENT', 'ROLE_CLIENT', 'USER', 'ROLE_USER'].includes(roleName);
                });
                const totalClientBalance = clientWallets.reduce((acc, w) => acc + (w.cashBalance || 0), 0);

                return (
                  <>
                    {financeSubTab === 'dashboard' && (
                      <div className="finance-dashboard-view animate-fade-in">
                        <div className="earnings-quick-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
                          <div className="earning-mini-card highlight-gold">
                            <label>TOTAL PLATFORM REVENUE</label>
                            <h3>₹{stats.platformRevenue?.toLocaleString() || '0'}</h3>
                            <span style={{fontSize:'0.65rem', color:'var(--elite-gold)'}}>Net Institutional Profit</span>
                          </div>
                          <div className="earning-mini-card">
                            <label>COMMISSION (APPTS)</label>
                            <h3>₹{stats.commissionRevenue?.toLocaleString() || '0'}</h3>
                            <span style={{fontSize:'0.65rem', color:'rgba(255,255,255,0.4)'}}>Expert Share Cut</span>
                          </div>
                          <div className="earning-mini-card">
                            <label>PLATFORM FEES</label>
                            <h3>₹{stats.platformFeeRevenue?.toLocaleString() || '0'}</h3>
                            <span style={{fontSize:'0.65rem', color:'rgba(255,255,255,0.4)'}}>General Fees</span>
                          </div>
                          <div className="earning-mini-card">
                            <label>AI CHAT EARNINGS</label>
                            <h3>₹{stats.chatRevenue?.toLocaleString() || '0'}</h3>
                            <span style={{fontSize:'0.65rem', color:'rgba(255,255,255,0.4)'}}>AI Intelligence Refills</span>
                          </div>
                          <div className="earning-mini-card">
                            <label>AI AUDIT EARNINGS</label>
                            <h3>₹{stats.auditRevenue?.toLocaleString() || '0'}</h3>
                            <span style={{fontSize:'0.65rem', color:'rgba(255,255,255,0.4)'}}>Doc Audit Services</span>
                          </div>
                          <div className="earning-mini-card highlight-danger">
                            <label>TOTAL LIABILITIES</label>
                            <h3>₹{(overallPayable + totalClientBalance).toLocaleString()}</h3>
                            <span style={{fontSize:'0.65rem', color:'#ef4444'}}>Total Vault Debt</span>
                          </div>
                        </div>

                        <div className="finance-performance-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', marginTop: '20px' }}>
                          <div className="finance-chart-section glass animate-fade-in" style={{ padding: '30px', height: '400px', minWidth: 0 }}>
                            <div className="section-header-saas" style={{ marginBottom: '20px' }}>
                              <h3>📈 Revenue Performance (Last 7 Days)</h3>
                              <span className="live-tag">REAL-TIME DATA</span>
                            </div>
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                              <AreaChart data={chartData}>
                                <defs>
                                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#e0c389" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#e0c389" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                                <Tooltip 
                                  contentStyle={{ background: '#111214', border: '1px solid #2a2c30', borderRadius: '12px', fontSize: '0.85rem' }}
                                  itemStyle={{ color: '#e0c389' }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#e0c389" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="finance-distribution-section glass animate-fade-in" style={{ padding: '30px', height: '400px', minWidth: 0 }}>
                            <div className="section-header-saas" style={{ marginBottom: '20px' }}>
                              <h3>🥧 Service Distribution</h3>
                              <span className="live-tag">REVENUE SPLIT</span>
                            </div>
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                              <PieChart>
                                <Pie
                                  data={[
                                    { name: 'AI Chat', value: stats.chatRevenue || 1 },
                                    { name: 'AI Audit', value: stats.auditRevenue || 1 },
                                    { name: 'Commissions', value: stats.commissionRevenue || 1 },
                                    { name: 'Platform Fees', value: stats.platformFeeRevenue || 1 }
                                  ]}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={100}
                                  paddingAngle={5}
                                  dataKey="value"
                                >
                                  <Cell fill="#e0c389" />
                                  <Cell fill="#3b82f6" />
                                  <Cell fill="#10b981" />
                                  <Cell fill="#f59e0b" />
                                </Pie>
                                <Tooltip 
                                   contentStyle={{ background: '#111214', border: '1px solid #2a2c30', borderRadius: '12px' }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="pie-legend" style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '-20px' }}>
                               <div style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '8px', height: '8px', background: '#e0c389', borderRadius: '50%' }}></span> Chat</div>
                               <div style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%' }}></span> Audit</div>
                               <div style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></span> Comm</div>
                               <div style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '8px', height: '8px', background: '#f59e0b', borderRadius: '50%' }}></span> Fees</div>
                            </div>
                          </div>
                        </div>

                        {/* MIRRORED LEDGER FOR QUICK VISIBILITY */}
                        <div className="dashboard-ledger-preview glass animate-slide-up" style={{ marginTop: '32px' }}>
                          <div className="section-header-saas">
                            <h3>📒 Recent Platform Transactions</h3>
                            <div className="export-controls" style={{ display: 'flex', gap: '10px' }}>
                              <button className="btn-export" onClick={() => exportLedger('FULL_LEDGER', 
                                ['ID','Date','Description','Party','Amount','Status'], 
                                ledger.map(t => [t.transactionId, new Date(t.timestamp).toLocaleString(), t.description, t.userName || t.userId, t.amount, t.status])
                              )}>⬇ Download Full Ledger CSV</button>
                              <button className="btn-view-sm" onClick={() => setFinanceSubTab('audit')} style={{ fontSize: '0.7rem', padding: '4px 10px' }}>Full Audit Ledger →</button>
                            </div>
                          </div>
                          <div style={{ overflowX: 'auto' }}>
                            <table className="saas-finance-table" style={{ marginTop: '10px' }}>
                              <thead>
                                <tr>
                                  <th>Date</th>
                                  <th>Description</th>
                                  <th>Party</th>
                                  <th style={{ textAlign: 'right' }}>Amount</th>
                                  <th style={{ textAlign: 'center' }}>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ledger.slice(0, 10).map(txn => (
                                  <tr key={txn.id}>
                                    <td style={{ fontSize: '0.7rem', opacity: 0.7 }}>{new Date(txn.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                                    <td style={{ fontWeight: 600 }}>{txn.description}</td>
                                    <td style={{ fontSize: '0.75rem' }}>{txn.userName || txn.userId || 'System'}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 800 }} className={txn.amount < 0 ? 'text-danger' : 'text-success'}>
                                      ₹{Math.abs(txn.amount).toLocaleString()}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      <span className={`saas-pill ${txn.status === 'COMPLETED' || txn.status === 'SUCCESS' ? 'success' : txn.status === 'ESCROW' ? 'info' : 'warning'}`}>
                                        {txn.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                                {ledger.length === 0 && (
                                  <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>No recent transactions recorded.</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {financeSubTab === 'operations' && (
                      <div className="finance-operations-view animate-fade-in">
                        <div className="finance-hub-grid">
                          <div className={`hub-card-sm ${financeView === 'payout' ? 'active' : ''}`} onClick={() => setFinanceView('payout')}>
                            <div className="hub-icon">💰</div>
                            <div className="hub-info">
                               <h4>Expert Payouts</h4>
                               <span>₹{overallPayable.toLocaleString()} PENDING</span>
                            </div>
                          </div>
                          <div className={`hub-card-sm ${financeView === 'withdraw' ? 'active' : ''}`} onClick={() => setFinanceView('withdraw')}>
                            <div className="hub-icon">🏦</div>
                            <div className="hub-info">
                              <h4>Withdrawals</h4>
                              <span>Pending Requests</span>
                            </div>
                          </div>
                          <div className={`hub-card-sm ${financeView === 'wallets' ? 'active' : ''}`} onClick={() => setFinanceView('wallets')}>
                            <div className="hub-icon">💳</div>
                            <div className="hub-info">
                              <h4>Client Wallets</h4>
                              <span>{wallets.length} Active</span>
                            </div>
                          </div>
                        </div>

                        <div className="finance-detail-view animate-slide-up">
                          {financeView === 'payout' && (
                            <div className="payout-table-container glass">
                              <div className="section-header-saas">
                                <h3>💰 Expert Payout Queue</h3>
                                <div className="export-controls">
                                  <button className="btn-export csv" onClick={() => exportLedger('PAYOUTS', ['ID','Name','Payable'], experts.filter(e => e.isVerified).map(e => [e.id, e.name, wallets.find(w => w.id === e.id)?.earnedBalance || 0]))}>CSV</button>
                                  <button className="btn-export pdf" onClick={() => exportToPDF('PAYOUTS', ['ID','Name','Payable'], experts.filter(e => e.isVerified).map(e => [e.id, e.name, wallets.find(w => w.id === e.id)?.earnedBalance || 0]))}>PDF</button>
                                </div>
                              </div>
                              <table className="saas-finance-table">
                                <thead>
                                  <tr>
                                    <th>Expert</th>
                                    <th>Payable Balance</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {isTabLoading ? (
                                    Array(5).fill(0).map((_, i) => (
                                      <tr key={i}>
                                        <td><div className="skeleton-pulse" style={{height:'20px', width:'150px', borderRadius:'4px'}}></div></td>
                                        <td><div className="skeleton-pulse" style={{height:'20px', width:'80px', borderRadius:'4px'}}></div></td>
                                        <td><div className="skeleton-pulse" style={{height:'20px', width:'100px', borderRadius:'4px'}}></div></td>
                                        <td><div className="skeleton-pulse" style={{height:'32px', width:'100px', borderRadius:'8px'}}></div></td>
                                      </tr>
                                    ))
                                  ) : experts.filter(e => e.isVerified).map(exp => {
                                    const wallet = wallets.find(w => w.id === exp.id || w.user?.id === exp.id);
                                    const bal = wallet?.earnedBalance || 0;
                                    return (
                                      <tr key={exp.id}>
                                        <td className="expert-name-cell">{exp.name}</td>
                                        <td className="text-gold">₹{bal.toLocaleString()}</td>
                                        <td><span className={`saas-pill ${bal === 0 ? 'success' : 'warning'}`}>{bal === 0 ? 'SETTLED' : 'PENDING'}</span></td>
                                        <td>
                                          <div className="action-stack">
                                            {bal > 0 && <button className="btn-approve-sm" onClick={() => handleMarkPaid(exp.id, bal)}>Mark Paid</button>}
                                            <button className="btn-view-sm" onClick={() => handleSendInvoice(exp.id, bal)}>📄 Invoice</button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {financeView === 'withdraw' && (
                            <div className="payout-queue-container glass">
                              <div className="section-header-saas">
                                <h3>🏦 Withdrawal Requests</h3>
                              </div>
                              <table className="payout-table">
                                <thead>
                                  <tr>
                                    <th>ID</th>
                                    <th>Party</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ledger.filter(txn => txn.description?.includes("Withdrawal")).map(wd => (
                                    <tr key={wd.id}>
                                      <td className="text-muted">{wd.transactionId}</td>
                                      <td className="expert-name-cell">{wd.userName || wd.userId}</td>
                                      <td className="text-gold">₹{wd.amount}</td>
                                      <td><span className={`saas-pill ${wd.status === 'PAID' ? 'success' : 'warning'}`}>{wd.status}</span></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {financeView === 'wallets' && (
                            <div className="payout-queue-container glass">
                              <div className="section-header-saas">
                                <h3>💳 Client Wallet Balances</h3>
                              </div>
                              <table className="payout-table">
                                <thead>
                                  <tr>
                                    <th>Client</th>
                                    <th>Balance</th>
                                    <th>Activity</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {wallets.map(c => (
                                    <tr key={c.id}>
                                      <td className="expert-name-cell">{c.user?.name || c.user?.email || c.user?.id}</td>
                                      <td className="text-gold">₹{c.cashBalance || 0}</td>
                                      <td><span className="saas-pill warning">{ledger.filter(l => l.userId === c.user?.id).length} TXNs</span></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {financeSubTab === 'audit' && (
                      <div className="finance-audit-view animate-fade-in">
                        <div className="finance-hub-grid">
                          <div className={`hub-card-sm ${financeView === 'escrow' ? 'active' : ''}`} onClick={() => setFinanceView('escrow')}>
                            <div className="hub-icon">🔄</div>
                            <div className="hub-info">
                              <h4>Escrow Flow</h4>
                              <span>₹{escrowVault.toLocaleString()} Locked</span>
                            </div>
                          </div>
                          <div className={`hub-card-sm ${financeView === 'ledger' ? 'active' : ''}`} onClick={() => setFinanceView('ledger')}>
                            <div className="hub-icon">📒</div>
                            <div className="hub-info">
                              <h4>Full Ledger</h4>
                              <span>{ledger.length} TXNs</span>
                            </div>
                          </div>
                        </div>

                        <div className="finance-detail-view animate-slide-up">
                          {financeView === 'escrow' && (
                            <div className="escrow-ledger-container glass">
                              <div className="section-header-saas">
                                <h3>🏦 Institutional Escrow Ledger</h3>
                              </div>
                              <div className="transaction-timeline">
                                {ledger.filter(t => t.status === 'LOCKED' || t.status === 'ESCROW').map(tx => (
                                  <div key={tx.id} className="tx-step-item">
                                    <div className="tx-info-block">
                                      <h4>{tx.userName || tx.userId} ➔ Escrow</h4>
                                      <p>{tx.description}</p>
                                    </div>
                                    <div className="tx-amount-block">
                                      <span className="amount">₹{tx.amount}</span>
                                      <span className="status-label">LOCKED</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {financeView === 'ledger' && (
                            <div className="payout-queue-container glass">
                              <div className="section-header-saas">
                                <h3>📒 Full Platform Ledger</h3>
                                <div className="export-controls">
                                  <button className="btn-view-sm" onClick={() => fetchTabDetail('finance', pages.finance.current)} style={{marginRight:'8px'}}>🔄 Refresh</button>
                                  <button className="btn-export csv" onClick={() => exportLedger('LEDGER', ['ID','Date','Description','Party','Amount','Status'], ledger.map(t => [t.transactionId, new Date(t.timestamp).toLocaleString(), t.description, t.userName || t.userId, t.amount, t.status]))}>CSV</button>
                                  <button className="btn-export pdf" onClick={() => exportToPDF('LEDGER', ['ID','Date','Description','Party','Amount','Status'], ledger.map(t => [t.transactionId, new Date(t.timestamp).toLocaleString(), t.description, t.userName || t.userId, t.amount, t.status]))}>PDF</button>
                                </div>
                              </div>
                              <table className="payout-table">
                                <thead>
                                  <tr>
                                    <th>ID</th>
                                    <th>Date</th>
                                    <th>Description</th>
                                    <th>Party</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ledger.map(txn => (
                                    <tr key={txn.id}>
                                      <td className="text-muted">{txn.transactionId}</td>
                                      <td style={{fontSize:'0.8rem'}}>{new Date(txn.timestamp).toLocaleString()}</td>
                                      <td>{txn.description}</td>
                                      <td>{txn.userName || txn.userId}</td>
                                      <td className={txn.amount < 0 ? 'text-danger' : 'text-success'}>₹{txn.amount}</td>
                                      <td><span className={`saas-pill ${txn.status === 'COMPLETED' ? 'success' : 'warning'}`}>{txn.status}</span></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {financeSubTab === 'treasury' && (
                      <div className="finance-audit-view animate-fade-in">
                        <div className="payout-queue-container glass">
                          <div className="section-header-saas">
                            <h3>🪙 Institutional Treasury Ledger</h3>
                            <p style={{fontSize:'0.7rem', color:'rgba(255,255,255,0.4)', marginTop:'4px'}}>Comprehensive audit trail of all platform-retained earnings.</p>
                            <div className="export-controls" style={{marginTop:'10px'}}>
                              <button className="btn-view-sm" onClick={() => fetchTabDetail('treasury', pages.treasury.current)} style={{marginRight:'8px'}}>🔄 Refresh</button>
                              <button className="btn-export csv" onClick={() => exportLedger('TREASURY_LEDGER', ['ID','Date','Category','Party','Amount','Status'], treasuryLedger.map(t => [t.transactionId, new Date(t.timestamp).toLocaleString(), t.description, t.userName || t.userId, t.amount, t.status]))}>CSV</button>
                              <button className="btn-export pdf" onClick={() => exportToPDF('TREASURY_LEDGER', ['ID','Date','Category','Party','Amount','Status'], treasuryLedger.map(t => [t.transactionId, new Date(t.timestamp).toLocaleString(), t.description, t.userName || t.userId, t.amount, t.status]))}>PDF</button>
                            </div>
                          </div>
                          <table className="payout-table">
                            <thead>
                              <tr>
                                <th>ID</th>
                                <th>Date</th>
                                <th>Revenue Category</th>
                                <th>Source Party</th>
                                <th>Net Earning</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {isTabLoading ? (
                                Array(10).fill(0).map((_, i) => (
                                  <tr key={i}>
                                    <td><div className="skeleton-pulse" style={{height:'20px', width:'60px', borderRadius:'4px'}}></div></td>
                                    <td><div className="skeleton-pulse" style={{height:'20px', width:'120px', borderRadius:'4px'}}></div></td>
                                    <td><div className="skeleton-pulse" style={{height:'20px', width:'180px', borderRadius:'4px'}}></div></td>
                                    <td><div className="skeleton-pulse" style={{height:'20px', width:'100px', borderRadius:'4px'}}></div></td>
                                    <td><div className="skeleton-pulse" style={{height:'20px', width:'80px', borderRadius:'4px'}}></div></td>
                                    <td><div className="skeleton-pulse" style={{height:'20px', width:'60px', borderRadius:'4px'}}></div></td>
                                  </tr>
                                ))
                              ) : treasuryLedger.map(txn => (
                                <tr key={txn.id}>
                                  <td className="text-muted" style={{fontSize:'0.75rem'}}>{txn.transactionId}</td>
                                  <td style={{fontSize:'0.75rem'}}>{new Date(txn.timestamp).toLocaleString()}</td>
                                  <td style={{fontWeight:600, color:'var(--elite-gold)'}}>{txn.description}</td>
                                  <td style={{fontSize:'0.8rem'}}>{txn.userName || txn.userId}</td>
                                  <td className="text-success" style={{fontWeight:800}}>₹{txn.amount.toLocaleString()}</td>
                                  <td><span className="saas-pill success">{txn.status}</span></td>
                                </tr>
                              ))}
                              {treasuryLedger.length === 0 && (
                                <tr>
                                  <td colSpan="6" style={{textAlign:'center', padding:'60px', opacity:0.5}}>No treasury earnings recorded in this period.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                          <PaginationControls tab="treasury" />
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
              </div>
          )}

          {activeTab === 'content' && (
            <div className="admin-list-container animate-fade-in">
              <div className="list-header">
                <div>
                  <h3>🛡️ Content Moderation</h3>
                  <p className="header-remark" style={{marginTop:'4px'}}>Navigate to the live pages to review and moderate content directly.</p>
                </div>
              </div>
              <div className="mod-launch-grid">
                <div className="mod-launch-card glass">
                  <div className="mod-launch-icon">📚</div>
                  <div className="mod-launch-body">
                    <h4>Resource Library</h4>
                    <p>Manage the institutional knowledge base. All legal guides and documents are listed here.</p>
                    <div className="mod-launch-stats">
                      <span className="saas-pill info">{stats.totalResources} Total Resources</span>
                    </div>
                  </div>
                  <button className="btn-approve-sm" onClick={() => navigate('/library')}>
                    Open Resource Page →
                  </button>
                </div>

                <div className="mod-launch-card glass">
                  <div className="mod-launch-icon">💬</div>
                  <div className="mod-launch-body">
                    <h4>Community Discussions</h4>
                    <p>Moderate community threads and official discussions directly on the forum.</p>
                    <div className="mod-launch-stats">
                      <span className="saas-pill info">{stats.totalPosts} Active Threads</span>
                    </div>
                  </div>
                  <button className="btn-approve-sm" onClick={() => navigate('/community')}>
                    Open Discussions →
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'master' && isMaster && (
            <div className="admin-list-container animate-fade-in">
              <div className="list-header" style={{ marginBottom: '30px' }}>
                <h3>🛡️ Institutional Admin Management</h3>
                <p style={{color:'rgba(255,255,255,0.4)', fontSize:'0.85rem'}}>Privileged terminal for high-level account management and security delegation.</p>
              </div>

              <div className="master-layout-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '30px' }}>
                
                {/* ADMIN LIST SECTION */}
                <div className="admin-list-section glass" style={{ padding: '25px', borderRadius: '12px' }}>
                  <h4 style={{ color: 'var(--elite-gold)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    👥 Active Administrators <span style={{ fontSize: '0.7rem', background: 'rgba(212,175,55,0.1)', padding: '2px 8px', borderRadius: '10px' }}>{admins.length}</span>
                  </h4>
                  <div className="admin-table-wrapper" style={{ overflowX: 'auto' }}>
                    <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                          <th style={{ padding: '12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>ADMIN</th>
                          <th style={{ padding: '12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>PERMISSIONS</th>
                          <th style={{ padding: '12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>STATUS</th>
                          <th style={{ padding: '12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admins.map(adm => (
                          <tr key={adm.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '15px 12px' }}>
                              <div style={{ fontWeight: 'bold' }}>{adm.firstName} {adm.lastName}</div>
                              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{adm.email}</div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--elite-gold)' }}>ID: {adm.id}</div>
                            </td>
                            <td style={{ padding: '15px 12px' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                {(adm.permissions || 'VIEW_ONLY').split(',').map(p => (
                                  <span key={p} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                    {p}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td style={{ padding: '15px 12px' }}>
                              <span style={{ color: adm.enabled ? '#10b981' : '#ef4444', fontSize: '0.75rem' }}>
                                ● {adm.enabled ? 'ACTIVE' : 'BLOCKED'}
                              </span>
                            </td>
                            <td style={{ padding: '15px 12px' }}>
                              {adm.id !== 'lawezy76' && (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <select 
                                    value={adm.permissions || 'READ-ONLY'}
                                    onChange={(e) => handleUpdateAdminPermissions(adm.id, e.target.value)}
                                    className="saas-select-inline"
                                    style={{ 
                                      background: 'rgba(255,255,255,0.05)', 
                                      color: 'white', 
                                      border: '1px solid rgba(255,255,255,0.1)', 
                                      borderRadius: '4px', 
                                      padding: '4px 8px', 
                                      fontSize: '0.7rem',
                                      outline: 'none',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <option value="READ-ONLY" style={{ background: '#1a1a1a', color: 'white' }}>Read-only</option>
                                    <option value="MODERATOR CONTENT" style={{ background: '#1a1a1a', color: 'white' }}>Moderator Content</option>
                                    <option value="PROFILE AUDIT" style={{ background: '#1a1a1a', color: 'white' }}>Profile Audit</option>
                                    <option value="SYSTEM LOGS" style={{ background: '#1a1a1a', color: 'white' }}>System Logs</option>
                                    <option value="FINANCIAL LEDGER" style={{ background: '#1a1a1a', color: 'white' }}>Financial Ledger</option>
                                    <option value="COMPLAINTS" style={{ background: '#1a1a1a', color: 'white' }}>Complaints</option>
                                    <option value="FULL ACCESS" style={{ background: '#1a1a1a', color: 'white' }}>Full Access</option>
                                  </select>
                                  <button 
                                    onClick={() => handleDeleteAdmin(adm.id)}
                                    className="saas-button danger" 
                                    style={{ fontSize: '0.7rem', padding: '5px 10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                  >
                                    Revoke Access
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* CREATE ADMIN SECTION */}
                <div className="create-admin-section">
                  <div className="master-card glass" style={{ padding: '30px', marginBottom: '30px' }}>
                    <h4 style={{ color: 'var(--elite-gold)', marginBottom: '20px' }}>Provision New Administrative Identity</h4>
                    <div className="master-form" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <input 
                          type="text" 
                          placeholder="First Name" 
                          value={newAdminData.firstName}
                          onChange={(e) => setNewAdminData({...newAdminData, firstName: e.target.value})}
                          style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white' }}
                        />
                        <input 
                          type="text" 
                          placeholder="Last Name" 
                          value={newAdminData.lastName}
                          onChange={(e) => setNewAdminData({...newAdminData, lastName: e.target.value})}
                          style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white' }}
                        />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Login ID (Optional - Custom ID)" 
                        value={newAdminData.loginId}
                        onChange={(e) => setNewAdminData({...newAdminData, loginId: e.target.value})}
                        style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white' }}
                      />
                      <input 
                        type="email" 
                        placeholder="Admin Email" 
                        value={newAdminData.email}
                        onChange={(e) => setNewAdminData({...newAdminData, email: e.target.value})}
                        style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white' }}
                      />
                      <input 
                        type="password" 
                        placeholder="Access Password" 
                        value={newAdminData.password}
                        onChange={(e) => setNewAdminData({...newAdminData, password: e.target.value})}
                        style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white' }}
                      />
                      <div className="permission-presets">
                        <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '8px' }}>INITIAL PERMISSIONS</label>
                        <select 
                          value={newAdminData.permissions}
                          onChange={(e) => setNewAdminData({...newAdminData, permissions: e.target.value})}
                          style={{ 
                            width: '100%', 
                            padding: '12px', 
                            background: 'rgba(255,255,255,0.03)', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: '6px', 
                            color: 'white',
                            outline: 'none'
                          }}
                        >
                          <option value="READ-ONLY" style={{ background: '#1a1a1a', color: 'white' }}>Read-only</option>
                          <option value="MODERATOR CONTENT" style={{ background: '#1a1a1a', color: 'white' }}>Moderator Content</option>
                          <option value="PROFILE AUDIT" style={{ background: '#1a1a1a', color: 'white' }}>Profile Audit</option>
                          <option value="SYSTEM LOGS" style={{ background: '#1a1a1a', color: 'white' }}>System Logs</option>
                          <option value="FINANCIAL LEDGER" style={{ background: '#1a1a1a', color: 'white' }}>Financial Ledger</option>
                          <option value="COMPLAINTS" style={{ background: '#1a1a1a', color: 'white' }}>Complaints</option>
                          <option value="FULL ACCESS" style={{ background: '#1a1a1a', color: 'white' }}>Full Access</option>
                        </select>
                      </div>

                      {!otpSent ? (
                        <button 
                          className="btn-master-action" 
                          onClick={handleRequestMasterOtp}
                          style={{ marginTop: '10px', padding: '14px', background: 'var(--elite-gold)', color: '#1a1a1a', fontWeight: '800', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          Request Institutional Security Code
                        </button>
                      ) : (
                        <div className="otp-verification-zone" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                          <p style={{ fontSize: '0.75rem', color: '#10b981' }}>Verification code dispatched to lawezy2025@gmail.com</p>
                          <input 
                            type="text" 
                            placeholder="Enter 6-Digit Code" 
                            value={masterOtp}
                            onChange={(e) => setMasterOtp(e.target.value)}
                            style={{ padding: '12px', textAlign: 'center', fontSize: '1.2rem', letterSpacing: '4px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid #10b981', borderRadius: '6px', color: 'white' }}
                          />
                          <button 
                            className="btn-master-confirm" 
                            onClick={handleCreateAdmin}
                            style={{ padding: '14px', background: '#10b981', color: 'white', fontWeight: '800', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            Confirm & Provision Account
                          </button>
                          <button 
                            onClick={() => setOtpSent(false)}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            Cancel / Resend
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="master-card glass" style={{ padding: '30px' }}>
                    <h4 style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '20px' }}>Institutional Terminal Status</h4>
                    <div className="master-stats" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div className="m-stat">
                        <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '5px' }}>Master Identity</label>
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{currentUser?.username || 'lawezy76'}</span>
                      </div>
                      <div className="m-stat">
                        <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '5px' }}>Secure Notification Relay</label>
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--elite-gold)' }}>lawezy2025@gmail.com</span>
                      </div>
                      <div className="m-stat">
                        <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '5px' }}>Administrative Hierarchy</label>
                        <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>Master Admin {'>'} Platform Admin {'>'} Audit Agent</span>
                      </div>
                    </div>
                  </div>

                  <div className="master-card glass highlight-danger" style={{ padding: '30px', border: '1px solid rgba(255, 77, 77, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ color: '#ff4d4d', marginBottom: '8px' }}>☢️ Institutional Treasury Liquidation</h4>
                        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', maxWidth: '400px' }}>
                          Surgical financial reset. Choose a scope to purge historical data and recalculate treasury.
                        </p>
                        <div className="purge-scope-selector" style={{marginTop:'15px', display:'flex', gap:'10px', alignItems:'center'}}>
                           <label style={{fontSize:'0.7rem', color:'rgba(255,255,255,0.3)'}}>PURGE SCOPE:</label>
                           <select 
                             value={purgeScope} 
                             onChange={(e) => setPurgeScope(e.target.value)}
                             style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem' }}
                           >
                             <option value="ALL">Full Platform Wipe (Everything)</option>
                             <option value="BEFORE_TODAY">Clear Previous (Keep Today)</option>
                             <option value="TODAY">Clear Today's Records Only</option>
                             <option value="SIX_MONTHS">Clear Older than 6 Months</option>
                             <option value="ONE_YEAR">Clear Older than 1 Year</option>
                           </select>
                        </div>
                      </div>
                      <div className="liquidation-actions" style={{ textAlign: 'right' }}>
                        {!otpSent ? (
                          <button 
                            className="btn-suspend-sm" 
                            style={{ padding: '12px 20px', fontSize: '0.85rem' }}
                            onClick={handleRequestMasterOtp}
                          >
                            Generate Security Code
                          </button>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
                             <input 
                                type="text"
                                placeholder="ENTER OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #ff4d4d', color: '#ff4d4d', padding: '8px', borderRadius: '4px', width: '120px', textAlign: 'center', fontWeight: 'bold' }}
                             />
                             <button 
                               className="btn-suspend-sm" 
                               style={{ background: '#ff4d4d', color: '#fff', border: 'none', padding: '10px 20px' }}
                               onClick={handleResetTreasury}
                             >
                               Confirm Liquidation
                             </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="master-audit-trail glass" style={{ marginTop: '40px', padding: '25px', borderRadius: '12px' }}>
                <h4 style={{ color: 'var(--elite-gold)', marginBottom: '20px' }}>🏛️ Institutional Audit Trail (Admin Actions)</h4>
                <div className="audit-timeline-saas" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {adminActions.length === 0 ? (
                    <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '20px' }}>No administrative events recorded in this session.</p>
                  ) : (
                    adminActions.slice(0, 10).map((action, idx) => (
                      <div key={idx} className="audit-log-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: '3px solid var(--elite-gold)' }}>
                        <div className="log-left">
                          <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{action.eventType}</div>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{action.summary}</div>
                        </div>
                        <div className="log-right" style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--elite-gold)' }}>{action.userId || 'SYSTEM'}</div>
                          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>{new Date(action.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* 👤 CLIENT AUDIT MODAL */}
      {showClientModal && selectedClient && (
        <div className="admin-modal-overlay animate-fade-in" onClick={() => setShowClientModal(false)}>
          <div className="admin-modal-content glass animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👤 Client Review: {selectedClient.name || selectedClient.firstName}</h3>
              <button className="btn-close-modal" onClick={() => setShowClientModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="audit-detail-grid">
                <div className="audit-item">
                  <label>Full Name</label>
                  <p>{selectedClient.name || selectedClient.firstName || 'N/A'}</p>
                </div>
                <div className="audit-item">
                  <label>Contact Email</label>
                  <p>{selectedClient.email || 'N/A'}</p>
                </div>
                <div className="audit-item">
                  <label>Wallet Balance</label>
                  <p style={{ color: 'var(--elite-gold)' }}>₹{wallets.find(w => w.user?.id === selectedClient.id)?.cashBalance || 0}</p>
                </div>
                <div className="audit-item">
                  <label>Account Status</label>
                  <p className={`status-badge ${(selectedClient.status || 'ACTIVE').toLowerCase()}`}>{selectedClient.status || 'ACTIVE'}</p>
                </div>
              </div>

              <div className="audit-section-block">
                <h4>📊 Engagement Overview</h4>
                <div className="audit-detail-grid">
                  <div className="audit-item">
                    <label>Total Appointments</label>
                    <p>{appointments.filter(a => a.clientId === selectedClient.id).length}</p>
                  </div>
                  <div className="audit-item">
                    <label>Active Complaints</label>
                    <p>{complaints.filter(c => c.clientId === selectedClient.id && c.status !== 'RESOLVED').length}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-modal-approve" onClick={() => { handleApproveExpert(selectedClient.id); setShowClientModal(false); }}>
                ✅ Verify Identity
              </button>
              <button className="btn-modal-block" onClick={() => { handleBlockUser(selectedClient.id); setShowClientModal(false); }}>
                {selectedClient.status === 'BLOCKED' ? '✅ Reactivate Account' : '⚠️ Suspend Account'}
              </button>
              <button className="btn-modal-cancel" onClick={() => setShowClientModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;
