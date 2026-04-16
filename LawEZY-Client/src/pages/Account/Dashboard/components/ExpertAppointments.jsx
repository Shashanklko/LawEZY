import React, { useState, useEffect } from 'react';
import apiClient from '../../../../services/apiClient';
import useAuthStore from '../../../../store/useAuthStore';
import AppointmentCard from './AppointmentCard';

const ExpertAppointments = () => {
    const { user } = useAuthStore();
    const [appointments, setAppointments] = useState([]);
    const [filter, setFilter] = useState('PROPOSALS');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/api/appointments/expert');
            setAppointments(res.header ? res.data.data : res.data); // Flex for ApiResponse wrap
        } catch (err) {
            console.error("Institutional Recall failure:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (appt, action, data) => {
        try {
            if (action === 'accept') {
                await apiClient.post(`/api/appointments/${appt.id}/accept`);
                alert("Institutional Protocol: Session accepted at standard rate.");
            } else if (action === 'accept_with_discount') {
                await apiClient.post(`/api/appointments/${appt.id}/accept-with-discount`);
                alert(`Negotiation Honored: Session confirmed with -${appt.discountPercent}% discount.`);
            } else if (action === 'reject') {
                await apiClient.post(`/api/appointments/${appt.id}/reject`, { reason: data.reason });
                alert("Institutional Rejection Dispatched. Protocol terminated.");
            } else if (action === 'paid') {
                await apiClient.patch(`/api/appointments/${appt.id}/status?status=PAID`);
                alert("Institutional Bridge Synchronized: Meeting Room Initialized.");
            } else if (action === 'completed') {
                await apiClient.patch(`/api/appointments/${appt.id}/status?status=PENDING_REVIEW`);
                alert("Institutional Protocol: Session marked for review. Awaiting client feedback.");
            } else if (action === 'initiate') {
                await apiClient.post(`/api/appointments/${appt.id}/initiate?isFree=false`);
                alert("Institutional Payment Request Sent.");
            } else if (action === 'initiate_free') {
                await apiClient.post(`/api/appointments/${appt.id}/initiate?isFree=true`);
                alert("Session Liberated: Pro-Bono access granted.");
            }
            fetchAppointments();
        } catch (err) {
            alert(`Institutional action failed: ${action}`);
        }
    };

    const filteredAppointments = appointments.filter(appt => {
        const apptStatus = appt.status || appt.appointmentStatus || 'PROPOSED';
        if (filter === 'PROPOSALS') return apptStatus === 'PROPOSED' || apptStatus === 'COUNTERED';
        if (filter === 'UPCOMING') return ['ACCEPTED', 'CONFIRMED', 'AWAITING_PAYMENT', 'PAID', 'PENDING_REVIEW'].includes(apptStatus);
        
        if (filter === 'COMPLETED') {
            if (apptStatus !== 'COMPLETED') return false;
            
            // 90-Day Retention Logic
            const completionDate = appt.updatedAt || appt.scheduledAt || new Date();
            const ageInDays = (new Date() - new Date(completionDate)) / (1000 * 60 * 60 * 24);
            return ageInDays <= 90;
        }
        return true;
    });

    if (loading) return <div style={{padding: '40px', textAlign: 'center', opacity: 0.6}}>Synchronizing Appointment Ledger...</div>;

    return (
        <div className="appointments-tab-container animate-reveal" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="tab-filters" style={{ display: 'flex', gap: '8px', background: 'rgba(212, 175, 55, 0.05)', padding: '6px', borderRadius: '14px', border: '1px solid rgba(212, 175, 55, 0.1)' }}>
                    {['PROPOSALS', 'UPCOMING', 'COMPLETED'].map(f => (
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
                            {f === 'PROPOSALS' ? 'Active Proposals' : f === 'UPCOMING' ? 'Confirmed Sessions' : 'Institutional History'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="appointments-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '25px' }}>
                {filteredAppointments.map(appt => (
                    <AppointmentCard 
                        key={appt.id} 
                        appt={appt} 
                        user={user} 
                        onAction={(action, data) => handleAction(appt, action, data)}
                    />
                ))}
            </div>
            
            {filteredAppointments.length === 0 && (
                <div style={{ textAlign: 'center', padding: '80px', background: 'var(--heritage-parchment)', borderRadius: '24px', border: '1px solid rgba(212, 175, 55, 0.2)', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📅</div>
                    <h3 style={{ margin: 0, fontWeight: 900, color: 'var(--midnight-primary)', fontSize: '1.5rem' }}>No Institutional Sessions</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600, marginTop: '10px' }}>Your professional queue is currently idle. Awaiting institutional client requests.</p>
                </div>
            )}
        </div>
    );
};

export default ExpertAppointments;
