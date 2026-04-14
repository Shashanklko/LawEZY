import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ExpertEcosystem.css';
import legalImg from '../../../../assets/experts/legal_pillar.png';
import financeImg from '../../../../assets/experts/finance_pillar.png';

const ExpertEcosystem = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  return (
    <section 
      ref={sectionRef} 
      className={`expert-dual-pillars ${isVisible ? 'reveal-active' : 'reveal-hidden'}`}
    >
      {/* LEFT PILLAR: LEGAL COUNSEL */}
      <div className="pillar legal-focus">
        <div className="pillar-bg-layer" 
          style={{ backgroundImage: `url(${legalImg})` }}
        >
          <div className="pillar-overlay"></div>
        </div>

        <div className="pillar-content-box">
          <span className="pillar-index">01</span>
          <h2 className="pillar-title">Legal help for your life & business <span className="title-accent"></span></h2>
          <p className="pillar-body">
            Get the right advice for your family, your ideas, and your company. 
            We connect you with top lawyers for any situation.
          </p>
          <ul className="pillar-capabilities">
            <li>Small Business Law</li>
            <li>Family & Property</li>
            <li>Protecting Your Ideas</li>
          </ul>
          <button className="pillar-cta-btn" onClick={() => navigate('/experts?category=legal')}>
            Find a Lawyer <span className="btn-arrow">→</span>
          </button>
        </div>
      </div>

      {/* RIGHT PILLAR: FINANCIAL STRATEGY */}
      <div className="pillar financial-focus">
        <div className="pillar-bg-layer" 
          style={{ backgroundImage: `url(${financeImg})` }}
        >
          <div className="pillar-overlay"></div>
        </div>

        <div className="pillar-content-box">
          <span className="pillar-index gold">02</span>
          <h2 className="pillar-title">Money & tax made simple <span className="title-accent"></span></h2>
          <p className="pillar-body">
            Expert CAs to handle your GST, audits, and business planning. 
            Professional financial care for your growing startup.
          </p>
          <ul className="pillar-capabilities">
            <li>GST & Tax Filing</li>
            <li>Startup Planning</li>
            <li>Audit & Compliance</li>
          </ul>
          <button className="pillar-cta-btn gold" onClick={() => navigate('/experts?category=financial')}>
            Talk to an Expert CA <span className="btn-arrow">→</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default ExpertEcosystem;
