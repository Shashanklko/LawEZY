import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { renderContentWithLinks } from '../../../../utils/caseFormatter';

const AppointmentCard = ({ appt, user, walletBalance, onAction, onNegotiate, onReschedule }) => {
    const navigate = useNavigate();
    const [loadingAction, setLoadingAction] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectBox, setShowRejectBox] = useState(false);
    const [showWalletWarning, setShowWalletWarning] = useState(false);
    const [showRescheduleForm, setShowRescheduleForm] = useState(false);
    const [newSlots, setNewSlots] = useState({
        slot1: appt.scheduledAt || '',
        slot2: appt.proposedSlot1 || '',
        slot3: appt.proposedSlot2 || ''
    });
    
    const wrappedAction = async (action, data) => {
        if (action === 'paid' && !isExpert) {
            const currentPrice = appt.fee || appt.price || appt.appointmentPrice || 0;
            if (walletBalance < currentPrice) {
                setShowWalletWarning(true);
                return;
            }
        }

        try {
            setLoadingAction(true);
            await onAction(action, data);
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || "";
            if (action === 'paid' && (errorMsg.includes("Insufficient") || errorMsg.includes("Balance"))) {
                setShowWalletWarning(true);
            } else {
                console.error("Action execution failed:", err);
            }
        } finally {
            setLoadingAction(false);
        }
    };

    // Determine role relative to the appointment
    const isExpert = ['LAWYER', 'CA', 'CFA', 'PROFESSIONAL'].includes(user?.role?.toUpperCase());
    const isInitiator = appt.initiatorId === user?.id || appt.senderId === user?.id;

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
        { key: 'COMPLETION_REQUESTED', label: 'Verifying', icon: '⏳' },
        { key: 'COMPLETED', label: 'Finished', icon: '✅' },
        { key: 'CANCELLED', label: 'Revoked', icon: '🚫' },
        { key: 'REJECTED', label: 'Rejected', icon: '✖️' }
    ];

    const normalizedStatus = status === 'ACCEPTED' ? 'CONFIRMED' : status;
    const currentStageIndex = stages.findIndex(s => s.key === normalizedStatus);
    const displayStatus = stages.find(s => s.key === normalizedStatus)?.label || status;

    return (
        <div className={`appointment-card minimalist animate-reveal ${loadingAction ? 'processing' : ''}`} style={{ 
            background: 'var(--card-bg, #ffffff)', 
            borderRadius: '16px', 
            border: '1px solid var(--card-border, #f1f5f9)',
            overflow: 'hidden',
            boxShadow: 'var(--card-shadow, 0 4px 20px rgba(0,0,0,0.03))',
            transition: 'transform 0.3s ease',
            height: 'fit-content',
            width: '100%',
            maxWidth: '440px',
            margin: '0 auto 24px auto',
            fontFamily: 'Outfit, sans-serif',
            position: 'relative',
            opacity: loadingAction ? 0.7 : 1,
            pointerEvents: loadingAction ? 'none' : 'auto',
            color: 'var(--text-primary, #0f172a)'
        }}>
            <div className="appointment-card-header" style={{ padding: '15px 20px', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--elite-gold)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                </div>
                <div style={{ flex: 1, marginLeft: '16px' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Consultation Details</div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>REF-{id.toString().slice(-4)}</div>
                </div>

                {status !== 'PENDING_STATUS_HIDDEN' && (
                    <div style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.6rem',
                        fontWeight: 900,
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        background: (status === 'CONFIRMED' || status === 'PAID' || status === 'COMPLETED') ? '#f0fdf4' : (status === 'CANCELLED' || status === 'REJECTED' ? '#fef2f2' : '#fff7ed'),
                        color: (status === 'CONFIRMED' || status === 'PAID' || status === 'COMPLETED') ? '#16a34a' : (status === 'CANCELLED' || status === 'REJECTED' ? '#ef4444' : '#ea580c'),
                        border: '1px solid currentColor',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        {((isExpert && (status === 'PROPOSED' || status === 'COUNTERED')) || (!isExpert && status === 'AWAITING_PAYMENT')) && (
                            <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#ef4444',
                                display: 'inline-block',
                                animation: 'pulse-red 2s infinite'
                            }}></span>
                        )}
                        {displayStatus}
                    </div>
                )}
            </div>

            <div className="appointment-card-body" style={{ padding: '15px 20px' }}>
                
                {/* Re-engineered Flex Timeline */}
                {status !== 'CANCELLED' && (
                    <div className="appointment-timeline-flex" style={{
                        display: 'flex',
                        width: '100%',
                        marginBottom: '20px',
                        padding: '10px 0',
                        justifyContent: 'space-between'
                    }}>
                        {stages.map((stage, index) => {
                            const isCompleted = index < currentStageIndex;
                            const isActive = index === currentStageIndex;
                            
                            return (
                                <div key={stage.key} style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    position: 'relative'
                                }}>
                                    {/* Progress Bridge Line */}
                                    {index < stages.length - 1 && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '10px',
                                            left: '50%',
                                            right: '-50%',
                                            height: '2px',
                                            background: index < currentStageIndex ? 'var(--elite-gold)' : '#f1f5f9',
                                            zIndex: 1
                                        }}></div>
                                    )}

                                    {/* Node Dot */}
                                    <div style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        background: isCompleted ? '#d4af37' : (isActive ? '#0f172a' : '#f8fafc'),
                                        border: isActive ? '2px solid #d4af37' : (isCompleted ? '1.5px solid #d4af37' : '1.5px solid #cbd5e1'),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.6rem',
                                        color: '#fff',
                                        zIndex: 2,
                                        transition: 'all 0.3s ease'
                                    }}>
                                        {isCompleted ? '✓' : ''}
                                    </div>

                                    {/* Stage Label - Optimized to only show active for clarity */}
                                    <div style={{
                                        marginTop: '10px',
                                        textAlign: 'center',
                                        width: '100%',
                                        height: '20px' // Fixed height to prevent layout shift
                                    }}>
                                        {isActive && (
                                            <div style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 900,
                                                color: '#0f172a',
                                                textTransform: 'uppercase',
                                                letterSpacing: '1.2px',
                                                whiteSpace: 'nowrap',
                                                transition: 'all 0.3s ease'
                                            }}>
                                                {stage.label}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '10px' }}>
                    <div className="appt-meta-block">
                        <span style={{ fontSize: '0.65rem', color: '#888', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>Scheduled Date</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{formattedDate}</span>
                    </div>
                    <div className="appt-meta-block">
                        <span style={{ fontSize: '0.65rem', color: '#888', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>Appointment Time</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{time}</span>
                    </div>
                </div>

                {(status === 'COUNTERED' || appt.proposedSlot1 || appt.proposedSlot2) && (
                    <div style={{ marginBottom: '15px', padding: '10px', background: 'rgba(212, 175, 55, 0.03)', borderRadius: '10px', border: '1px dashed rgba(212, 175, 55, 0.2)' }}>
                         <span style={{ fontSize: '0.6rem', color: 'var(--elite-gold)', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                             {status === 'COUNTERED' ? 'Proposed Rescheduling Slots' : 'Alternate Proposed Slots'}
                         </span>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                             {[appt.proposedSlot1, appt.proposedSlot2, appt.proposedSlot3].filter(Boolean).map((slot, idx) => (
                                 <div key={idx} style={{ 
                                     display: 'flex', 
                                     justifyContent: 'space-between', 
                                     alignItems: 'center',
                                     padding: '6px 10px',
                                     background: 'rgba(255,255,255,0.5)',
                                     borderRadius: '6px',
                                     border: '1px solid rgba(0,0,0,0.05)'
                                 }}>
                                     <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                                         {new Date(slot).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                     </span>
                                     {((status === 'COUNTERED' || status === 'PROPOSED') && !isInitiator) && (
                                         <button 
                                             onClick={() => wrappedAction('finalize', { slotIndex: idx + 1 })}
                                             style={{ 
                                                 background: 'var(--midnight-primary)', color: 'var(--elite-gold)', border: 'none', 
                                                 padding: '5px 12px', borderRadius: '6px', fontSize: '0.65rem', 
                                                 fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                                             }}>
                                             SELECT SLOT
                                         </button>
                                     )}
                                 </div>
                             ))}
                         </div>
                    </div>
                )}

                {appt.reason && (
                    <div style={{ 
                        padding: '10px 0', 
                        borderTop: '1px solid #f8fafc',
                        marginBottom: '10px'
                    }}>
                        <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '4px', letterSpacing: '1.5px' }}>Case Brief</span>
                        <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: '1.5', fontWeight: 500, color: '#334155' }}>{renderContentWithLinks(appt.reason)}</p>
                    </div>
                )}

                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '12px 18px', 
                    background: '#f8fafc',
                    borderRadius: '12px', 
                    border: '1px solid #f1f5f9'
                }}>
                    <div>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', display: 'block', marginBottom: '4px' }}>Consultation Fee</span>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>₹{price}</div>
                    </div>
                    {appt.discountPercent > 0 && (
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: 900, border: '1.5px solid #10b981', padding: '3px 10px', borderRadius: '20px' }}>-{appt.discountPercent}% OFF</span>
                        </div>
                    )}
                </div>

                <div className="appointment-card-actions" style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    
                    {/* Professional side actions */}
                    {(isExpert && !showRejectBox && ((status === 'PROPOSED' && !isInitiator) || (status === 'COUNTERED' && isInitiator))) && (
                        <>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn-appt-primary" style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '12px 8px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '0.7rem' }} onClick={() => wrappedAction('accept_with_discount')}>
                                    {loadingAction ? '...' : 'ACCEPT & DISCOUNT'}
                                </button>
                                <button className="btn-appt-primary" style={{ flex: 1, background: '#d4af37', color: 'white', border: 'none', padding: '12px 8px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '0.7rem' }} onClick={() => wrappedAction('accept')}>
                                    {loadingAction ? '...' : 'APPROVE PROPOSAL'}
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
                                <button className="btn-appt-secondary" style={{ flex: 1, color: '#64748b', borderColor: '#e2e8f0', background: 'transparent', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.7rem' }} onClick={() => setShowRescheduleForm(true)}>
                                    SUGGEST NEW TIME
                                </button>
                                <button className="btn-appt-secondary" style={{ flex: 1, color: '#ef4444', borderColor: '#ef4444', background: 'transparent', border: '1px solid #ef4444', padding: '10px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.7rem' }} onClick={() => setShowRejectBox(true)}>
                                    REJECT APPOINTMENT
                                </button>
                            </div>
                        </>
                    )}

                    {/* Rejection UI */}
                    {showRejectBox && (
                        <div className="animate-reveal" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <textarea 
                                placeholder="Provide a reason for rejection..." 
                                value={rejectionReason || ''}
                                onChange={e => setRejectionReason(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ef4444', fontSize: '0.8rem', outline: 'none' }}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn-appt-primary" style={{ background: '#ef4444', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 800, flex: 1, cursor: 'pointer' }} onClick={() => wrappedAction('reject', { reason: rejectionReason })}>
                                    {loadingAction ? 'REJECTING...' : 'CONFIRM REJECTION'}
                                </button>
                                <button className="btn-appt-secondary" style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #94a3b8', background: 'transparent', color: '#64748b', fontWeight: 700, cursor: 'pointer' }} onClick={() => setShowRejectBox(false)}>
                                    CANCEL
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Client side actions */}
                    {(!isExpert && ((status === 'PROPOSED' && !isInitiator) || (status === 'COUNTERED' && isInitiator))) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button className="btn-appt-primary" style={{ background: '#d4af37', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem', width: '100%' }} onClick={() => wrappedAction('accept')}>
                                {loadingAction ? 'CONFIRMING...' : 'CONFIRM APPOINTMENT'}
                            </button>
                            <button className="btn-appt-secondary" style={{ color: '#64748b', borderColor: '#e2e8f0', background: 'transparent', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem' }} onClick={() => setShowRescheduleForm(true)}>
                                SUGGEST NEW TIME
                            </button>
                        </div>
                    )}

                    {showRescheduleForm && (
                        <div style={{ marginTop: '15px', padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px', textTransform: 'uppercase' }}>Propose Alternate Slots</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {[1, 2, 3].map(num => (
                                    <div key={num} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '0.6rem', fontWeight: 700, color: '#64748b' }}>Slot {num}</label>
                                        <input 
                                            type="datetime-local" 
                                            value={newSlots[`slot${num}`]} 
                                            onChange={(e) => setNewSlots({...newSlots, [`slot${num}`]: e.target.value})}
                                            style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.75rem' }}
                                        />
                                    </div>
                                ))}

                                {isExpert && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '5px', padding: '10px', background: 'rgba(212, 175, 55, 0.05)', borderRadius: '10px', border: '1px solid rgba(212, 175, 55, 0.1)' }}>
                                        <label style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--elite-gold)', textTransform: 'uppercase' }}>Proposed Base Fee (Expert Payout)</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', fontWeight: 700 }}>₹</span>
                                            <input 
                                                type="number" 
                                                value={newSlots.newBaseFee || appt.baseFee || ''} 
                                                onChange={(e) => setNewSlots({...newSlots, newBaseFee: e.target.value})}
                                                style={{ width: '100%', padding: '8px 8px 8px 25px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 700 }}
                                                placeholder="e.g. 1500"
                                            />
                                        </div>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.6rem', color: '#64748b' }}>Client will see this as ₹{Math.round((parseFloat(newSlots.newBaseFee || appt.baseFee || 0)) * 1.2 + 50)} (incl. platform charges).</p>
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                    <button 
                                        className="btn-appt-primary" 
                                        style={{ flex: 1, background: '#0f172a', padding: '10px', fontSize: '0.75rem' }}
                                        onClick={async () => {
                                            if (!newSlots.slot1 || !newSlots.slot2 || !newSlots.slot3) {
                                                alert("Please provide all 3 proposal slots for effective negotiation.");
                                                return;
                                            }
                                            await wrappedAction('counter', newSlots);
                                            setShowRescheduleForm(false);
                                        }}
                                    >
                                        SEND PROPOSAL
                                    </button>
                                    <button 
                                        className="btn-appt-secondary" 
                                        style={{ flex: 1, padding: '10px', fontSize: '0.75rem' }}
                                        onClick={() => setShowRescheduleForm(false)}
                                    >
                                        CANCEL
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {status === 'CONFIRMED' && isExpert && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn-appt-primary" style={{ flex: 1, background: '#0f172a', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }} onClick={() => wrappedAction('initiate')}>
                                {loadingAction ? 'REQUESTING...' : 'REQUEST ESCROW PAYMENT'}
                            </button>
                            <button className="btn-appt-secondary" style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #d4af37', background: 'transparent', color: '#d4af37', fontWeight: 700, cursor: 'pointer' }} onClick={() => wrappedAction('initiate_free')}>
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
                                        style={{ flex: 2, background: '#10b981', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer' }} 
                                        onClick={() => {
                                            const baseJoinUrl = `https://meet.jit.si/${appt.roomId}`;
                                            const userName = user?.displayName || (isExpert ? "Professional Expert" : "LawEZY Client");
                                            
                                            // 🛡️ ROLE-BASED ROOM GOVERNANCE
                                            // Expert: Bypasses pre-join, manages lobby
                                            // Client: Enters lobby, awaits expert admission
                                            const rolespec = isExpert 
                                                ? `#config.prejoinPageEnabled=false&config.enableLobby=true&config.startWithAudioMuted=false&userInfo.displayName="${userName}"` 
                                                : `#config.prejoinPageEnabled=true&config.enableLobby=true&config.startWithAudioMuted=true&userInfo.displayName="${userName}"`;
                                            
                                            window.open(baseJoinUrl + rolespec, '_blank');
                                        }}
                                    >
                                        <span style={{ fontSize: '1.2rem' }}>🎥</span> {isExpert ? 'JOIN AS MODERATOR' : 'JOIN SECURE CONSULTATION'}
                                    </button>
                                    {isExpert && (
                                        <button className="btn-appt-secondary" style={{ flex: 1, borderColor: '#10b981', color: '#10b981', background: 'transparent', border: '1px solid #10b981', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }} onClick={() => wrappedAction('mark-completed')}>
                                            {loadingAction ? '...' : 'MARK COMPLETED'}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                isExpert && (
                                    <button className="btn-appt-primary" style={{ background: '#0f172a', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', width: '100%' }} onClick={() => wrappedAction('paid')}>
                                        {loadingAction ? 'CREATING...' : 'INITIATE VIDEO SESSION (CREATE ROOM)'}
                                    </button>
                                )
                            )}
                            {!appt.roomId && !isExpert && (
                                <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#059669' }}>
                                    Payment Verified. Awaiting Expert to initiate consultation room...
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

                    {status === 'AWAITING_PAYMENT' && isExpert && (
                        <div style={{ padding: '12px', background: 'rgba(212, 175, 55, 0.05)', borderRadius: '12px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#d4af37', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                            <div style={{ fontSize: '1.2rem', marginBottom: '5px' }}>💳</div>
                            AWAITING CLIENT DEPOSIT
                            <p style={{ margin: '4px 0 0', fontSize: '0.65rem', color: '#64748b' }}>The client is processing the escrow payment. Once secured, you can initiate the video session.</p>
                        </div>
                    )}

                    {(status === 'PROPOSED' || status === 'COUNTERED') && isInitiator && (
                        <div style={{ padding: '12px', background: 'rgba(0,0,0,0.03)', borderRadius: '12px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                             Awaiting confirmation from other party...
                        </div>
                    )}

                    {status === 'COMPLETION_REQUESTED' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {isExpert ? (
                                <div style={{ padding: '15px', background: 'rgba(212, 175, 55, 0.05)', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.2)', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.2rem', marginBottom: '5px' }}>⏳</div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--midnight-primary)' }}>AWAITING CLIENT CONFIRMATION</span>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.65rem', color: '#64748b' }}>Payout will be released automatically in 48h if not confirmed.</p>
                                </div>
                            ) : (
                                <button 
                                    className="btn-appt-primary" 
                                    style={{ 
                                        background: '#0f172a', 
                                        border: '1px solid #d4af37', 
                                        color: '#d4af37', 
                                        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)',
                                        padding: '16px',
                                        borderRadius: '12px',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                    onClick={() => wrappedAction('review')}
                                >
                                    {loadingAction ? 'RELEASING...' : '⭐ CONFIRM & RELEASE PAYMENT'}
                                </button>
                            )}
                        </div>
                    )}

                    {status === 'COMPLETED' && (
                        <div style={{ padding: '15px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', marginBottom: '5px' }}>✅</div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669' }}>SESSION COMPLETED</span>
                            <p style={{ margin: '4px 0 0', fontSize: '0.65rem', color: '#64748b' }}>Appointment archived in history.</p>
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

            {/* Wallet Insufficient Funds Popup */}
            {showWalletWarning && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div className="animate-reveal" style={{
                        background: '#fff',
                        borderRadius: '24px',
                        padding: '30px',
                        width: '100%',
                        maxWidth: '400px',
                        textAlign: 'center',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                        border: '1px solid rgba(212, 175, 55, 0.2)'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>💳</div>
                        <h2 style={{ margin: '0 0 10px 0', fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>Insufficient Balance</h2>
                        <p style={{ margin: '0 0 25px 0', fontSize: '0.9rem', color: '#64748b', lineHeight: '1.6' }}>
                            Your current wallet balance is <strong style={{ color: '#0f172a' }}>₹{walletBalance?.toLocaleString()}</strong>. 
                            This consultation requires <strong style={{ color: 'var(--elite-gold)' }}>₹{price?.toLocaleString()}</strong>.
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button 
                                onClick={() => navigate('/dashboard?tab=wallet')}
                                style={{ 
                                    padding: '16px', 
                                    borderRadius: '14px', 
                                    background: 'var(--midnight-primary)', 
                                    color: 'var(--elite-gold)', 
                                    border: '1px solid var(--elite-gold)', 
                                    fontWeight: 800, 
                                    fontSize: '0.9rem', 
                                    cursor: 'pointer',
                                    boxShadow: '0 8px 20px rgba(212, 175, 55, 0.15)'
                                }}
                            >
                                TOP UP WALLET & PROCEED
                            </button>
                            <button 
                                onClick={() => setShowWalletWarning(false)}
                                style={{ 
                                    padding: '12px', 
                                    borderRadius: '14px', 
                                    background: 'transparent', 
                                    color: '#64748b', 
                                    border: 'none', 
                                    fontWeight: 700, 
                                    fontSize: '0.85rem', 
                                    cursor: 'pointer' 
                                }}
                            >
                                CLOSE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppointmentCard;

