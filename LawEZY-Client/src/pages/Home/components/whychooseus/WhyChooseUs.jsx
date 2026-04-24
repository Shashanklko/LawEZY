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

  const institutionalCapabilities = [
    {
      id: "01",
      title: "Legal Consultations",
      description: "Direct access to senior advocates and legal specialists with over 50+ practice areas covered.",
      linkText: "See for Legal expert",
      path: "/experts?category=legal"
    },
    {
      id: "02",
      title: "Financial Institutional Advisory",
      description: "Elite support from top-tier Chartered Accountants (CAs) and CS professionals to manage your compliance.",
      linkText: "Meet our Financial Advisor",
      path: "/experts?category=financial"
    },
    {
      id: "03",
      title: "Seamless Appointment",
      description: "Real-time, effortless scheduling with elite professionals at your absolute convenience.",
      linkText: "Make your consultations",
      path: "/dashboard?tab=appointments"
    },
    {
      id: "04",
      title: "LawinoAI Copilot",
      description: "Your 24/7 autonomous intelligence core for instant legal clarity and complex document analysis.",
      linkText: "Ask your query",
      path: "/lawino-ai"
    },
    {
      id: "05",
      title: "Institutional Dashboard",
      description: "A centralized command center to track your case history, documents, and professional engagements.",
      linkText: "Go to Dashboard",
      path: "/dashboard"
    },
    {
      id: "06",
      title: "Institutional Education",
      description: "Curated resources and professional masterclasses to empower your legal and financial literacy.",
      linkText: "Explore E-Resource",
      path: "/library"
    },
    {
      id: "07",
      title: "Real-time Messaging",
      description: "Secure, encrypted communication channels for instant collaboration with your legal advisors.",
      linkText: "Start Messaging",
      path: "/messages"
    },
    {
      id: "08",
      title: "Community & Newsroom",
      description: "A collaborative dialogue for case studies, professional blogs, and legal problems. Real-time newsroom.",
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

      <div className="institutional-portfolio-grid">
        {institutionalCapabilities.map((item) => (
          <div 
            key={item.id} 
            className={`institutional-card ${item.isFeatured ? 'featured-insight' : ''}`}
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

