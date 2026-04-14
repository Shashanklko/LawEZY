import React from 'react';
import './About.css';

const About = () => {
  return (
    <div className="about-page">
      {/* HERO: THE UNIFIED BRIDGE */}
      <section className="about-hero">
        <div className="hero-overlay">
          <span className="hero-subtitle">The Ecosystem for Strategic Justice</span>
          <h1>Connecting <span>Seekers with Expertise</span>.</h1>
        </div>
      </section>

      {/* DUAL PATHWAYS: THE LAWEZY ECOSYSTEM */}
      <section className="about-grid-section">
        <div className="dual-pathway-container">
          {/* PATH 1: FOR SEEKERS */}
          <div className="pathway-card seekers">
            <span className="section-tag">Seeking Advice?</span>
            <h2>Doorstep Legal Care</h2>
            <p>We bring world-class <strong>Lawyers, CAs, and CFAs</strong> directly to you. Whether you are a <strong>Senior Citizen</strong> needing home-based counsel, an <strong>Individual or Family</strong> seeking expert guidance, or a <strong>Student Founder</strong> building a startup—we've simplified the journey for you.</p>
            <ul className="pathway-features">
              <li>✓ Elite Lawyers at a Click</li>
              <li>✓ Zero Travel, Total Comfort</li>
              <li>✓ AI-Powered Case Summaries</li>
              <li>✓ Verified CAs & CFAs</li>
            </ul>
          </div>

          {/* PATH 2: FOR PROFESSIONALS */}
          <div className="pathway-card professionals">
            <span className="section-tag">Ready to Serve?</span>
            <h2>Your Digital Command Center</h2>
            <p>LawEZY empowers <strong>Lawyers, CAs, and CFAs</strong> to reach clients they never could before. Manage your entire practice from a high-velocity digital office with zero infrastructure costs.</p>
            <ul className="pathway-features">
              <li>✓ Global Client Reach</li>
              <li>✓ High-Authority AI Workspace</li>
              <li>✓ Zero Logistics Fatigue</li>
              <li>✓ Strategic Case Management</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CORE VISION: THE SEAMLESS BRIDGE */}
      <section className="mission-horizontal">
        <div className="mission-wrapper">
          <span className="section-tag">Our Unified Vision</span>
          <h2>"Building a future where legal and financial expertise is as accessible as a conversation, and every professional is empowered to excel without borders."</h2>
          <p>We are the definitive bridge between a complex challenge and a strategic solution.</p>
        </div>
      </section>

      {/* WHY LAWEZY: THE THREE-WAY WIN */}
      <section className="pillars-section">
        <span className="section-tag">The LawEZY Advantage</span>
        <h2>A Strategic <span>Cycle of Excellence</span></h2>
        
        <div className="pillars-grid">
          <div className="pillar-card">
            <span className="pillar-icon">⚖️</span>
            <h3>Senior-First Inclusion</h3>
            <p>Ensuring that our elders can resolve legal and estate matters with dignity, without the physical hardship of courthouse travel to find a <strong>Lawyer</strong>.</p>
          </div>
          
          <div className="pillar-card">
            <span className="pillar-icon">🎓</span>
            <h3>Next-Gen Founders</h3>
            <p>Fueling the student-startup ecosystem by providing the necessary legal and financial rails to turn vision into institutional reality.</p>
          </div>
          
          <div className="pillar-card">
            <span className="pillar-icon">🏛️</span>
            <h3>Elite Professional Growth</h3>
            <p>Giving <strong>Lawyers</strong> and CAs the tools to scale their practice internationally, focusing on deep strategic work rather than logistical drudgery.</p>
          </div>
        </div>
      </section>

      {/* VALUES: THE STRATEGIC PACT */}
      <section className="values-banner">
        <div className="values-scroll">
          <div className="value-item">
            <span className="value-label">Human Simplicity</span>
          </div>
          <div className="value-item">
            <span className="value-label">Professional Authority</span>
          </div>
          <div className="value-item">
            <span className="value-label">Global Accessibility</span>
          </div>
          <div className="value-item">
            <span className="value-label">Absolute Transparency</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
