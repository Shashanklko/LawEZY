import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../../store/useAuthStore';
import useMetadata from '../../../services/useMetadata';
import apiClient from '../../../services/apiClient';
import ClientOverview from './components/ClientOverview';
import ClientAppointments from './components/ClientAppointments';
import Profile from '../Profile/Profile';
import Wallet from '../../Wallet/Wallet';
import './ExpertDashboard.css'; // Reusing established premium styles

const ClientDashboard = ({ onToggleView }) => {
    const { user } = useAuthStore();
    const { profile, wallet, refreshMetadata } = useMetadata();
    const navigate = useNavigate();
    
    const [activeTab, setActiveTab] = useState('appointments');
    const [transactions, setTransactions] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const [transRes, sessionRes] = await Promise.all([
                    apiClient.get('/api/account/transactions'),
                    apiClient.get(`/api/chat/sessions/user/${user.uid}`)
                ]);
                setTransactions(transRes.data.data || transRes.data || []);
                setSessions(sessionRes.data.data || sessionRes.data || []);
            } catch (err) {
                console.error("Client Dashboard Recall Failure:", err);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchDashboardData();
        }
    }, [user]);

    const renderContent = () => {
        switch (activeTab) {
            case 'appointments':
                return <ClientAppointments user={user} />;
            case 'profile':
                return <div className="animate-reveal"><Profile /></div>;
            case 'wallet':
                return <div className="animate-reveal"><Wallet /></div>;
            default:
                return <ClientAppointments user={user} />;
        }
    };

    return (
        <div className="expert-dashboard-container">
            <aside className="dashboard-sidebar">
                <div className="sidebar-brand">
                    <div className="brand-label">LAWEZY CLIENT HUB</div>
                    <div className="expert-identity-card">
                        <div className="avatar-wrapper-elite">
                            <img src={profile?.avatar || user?.avatar || 'https://ui-avatars.com/api/?name=CL&background=0D1B2A&color=E0C389'} alt="User" />
                        </div>
                        <div className="id-text">
                            <div className="name-bold">{profile?.name || user?.firstName || 'Institutional Client'}</div>
                            <div className="role-tag">CLIENT IDENTITY</div>
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav" style={{ marginTop: '30px' }}>
                    <button 
                        className={`nav-link-item ${activeTab === 'appointments' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('appointments')}
                    >
                        <div className="nav-label-group">
                            <span className="nav-text">📋 ENGAGEMENT LEDGER</span>
                            <span className="nav-sub">Active legal portfolio</span>
                        </div>
                    </button>

                    <button 
                        className={`nav-link-item ${activeTab === 'profile' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('profile')}
                    >
                        <div className="nav-label-group">
                            <span className="nav-text">🛡️ IDENTITY VAULT</span>
                            <span className="nav-sub">KYC & personal dossier</span>
                        </div>
                    </button>

                    <button 
                        className={`nav-link-item ${activeTab === 'wallet' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('wallet')}
                    >
                        <div className="nav-label-group">
                            <span className="nav-text">💳 FINANCIAL ESCROW</span>
                            <span className="nav-sub">Secure balance & deposits</span>
                        </div>
                    </button>

                    <button className="nav-link-item" onClick={() => navigate('/experts')}>
                        <div className="nav-label-group">
                            <span className="nav-text">🔍 DISCOVERY NETWORK</span>
                            <span className="nav-sub">Institutional expert selection</span>
                        </div>
                    </button>
                    
                    <button className="nav-link-item" onClick={() => navigate('/messages')}>
                        <div className="nav-label-group">
                            <span className="nav-text">💬 MESSAGING UNIT</span>
                            <span className="nav-sub">Secure consultations</span>
                        </div>
                    </button>

                    {user?.role !== 'CLIENT' && (
                        <>
                            <div style={{ margin: '20px 0', borderTop: '1px solid rgba(212, 175, 55, 0.1)' }}></div>
                            <button className="nav-link-item expert-bridge-btn" onClick={onToggleView} style={{ background: 'rgba(212, 175, 55, 0.05)', marginTop: 'auto' }}>
                                <div className="nav-label-group">
                                    <span className="nav-text" style={{ color: 'var(--elite-gold)', fontWeight: 800 }}>🏛️ EXPERT PRACTICE</span>
                                    <span className="nav-sub">Back to your professional dashboard</span>
                                </div>
                            </button>
                        </>
                    )}
                </nav>

                <div className="sidebar-footer-stat">
                    <div className="institutional-footer">
                        <div className="footer-actions-dual">
                            <button className="btn-exit-dash" onClick={() => navigate('/')}>
                                EXIT DASHBOARD
                            </button>
                            <button className="btn-logout-minimal" onClick={() => { useAuthStore.getState().logout(); navigate('/login'); }}>
                                LOG OUT
                            </button>
                        </div>
                        <span>v2.4.0-CL</span>
                    </div>
                </div>
            </aside>

            <main className="dashboard-main">
                <header className="dashboard-header" style={{ padding: '25px 40px', background: '#fff', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="header-context">
                        <h1 className="header-title" style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: 'var(--midnight-primary)', letterSpacing: '-0.5px' }}>
                            {activeTab === 'appointments' ? 'Engagement Pipeline' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1) + ' Hub'}
                        </h1>
                        <p className="header-subtitle" style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                            {loading ? 'Synchronizing Institutional Portfolio...' : 'Managing your institutional legal portfolio and financial integrity.'}
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
                                    <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Institutional Investment</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--midnight-primary)' }}>₹{sessions.reduce((acc, s) => acc + (s.fee || 0), 0).toLocaleString()}</span>
                                </div>
                                <div className="header-metric-item" style={{ paddingLeft: '30px', borderLeft: '1px solid #f1f5f9' }}>
                                    <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Escrow Integrity</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--elite-gold)' }}>₹{wallet?.balance?.toLocaleString() || '0'}</span>
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
