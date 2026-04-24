import React from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import './Institutional.css';

const JoinNetwork = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleApplyClick = () => {
    if (user) {
      // If already logged in, take them to their command center
      navigate('/dashboard');
    } else {
      // If new, take them to the onboarding gateway with expert intent
      navigate('/signup?role=expert');
    }
  };

  const scrollToRevenue = () => {
    const section = document.querySelector('.inst-revenue-ecosystem');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="institutional-page join-network">
      <div className="noise-overlay"></div>

      <section className="inst-hero">
        <div className="inst-hero-content">
          <span className="inst-tag">Institutional Onboarding</span>
          <h1>Join the <span>Professional Elite</span></h1>
          <p className="hero-sub">
            The premium infrastructure for legal and financial masters. 
            Scale your practice with automated governance and elite institutional client flow.
          </p>
          <div className="inst-hero-actions">
            <button className="inst-btn-primary" onClick={handleApplyClick}>Apply for Credentials</button>
            <button className="inst-btn-secondary" onClick={scrollToRevenue}>Explore Revenue Tiers</button>
          </div>
        </div>
      </section>

      <section className="inst-value-prop">
        <div className="inst-container">
          <div className="prop-header">
            <h2 className="section-title">The Institutional Edge</h2>
            <p className="section-subtitle">Why the most successful advocates and consultants choose LawEZY.</p>
          </div>

          <div className="inst-grid">
            <div className="inst-card">
              <div className="card-badge">EFFICIENCY</div>
              <div className="card-icon">⚡</div>
              <h3>Automated Practice</h3>
              <p>Eliminate administrative friction. Our platform handles scheduling, initial documentation, and client screening so you focus purely on expertise.</p>
              <ul className="card-list">
                <li>Automated Slot Booking</li>
                <li>Secure Virtual Chambers</li>
                <li>Digital Audit Trails</li>
              </ul>
            </div>

            <div className="inst-card">
              <div className="card-badge">FINANCIALS</div>
              <div className="card-icon">💎</div>
              <h3>Guaranteed Payouts</h3>
              <p>Stop chasing invoices. Every consultation is secured via institutional escrow. Funds are liquidated directly to your ledger upon completion.</p>
              <ul className="card-list">
                <li>Instant Escrow Locking</li>
                <li>Weekly Bank Liquidation</li>
                <li>Zero Payment Disputes</li>
              </ul>
            </div>

            <div className="inst-card">
              <div className="card-badge">BRANDING</div>
              <div className="card-icon">🏛️</div>
              <h3>Digital Authority</h3>
              <p>Elevate your footprint. Your LawEZY profile is optimized for institutional search, positioning you as a thought leader in your domain.</p>
              <ul className="card-list">
                <li>Professional SEO Profile</li>
                <li>Expert Verification Badge</li>
                <li>Published Insight Hub</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      <section className="inst-revenue-ecosystem">
        <div className="inst-container">
          <div className="prop-header">
            <h2 className="section-title">Revenue Ecosystem</h2>
            <p className="section-subtitle">Multiple high-yield channels to monetize your professional expertise.</p>
          </div>

          <div className="revenue-grid">
            <div className="revenue-item" onClick={handleApplyClick} style={{ cursor: 'pointer' }}>
              <div className="rev-icon">📅</div>
              <div className="rev-info">
                <h4>Premium Consultations</h4>
                <p>Set your own hourly rates for scheduled high-stakes appointments. Full escrow security for every session.</p>
                <span className="rev-tag">High Yield</span>
              </div>
            </div>

            <div className="revenue-item" onClick={handleApplyClick} style={{ cursor: 'pointer' }}>
              <div className="rev-icon">💬</div>
              <div className="rev-info">
                <h4>Instant Messenger</h4>
                <p>Monetize quick advice with 10-minute and 20-minute paid chat windows. Ideal for high-volume client flow.</p>
                <span className="rev-tag">High Volume</span>
              </div>
            </div>

            <div className="revenue-item" onClick={handleApplyClick} style={{ cursor: 'pointer' }}>
              <div className="rev-icon">📄</div>
              <div className="rev-info">
                <h4>Document Audits</h4>
                <p>Receive fixed-fee mandates for auditing contracts, notices, and legal agreements through our secure portal.</p>
                <span className="rev-tag">Fixed Fee</span>
              </div>
            </div>

            <div className="revenue-item" onClick={handleApplyClick} style={{ cursor: 'pointer' }}>
              <div className="rev-icon">🏢</div>
              <div className="rev-info">
                <h4>Corporate Retainers</h4>
                <p>Connect with institutional clients for long-term advisory roles and recurring monthly retainerships.</p>
                <span className="rev-tag">Recurring</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="inst-onboarding">
        <div className="inst-container">
          <h2 className="section-title">Onboarding Protocol</h2>
          <div className="onboarding-steps">
            <div className="step-item">
              <div className="step-meta">
                <span className="step-number">STEP 01</span>
                <div className="step-line"></div>
              </div>
              <h4>Vetting & Verification</h4>
              <p>Submit your bar credentials or professional licenses. Our compliance team verifies all institutional entrants within 48 hours.</p>
            </div>

            <div className="step-item">
              <div className="step-meta">
                <span className="step-number">STEP 02</span>
                <div className="step-line"></div>
              </div>
              <h4>Infrastructure Setup</h4>
              <p>Configure your digital chambers, set your consultation fees (10m/20m windows), and link your institutional payout wallet.</p>
            </div>

            <div className="step-item">
              <div className="step-meta">
                <span className="step-number">STEP 03</span>
                <div className="step-line"></div>
              </div>
              <h4>Market Activation</h4>
              <p>Go live in the LawEZY Network. Start receiving mandates, participate in community discussions, and scale your professional earnings.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="inst-cta">
        <div className="cta-glass">
          <div className="cta-content">
            <h2>Redefine Your Professional Legacy</h2>
            <p>LawEZY is a selective network. We only accept the top 5% of applicants to ensure institutional quality.</p>
            <div className="cta-actions">
              <button className="inst-btn-primary" onClick={handleApplyClick}>Start Secure Application</button>
              <span className="cta-note">Bar Council/Professional Registration Mandatory.</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default JoinNetwork;
