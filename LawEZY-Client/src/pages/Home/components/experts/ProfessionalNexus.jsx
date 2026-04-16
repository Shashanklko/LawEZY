import React, { useEffect, useRef, useState } from 'react';
import './ProfessionalNexus.css';
import financeImg from '../../../../assets/homepage/CA.jpg';

const ProfessionalNexus = () => {
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
      className={`nexus-editorial-section ${isVisible ? 'reveal-active' : 'reveal-hidden'}`}
    >
      <div className="nexus-container">
        <div className="nexus-content-left">
          <span className="nexus-eyebrow">Institutional Collaboration</span>
          <h2 className="nexus-heading">Are you a Legal or Financial Professional?</h2>
          <p className="nexus-tagline">
            Join our exclusive ecosystem of top-tier practitioners to scale your 
            firm and collaborate with global talent on LawEZY.
          </p>
          
          <ul className="nexus-perks">
            <li><span>01</span> Institutional Case Hand-off</li>
            <li><span>02</span> Global Professional Branding</li>
            <li><span>03</span> Elite Network Collaboration</li>
          </ul>

          <button className="btn-nexus-primary">Join the Network →</button>
        </div>
        
        <div className="nexus-image-right">
          <div className="nexus-image-frame">
            <img src={financeImg} alt="Professional Financial Institutional Advisory" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfessionalNexus;
