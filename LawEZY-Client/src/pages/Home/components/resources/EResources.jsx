import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './EResources.css';

const EResources = () => {
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

  const resources = [
    {
      id: 1,
      category: 'Corporate Law',
      catId: 'corp',
      description: 'Master Corporate compliance, international contract frameworks, and M&A legalities.',
      icon: '🏛️'
    },
    {
      id: 2,
      category: 'Taxation & Tax',
      catId: 'tax',
      description: 'Deep-dive into Direct/Indirect taxation, GST optimization, and tax-efficient structures.',
      icon: '📊'
    },
    {
      id: 3,
      category: 'Real Estate',
      catId: 'other',
      description: 'Navigating property acquisition, high-value leasing, and Mumbai land-law specializations.',
      icon: '🏡'
    },
    {
      id: 4,
      category: 'IP & Startup',
      catId: 'ip',
      description: 'Protecting innovation through Trademark, Patent law, and fundraising compliance.',
      icon: '💡'
    },
    {
      id: 5,
      category: 'Labor & HR',
      catId: 'other',
      description: 'Optimizing human growth through employment law, ESOP frameworks, and benefit compliance.',
      icon: '👥'
    }
  ];

  return (
    <section 
      ref={sectionRef} 
      className={`resourceSection ${isVisible ? 'reveal-active' : 'reveal-hidden'}`} 
      id="resources"
    >
      <div className="resourceHeader">

        <h2 className="resourceTitle">Elite E-Resources</h2>
        <p className="resourceSubtitle">
          Direct access to the world's most comprehensive legal and financial intelligence library. 
          Expertly curated for high-tempo professional clarity.
        </p>
      </div>

      <div className="resourceGrid">
        {resources.map((res) => (
          <div key={res.id} className="resourceCard">
            <div className="cardHeader">
              <span className="cardIcon">{res.icon}</span>
            </div>
            <h3 className="cardTitle">{res.category}</h3>
            <p className="cardDesc">{res.description}</p>
            <button 
              className="cardAction" 
              onClick={() => navigate(`/library?category=${res.catId}`)}
            >
              Get Access →
            </button>
          </div>
        ))}
        
        {/* THE SIXTH CARD: EXPLORE MORE */}
        <div className="exploreMoreCard">
          <div className="exploreContent">
            <h3>The Global Hub</h3>
            <p>Access the full 50,000+ document archive including international case law and sovereign tax treaties.</p>
            <button className="exploreBtn" onClick={() => navigate('/library')}>Explore Full Library</button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EResources;

