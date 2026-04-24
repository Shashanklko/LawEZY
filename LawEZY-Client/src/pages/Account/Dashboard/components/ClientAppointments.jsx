import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../../../services/apiClient';
import { getSocket } from '../../../../services/socket';
import AppointmentCard from './AppointmentCard';
import ReviewModal from './ReviewModal';

const ClientAppointments = ({ user, walletBalance, onRefresh }) => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ACTIVE');
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedAppt, setSelectedAppt] = useState(null);
    const fetchRef = useRef(null);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/api/appointments/client');
            setAppointments(res.header ? res.data.data : res.data);
        } catch (err) {
            console.error("Failed to recall client ledger:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRef.current = fetchAppointments;
        fetchAppointments();

        const token = localStorage.getItem('lawezy_token');
        if (token) {
            const socket = getSocket(token);
            const handler = () => {
                fetchRef.current?.();
                onRefresh?.();
            };
            socket.on('notification_received', handler);
            socket.on('discovery_sync', handler);
            return () => {
                socket.off('notification_received', handler);
                socket.off('discovery_sync', handler);
            };
        }
    }, [onRefresh]);

    const handleAction = async (appt, action, data) => {
        try {
            if (action === 'accept') {
                await apiClient.post(`/api/appointments/${appt.id}/accept`);
                setFilter('ACTIVE');
            } else if (action === 'paid') {
                await apiClient.patch(`/api/appointments/${appt.id}/status?status=PAID`);
                setFilter('ACTIVE');
            } else if (action === 'revoke') {
                await apiClient.patch(`/api/appointments/${appt.id}/status?status=CANCELLED`);
            } else if (action === 'review') {
                setSelectedAppt(appt);
                setShowReviewModal(true);
                return;
            } else if (action === 'counter') {
                await apiClient.post(`/api/appointments/${appt.id}/counter`, data);
            } else if (action === 'finalize') {
                await apiClient.post(`/api/appointments/${appt.id}/finalize?slotIndex=${data?.slotIndex || 1}`);
                setFilter('ACTIVE');
            }
            fetchRef.current?.();
            onRefresh?.();
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || "";
            if (errorMsg.includes("Insufficient") || errorMsg.includes("Balance")) {
                throw err;
            }
            alert(`Action failed: ${errorMsg || "The system was unable to process the request."}`);
        }
    };

    const handleNegotiate = async (appt, percent) => {
        try {
            const currentPrice = appt.fee;
            const discount = Math.round(currentPrice * (percent / 100));
            const newPrice = currentPrice - discount;
            await apiClient.post(`/api/appointments/${appt.id}/negotiate?baseFee=${newPrice - 100}`);
            fetchRef.current?.();
            onRefresh?.();
        } catch (err) {
            alert("Negotiation failed.");
        }
    };

    const filtered = appointments.filter(a => {
        const apptStatus = a.status || a.appointmentStatus || 'PROPOSED';
        if (filter === 'ACTIVE') return !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(apptStatus);
        
        if (filter === 'HISTORY') {
            if (!['COMPLETED', 'CANCELLED', 'REJECTED'].includes(apptStatus)) return false;
            
            // 90-Day Retention Logic
            const completionDate = a.updatedAt || a.scheduledAt || new Date();
            const ageInDays = (new Date() - new Date(completionDate)) / (1000 * 60 * 60 * 24);
            return ageInDays <= 90;
        }
        return true;
    });

    if (loading) return <div style={{ padding: '40px', textAlign: 'center', opacity: 0.6 }}>Synchronizing Case Ledger...</div>;

    return (
        <div className="appointments-tab-container animate-reveal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', gap: '20px', flexWrap: 'wrap' }}>
                <div className="tab-filters" style={{ display: 'flex', gap: '8px', background: 'rgba(212, 175, 55, 0.05)', padding: '6px', borderRadius: '14px', border: '1px solid rgba(212, 175, 55, 0.1)' }}>
                    {['ACTIVE', 'HISTORY'].map(f => (
                        <button 
                            key={f}
                            className={`filter-pill ${filter === f ? 'active' : ''}`}
                            onClick={() => setFilter(f)}
                            style={{
                                padding: '8px 18px', borderRadius: '10px', border: 'none', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer',
                                background: filter === f ? 'var(--midnight-primary)' : 'transparent',
                                color: filter === f ? 'var(--elite-gold)' : '#64748b',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                letterSpacing: '0.5px'
                            }}
                        >
                            {f === 'ACTIVE' ? 'Active Sessions' : 'Session History'}
                        </button>
                    ))}
                </div>

                {filter === 'HISTORY' && (
                    <div style={{ 
                        fontSize: '0.65rem', 
                        fontWeight: 800, 
                        color: 'var(--midnight-primary)', 
                        background: 'rgba(212, 175, 55, 0.1)',
                        padding: '10px 18px',
                        borderRadius: '12px',
                        border: '1px solid rgba(212, 175, 55, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <span style={{ fontSize: '1.2rem' }}>🏛️</span>
                        INSTITUTIONAL HISTORY IS RETAINED FOR A MAXIMUM OF 90 DAYS
                    </div>
                )}

                <button 
                    onClick={() => window.location.href='/experts'} 
                    className="btn-save-profile" 
                    style={{ 
                        margin: 0, 
                        padding: '12px 24px', 
                        fontSize: '0.8rem', 
                        minWidth: 'auto', 
                        background: 'var(--midnight-primary)',
                        color: 'var(--elite-gold)',
                        boxShadow: '0 4px 15px rgba(212, 175, 55, 0.15)',
                        border: '1px solid var(--elite-gold)'
                    }}
                >
                    + Book New Appointment
                </button>
            </div>

            <div className="appointments-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {filtered.map(appt => (
                    <AppointmentCard 
                        key={appt.id} 
                        appt={appt} 
                        user={user} 
                        walletBalance={walletBalance}
                        onAction={(action, data) => handleAction(appt, action, data)}
                        onNegotiate={(percent) => handleNegotiate(appt, percent)}
                        onReschedule={() => alert("Redirecting to Expert Profile for alternate booking...")}
                    />
                ))}
                {filtered.length === 0 && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', background: 'rgba(0,0,0,0.02)', borderRadius: '20px', border: '1px dashed #ddd' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '15px' }}>📜</div>
                        <h4 style={{ margin: 0, fontWeight: 800 }}>No Sessions Recorded</h4>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '8px' }}>Your institutional engagement trail is currently empty. Start by finding a professional.</p>
                        <button onClick={() => window.location.href='/experts'} className="btn-save-profile" style={{ marginTop: '20px', padding: '10px 20px', fontSize: '0.75rem', minWidth: 'auto' }}>Browse Experts</button>
                    </div>
                )}
            </div>

            {showReviewModal && selectedAppt && (
                <ReviewModal 
                    appointment={selectedAppt}
                    onClose={() => setShowReviewModal(false)}
                    onSuccess={() => {
                        setShowReviewModal(false);
                        fetchAppointments();
                        alert("Review Submitted successfully. Session closed.");
                    }}
                />
            )}
        </div>
    );
};

export default ClientAppointments;

