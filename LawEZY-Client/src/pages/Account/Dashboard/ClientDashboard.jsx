import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../../store/useAuthStore';
import useMetadata from '../../../services/useMetadata';
import apiClient from '../../../services/apiClient';
import { getSocket } from '../../../services/socket';
import ClientOverview from './components/ClientOverview';
import ClientAppointments from './components/ClientAppointments';
import Profile from '../Profile/Profile';
import Wallet from '../../Wallet/Wallet';
import './ExpertDashboard.css'; // Reusing established premium styles

const ClientDashboard = () => {
    const { user, toggleViewMode, impersonatedUser, stopImpersonating } = useAuthStore();
    const { profile, wallet, refreshMetadata } = useMetadata();
    const navigate = useNavigate();
    
    const [activeTab, setActiveTab] = useState('appointments');
    const [transactions, setTransactions] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [pendingAppointments, setPendingAppointments] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const tab = queryParams.get('tab');
        if (tab && ['appointments', 'profile', 'wallet'].includes(tab)) {
            setActiveTab(tab);
        }
    }, [window.location.search]);

    const fetchDashboardData = React.useCallback(async () => {
        try {
            setLoading(true);
            const [transRes, sessionRes, apptRes] = await Promise.all([
                apiClient.get('/api/account/transactions'),
                apiClient.get(`/api/chat/sessions/user/${user.id}`),
                apiClient.get('/api/appointments/client')
            ]);
            setTransactions(transRes.data.data || transRes.data || []);
            setSessions(sessionRes.data.data || sessionRes.data || []);
            
            const appts = apptRes.data.data || apptRes.data || [];
            const pendingCount = appts.filter(a => {
                const s = a.status || a.appointmentStatus || 'PROPOSED';
                return ['PROPOSED', 'COUNTERED'].includes(s);
            }).length;
            setPendingAppointments(pendingCount);
            
            await refreshMetadata();
        } catch (err) {
            console.error("Client Dashboard Recall Failure:", err);
        } finally {
            setLoading(false);
        }
    }, [user?.id, refreshMetadata]);

    useEffect(() => {
        if (user) {
            fetchDashboardData();
            
            // Real-time synchronization
            const token = localStorage.getItem('lawezy_token');
            if (token) {
                const socket = getSocket(token);
                socket.on('notification_received', fetchDashboardData);
                socket.on('discovery_sync', fetchDashboardData);
                
                return () => {
                    socket.off('notification_received', fetchDashboardData);
                    socket.off('discovery_sync', fetchDashboardData);
                };
            }
        }
    }, [user?.id, fetchDashboardData]);

    const renderContent = () => {
        switch (activeTab) {
            case 'appointments':
                return <ClientAppointments user={user} walletBalance={wallet?.cashBalance || 0} onRefresh={fetchDashboardData} />;
            case 'profile':
                return <div className="animate-reveal"><Profile /></div>;
            case 'wallet':
                return <div className="animate-reveal"><Wallet onRefresh={fetchDashboardData} /></div>;
            default:
                return <ClientAppointments user={user} onRefresh={fetchDashboardData} />;
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
                                {(profile?.name || user?.firstName || 'C')[0].toUpperCase()}
                            </div>
                        </div>
                        <div className="id-text">
                            <div className="name-bold">{profile?.name || user?.firstName || 'Institutional Client'}</div>
                            <div className="role-tag">CLIENT IDENTITY</div>
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav" style={{ marginTop: '30px' }}>
                    <button 
                        className={`nav-link-item ${activeTab === 'profile' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('profile')}
                        title="MY PROFILE"
                    >
                        <span className="nav-icon">🛡️</span>
                        <div className="nav-label-group">
                            <span className="nav-text">MY PROFILE</span>
                            <span className="nav-sub">KYC & personal details</span>
                        </div>
                    </button>

                    <button 
                        className={`nav-link-item ${activeTab === 'appointments' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('appointments')}
                        title="APPOINTMENTS"
                    >
                        <span className="nav-icon">📋</span>
                        <div className="nav-label-group">
                            <span className="nav-text">APPOINTMENTS</span>
                            <span className="nav-sub">Active legal sessions</span>
                            {pendingAppointments > 0 && <span className="unread-badge" style={{ position: 'absolute', right: '15px' }}>{pendingAppointments}</span>}
                        </div>
                    </button>

                    <button 
                        className={`nav-link-item ${activeTab === 'wallet' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('wallet')}
                        title="WALLET & DEPOSITS"
                    >
                        <span className="nav-icon">💳</span>
                        <div className="nav-label-group">
                            <span className="nav-text">WALLET & DEPOSITS</span>
                            <span className="nav-sub">Manage your funds</span>
                        </div>
                    </button>

                    {/* Audit Mandates removed as part of messaging pivot */}

                    <button 
                        className="nav-link-item" 
                        onClick={() => navigate('/experts')}
                        title="FIND EXPERTS"
                    >
                        <span className="nav-icon">🔍</span>
                        <div className="nav-label-group">
                            <span className="nav-text">FIND EXPERTS</span>
                            <span className="nav-sub">Browse legal professionals</span>
                        </div>
                    </button>

                    <button 
                        className="nav-link-item" 
                        onClick={() => navigate('/messages')}
                        title="SECURE MESSAGING"
                    >
                        <span className="nav-icon">💬</span>
                        <div className="nav-label-group">
                            <span className="nav-text">SECURE MESSAGING</span>
                            <span className="nav-sub">Encrypted consultations</span>
                        </div>
                    </button>

                    {user?.role !== 'CLIENT' && (
                        <>
                            <div style={{ margin: '20px 0', borderTop: '1px solid rgba(212, 175, 55, 0.1)' }}></div>
                            <button className="nav-link-item expert-bridge-btn" onClick={() => { setActiveTab('appointments'); toggleViewMode(); }} style={{ background: 'rgba(212, 175, 55, 0.05)', marginTop: 'auto' }} title="EXPERT PRACTICE">
                                <span className="nav-icon">🏛️</span>
                                <div className="nav-label-group">
                                    <span className="nav-text" style={{ color: 'var(--elite-gold)', fontWeight: 800 }}>EXPERT CENTER</span>
                                    <span className="nav-sub">Back to your professional dashboard</span>
                                </div>
                            </button>
                        </>
                    )}
                </nav>

                <div className="sidebar-footer-stat">
                    <div className="institutional-footer">
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
                <header className="dashboard-header" style={{ padding: '25px 40px', background: '#fff', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="header-context">
                        <h1 className="header-title" style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: 'var(--midnight-primary)', letterSpacing: '-0.5px' }}>
                            {activeTab === 'appointments' ? 'Appointment Pipeline' : activeTab === 'wallet' ? 'Wallet & Payments' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1) + ' Hub'}
                        </h1>
                        <p className="header-subtitle" style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                            {loading ? 'Synchronizing Case Portfolio...' : 'Manage your consultations, payments, and legal engagements.'}
                        </p>
                    </div>

                    <div className="header-metrics" style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
                        {loading ? (
                            <div style={{ display: 'flex', gap: '20px' }}>
                                <div className="skeleton-pulse" style={{ width: '120px', height: '40px' }}></div>
                                <div className="skeleton-pulse" style={{ width: '120px', height: '40px' }}></div>
                            </div>
                        ) : (
                            <>
                                <div className="header-metric-item">
                                    <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Cash Balance</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--elite-gold)' }}>₹{wallet?.cashBalance?.toLocaleString() || '0'}</span>
                                </div>
                            </>
                        )}
                        <button className="header-btn" onClick={() => refreshMetadata()} style={{ marginLeft: '20px', padding: '10px 18px', borderRadius: '10px', background: 'rgba(212, 175, 55, 0.1)', color: 'var(--elite-gold)', border: 'none', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ transform: 'scale(1.2)' }}>↻</span> SYNC LEDGER
                        </button>
                    </div>
                </header>

                <div className="dashboard-content">
                    {loading && activeTab === 'appointments' ? (
                        <div style={{ padding: '40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '30px' }}>
                            {[1, 2, 3].map(i => (
                                <div key={i} className="skeleton-card skeleton-pulse" style={{ height: '280px' }}></div>
                            ))}
                        </div>
                    ) : renderContent()}
                </div>
            </main>
        </div>
    );
};

export default ClientDashboard;

