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
    {type === 'PHONE' ? 'Contact Information Redacted' : 'Third-Party Link Blocked - Use Secure Room'}
  </div>
);

/**
 * Replaces raw URLs and Phone Numbers in text with clickable tags or Security Badges.
 */
export const renderContentWithLinks = (text) => {
  if (!text) return '';
  
  // 1. PHONE NUMBER REDACTION (Indian & Global)
  const phoneRegex = /(\+?(?:91[\-\s]?)?[789]\d{9}|(?:\+?\d{1,3}[\-\s]?)?\(?\d{3}\)?[\-\s]?\d{3}[\-\s]?\d{4})/g;
  
  // 2. URL DETECTION
  const urlRegex = /((?:https?:\/\/|www\.)[^\s]+)/g;

  // 🛡️ INSTITUTIONAL SECURITY: Full Message Redaction if sensitive info found
  // We use .test() for performance and reset regex state if needed
  if (phoneRegex.test(text)) {
    return <SecurityBlockedBadge type="PHONE" />;
  }

  const urls = text.match(urlRegex);
  if (urls) {
    const isProhibited = urls.some(sub => {
      const lowerSub = sub.toLowerCase();
      return lowerSub.includes('meet.google.com') || 
             lowerSub.includes('zoom.us') || 
             lowerSub.includes('zoom.com') ||
             lowerSub.includes('teams.microsoft.com') || 
             lowerSub.includes('teams.live.com') ||
             lowerSub.includes('webex.com') ||
             lowerSub.includes('skype.com');
    });

    if (isProhibited) {
      return <SecurityBlockedBadge type="LINK" />;
    }
  }

  // Normal linkification for approved URLs
  let parts = [text];
  let newParts = [];
  
  parts.forEach(part => {
    if (typeof part !== 'string') {
      newParts.push(part);
      return;
    }
    const subParts = part.split(urlRegex);
    subParts.forEach((sub, idx) => {
      if (sub.match(urlRegex)) {
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
      } else if (sub) {
        newParts.push(sub);
      }
    });
  });

  return newParts;
};

/**
 * Returns a simple redacted string if sensitive info is found.
 * Ideal for sidebar previews.
 */
export const redactPlain = (text) => {
  if (!text) return '';
  const phoneRegex = /(\+?(?:91[\-\s]?)?[789]\d{9}|(?:\+?\d{1,3}[\-\s]?)?\(?\d{3}\)?[\-\s]?\d{3}[\-\s]?\d{4})/g;
  const urlRegex = /((?:https?:\/\/|www\.)[^\s]+)/g;

  if (phoneRegex.test(text)) return 'Contact Information Redacted';

  const urls = text.match(urlRegex);
  if (urls) {
    const isProhibited = urls.some(sub => {
      const lowerSub = sub.toLowerCase();
      return lowerSub.includes('meet.google.com') || 
             lowerSub.includes('zoom.us') || 
             lowerSub.includes('zoom.com') ||
             lowerSub.includes('teams.microsoft.com') || 
             lowerSub.includes('teams.live.com') ||
             lowerSub.includes('webex.com') ||
             lowerSub.includes('skype.com');
    });
    if (isProhibited) return 'Third-Party Link Blocked';
  }

  return text;
};

