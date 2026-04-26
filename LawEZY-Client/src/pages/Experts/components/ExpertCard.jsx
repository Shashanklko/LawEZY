import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../../store/useAuthStore';
import './ExpertCard.css';

const ExpertCard = ({ expert, onViewProfile, onBookAppointment }) => {
  const navigate = useNavigate();
  const { user, viewMode } = useAuthStore();
  
  // High-fidelity identity resolution
  const isSelf = user && (user.id === expert.id);
  
  return (
    <div className={`expert-card-v2 ${!expert.isVerified ? 'verification-locked' : ''}`} onClick={() => expert.isVerified && onViewProfile(expert)}>
      {!expert.isVerified && (
        <div className="verification-lock-overlay">
          <div className="lock-content">
            <div className="lock-icon">L</div>
            <h4>Audit Pending</h4>
            <p>Verification in progress.</p>
          </div>
        </div>
      )}
      
      <div className="card-header">
        <div className="avatar-wrapper">
          <div className="letter-avatar" style={{ background: 'var(--midnight-primary)', color: 'var(--elite-gold)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.4rem', border: '2px solid var(--elite-gold)' }}>
            {(expert.name || 'P')[0].toUpperCase()}
          </div>
          {expert.isVerified && (
            <div className="verified-badge-institutional" title="Institutional Verified">
              <span style={{ fontSize: '12px' }}>V</span>
            </div>
          )}
        </div>
        
        <div className="expert-meta-header">
          <div className="title-exp-row">
            <span className="expert-title">{expert.title || 'Institutional Advisor'}</span>
            <span className="expert-experience-tag">{expert.experience || 'NEW'} EXP</span>
          </div>
          <h3 className="expert-name-institutional">{expert.name}</h3>
          <div className="card-institutional-badges">
             <span className="institutional-uid-badge">ID: {expert.id?.substring ? expert.id.substring(0, 8) : expert.id}</span>
             {expert.location && <span className="expert-location-chip">📍 {expert.location}</span>}
          </div>
        </div>
        
        <div className="expert-rating-dock">
          <span className="star">★</span>
          <span className="rating-num">{Number(expert.rating || 0).toFixed(1)}</span>
        </div>
      </div>
      
      <div className="card-body">
        <p className="expert-bio-short">{expert.bioSmall || expert.bio || 'Specialized institutional counsel.'}</p>
        <div className="expert-domains-tags">
          {(expert.domains || []).slice(0, 3).map(domain => (
            <span key={domain} className="domain-chip">{domain}</span>
          ))}
          {(expert.domains || []).length > 3 && <span className="domain-chip plus">+{expert.domains.length - 3}</span>}
        </div>
      </div>

      <div className="card-footer">
        <button 
          className="btn-book-institutional full-width" 
          disabled={!expert.isVerified || isSelf}
          onClick={(e) => {
            e.stopPropagation();
            onBookAppointment && onBookAppointment(expert);
          }}
        >
          {isSelf ? "Self Profile" : "Book 1:1 Appointment"}
        </button>
        
        <div className="footer-secondary-actions">
            <button className="btn-secondary profile-btn" onClick={(e) => { e.stopPropagation(); navigate(`/expert/${expert.id}`); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4-4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                Profile
            </button>
            {!isSelf && viewMode !== 'EXPERT' && (
                <button className="btn-secondary message-btn" onClick={(e) => { e.stopPropagation(); navigate(`/messages?expertId=${expert.id}&expertName=${encodeURIComponent(expert.firstName || expert.name)}`); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    Message
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default ExpertCard;
