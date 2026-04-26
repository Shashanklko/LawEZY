import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import useAuthStore from '../../store/useAuthStore';
import './ExpertProfile.css';

const ExpertProfile = ({ expertId, isModal }) => {
  const { id: paramId, slug } = useParams();
  const id = expertId || paramId;
  const navigate = useNavigate();
  const { user, viewMode } = useAuthStore();
  const [expert, setExpert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isSelf = user?.id === expert?.id;
  const [activeTab, setActiveTab] = useState('summary');
  const heroRef = useRef(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  
  // Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingData, setBookingData] = useState({
    date: '',
    time: '',
    reason: '',
    discountPercent: 0
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isModal) {
      window.scrollTo(0, 0);
    }
    
    const fetchExpert = async () => {
      try {
        setLoading(true);
        setError(null);
        // Institutional Logic: Use public endpoint for slugs, private for internal IDs
        const endpoint = slug ? `/api/public/p/${slug}` : `/api/professionals/${id}`;
        const response = await apiClient.get(endpoint);
        setExpert(response.data);
      } catch (err) {
        console.error('Error fetching expert profile:', err);
        setError("Institutional Handshake Failed: Dossier not found or unauthorized.");
        if (!isModal) {
            setTimeout(() => navigate('/experts'), 3000);
        }
      } finally {
        setLoading(false);
      }
    };

    if (id || slug) {
      fetchExpert();
    }
  }, [id, slug, navigate, isModal]);

  useEffect(() => {
    if (expert) {
        const originalTitle = document.title;
        document.title = `${expert.name} | ${expert.category} Professional | LawEZY Elite Dossier`;
        
        // Institutional Vanity Redirect: If we arrived via UID but have a slug, switch to Name-URL
        if (expert.slug && !slug) {
            navigate(`/p/${expert.slug}`, { replace: true });
        }
        
        return () => { document.title = originalTitle; };
    }
  }, [expert, slug, navigate]);

  const handleShare = () => {
    // Priority: Copy the current URL (which is now auto-redirected to the Name-Based vanity path)
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert("Institutional Dossier Link Copied to Clipboard! You can now share this on LinkedIn or professional networks.");
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Please login to book an institutional consultation.");
      navigate('/login');
      return;
    }

    try {
      setIsSubmitting(true);
      const scheduledAt = `${bookingData.date}T${bookingData.time}`;
      
      const payload = {
        clientId: user.id || user.id,
        expertId: expert.id || expert.id,
        initiatorId: user.id || user.id,
        baseFee: expert.consultationFee || 499.0,
        scheduledAt: scheduledAt,
        reason: bookingData.reason,
        discountPercent: parseFloat(bookingData.discountPercent)
      };

      await apiClient.post('/api/appointments/propose', payload);
      alert(`Institutional Proposal Dispatched to ${expert.name}. Institutional tracking active in your dashboard.`);
      setShowBookingModal(false);
      navigate('/dashboard');
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || "Institutional handshake failed.";
      alert(`Booking Error: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };



  useEffect(() => {
    if (!heroRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyBar(!entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    
    observer.observe(heroRef.current);
    
    return () => observer.disconnect();
  }, [expert]);

  if (loading) return (
    <div className="loading-state">
      <div className="loader-institutional"></div>
      Initializing Institutional Profile...
    </div>
  );

  if (error || !expert) return (
    <div className="error-state-elite" style={{ padding: '100px 20px', textAlign: 'center', background: 'var(--heritage-parchment)', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
       <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⚠️</div>
       <h2 style={{ fontFamily: 'Spectral', fontSize: '2rem', marginBottom: '10px' }}>Dossier Unavailable</h2>
       <p style={{ opacity: 0.7, marginBottom: '30px', maxWidth: '400px' }}>{error || "The professional dossier you are attempting to access could not be retrieved from the institutional archives."}</p>
       <button onClick={() => isModal ? window.location.reload() : navigate('/experts')} className="btn-secondary-msg">
         {isModal ? "Retry Handshake" : "Return to Expert Network"}
       </button>
    </div>
  );

  return (
    <div className={`expert-profile-page ${isModal ? 'is-in-modal' : ''}`}>
      <div className="profile-hero" ref={heroRef}>
        {!isModal && (
          <button className="btn-back-circle" onClick={() => navigate(-1)} aria-label="Go Back">←</button>
        )}
        
        <div className="profile-hero-content">
          <div className="profile-header-main">
            <div className="profile-avatar-large">
              <div className="avatar-wrapper-elite">
                <div className="letter-avatar" style={{ background: 'var(--midnight-primary)', color: 'var(--elite-gold)', width: '120px', height: '120px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '3rem', border: '4px solid var(--elite-gold)', boxShadow: '0 15px 35px rgba(0,0,0,0.2)' }}>
                  {(expert.name || 'P')[0].toUpperCase()}
                </div>
                <span className={`status-badge ${expert.online ? 'online' : 'offline'}`}>
                  {expert.online ? 'AVAILABLE NOW' : 'OFFLINE'}
                </span>
              </div>
              <div className="expert-stats-row-header">
                <span className="rating-v">★ {Number(expert.rating || 0).toFixed(1)}</span>
                <span className="rating-l">INSTITUTIONAL RATING</span>
              </div>
            </div>
            
            <div className="profile-info-primary">
              <div className="badge-expert-type">{expert.category} Professional</div>
              <h1>{expert.name}</h1>
              <p className="expert-designation">{expert.title || 'Institutional Advisor'} • {expert.experience || 'New'} Experience</p>
              
              <div className="expert-meta-markers">
                <span className="marker-item">🆔 {expert.id || `LZY-${expert.id.substring(0, 8)}`}</span>
                <span className="marker-divider">|</span>
                <span className="marker-item">📍 {(expert.location || 'India').split(',')[0]}</span>
                {expert.isVerified ? (
                  <>
                    <span className="marker-divider">|</span>
                    <span className="marker-item verified-premium-stamp">
                      <span className="badge-icon-verified">🛡️</span>
                      VERIFIED LICENSE: {expert.licenseNo} 
                    </span>
                  </>
                ) : (
                  <>
                    <span className="marker-divider">|</span>
                    <span className="marker-item pending-verification">
                      <span className="badge-icon-pending">⏳</span>
                      LICENSE PENDING VERIFICATION
                    </span>
                  </>
                )}
              </div>

              {expert.languages && expert.languages.length > 0 && (
                <div className="expert-languages-row">
                  <span className="lang-label">Languages:</span>
                  {expert.languages.map(lang => (
                    <span key={lang} className="lang-tag">{lang}</span>
                  ))}
                </div>
              )}

              <div className="profile-actions-container">
                {isSelf ? (
                   <div className="self-view-actions-banner animate-reveal">
                      <div className="preview-indicator">
                        <span className="icon">🛡️</span> THIS IS YOUR PUBLIC Dossier PREVIEW
                      </div>
                      <button className="btn-primary-consult" onClick={() => navigate('/profile')}>
                        Manage My Dossier & Credentials →
                      </button>
                   </div>
                ) : (
                  <div className="institutional-action-grid animate-reveal">
                    <div className="booking-fee-card">
                        <span className="fee-label">CONSULTATION FEE</span>
                        <div className="fee-value-row">
                          <span className="fee-amount">₹{Math.round((expert.consultationFee || 499) * 1.2 + 50)}</span>
                          <span className="fee-tag">ALL INCL.</span>
                        </div>
                        <span className="fee-breakdown">₹{expert.consultationFee || 499} Expert + Governance Charges</span>
                    </div>

                    <div className="booking-fee-card text-fee-card">
                        <span className="fee-label">TEXT MESSAGE</span>
                        <div className="fee-value-row">
                          <span className="fee-amount small-fee">₹{expert.textChatFee || 100}</span>
                          <span className="fee-tag">/ 10m</span>
                        </div>
                        <span className="fee-breakdown trial-tag">🎁 5-MIN FREE TRIAL</span>
                    </div>



                    <div className="action-buttons-group">
                      <button className="btn-primary-consult" onClick={() => setShowBookingModal(true)}>
                        Book 1:1 Consultation
                        <span className="btn-arrow">→</span>
                      </button>
                      
                    <div className="secondary-actions-row">
                      {viewMode === 'CLIENT' && !isSelf && (
                        <button className="btn-secondary-msg" onClick={() => navigate(`/messages?expertId=${expert.id}&expertName=${encodeURIComponent(expert.name)}`)}>
                          Send Message
                        </button>
                      )}
                    </div>
                    
                    <button className="btn-share-dossier" onClick={handleShare} title="Copy Public Dossier Link" style={{ width: '100%', marginTop: '10px' }}>
                      <span className="icon">🔗</span> Share Public Dossier
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>

      <div className="profile-body-container">
        <nav className="profile-tabs">
          <button className={activeTab === 'summary' ? 'active' : ''} onClick={() => setActiveTab('summary')}>Professional Summary</button>
          <button className={activeTab === 'journey' ? 'active' : ''} onClick={() => setActiveTab('journey')}>Professional Journey</button>
          <button className={activeTab === 'experience' ? 'active' : ''} onClick={() => setActiveTab('experience')}>Experience Snapshot</button>
          <button className={activeTab === 'expertise' ? 'active' : ''} onClick={() => setActiveTab('expertise')}>Specialized Domains</button>
          <button className={activeTab === 'reviews' ? 'active' : ''} onClick={() => setActiveTab('reviews')}>Client Testimonials</button>
        </nav>

        <div className="tab-content">
          {(activeTab === 'summary' || activeTab === 'bio') && (
            <div className="bio-section animate-reveal">
              <div className="bio-split-layout">
                <div className="bio-text-main">
                  <h3>Professional Summary & Strategy</h3>
                  <p>{expert.bio || expert.bioSmall || 'Institutional professional at LawEZY Elite Network.'}</p>
                </div>

                <div className="bio-credentials-sidebar">
                  <div className="credentials-list">
                    <h4>Institutional Pedigree</h4>
                    {expert.educationList && expert.educationList.length > 0 ? (
                      <ul>
                         {expert.educationList.map((edu, idx) => (
                          <li key={idx}>
                             <strong>{edu.degree || 'Institutional Milestone'}</strong> | {edu.institute || 'Pending Record'} | {edu.year || 'N/A'}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="no-data-hint">Academic records pending synchronization.</p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'journey' && (
            <div className="journey-section animate-reveal">
              <h3>Professional Trajectory</h3>
              <div className="career-roadmap">
                <div className="roadmap-timeline">
                  {expert.experienceList && expert.experienceList.length > 0 ? (
                    expert.experienceList.map((job, idx) => (
                      <div key={idx} className="roadmap-item">
                        <div className="roadmap-marker"></div>
                        <div className="roadmap-content">
                          <span className="job-period">{job.start} - {job.end || 'Present'}</span>
                          <strong>{job.designation}</strong>
                          <span>{job.company}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="no-data-hint">Professional journey records pending synchronization.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'experience' && (
            <div className="experience-section animate-reveal">
              <h3 className="section-title-premium">Professional Proof & Achievement Gallery</h3>
              <p className="section-subtitle-premium">Direct documentation of legal/financial milestones and successful case snapshots.</p>

              {expert.snapshots && expert.snapshots.length > 0 ? (
                <div className="snapshots-display-grid">
                  {expert.snapshots.map((snap, idx) => (
                    <div key={idx} className="snapshot-card-premium">
                      <div className="snapshot-media-frame">
                        <img 
                          src={typeof snap === 'string' ? snap : (snap.url || snap.link)} 
                          alt={typeof snap === 'string' ? `Professional Milestone ${idx + 1}` : (snap.title || 'Institutional Record')} 
                          onError={(e) => { e.target.src = 'https://plus.unsplash.com/premium_photo-1661274154817-f5da1759600a?q=80&w=2070&auto=format&fit=crop'; }}
                        />
                      </div>
                      <div className="snapshot-info-overlay">
                        <h4>{snap.title || (typeof snap === 'string' ? 'Institutional Milestone' : 'Case Achievement')}</h4>
                        <p>{snap.category ? (snap.category === 'CASE' ? 'Verified Case Record' : snap.category) : 'Institutional Record'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state-container-premium">
                  <div className="empty-icon-box">🏛️</div>
                  <h4>No Snapshots Available</h4>
                  <p>This expert has not yet uploaded public credentials or case snapshots to their dossier.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'expertise' && (
            <div className="expertise-section animate-reveal">
              <h3>Core Specialized Domains</h3>
              <div className="expertise-grid">
                {(expert.domains || []).map(domain => (
                  <div key={domain} className="expertise-item">
                    <span className="check-icon">◈</span>
                    <div className="expertise-text">
                      <strong>{domain}</strong>
                      <p>Institutional-grade counsel and institutional execution in this high-impact domain.</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="reviews-section animate-reveal">
              <div className="reviews-header-group">
                <h3>Verified Client Testimonials</h3>
                <p className="section-subtitle">Direct feedback on institutional execution and professional satisfaction.</p>
              </div>

              <div className="reviews-list-v2">
                {expert.testimonials?.length > 0 ? (
                  expert.testimonials.map((test, idx) => (
                    <div key={idx} className="review-card-premium">
                      <div className="review-meta-header">
                        <div className="meta-left">
                          <strong className="reviewer-name">{test.clientName}</strong>
                          <span className="review-date">{new Date(test.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="meta-right">
                          <span className="review-rating-star">★ {test.rating?.toFixed(1)}</span>
                        </div>
                      </div>

                      <div className="review-content-single">
                        <p className="review-text-elite">
                            {test.comment ? `"${test.comment}"` : <em>Initial institutional rating submitted without comment.</em>}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-reviews-state">
                    <p>No verified reviews for this expert yet. Be among the first to leave feedback after your consultation.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showStickyBar && (
        <div className="sticky-action-bar animate-reveal-up">
          <div className="sticky-bar-content">
            <div className="sticky-expert-info">
              <div className="sticky-avatar-letter" style={{ background: 'var(--midnight-primary)', color: 'var(--elite-gold)', width: '35px', height: '35px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', border: '1px solid var(--elite-gold)', marginRight: '10px' }}>
                {(expert.name || 'P')[0].toUpperCase()}
              </div>
              <div className="sticky-text">
                <strong>{expert.name}</strong>
                <span>{expert.price ? `₹${expert.price}/session` : 'Value-Based Pricing'}</span>
              </div>
            </div>
            <div className="sticky-actions">
              {isSelf ? (
                 <button className="btn-primary-consult" onClick={() => navigate('/profile')}>Edit My Profile</button>
              ) : (
                <>
                  {viewMode !== 'EXPERT' && (
                    <button className="btn-secondary-msg" onClick={() => navigate(`/messages?expertId=${expert.id}&expertName=${encodeURIComponent(expert.name)}`)}>Message</button>
                  )}
                  <button className="btn-primary-consult" onClick={() => setShowBookingModal(true)}>Book Consultation →</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Booking Modal */}
      {showBookingModal && (
        <div className="modal-overlay-premium" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowBookingModal(false)}>
          <div className="booking-modal-card animate-reveal-up" style={{ background: 'var(--heritage-parchment)', width: '100%', maxWidth: '450px', borderRadius: '24px', padding: '35px', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.4)', border: '1px solid var(--glass-border)' }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--midnight-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', color: 'var(--elite-gold)', fontSize: '1.5rem', boxShadow: '0 8px 20px rgba(13, 27, 42, 0.2)' }}>⚖️</div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, color: 'var(--midnight-primary)', margin: 0 }}>Secure 1:1 Booking</h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '5px' }}>Initiating institutional consultation with {expert.name}</p>
            </div>

            <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '15px' }}>
                <div className="input-field-group">
                  <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>Preferred Date</label>
                  <input 
                    required 
                    type="date" 
                    min={new Date().toISOString().split('T')[0]}
                    value={bookingData.date}
                    onChange={e => setBookingData({...bookingData, date: e.target.value})}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
                <div className="input-field-group">
                  <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>Time</label>
                  <input 
                    required 
                    type="time" 
                    value={bookingData.time}
                    onChange={e => setBookingData({...bookingData, time: e.target.value})}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div className="input-field-group">
                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>Reason for Consultation</label>
                <textarea 
                  required 
                  placeholder="Briefly describe your legal or financial requirement..."
                  value={bookingData.reason || ''}
                  onChange={e => setBookingData({...bookingData, reason: e.target.value})}
                  rows={3}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '0.9rem', outline: 'none', resize: 'none' }}
                />
              </div>

              <div className="input-field-group" style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '15px', borderRadius: '14px', border: '1px dashed rgba(16, 185, 129, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '1px' }}>Institutional Negotiation</label>
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#059669' }}>{bookingData.discountPercent}% Discount</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="10" 
                  step="1"
                  value={bookingData.discountPercent}
                  onChange={e => setBookingData({...bookingData, discountPercent: e.target.value})}
                  style={{ width: '100%', height: '6px', background: '#d1fae5', borderRadius: '5px', outline: 'none', cursor: 'pointer' }}
                />
                <div style={{ fontSize: '0.6rem', color: '#64748b', marginTop: '8px', fontStyle: 'italic' }}>Requested Fee: ₹{Math.round((expert.consultationFee || 499) * (1 - bookingData.discountPercent/100))} + Platform Fee</div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowBookingModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#e2e8f0', color: '#475569', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}>Abstain</button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 2, padding: '14px', borderRadius: '12px', border: 'none', background: 'var(--midnight-primary)', color: 'var(--elite-gold)', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 8px 15px rgba(13, 27, 42, 0.2)', transition: 'all 0.2s' }}>
                  {isSubmitting ? 'Dispatching...' : 'Submit Institutional Request →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      
    </div>
  );
};

export default ExpertProfile;

