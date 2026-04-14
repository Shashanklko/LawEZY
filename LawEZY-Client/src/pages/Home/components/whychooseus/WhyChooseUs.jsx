import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './WhyChooseUs.css';

const WhyChooseUs = () => {
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

  const strategicCapabilities = [
    {
      id: "01",
      title: "Legal Consultations",
      description: "Direct access to senior advocates and legal specialists with over 50+ practice areas covered.",
      linkText: "See for Legal expert",
      path: "/experts?category=legal"
    },
    {
      id: "02",
      title: "Financial Strategic Advisory",
      description: "Elite support from top-tier Chartered Accountants (CAs) and CS professionals to manage your compliance.",
      linkText: "Meet our Financial Advisor",
      path: "/experts?category=financial"
    },
    {
      id: "03",
      title: "Seamless Booking",
      description: "Real-time, effortless scheduling with elite professionals at your absolute convenience.",
      linkText: "Make your Consulations",
    },
    {
      id: "04",
      title: "LawinoAI Copilot",
      description: "Your 24/7 autonomous intelligence core for instant legal clarity and complex document analysis.",
      linkText: "Ask your Query",
      isFeatured: true
    },
    {
      id: "05",
      title: "Secure Digital Vault",
      description: "A centralized, high-security archive for all your critical legal and financial documentation.",
      linkText: "Secure your Document",
    },
    {
      id: "06",
      title: "Strategic Education",
      description: "Curated resources and professional masterclasses to empower your legal and financial literacy.",
      linkText: "Explore E-Resource",
    },
    {
      id: "07",
      title: "Expert Network",
      description: "An exclusive ecosystem for practitioners to scale their firms and collaborate with global talent.",
      linkText: "Join the network",
    },
    {
      id: "08",
      title: "Community & Newsroom",
      description: "A collaborative dialogue for case studies, professional blogs, and legal problems. Real-time newsroom and peer engagement.",
      linkText: "Join the dialogue",
      path: "/community"
    }
  ];

  return (
    <section 
      ref={sectionRef} 
      className={`why-choose-us-professional ${isVisible ? 'reveal-active' : 'reveal-hidden'}`} 
      id="why-choose-us"
    >
      <div className="sovereign-header">

        <h2 className="sovereign-title">The Sovereign <span>Advantage</span>.</h2>
      </div>

      <div className="strategic-portfolio-grid">
        {strategicCapabilities.map((item) => (
          <div 
            key={item.id} 
            className={`strategic-card ${item.isFeatured ? 'featured-insight' : ''}`}
            onClick={() => item.path && navigate(item.path)}
            style={{ cursor: item.path ? 'pointer' : 'default' }}
          >
            <h3 className="card-heading">
              {item.title} <span className="title-chevron">›</span>
            </h3>
            <p className="card-summary">{item.description}</p>
            <div className="card-footer">
              <span className="learn-more-link">{item.linkText} →</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default WhyChooseUs;
