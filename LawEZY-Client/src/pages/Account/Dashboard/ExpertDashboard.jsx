import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../../../store/useAuthStore';
import useMetadata from '../../../services/useMetadata';
import apiClient from '../../../services/apiClient';
import { getSocket } from '../../../services/socket';
import ExpertAppointments from './components/ExpertAppointments';
import Wallet from '../../Wallet/Wallet';
import './ExpertDashboard.css';

const ExpertDashboard = () => {
    const { user, toggleViewMode, impersonatedUser, stopImpersonating } = useAuthStore();
    const { profile, wallet, refreshMetadata } = useMetadata();
    const navigate = useNavigate();
    
    const [activeTab, setActiveTab] = useState('appointments');
    const [transactions, setTransactions] = useState([]);
    const [chatSessions, setChatSessions] = useState([]);
    const [pendingAppointments, setPendingAppointments] = useState(0);
    const [pendingClientAppointments, setPendingClientAppointments] = useState(0);
    const [isOnline, setIsOnline] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const tab = searchParams.get('tab');
        if (tab && ['appointments', 'wallet'].includes(tab)) {
            setActiveTab(tab);
        }
    }, [window.location.search]);

    // Synchronize isOnline with profile status once metadata is resolved
    useEffect(() => {
        if (profile) {
            setIsOnline(!!profile.online);
        }
    }, [profile]);

    const fetchDashboardData = React.useCallback(async () => {
        try {
            setLoading(true);

            const [transRes, chatRes, apptRes, clientApptRes] = await Promise.all([
                apiClient.get('/api/account/transactions').catch(() => ({ data: [] })),
                apiClient.get('/api/chat/sessions/pro/expert').catch(() => ({ data: [] })),
                apiClient.get('/api/appointments/expert').catch(() => ({ data: [] })),
                apiClient.get('/api/appointments/client').catch(() => ({ data: [] }))
            ]);
            
            setTransactions(transRes.data.data || transRes.data || []);
            setChatSessions(chatRes.data.data || chatRes.data || []);
            
            await refreshMetadata();

            const clientAppts = clientApptRes.data.data || clientApptRes.data || [];
            const pendingClientCount = clientAppts.filter(a => {
                const s = a.status || a.appointmentStatus || 'PROPOSED';
                return ['PROPOSED', 'COUNTERED'].includes(s);
            }).length;
            setPendingClientAppointments(pendingClientCount);

            const appts = apptRes.data.data || apptRes.data || [];
            const pendingCount = appts.filter(a => {
                const s = a.status || a.appointmentStatus || 'PROPOSED';
                return ['PROPOSED', 'COUNTERED'].includes(s);
            }).length;
            setPendingAppointments(pendingCount);
            
        } catch (err) {
            console.error("Dashboard Synchronization Failure:", err);
        } finally {
            setLoading(false);
        }
    }, [refreshMetadata]);

    useEffect(() => {
        if (user) {
            fetchDashboardData();
            
            // Real-time synchronization
            const token = localStorage.getItem('lawezy_token');
            if (token) {
                const socket = getSocket(token);
                socket.on('notification_received', fetchDashboardData);
                socket.on('discovery_sync', fetchDashboardData);
                socket.on('new_notification', fetchDashboardData);
                socket.on('appointment_update', fetchDashboardData);
                socket.on('transaction_update', fetchDashboardData);
                
                return () => {
                    socket.off('notification_received', fetchDashboardData);
                    socket.off('discovery_sync', fetchDashboardData);
                    socket.off('new_notification', fetchDashboardData);
                    socket.off('appointment_update', fetchDashboardData);
                    socket.off('transaction_update', fetchDashboardData);
                };
            }
        }
    }, [user?.id, fetchDashboardData]);

    // Financial calculations
    const calculateEarnings = () => {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        // Calculate start of current week (assuming Monday start)
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); 
        const startOfWeek = new Date(today.setDate(diff));
        startOfWeek.setHours(0, 0, 0, 0);
        
        // Reset today for reuse
        const now = new Date();

        let daily = 0, weekly = 0, monthly = 0;
        transactions.forEach(tx => {
            if (!tx || !tx.timestamp) return;
            const txDate = new Date(tx.timestamp);
            const amount = Number(tx.amount) || 0;
            const status = tx.status?.toUpperCase() || '';
            
            // Only count completed revenue
            if (amount > 0 && (status === 'SUCCESS' || status === 'COMPLETED' || status === 'PAID' || status === 'SETTLED')) {
                if (txDate.toDateString() === now.toDateString()) daily += amount;
                if (txDate >= startOfWeek) weekly += amount;
                if (txDate >= startOfMonth) monthly += amount;
            }
        });

        return { daily, weekly, monthly };
    };

    const earnings = calculateEarnings();
    const unreadMessages = chatSessions.reduce((acc, s) => acc + (s.unreadCount || 0), 0);

    const toggleAvailability = async () => {
        try {
            const newStatus = !isOnline;
            setIsOnline(newStatus);
            await apiClient.patch(`/api/professionals/${user.id}/status`, { online: newStatus });
            // Institutional Refresh: Ensure local cache and metadata parity
            await refreshMetadata();
        } catch (err) {
            console.error("Status synchronization failed.");
            setIsOnline(!newStatus); // Rollback on failure
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'appointments':
                return <ExpertAppointments walletBalance={wallet?.earnedBalance || 0} pendingCount={pendingAppointments} onRefresh={fetchDashboardData} />;
            case 'wallet':
                return (
                    <div className="wallet-tab-view animate-slide-up">
                        <Wallet transactions={transactions} onRefresh={fetchDashboardData} isExpertView={true} />
                        
                        {/* 🔒 ESCROW VAULT BREAKDOWN */}
                        <div className="escrow-vault-section glass" style={{ marginTop: '40px', padding: '30px', borderRadius: '24px', background: 'rgba(59, 130, 246, 0.02)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                            <div className="section-header-pro" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ color: '#1e40af', fontWeight: 900, margin: 0 }}>🛡️ Escrow Vault Ledger</h3>
                                <span className="vault-status-pill" style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800 }}>SECURED BY LAW-EZY</span>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '25px' }}>These funds are held in escrow for active appointments and will be released to your main balance upon session completion and client review.</p>
                            
                            <div className="escrow-list">
                                {transactions.filter(t => t.status === 'ESCROW').length > 0 ? (
                                    transactions.filter(t => t.status === 'ESCROW').map(tx => (
                                        <div key={tx.id} className="escrow-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: 'white', borderRadius: '16px', marginBottom: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                                            <div className="e-info">
                                                <div className="e-desc" style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{tx.description}</div>
                                                <div className="e-meta" style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>{new Date(tx.timestamp).toLocaleString()} • Ref: {tx.transactionRefId?.substring(0, 8)}</div>
                                            </div>
                                            <div className="e-amount" style={{ fontWeight: 900, color: '#3b82f6', fontSize: '1rem' }}>₹{tx.amount.toLocaleString()}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5, fontStyle: 'italic', fontSize: '0.85rem' }}>
                                        No active funds currently held in escrow.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            default:
                return <ExpertAppointments walletBalance={wallet?.earnedBalance || 0} pendingCount={pendingAppointments} onRefresh={fetchDashboardData} />;
        }
    };

    return (
        <div className="expert-dashboard-wrapper">
            {impersonatedUser && (
                <div className="admin-oversight-banner">
                    <span>ADMINISTRATIVE OVERSIGHT MODE: Viewing as <strong>{impersonatedUser.name}</strong></span>
                    <button onClick={() => { stopImpersonating(); navigate('/admin'); }}>Return to Command Center</button>
                </div>
            )}
            <aside className={`dashboard-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-brand">
                    <div className="brand-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="brand-text">DASHBOARD</span>
                        <button className="collapse-toggle-btn" onClick={() => setIsCollapsed(!isCollapsed)} title="Toggle Sidebar">
                            {isCollapsed ? '❯' : '❮'}
                        </button>
                    </div>
                    <div className="expert-identity-card">
                        <div className="avatar-wrapper-elite">
                            <div className="letter-avatar" style={{ background: 'var(--midnight-primary)', color: 'var(--elite-gold)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.5rem', border: '3px solid var(--elite-gold)' }}>
                                {(profile?.name || user?.firstName || 'E')[0].toUpperCase()}
                            </div>
                            {!isCollapsed && <div className={`status-node ${isOnline ? 'online' : 'offline'}`}></div>}
                        </div>
                        {!isCollapsed && (
                            <div className="id-text">
                                <div className="name-bold" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {profile?.name || user?.firstName || 'Professional Lawyer'}
                                    {profile?.isVerified && <span title="Verified Professional" style={{ color: '#4ade80', fontSize: '0.9rem' }}>✅</span>}
                                </div>
                                <div className="role-tag">{user?.role || 'LAWYER'}</div>
                            </div>
                        )}
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <button className="nav-link-item" onClick={() => navigate('/profile')}>
                        <div className="nav-label-group">
                            <span className="nav-text">👤 MY PROFILE</span>
                            <span className="nav-sub">Credentials & public visibility</span>
                        </div>
                    </button>

                    <button 
                        className={`nav-link-item ${activeTab === 'appointments' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('appointments')}
                    >
                        <div className="nav-label-group">
                            <span className="nav-text">📅 MY CONSULTATIONS</span>
                            <span className="nav-sub">Manage active client bookings</span>
                        </div>
                        {pendingAppointments > 0 && <span className="unread-badge sidebar-alert" style={{ 
                            animation: 'pulse-red 2s infinite',
                            background: '#ef4444',
                            boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)'
                        }}>{pendingAppointments}</span>}
                    </button>

                    <button 
                        className={`nav-link-item ${activeTab === 'wallet' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('wallet')}
                    >
                        <div className="nav-label-group">
                            <span className="nav-text">💰 EARNINGS & WALLET</span>
                            <span className="nav-sub">Revenue & payout tracking</span>
                        </div>
                    </button>

                    <button className="nav-link-item" onClick={() => navigate('/messages')}>
                        <div className="nav-label-group">
                            <span className="nav-text">💬 CLIENT CHATS</span>
                            <span className="nav-sub">Secure communications</span>
                            {unreadMessages > 0 && <span className="unread-badge">{unreadMessages}</span>}
                        </div>
                    </button>

                    <div style={{ margin: '20px 0', borderTop: '1px solid rgba(212, 175, 55, 0.1)' }}></div>

                    {!isCollapsed && (
                        <div className="promo-actions-row" style={{ gap: '6px', padding: '0 12px', margin: '8px 0' }}>
                            <button className="btn-promo-share" onClick={() => {
                                const url = profile?.slug 
                                    ? `${window.location.origin}/p/${profile.slug}` 
                                    : `${window.location.origin}/expert/${user.id}`;
                                navigator.clipboard.writeText(url);
                                alert("Profile Link Copied!");
                            }}>
                                🔗 Share
                            </button>
                            <button className="btn-promo-preview" onClick={() => {
                                if (profile?.slug) navigate(`/p/${profile.slug}`);
                                else navigate(`/expert/${user.id}`);
                            }}>
                                👁️ Preview
                            </button>
                        </div>
                    )}

                    <button className="nav-link-item seeker-bridge-btn" onClick={() => { setActiveTab('appointments'); toggleViewMode(); }} style={{ background: 'rgba(212, 175, 55, 0.05)', marginTop: '10px' }}>
                        <div className="nav-label-group">
                            <span className="nav-text" style={{ color: 'var(--elite-gold)', fontWeight: 800 }}>🏠 SEEKER CENTER</span>
                            <span className="nav-sub">Switch to client view</span>
                        </div>
                        {pendingClientAppointments > 0 && (
                            <span className="unread-badge sidebar-alert" style={{ 
                                animation: 'pulse-red 2s infinite',
                                background: '#ef4444',
                                boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)'
                            }}>
                                {pendingClientAppointments}
                            </span>
                        )}
                    </button>
                </nav>

                <div className="sidebar-footer-stat">
                    <div className="stat-label">AVAILABILITY STATUS</div>
                    <div className="status-toggle-control" onClick={toggleAvailability}>
                         <div className={`toggle-track ${isOnline ? 'active' : ''}`}>
                             <div className="toggle-thumb"></div>
                         </div>
                         <span className="status-label">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                    </div>

                    <div className="pro-footer">
                        <div className="footer-actions-dual">
                            <button className="btn-exit-dash" onClick={() => navigate('/')} title="EXIT DASHBOARD">
                                <span className="nav-icon">🚪</span>
                                <span className="btn-text">EXIT CENTER</span>
                            </button>
                            <button className="btn-logout-minimal" onClick={() => { useAuthStore.getState().logout(); navigate('/login'); }} title="LOG OUT">
                                <span className="nav-icon">🔐</span>
                                <span className="btn-text">LOG OUT</span>
                            </button>
                        </div>

                    </div>
                </div>
            </aside>

            <main className="dashboard-main">
                <header className="dashboard-header-elite">
                    <div className="header-text">
                        <h1>Dashboard</h1>
                        <p>{loading ? 'Loading Dashboard...' : `Synchronized at ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}</p>
                    </div>
                    
                    <div className="metrics-grid-header-pro">
                        {loading ? (
                            <>
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="metric-card-pro skeleton-pulse" style={{ height: '110px' }}></div>
                                ))}
                            </>
                        ) : (
                            <>
                                <div className="metric-card-pro">
                                    <div className="m-icon">📅</div>
                                    <div className="m-content">
                                        <span className="m-label">TODAY</span>
                                        <span className="m-value">₹{earnings.daily.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="metric-card-pro">
                                    <div className="m-icon">📈</div>
                                    <div className="m-content">
                                        <span className="m-label">WEEKLY</span>
                                        <span className="m-value">₹{earnings.weekly.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="metric-card-pro mini-gold" onClick={() => setActiveTab('wallet')} style={{ cursor: 'pointer' }}>
                                    <div className="m-content">
                                        <span className="m-label">TOTAL PAYABLE</span>
                                        <span className="m-value" style={{ fontSize: '0.9rem' }}>₹{wallet?.earnedBalance?.toLocaleString() || '0'}</span>
                                    </div>
                                    <div className="m-icon" style={{ width: '30px', height: '30px', fontSize: '0.9rem' }}>🏛️</div>
                                </div>
                                <div className="metric-card-pro mini-gold" onClick={() => setActiveTab('wallet')} style={{ cursor: 'pointer', background: '#dbeafe', borderColor: '#3b82f6' }}>
                                    <div className="m-content">
                                        <span className="m-label" style={{ color: '#1e40af', fontWeight: 800 }}>ESCROW LOCKED</span>
                                        <span className="m-value" style={{ fontSize: '1rem', color: '#1e40af' }}>₹{wallet?.escrowBalance?.toLocaleString() || '0'}</span>
                                    </div>
                                    <div className="m-icon" style={{ width: '30px', height: '30px', fontSize: '0.9rem', background: '#3b82f6', color: 'white' }}>🔒</div>
                                </div>
                            </>
                        )}
                    </div>
                </header>

                <div className="dashboard-content-grid">
                    <section className="main-viewport">
                        {loading && activeTab === 'appointments' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {[1, 2].map(i => (
                                    <div key={i} className="skeleton-card skeleton-pulse" style={{ height: '200px' }}></div>
                                ))}
                            </div>
                        ) : renderContent()}
                    </section>
                    
                    <aside className="communications-feed" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 15px 50px rgba(0,0,0,0.06)' }}>
                        <div className="feed-header">
                            <h3 style={{ color: 'var(--midnight-primary)', fontWeight: 900 }}>Live Conversations</h3>
                            <button className="btn-text-only" onClick={() => navigate('/messages')} style={{ color: 'var(--elite-gold)', fontWeight: 800 }}>VIEW HUB →</button>
                        </div>
                        <div className="chat-mini-list">
                            {loading ? (
                                <>
                                    {[1, 2, 3].map(i => (
                                        <div key={i} style={{ display: 'flex', gap: '12px', padding: '12px' }}>
                                            <div className="skeleton-circle skeleton-pulse"></div>
                                            <div style={{ flex: 1 }}>
                                                <div className="skeleton-text skeleton-pulse"></div>
                                                <div className="skeleton-text short skeleton-pulse"></div>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            ) : chatSessions.length > 0 ? (
                                chatSessions.slice(0, 4).map(session => (
                                    <div key={session.id} className="chat-item-dash" onClick={() => navigate(`/messages?sessionId=${session.id}`)} style={{ borderBottom: '1px solid #f8fafc' }}>
                                        <div className="c-avatar" style={{ background: 'var(--midnight-primary)', color: 'var(--elite-gold)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{(session.clientName || 'C').charAt(0).toUpperCase()}</div>
                                        <div className="c-info">
                                            <strong style={{ color: 'var(--midnight-primary)', fontSize: '0.9rem' }}>{session.clientName || 'Client'}</strong>
                                            <p className="last-msg" style={{ color: '#64748b' }}>{session.lastMessage || 'Awaiting synchronization...'}</p>
                                        </div>
                                        {session.unreadCount > 0 && <div className="c-badge" style={{ background: 'var(--accent-red)' }}>{session.unreadCount}</div>}
                                    </div>
                                ))
                            ) : (
                                <div className="empty-feed" style={{ background: 'rgba(0,0,0,0.01)', borderRadius: '16px', padding: '30px' }}>
                                    <span className="icon" style={{ opacity: 1 }}>📬</span>
                                    <p style={{ fontWeight: 700, color: '#94a3b8' }}>No active conversations.</p>
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
};

export default ExpertDashboard;

