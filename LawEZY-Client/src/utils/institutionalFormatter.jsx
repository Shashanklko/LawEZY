import React from 'react';

/**
 * Renders a security blocked badge for prohibited domains.
 */
const SecurityBlockedBadge = ({ type }) => (
  <div className="security-block-badge animate-reveal" style={{
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    padding: '10px 15px',
    marginTop: '8px',
    marginBottom: '8px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    color: '#ef4444',
    fontSize: '0.85rem',
    fontWeight: 700,
    fontFamily: 'Outfit, sans-serif'
  }}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    {type === 'PHONE' ? 'Contact Redacted for Security' : 'External Link Blocked - Use Appointment Center'}
  </div>
);

/**
 * Replaces raw URLs and Phone Numbers in text with clickable tags or Security Badges.
 */
export const renderContentWithLinks = (text) => {
  if (!text) return '';
  
  // 1. PHONE NUMBER REDACTION (Indian & Global)
  // Catching 10 digit, +91, and spaces/dashes
  const phoneRegex = /(\+?(?:91[\-\s]?)?[789]\d{9}|(?:\+?\d{1,3}[\-\s]?)?\(?\d{3}\)?[\-\s]?\d{3}[\-\s]?\d{4})/g;
  
  // 2. URL DETECTION
  const urlRegex = /((?:https?:\/\/|www\.)[^\s]+)/g;

  // Split and process
  let parts = [text];

  // Process Phone Numbers first
  let newParts = [];
  parts.forEach(part => {
    if (typeof part !== 'string') {
      newParts.push(part);
      return;
    }
    const subParts = part.split(phoneRegex);
    subParts.forEach((sub, idx) => {
      if (sub.match(phoneRegex)) {
        newParts.push(<SecurityBlockedBadge key={`phone-${idx}`} type="PHONE" />);
      } else if (sub) {
        newParts.push(sub);
      }
    });
  });
  parts = newParts;

  // Process URLs
  newParts = [];
  parts.forEach(part => {
    if (typeof part !== 'string') {
      newParts.push(part);
      return;
    }
    const subParts = part.split(urlRegex);
    subParts.forEach((sub, idx) => {
      if (sub.match(urlRegex)) {
        const lowerSub = sub.toLowerCase();
        const isProhibited = lowerSub.includes('meet.google.com') || 
                             lowerSub.includes('zoom.us') || 
                             lowerSub.includes('zoom.com') ||
                             lowerSub.includes('teams.microsoft.com') || 
                             lowerSub.includes('teams.live.com') ||
                             lowerSub.includes('webex.com') ||
                             lowerSub.includes('skype.com');

        if (isProhibited) {
          newParts.push(<SecurityBlockedBadge key={`link-${idx}`} type="LINK" />);
        } else {
          const href = sub.startsWith('www.') ? `https://${sub}` : sub;
          newParts.push(
            <a 
              key={`url-${idx}`} 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ color: 'var(--elite-gold)', textDecoration: 'underline', fontWeight: 600, wordBreak: 'break-all' }}
            >
              {sub}
            </a>
          );
        }
      } else if (sub) {
        newParts.push(sub);
      }
    });
  });

  return newParts;
};


