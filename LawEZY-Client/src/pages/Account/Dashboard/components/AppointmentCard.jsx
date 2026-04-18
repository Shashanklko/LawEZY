import React, { useState } from 'react';
import { renderContentWithLinks } from '../../../../utils/institutionalFormatter';

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

    // Timeline logic
    const stages = [
        { key: 'PROPOSED', label: 'Proposal', icon: '📝' },
        { key: 'COUNTERED', label: 'Negotiate', icon: '🔄' },
        { key: 'CONFIRMED', label: 'Approved', icon: '⚖️' },
        { key: 'AWAITING_PAYMENT', label: 'Payment', icon: '💳' },
        { key: 'PAID', label: 'Consult', icon: '🎥' },
        { key: 'COMPLETED', label: 'Finished', icon: '✅' }
    ];

    const currentStageIndex = stages.findIndex(s => s.key === status);
    const displayStatus = stages.find(s => s.key === status)?.label || status;

    return (
        <div className={`appointment-card minimalist animate-reveal ${loadingAction ? 'processing' : ''}`} style={{ 
            background: '#ffffff', 
            borderRadius: '16px', 
            border: '1px solid #f1f5f9',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            marginBottom: '24px',
            fontFamily: 'Outfit, sans-serif',
            position: 'relative',
            opacity: loadingAction ? 0.7 : 1,
            pointerEvents: loadingAction ? 'none' : 'auto'
        }}>
            <div className="appointment-card-header" style={{
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                borderBottom: '1px solid #f8fafc'
            }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--elite-gold)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Institutional Record</div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>REF-{id.toString().slice(-4)}</div>
                </div>

                {status !== 'COMPLETED' && status !== 'CANCELLED' && (
                    <div style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.6rem',
                        fontWeight: 900,
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        background: (status === 'CONFIRMED' || status === 'PAID') ? '#f0fdf4' : '#fff7ed',
                        color: (status === 'CONFIRMED' || status === 'PAID') ? '#16a34a' : '#ea580c',
                        border: '1px solid currentColor',
                    }}>
                        {displayStatus}
                    </div>
                )}
            </div>

            <div className="appointment-card-body" style={{ padding: '20px' }}>
                
                {/* Timeline View */}
                {status !== 'CANCELLED' && (
                    <div className="appointment-timeline minimalist" style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '40px',
                        padding: '20px 0',
                        position: 'relative'
                    }}>
                        {/* Thin Progress Line */}
                        <div style={{
                            position: 'absolute',
                            top: '30px',
                            left: '30px',
                            right: '30px',
                            height: '1px',
                            background: '#f1f5f9',
                            zIndex: 1
                        }}></div>
                        <div style={{
                            position: 'absolute',
                            top: '30px',
                            left: '30px',
                            width: `calc(${Math.max(0, currentStageIndex) * (100 / (stages.length - 1))}% - 60px)`,
                            height: '1px',
                            background: 'var(--elite-gold)',
                            zIndex: 2,
                            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}></div>

                        {stages.map((stage, index) => {
                            const isCompleted = index < currentStageIndex;
                            const isActive = index === currentStageIndex;
                            return (
                                <div key={stage.key} style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    zIndex: 3,
                                    width: '14.2%',
                                    flexShrink: 0
                                }}>
                                    <div style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        background: isCompleted ? 'var(--elite-gold)' : (isActive ? '#0f172a' : '#fff'),
                                        border: isActive ? '2px solid var(--elite-gold)' : '1.5px solid #f1f5f9',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.6rem',
                                        color: isCompleted ? '#fff' : (isActive ? '#fff' : '#cbd5e1'),
                                        transition: 'all 0.4s ease'
                                    }}>
                                        {isCompleted ? '✓' : ''}
                                    </div>
                                    <span style={{
                                        fontSize: '0.45rem',
                                        fontWeight: isActive ? 900 : 600,
                                        marginTop: '10px',
                                        color: isActive ? '#0f172a' : (isCompleted ? '#64748b' : '#cbd5e1'),
                                        textAlign: 'center',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.8px',
                                        width: '100%'
                                    }}>
                                        {stage.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '18px' }}>
                    <div className="appt-meta-block">
                        <span style={{ fontSize: '0.65rem', color: '#888', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>Institutional Date</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{formattedDate}</span>
                    </div>
                    <div className="appt-meta-block">
                        <span style={{ fontSize: '0.65rem', color: '#888', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>Precision Time</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{time}</span>
                    </div>
                </div>

                {appt.reason && (
                    <div style={{ 
                        padding: '16px 0', 
                        borderTop: '1px solid #f8fafc',
                        marginBottom: '20px'
                    }}>
                        <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '8px', letterSpacing: '1.5px' }}>Objective</span>
                        <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.6', fontWeight: 500, color: '#334155' }}>{renderContentWithLinks(appt.reason)}</p>
                    </div>
                )}

                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '20px', 
                    background: '#f8fafc',
                    borderRadius: '12px', 
                    border: '1px solid #f1f5f9'
                }}>
                    <div>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', display: 'block', marginBottom: '4px' }}>Session Value</span>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>₹{price}</div>
                    </div>
                    {appt.discountPercent > 0 && (
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: 900, border: '1.5px solid #10b981', padding: '3px 10px', borderRadius: '20px' }}>-{appt.discountPercent}% OFF</span>
                        </div>
                    )}
                </div>

                <div className="appointment-card-actions" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    
                    {/* Professional side actions */}
                    {(status === 'PROPOSED' || status === 'COUNTERED') && isExpert && !showRejectBox && !isInitiator && (
                        <>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn-appt-primary" style={{ flex: 1, background: '#10b981' }} onClick={() => wrappedAction('accept_with_discount')}>
                                    {loadingAction ? 'PROCESSING...' : 'ACCEPT & DISCOUNT'}
                                </button>
                                <button className="btn-appt-primary" style={{ flex: 1 }} onClick={() => wrappedAction('accept')}>
                                    {loadingAction ? 'CONFIRMING...' : 'APPROVE PROPOSAL'}
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
                    {(status === 'PROPOSED' || status === 'COUNTERED') && !isExpert && !isInitiator && (
                        <button className="btn-appt-primary" onClick={() => wrappedAction('accept')}>
                            {loadingAction ? 'CONFIRMING...' : 'APPROVE INSTITUTIONAL SESSION'}
                        </button>
                    )}

                    {status === 'CONFIRMED' && isExpert && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn-appt-primary" style={{ flex: 1 }} onClick={() => wrappedAction('initiate')}>
                                {loadingAction ? 'REQUESTING...' : 'REQUEST ESCROW PAYMENT'}
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
                                        <span>🎥</span> {isExpert ? 'JOIN AS MODERATOR' : 'JOIN SECURE CONSULTATION'}
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
                                    Payment Verified. Awaiting Expert to initiate institutional room...
                                </div>
                            )}
                        </div>
                    )}

                    {status === 'AWAITING_PAYMENT' && !isExpert && (
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                             <button className="btn-appt-primary" style={{ background: '#10b981' }} onClick={() => wrappedAction('paid')}>
                                 {loadingAction ? 'VERIFYING...' : 'PROCEED TO ESCROW PAYMENT'}
                             </button>
                             <button className="btn-appt-secondary" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => wrappedAction('revoke')}>
                                 {loadingAction ? 'REVOKING...' : 'REVOKE REQUEST'}
                             </button>
                         </div>
                    )}

                    {(status === 'PROPOSED' || status === 'COUNTERED') && isInitiator && (
                        <div style={{ padding: '12px', background: 'rgba(0,0,0,0.03)', borderRadius: '12px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                             Protocol Pending: Awaiting Peer Validation...
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
                                    style={{ background: 'var(--midnight-primary)', border: '1px solid var(--elite-gold)', color: 'var(--elite-gold)', boxShadow: '0 8px 20px rgba(212, 175, 55, 0.2)' }}
                                    onClick={() => wrappedAction('review')}
                                >
                                    {loadingAction ? 'ARCHIVING...' : '⭐ FINALIZE & LEAVE FEEDBACK'}
                                </button>
                            )}
                        </div>
                    )}

                    {status === 'COMPLETED' && (
                        <div style={{ padding: '15px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', marginBottom: '5px' }}>✅</div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669' }}>SESSION COMPLETED</span>
                            <p style={{ margin: '4px 0 0', fontSize: '0.65rem', color: '#64748b' }}>Institutional mission archived in history ledger.</p>
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
