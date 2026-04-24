import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AIFeature.css';

const AIFeature = () => {
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
      className={`ai-showcase ${isVisible ? 'reveal-active' : 'reveal-hidden'}`}
    >
      <div className="ai-container">
        <div className="ai-content">
          <h2 className="ai-title"><span>Lawino<span className="brand-dot">.</span>ai</span></h2>
          <p className="ai-definition">
            Lawino<span className="brand-dot">.</span>ai is your personal guide for legal and financial questions. 
            Upload documents for instant expert analysis and connect with the right professional 
            when you're ready for your next big step.
          </p>

          <div className="ai-action-row">
            <button className="btn-ai-launch" onClick={() => navigate('/lawino-ai')}>
              Ask Your Queries to Lawino <span className="btn-arrow">→</span>
            </button>
          </div>
        </div>

        <div className="ai-preview-window">
          {/* Atmospheric Glow behind images */}
          <div className="preview-glow-core"></div>
          
          <div className="ai-preview-visual">
            {/* Desktop Frame */}
            <div className="device-frame desktop-frame">
              <div className="frame-header-dots"><span></span><span></span><span></span></div>
              <img 
                src="/src/assets/homepage/lawino_desktop.png" 
                alt="Lawino AI Desktop Interface" 
                className="preview-img desktop"
                loading="lazy"
              />
            </div>
            
            {/* Mobile Frame */}
            <div className="device-frame mobile-frame">
              <div className="mobile-bezel-line"></div>
              <img 
                src="/src/assets/homepage/lawino_mobile.png" 
                alt="Lawino AI Mobile Interface" 
                className="preview-img mobile"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AIFeature;

