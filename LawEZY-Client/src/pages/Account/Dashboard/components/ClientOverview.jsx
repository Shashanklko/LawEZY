import React from 'react';
import { Link } from 'react-router-dom';

const ClientOverview = ({ user, profile, wallet, sessions, transactions }) => {
    const pendingActions = sessions.filter(s => !s.isAppointmentPaid && s.status === 'ACTIVE').length;
    const totalDeposited = transactions
        .filter(t => t.description?.toLowerCase().includes('deposit') || t.description?.toLowerCase().includes('top-up'))
        .reduce((acc, t) => acc + (t.amount || 0), 0);

    return (
        <div className="dashboard-overview animate-reveal">
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-label">Cash Balance</span>
                        <span className="stat-icon">💳</span>
                    </div>
                    <div className="stat-value">₹{wallet?.cashBalance?.toLocaleString() || '0'}</div>
                    <div className="stat-delta delta-up">Available for Assets</div>
                </div>
                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-label">Pending Action</span>
                        <span className="stat-icon">⏳</span>
                    </div>
                    <div className="stat-value">{pendingActions}</div>
                    <div className="stat-delta">Requires Attention</div>
                </div>
            </div>

            <div className="data-section" style={{ marginTop: '25px' }}>
                <div className="section-header">
                    <h2 className="section-title">Recent Institutional Engagement</h2>
                    <Link to="/messages" className="btn-save-profile" style={{fontSize: '0.7rem', padding: '6px 12px', minWidth: 'auto'}}>Open Secure Chat</Link>
                </div>
                <div className="recent-activity-list" style={{ padding: '0 24px 24px 24px' }}>
                    {sessions.length > 0 ? sessions.slice(0, 3).map(session => (
                        <div key={session.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{session.expertName || `Case ID: ${session.id.slice(-8)}`}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Last activity: {new Date(session.updatedAt).toLocaleDateString()}</div>
                            </div>
                            <span className={`status-pill ${session.isAppointmentPaid ? 'status-paid' : 'status-pending'}`}>
                                {session.isAppointmentPaid ? 'CONFIRMED' : 'ACTION REQ'}
                            </span>
                        </div>
                    )) : (
                        <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>
                            No active institutional consultations initialized.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClientOverview;

