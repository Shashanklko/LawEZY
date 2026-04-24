import React, { useEffect, useRef, useState } from 'react';

const Footer = () => {
  const [isVisible, setIsVisible] = useState(false);
  const footerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (footerRef.current) {
      observer.observe(footerRef.current);
    }

    return () => {
      if (footerRef.current) {
        observer.unobserve(footerRef.current);
      }
    };
  }, []);

  return (
    <footer ref={footerRef} className="footer-premium">
      <div className={`footer-container ${isVisible ? 'reveal-active' : 'reveal-hidden'}`}>
        <div className="footer-grid">
          <div className="footer-brand">
            <h3 className="lawezy-logo medium" style={{ color: 'white' }}>LAWEZY<span className="logo-dot">.</span></h3>
            <p className="f-tagline">Architecting the future of global legal and financial advisory through advanced cognitive technology.</p>

          </div>

          <div className="f-column">
            <h4>Ecosystem</h4>
            <a href="/lawino-ai">LawinoAI</a>
            <a href="/experts">Expert Network</a>
            <a href="/library">E-Resources</a>
            <a href="/community">Community</a>
          </div>

          <div className="f-column">
            <h4>Institutional</h4>
            <a href="/about">About LawEZY</a>
            <a href="/join-network">Join the Network</a>
          </div>



          <div className="f-column">
            <h4>Help & Support</h4>
            <a href="/faq">FAQ</a>
            <a href="/contact">Contact Us</a>

          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="f-legal">
            <a href="#privacy">Privacy Protocol</a>
            <a href="#terms">Institutional Terms</a>
            <a href="#cookie">Cookie Policy</a>
          </div>
          <p className="f-copyright">&copy; 2026 LawEZY | Enterprise Legal Ecosystem. All rights reserved.</p>
        </div>
      </div>

      <style jsx="true">{`
        .footer-premium {
          padding: 80px 0 40px;
          background: #2D0606; /* Heritage Burgundy Deep */
          color: white;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          position: relative;
          z-index: 10;
          min-height: 60vh; /* Shorter than main sections but snaps to bottom */
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        /* SCROLL REVEAL */
        .reveal-hidden {
          opacity: 0;
          transform: translateY(30px);
        }
        .reveal-active {
          opacity: 1;
          transform: translateY(0);
          transition: all 1s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .footer-container {
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
          padding: 0 10%;
        }
        .footer-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1fr;
          gap: 40px;
          margin-bottom: 60px;
        }
        .f-dot { color: var(--accent-gold); }
        .f-tagline {
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.6;
          max-width: 300px;
          margin-bottom: 30px;
          font-size: 0.95rem;
        }
        .f-trust-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .trust-badge {
          font-size: 0.6rem;
          font-weight: 850;
          padding: 4px 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          letter-spacing: 1px;
          color: rgba(255, 255, 255, 0.5);
        }
        .f-column h4 {
          font-size: 1.1rem;
          font-weight: 800;
          margin-bottom: 25px;
          color: white;
        }
        .f-column a, .f-column p {
          display: block;
          color: rgba(255, 255, 255, 0.6);
          text-decoration: none;
          margin-bottom: 12px;
          font-size: 0.95rem;
          transition: 0.3s;
        }
        .f-column a:hover { color: var(--accent-gold); transform: translateX(5px); }
        .footer-bottom {
          padding-top: 40px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .f-legal { display: flex; gap: 30px; }
        .f-legal a { color: rgba(255, 255, 255, 0.4); text-decoration: none; font-size: 0.85rem; }
        .f-copyright { color: rgba(255, 255, 255, 0.3); font-size: 0.85rem; }
        
        @media (max-width: 992px) {
          .footer-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 600px) {
          .footer-grid { grid-template-columns: 1fr; }
          .footer-bottom { flex-direction: column; gap: 20px; text-align: center; }
        }
      `}</style>
    </footer>
  );
};

export default Footer;

