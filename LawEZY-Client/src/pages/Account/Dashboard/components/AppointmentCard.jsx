import React, { useState } from 'react';
import { renderContentWithLinks } from '../../../../utils/strategicFormatter';

const AppointmentCard = ({ appt, user, onAction, onNegotiate, onReschedule }) => {
    const [loadingAction, setLoadingAction] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectBox, setShowRejectBox] = useState(false);
    
    const wrappedAction = async (action, data) => {
        try {
            setLoadingAction(true);
            await onAction(action, data);
        } finally {
            setLoadingAction(false);
        }
    };

    // Determine role relative to the appointment
    const isExpert = ['LAWYER', 'CA', 'CFA', 'PROFESSIONAL'].includes(user?.role?.toUpperCase());
    const isInitiator = appt.initiatorUid === user?.uid || appt.senderId === user?.id;

    const status = appt.status || appt.appointmentStatus || 'PROPOSED';
    const price = appt.fee || appt.price || appt.appointmentPrice || 'TBD';
    const date = appt.scheduledAt || appt.appointmentDate || appt.date || 'To be synchronized';
    const id = appt.id || appt.appointmentId || 'Ref-001';

    const formattedDate = date && !date.includes('Sync') ? new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : date;
    const time = appt.scheduledAt ? new Date(appt.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (appt.appointmentTime || '');

    return (
        <div className={`appointment-card animate-reveal ${loadingAction ? 'processing' : ''}`} style={{ 
            background: 'var(--heritage-parchment)', 
            borderRadius: '20px', 
            border: '1px solid var(--glass-border)',
            overflow: 'hidden',
            boxShadow: '0 15px 35px rgba(0,0,0,0.06)',
            marginBottom: '20px',
            fontFamily: 'Outfit, sans-serif',
            position: 'relative',
            opacity: loadingAction ? 0.7 : 1,
            pointerEvents: loadingAction ? 'none' : 'auto'
        }}>
            {/* Status Ribbon */}

            <div className="appointment-card-header" style={{
                background: 'rgba(13, 27, 42, 0.02)',
                padding: '18px 20px',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--midnight-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--strategic-gold)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Institutional Record</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0f172a' }}>Ref: LZY-AS-{id.toString().slice(-4)}</div>
                </div>

                {status !== 'COMPLETED' && (
                    <div style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.6rem',
                        fontWeight: 900,
                        letterSpacing: '0.5px',
                        whiteSpace: 'nowrap',
                        background: (status === 'CONFIRMED' || status === 'PAID') ? '#d1fae5' : 
                                    (status === 'PENDING_REVIEW' ? '#dbeafe' : '#fef3c7'),
                        color: (status === 'CONFIRMED' || status === 'PAID') ? '#065f46' : 
                               (status === 'PENDING_REVIEW' ? '#1e40af' : '#92400e'),
                        border: '1px solid currentColor',
                    }}>
                        {status === 'PENDING_REVIEW' ? (isExpert ? 'AWAITING RECAP' : 'PENDING YOUR REVIEW') : status}
                    </div>
                )}
            </div>

            <div className="appointment-card-body" style={{ padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '18px' }}>
                    <div className="appt-meta-block">
                        <span style={{ fontSize: '0.65rem', color: '#888', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>Strategy Date</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{formattedDate}</span>
                    </div>
                    <div className="appt-meta-block">
                        <span style={{ fontSize: '0.65rem', color: '#888', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>Precision Time</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{time}</span>
                    </div>
                </div>

                {appt.reason && (
                    <div style={{ padding: '12px', background: 'rgba(0,0,0,0.03)', borderRadius: '12px', marginBottom: '18px', borderLeft: '3px solid var(--strategic-gold)' }}>
                        <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Requirement Reason</span>
                        <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: '1.4', fontWeight: 600 }}>{renderContentWithLinks(appt.reason)}</p>
                    </div>
                )}

                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '18px', 
                    background: '#0F172A', // Hardcoded Midnight for contrast
                    borderRadius: '16px', 
                    color: '#fff',
                    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)'
                }}>
                    <div>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', display: 'block' }}>Strategic Fee</span>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#C5A572' }}>₹{price}</div>
                    </div>
                    {appt.discountPercent > 0 && (
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.6rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.2)', padding: '2px 6px', borderRadius: '4px', fontWeight: 900 }}>NEGOTIATED -{appt.discountPercent}%</span>
                        </div>
                    )}
                </div>

                <div className="appointment-card-actions" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    
                    {/* Professional side actions */}
                    {status === 'PROPOSED' && isExpert && !showRejectBox && (
                        <>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn-appt-primary" style={{ flex: 1, background: '#10b981' }} onClick={() => wrappedAction('accept_with_discount')}>
                                    {loadingAction ? 'PROCESSING...' : 'ACCEPT & DISCOUNT'}
                                </button>
                                <button className="btn-appt-primary" style={{ flex: 1 }} onClick={() => wrappedAction('accept')}>
                                    {loadingAction ? 'CONFIRMING...' : 'ACCEPT'}
                                </button>
                            </div>
                            <button className="btn-appt-secondary" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => setShowRejectBox(true)}>
                                REJECT APPOINTMENT
                            </button>
                        </>
                    )}

                    {/* Rejection UI */}
                    {showRejectBox && (
                        <div className="animate-reveal" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <textarea 
                                placeholder="Specify institutional reason for rejection..." 
                                value={rejectionReason}
                                onChange={e => setRejectionReason(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ef4444', fontSize: '0.8rem', outline: 'none' }}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn-appt-primary" style={{ background: '#ef4444', flex: 1 }} onClick={() => wrappedAction('reject', { reason: rejectionReason })}>
                                    {loadingAction ? 'REJECTING...' : 'CONFIRM REJECTION'}
                                </button>
                                <button className="btn-appt-secondary" style={{ flex: 1 }} onClick={() => setShowRejectBox(false)}>
                                    CANCEL
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Client side actions */}
                    {status === 'PROPOSED' && !isExpert && !isInitiator && (
                        <button className="btn-appt-primary" onClick={() => wrappedAction('accept')}>
                            {loadingAction ? 'CONFIRMING...' : 'CONFIRM STRATEGIC SESSION'}
                        </button>
                    )}

                    {status === 'CONFIRMED' && isExpert && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn-appt-primary" style={{ flex: 1 }} onClick={() => wrappedAction('initiate')}>
                                {loadingAction ? 'REQUESTING...' : 'REQUEST PAYMENT'}
                            </button>
                            <button className="btn-appt-secondary" style={{ flex: 1 }} onClick={() => wrappedAction('initiate_free')}>
                                {loadingAction ? 'INITIATING...' : 'HONOR AS PRO-BONO'}
                            </button>
                        </div>
                    )}

                    {status === 'PAID' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {appt.roomId ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button 
                                        className="btn-appt-primary" 
                                        style={{ flex: 2, background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }} 
                                        onClick={() => {
                                            const baseJoinUrl = `https://meet.jit.si/${appt.roomId}`;
                                            const rolespec = isExpert 
                                                ? `#config.prejoinPageEnabled=false&config.enableLobby=true&config.startWithAudioMuted=false` 
                                                : `#config.prejoinPageEnabled=true&config.enableLobby=true`;
                                            window.open(baseJoinUrl + rolespec, '_blank');
                                        }}
                                    >
                                        <span>🚀</span> {isExpert ? 'JOIN AS MODERATOR' : 'JOIN STRATEGIC SESSION'}
                                    </button>
                                    {isExpert && (
                                        <button className="btn-appt-secondary" style={{ flex: 1, borderColor: '#10b981', color: '#10b981' }} onClick={() => wrappedAction('completed')}>
                                            {loadingAction ? '...' : 'MARK COMPLETED'}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                isExpert && (
                                    <button className="btn-appt-primary" style={{ background: 'var(--midnight-primary)' }} onClick={() => wrappedAction('paid')}>
                                        {loadingAction ? 'CREATING...' : 'INITIATE VIDEO SESSION (CREATE ROOM)'}
                                    </button>
                                )
                            )}
                            {!appt.roomId && !isExpert && (
                                <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#059669' }}>
                                    Payment Verified. Awaiting Expert to initiate strategic room...
                                </div>
                            )}
                        </div>
                    )}

                    {status === 'AWAITING_PAYMENT' && !isExpert && (
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                             <button className="btn-appt-primary" style={{ background: '#10b981' }} onClick={() => wrappedAction('paid')}>
                                 {loadingAction ? 'VERIFYING...' : 'PROCEED TO SECURE PAYMENT'}
                             </button>
                             <button className="btn-appt-secondary" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => wrappedAction('revoke')}>
                                 {loadingAction ? 'REVOKING...' : 'REVOKE REQUEST'}
                             </button>
                         </div>
                    )}

                    {status === 'PROPOSED' && isInitiator && (
                        <div style={{ padding: '12px', background: 'rgba(0,0,0,0.03)', borderRadius: '12px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                             Protocol Pending: Awaiting Professional Validation...
                        </div>
                    )}

                    {status === 'PENDING_REVIEW' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {isExpert ? (
                                <div style={{ padding: '15px', background: 'rgba(212, 175, 55, 0.05)', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.2)', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.2rem', marginBottom: '5px' }}>⏳</div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--midnight-primary)' }}>AWAITING CLIENT FEEDBACK</span>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.65rem', color: '#64748b' }}>Mission logic suspended until institutional review is submitted.</p>
                                </div>
                            ) : (
                                <button 
                                    className="btn-appt-primary" 
                                    style={{ background: 'var(--midnight-primary)', border: '1px solid var(--strategic-gold)', color: 'var(--strategic-gold)', boxShadow: '0 8px 20px rgba(212, 175, 55, 0.2)' }}
                                    onClick={() => wrappedAction('review')}
                                >
                                    {loadingAction ? 'ARCHIVING...' : '⭐ FINALIZE & LEAVE REVIEW'}
                                </button>
                            )}
                        </div>
                    )}

                    {status === 'COMPLETED' && (
                        <div style={{ padding: '15px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', marginBottom: '5px' }}>✅</div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669' }}>SESSION COMPLETED</span>
                            <p style={{ margin: '4px 0 0', fontSize: '0.65rem', color: '#64748b' }}>Strategic mission archived in institutional history.</p>
                        </div>
                    )}

                    {status === 'CANCELLED' && (
                        <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                             <span style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: 800, textTransform: 'uppercase' }}>REJECTION REASON</span>
                             <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>{appt.rejectionReason || 'No specific reason provided.'}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AppointmentCard;
