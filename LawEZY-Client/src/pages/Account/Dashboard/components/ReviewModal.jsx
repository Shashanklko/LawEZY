import React, { useState } from 'react';
import apiClient from '../../../../services/apiClient';

const ReviewModal = ({ appointment, onClose, onSuccess }) => {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            alert("Institutional Protocol: Please provide a star rating to proceed.");
            return;
        }

        try {
            setLoading(true);
            await apiClient.post('/api/appointments/review', {
                appointmentId: appointment.id,
                rating,
                comment,
                isAnonymous
            });
            onSuccess();
        } catch (err) {
            alert("Strategic Error: Failed to submit feedback ledger.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="institutional-modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(13, 27, 42, 0.8)', backdropFilter: 'blur(8px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <div className="review-modal-card" style={{
                background: 'white', borderRadius: '30px', width: '100%', maxWidth: '450px',
                padding: '40px', boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                border: '1px solid rgba(212, 175, 55, 0.2)', position: 'relative'
            }}>
                <button onClick={onClose} style={{
                    position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'none',
                    fontSize: '1.5rem', cursor: 'pointer', color: '#64748b'
                }}>&times;</button>

                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🏛️</div>
                    <h2 style={{ margin: 0, fontWeight: 900, fontSize: '1.6rem', color: 'var(--midnight-primary)' }}>Finalize Session</h2>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '8px', fontWeight: 600 }}>
                        Consultation with {appointment.expertName || 'Expert'}
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '30px', textAlign: 'center' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--midnight-primary)', marginBottom: '15px' }}>
                            Strategic Performance Rating
                        </label>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHover(star)}
                                    onMouseLeave={() => setHover(0)}
                                    style={{
                                        background: 'none', border: 'none', fontSize: '2.5rem', cursor: 'pointer',
                                        color: (hover || rating) >= star ? '#FFD700' : '#e2e8f0',
                                        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        transform: (hover || rating) >= star ? 'scale(1.15)' : 'scale(1)',
                                        padding: 0
                                    }}
                                >
                                    ★
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--midnight-primary)', marginBottom: '10px' }}>
                            Professional Testimonial (Optional)
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Share your institutional experience..."
                            style={{
                                width: '100%', minHeight: '120px', padding: '15px', borderRadius: '15px',
                                border: '2px solid #edf2f7', outline: 'none', fontSize: '0.9rem', color: '#2d3748',
                                transition: 'all 0.3s ease', boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px', background: 'rgba(13, 27, 42, 0.03)', padding: '12px 20px', borderRadius: '14px' }}>
                        <input
                            type="checkbox"
                            id="anon-toggle"
                            checked={isAnonymous}
                            onChange={(e) => setIsAnonymous(e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--midnight-primary)' }}
                        />
                        <label htmlFor="anon-toggle" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4a5568', cursor: 'pointer' }}>
                            Remain Anonymous on Expert's Portfolio
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || rating === 0}
                        className="btn-save-profile"
                        style={{
                            width: '100%', margin: 0, padding: '18px', borderRadius: '16px',
                            background: rating === 0 ? '#cbd5e0' : 'var(--midnight-primary)',
                            color: 'var(--strategic-gold)', fontWeight: 900, cursor: rating === 0 ? 'not-allowed' : 'pointer',
                            fontSize: '1rem', border: '1px solid var(--strategic-gold)',
                            boxShadow: rating === 0 ? 'none' : '0 10px 25px rgba(212, 175, 55, 0.2)'
                        }}
                    >
                        {loading ? 'Finalizing Protocol...' : 'Confirm & Finalize Session'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ReviewModal;
