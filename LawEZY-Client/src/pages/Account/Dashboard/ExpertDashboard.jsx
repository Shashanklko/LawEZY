import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../../../store/useAuthStore';
import useMetadata from '../../../services/useMetadata';
import apiClient from '../../../services/apiClient';
import ExpertAppointments from './components/ExpertAppointments';
import './ExpertDashboard.css';

const ExpertDashboard = ({ onToggleView }) => {
    const { user } = useAuthStore();
    const { profile, wallet, refreshMetadata } = useMetadata();
    const navigate = useNavigate();
    
    const [activeTab, setActiveTab] = useState('appointments');
    const [transactions, setTransactions] = useState([]);
    const [chatSessions, setChatSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(false);

    // Synchronize isOnline with profile status once metadata is resolved
    useEffect(() => {
        if (profile) {
            setIsOnline(!!profile.online);
        }
    }, [profile]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const [transRes, chatRes] = await Promise.all([
                    apiClient.get('/api/account/transactions'),
                    apiClient.get(`/api/chat/sessions/pro/${user.uid}`)
                ]);
                setTransactions(transRes.data.data || transRes.data || []);
                setChatSessions(chatRes.data.data || chatRes.data || []);
            } catch (err) {
                console.error("Dashboard Intelligence Sync Failure:", err);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchDashboardData();
        }
    }, [user]);

    // Financial calculations
    const calculateEarnings = () => {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        let daily = 0, monthly = 0;
        transactions.forEach(tx => {
            if (!tx || !tx.timestamp) return;
            const txDate = new Date(tx.timestamp);
            const amount = Number(tx.amount) || 0;
            const status = tx.status?.toUpperCase() || '';
            
            if (amount > 0 && (status === 'SUCCESS' || status === 'COMPLETED' || status === 'PAID')) {
                if (txDate.toDateString() === today.toDateString()) daily += amount;
                if (txDate >= startOfMonth) monthly += amount;
            }
        });

        return { daily, monthly };
    };

    const earnings = calculateEarnings();
    const unreadMessages = chatSessions.reduce((acc, s) => acc + (s.unreadCount || 0), 0);

    const toggleAvailability = async () => {
        try {
            const newStatus = !isOnline;
            setIsOnline(newStatus);
            await apiClient.patch(`/api/professionals/${user.uid}/status`, { online: newStatus });
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
                return <ExpertAppointments />;
            case 'wallet':
                return (
                    <div className="wallet-overview-pane animate-reveal">
                        <div className="pane-header">
                            <h3>Ledger & Liquidity</h3>
                            <button className="btn-save-profile" onClick={() => navigate('/wallet')}>Manage Wallet →</button>
                        </div>
                        <div className="transactions-mini-list">
                            {transactions.length > 0 ? (
                                transactions.slice(0, 5).map(tx => (
                                    <div key={tx.id} className="tx-item-dash">
                                        <div className="tx-info">
                                            <span className="tx-ref">Ref: {tx.id.toString().substring(0,6)}</span>
                                            <span className="tx-date">{new Date(tx.timestamp).toLocaleDateString()}</span>
                                        </div>
                                        <div className={`tx-amount ${tx.amount > 0 ? 'plus' : 'minus'}`}>
                                            {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount)}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="no-data-hint">No recent transactions synchronized.</p>
                            )}
                        </div>
                    </div>
                );
            default:
                return <ExpertAppointments />;
        }
    };

    return (
        <div className="expert-dashboard-container">
            <aside className="dashboard-sidebar">
                <div className="sidebar-brand">
                    <div className="brand-label">LAWEZY INSTITUTIONAL</div>
                    <div className="expert-identity-card">
                        <div className="avatar-wrapper-elite">
                            <img src={profile?.avatar || user?.avatar || 'https://ui-avatars.com/api/?name=EX&background=0D1B2A&color=E0C389'} alt="Expert" />
                            <div className={`status-node ${isOnline ? 'online' : 'offline'}`}></div>
                        </div>
                        <div className="id-text">
                            <div className="name-bold">{profile?.name || user?.firstName || 'Institutional Expert'}</div>
                            <div className="role-tag">{user?.role || 'PROFESSIONAL'}</div>
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <button 
                        className={`nav-link-item ${activeTab === 'appointments' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('appointments')}
                    >
                        <div className="nav-label-group">
                            <span className="nav-text">📅 INSTITUTIONAL PIPELINE</span>
                            <span className="nav-sub">Manage active consultations</span>
                        </div>
                    </button>

                    <button 
                        className={`nav-link-item ${activeTab === 'wallet' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('wallet')}
                    >
                        <div className="nav-label-group">
                            <span className="nav-text">📊 FINANCIAL LEDGER</span>
                            <span className="nav-sub">Revenue & escrow tracking</span>
                        </div>
                    </button>

                    <button className="nav-link-item" onClick={() => navigate('/profile')}>
                        <div className="nav-label-group">
                            <span className="nav-text">👤 PROFESSIONAL DOSSIER</span>
                            <span className="nav-sub">Credentials & public profile</span>
                        </div>
                    </button>

                    <button className="nav-link-item" onClick={() => navigate('/messages')}>
                        <div className="nav-label-group">
                            <span className="nav-text">💬 MESSAGING HUB</span>
                            <span className="nav-sub">Secure client communications</span>
                            {unreadMessages > 0 && <span className="unread-badge">{unreadMessages}</span>}
                        </div>
                    </button>

                    <div style={{ margin: '20px 0', borderTop: '1px solid rgba(212, 175, 55, 0.1)' }}></div>

                    <button className="nav-link-item seeker-bridge-btn" onClick={onToggleView} style={{ background: 'rgba(212, 175, 55, 0.05)', marginTop: 'auto' }}>
                        <div className="nav-label-group">
                            <span className="nav-text" style={{ color: 'var(--elite-gold)', fontWeight: 800 }}>🏛️ SEEKER DASHBOARD</span>
                            <span className="nav-sub">Manage advice you've booked</span>
                        </div>
                    </button>
                </nav>

                <div className="sidebar-footer-stat">
                    <div className="stat-label">AVAILABILITY PROTOCOL</div>
                    <div className="status-toggle-control" onClick={toggleAvailability}>
                         <div className={`toggle-track ${isOnline ? 'active' : ''}`}>
                             <div className="toggle-thumb"></div>
                         </div>
                         <span className="status-label">{isOnline ? 'MISSION READY' : 'OFFLINE MODE'}</span>
                    </div>

                    <div className="institutional-footer">
                        <div className="footer-actions-dual">
                            <button className="btn-exit-dash" onClick={() => navigate('/')}>
                                EXIT DASHBOARD
                            </button>
                            <button className="btn-logout-minimal" onClick={() => { useAuthStore.getState().logout(); navigate('/login'); }}>
                                LOG OUT
                            </button>
                        </div>
                        <span>v2.4.0-PRO</span>
                    </div>
                </div>
            </aside>

            <main className="dashboard-main">
                <header className="dashboard-header-elite">
                    <div className="header-text">
                        <h1>Expert Command Center</h1>
                        <p>{loading ? 'Synchronizing Institutional Intelligence...' : `Synchronized at ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}</p>
                    </div>
                    
                    <div className="metrics-grid-header">
                        {loading ? (
                            <>
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="metric-card-mini skeleton-pulse" style={{ border: 'none', height: '80px' }}></div>
                                ))}
                            </>
                        ) : (
                            <>
                                <div className="metric-card-mini">
                                    <span className="m-label">TODAY'S REVENUE</span>
                                    <span className="m-value">₹{earnings.daily}</span>
                                </div>
                                <div className="metric-card-mini">
                                    <span className="m-label">MONTHLY YIELD</span>
                                    <span className="m-value">₹{earnings.monthly}</span>
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
                                        <div className="c-avatar" style={{ background: 'var(--midnight-primary)', color: 'var(--elite-gold)', borderRadius: '12px' }}>{session.clientName?.charAt(0) || 'C'}</div>
                                        <div className="c-info">
                                            <strong style={{ color: 'var(--midnight-primary)', fontSize: '0.9rem' }}>{session.clientName || 'Institutional Client'}</strong>
                                            <p className="last-msg" style={{ color: '#64748b' }}>{session.lastMessage || 'Awaiting synchronization...'}</p>
                                        </div>
                                        {session.unreadCount > 0 && <div className="c-badge" style={{ background: 'var(--accent-red)' }}>{session.unreadCount}</div>}
                                    </div>
                                ))
                            ) : (
                                <div className="empty-feed" style={{ background: 'rgba(0,0,0,0.01)', borderRadius: '16px', padding: '30px' }}>
                                    <span className="icon" style={{ opacity: 1 }}>📬</span>
                                    <p style={{ fontWeight: 700, color: '#94a3b8' }}>No active institutional comms.</p>
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
