import React, { useState, useEffect, useRef } from 'react';
import './HeroCarousel.css';

const images = [
  {
    id: "01",
    url: '/src/assets/homepage/family-lawyer.png',
    title: 'Modern Advice for Your Life & Business',
    body: 'LawEZY brings expert legal and financial help to everyone. Whether you are starting a business or protecting your family, we provide clear, honest advice to help you move forward with confidence.',
    cta: 'See how we can help'
  },
  {
    id: "02",
    url: '/src/assets/homepage/Lawyer-meeting.png',
    title: 'Easy Solutions for Every Growth Stage',
    body: 'Empowering individuals and growing startups with the same tools used by big firms. We make professional expertise simple, affordable, and accessible for your unique journey.',
    cta: 'Explore our services'
  },
  {
    id: "03",
    url: '/src/assets/homepage/CA_meeting.png',
    title: 'The Perfect Partner for Your Ambition',
    body: 'Where your goals meet the experts who can make them happen. Our technology connects you with the right professionals instantly, giving you a real advantage in every decision.',
    cta: 'Discover LawinoAI'
  }
];

const HeroCarousel = () => {
  const [current, setCurrent] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  const nextSlide = () => {
    setCurrent((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrent((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  useEffect(() => {
    const timer = setInterval(nextSlide, 12000);
    return () => clearInterval(timer);
  }, []);

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
    <section ref={sectionRef} className="hero-full">
      {/* Background imagery */}
      <div className="hero-bg-layer">
        {images.map((img, index) => (
          <div 
            key={index}
            className={`hero-bg-image ${index === current ? 'active' : ''}`}
            style={{ backgroundImage: `url(${img.url})` }}
          >
            <div className="hero-overlay-refined"></div>
          </div>
        ))}
      </div>

      <div className={`hero-card-container ${isVisible ? 'reveal-active' : 'reveal-hidden'}`}>
        <div className="editorial-box">
          {/* Narrative Content Wrapper */}
          <div className="story-wrapper">
            {images.map((img, index) => (
              <div 
                key={index} 
                className={`story-content ${index === current ? 'active' : ''}`}
              >
                <span className="story-number">{img.id}</span>
                <h2 className="story-title">{img.title}</h2>
                <p className="story-body">{img.body}</p>
              </div>
            ))}
          </div>

          {/* Unified Action Nexus (OUTSIDE the content map to prevent overflow) */}
          <div className="editorial-actions-row">
            <button className="btn-pill-premium">
              {images[current].cta} <span className="btn-arrow">→</span>
            </button>
          </div>

          {/* SLEEK PROGRESS INDICATORS */}
          <div className="carousel-indicators">
            {images.map((_, index) => (
              <div 
                key={index} 
                className={`indicator-bar ${index === current ? 'active' : ''}`}
                onClick={() => setCurrent(index)}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroCarousel;
