import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../../../services/apiClient';
import useAuthStore from '../../../../store/useAuthStore';
import { getSocket } from '../../../../services/socket';
import AppointmentCard from './AppointmentCard';

const ExpertAppointments = ({ walletBalance, pendingCount, onRefresh }) => {
    const { user } = useAuthStore();
    const [appointments, setAppointments] = useState([]);
    const [filter, setFilter] = useState('ACTIVE');
    const [loading, setLoading] = useState(true);
    const fetchRef = useRef(null);

    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                setLoading(true);
                const res = await apiClient.get('/api/appointments/expert');
                const data = res.header ? res.data.data : res.data;
                setAppointments(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Recall failure:", err);
            } finally {
                setLoading(false);
            }
        };

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
            } else if (action === 'accept_with_discount') {
                await apiClient.post(`/api/appointments/${appt.id}/accept-with-discount`);
                setFilter('ACTIVE');
            } else if (action === 'reject') {
                await apiClient.post(`/api/appointments/${appt.id}/reject`, { reason: data?.reason });
            } else if (action === 'paid') {
                await apiClient.patch(`/api/appointments/${appt.id}/status?status=PAID`);
            } else if (action === 'mark-completed') {
                await apiClient.post(`/api/appointments/${appt.id}/mark-completed`);
            } else if (action === 'initiate') {
                await apiClient.post(`/api/appointments/${appt.id}/initiate?isFree=false`);
                setFilter('ACTIVE');
            } else if (action === 'initiate_free') {
                await apiClient.post(`/api/appointments/${appt.id}/initiate?isFree=true`);
                setFilter('ACTIVE');
            } else if (action === 'counter') {
                await apiClient.post(`/api/appointments/${appt.id}/counter`, data);
            }
            fetchRef.current?.();
            onRefresh?.();
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || '';
            if (errorMsg.includes('Insufficient') || errorMsg.includes('Balance')) {
                throw err; // Let AppointmentCard handle the wallet modal
            }
            console.error('Expert action failed:', err);
        }
    };

    const filteredAppointments = appointments.filter(appt => {
        const apptStatus = appt.status || appt.appointmentStatus || 'PROPOSED';
        if (filter === 'ACTIVE') {
            return ['PROPOSED', 'COUNTERED', 'CONFIRMED', 'AWAITING_PAYMENT', 'PAID', 'PENDING_REVIEW'].includes(apptStatus);
        }
        
        if (filter === 'HISTORY') {
            if (!['COMPLETED', 'CANCELLED', 'REJECTED'].includes(apptStatus)) return false;
            
            // 90-Day Retention Logic
            const completionDate = appt.updatedAt || appt.scheduledAt || new Date();
            const ageInDays = (new Date() - new Date(completionDate)) / (1000 * 60 * 60 * 24);
            return ageInDays <= 90;
        }
        return true;
    });

    if (loading) return <div style={{padding: '40px', textAlign: 'center', opacity: 0.6}}>Loading Appointments...</div>;

    return (
        <div className="appointments-tab-container animate-reveal" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="tab-filters" style={{ display: 'flex', gap: '8px', background: 'rgba(212, 175, 55, 0.05)', padding: '6px', borderRadius: '14px', border: '1px solid rgba(212, 175, 55, 0.1)' }}>
                    {['ACTIVE', 'HISTORY'].map(f => (
                        <button 
                            key={f}
                            className={`filter-pill ${filter === f ? 'active' : ''}`}
                            onClick={() => setFilter(f)}
                            style={{
                                padding: '8px 24px', borderRadius: '10px', border: 'none', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                                background: filter === f ? 'var(--midnight-primary)' : 'transparent',
                                color: filter === f ? 'var(--elite-gold)' : '#64748b',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                letterSpacing: '0.5px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {f === 'ACTIVE' ? 'Active Sessions' : 'Session History'}
                            {f === 'ACTIVE' && (pendingCount || 0) > 0 && (
                                <span style={{
                                    background: '#ef4444',
                                    color: 'white',
                                    fontSize: '0.65rem',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontWeight: 900,
                                    animation: 'pulse-red 2s infinite',
                                    boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)'
                                }}>
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
                    gap: '25px',
                    width: '100%',
                    justifyContent: 'center'
                }}>
                {filteredAppointments.map(appt => (
                    <AppointmentCard 
                        key={appt.id} 
                        appt={appt} 
                        user={user}
                        walletBalance={walletBalance || 0}
                        onAction={(action, data) => handleAction(appt, action, data)}
                    />
                ))}
            </div>
            
            {filteredAppointments.length === 0 && (
                <div style={{ textAlign: 'center', padding: '80px', background: 'var(--heritage-parchment)', borderRadius: '24px', border: '1px solid rgba(212, 175, 55, 0.2)', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📅</div>
                    <h3 style={{ margin: 0, fontWeight: 900, color: 'var(--midnight-primary)', fontSize: '1.5rem' }}>No Appointments Found</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600, marginTop: '10px' }}>You don't have any appointments at the moment. New requests will appear here.</p>
                </div>
            )}
        </div>
    );
};

export default ExpertAppointments;

