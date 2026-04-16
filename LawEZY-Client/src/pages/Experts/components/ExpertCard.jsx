import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../../store/useAuthStore';
import './ExpertCard.css';

const ExpertCard = ({ expert, onViewProfile, onBookAppointment }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  // Multi-tier identity check to ensure self-engagement is blocked
  const isSelf = user?.uid === expert.uid || user?.id === expert.id || user?.uid === expert.id;
  
  return (
    <div className={`expert-card-v2 ${!expert.isVerified ? 'verification-locked' : ''}`} onClick={() => expert.isVerified && onViewProfile(expert.id)}>
      {!expert.isVerified && (
        <div className="verification-lock-overlay">
          <div className="lock-content">
            <div className="lock-icon">🔒</div>
            <h4>Audit Pending</h4>
            <p>This expert dossier is currently undergoing institutional verification.</p>
          </div>
        </div>
      )}
      <div className="card-header">
        <div className="avatar-wrapper">
          <img src={expert.avatar || 'https://via.placeholder.com/100'} alt={expert.name} />
          {expert.isVerified && (
            <div className="verified-badge-institutional" title="Institutional Verified Expert">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
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
             <span className="institutional-uid-badge">UID: {expert.uid || `LZY-${expert.id.substring(0, 8)}`}</span>
             {expert.location && <span className="expert-location-chip"><span className="loc-icon">📍</span> {expert.location}</span>}
          </div>
        </div>
        <div className="expert-rating-dock">
          <span className="star">★</span>
          <span className="rating-num">{expert.rating}</span>
        </div>
      </div>
      
      <div className="card-body">
        <p className="expert-bio-short">{expert.bioSmall || expert.bio || 'Specialized in multi-jurisdictional compliance and institutional counsel.'}</p>
        <div className="expert-pedigree-mini">
            {expert.educationList?.[0] && <span className="pedigree-item">🎓 {expert.educationList[0].degree}</span>}
        </div>
        <div className="expert-domains-tags">
          {(expert.domains || []).slice(0, 3).map(domain => (
            <span key={domain} className="domain-chip">{domain}</span>
          ))}
          {(expert.domains || []).length > 3 && <span className="domain-chip plus">+{(expert.domains || []).length - 3} More</span>}
        </div>
      </div>

      <div className="card-footer">
        <div className="price-info">
          <span className="price-label">Starts from</span>
          <span className="price-value">₹{expert.price || '499'} <span>/ session</span></span>
          <button 
            className="btn-book-institutional" 
            disabled={!expert.isVerified || isSelf}
            onClick={(e) => {
              e.stopPropagation();
              onBookAppointment && onBookAppointment(expert);
            }}
            title={isSelf ? "You cannot book appointments with yourself" : ""}
          >
            {isSelf ? "Self Profile" : "Book 1:1 Appointment"}
          </button>
        </div>
        <div className="expert-card-actions">
          <button className="btn-connect-expert-small" disabled={!expert.isVerified} onClick={() => onViewProfile(expert.id)}>{isSelf ? "Your Dossier" : "View Profile →"}</button>
          <button 
            className="btn-send-message-small"
            disabled={!expert.isVerified || isSelf}
            onClick={(e) => {
              e.stopPropagation();
              if (expert.isVerified && !isSelf) {
                navigate(`/messages?expertId=${expert.uid}&expertName=${encodeURIComponent(expert.name)}`);
              }
            }}
            title={isSelf ? "Messaging yourself is disabled" : ""}
          >
            Send Message
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpertCard;
