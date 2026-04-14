import React, { useState, useEffect, useRef } from 'react';
import './CommunityShowcase.css';

const CommunityShowcase = () => {
  const [startIndex, setStartIndex] = useState(0);
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

  const allTestimonials = [
    {
      text: "LawEZY made it incredibly easy to find a business attorney. The booking process was seamless, and I received expert advice that helped me navigate a complex contract negotiation.",
      author: "Sarah Jenkins",
      role: "Business Owner",
      avatar: "SJ"
    },
    {
      text: "As someone who deals with multiple property transactions, having access to legal professionals through LawEZY has been invaluable. The platform is intuitive and the professionals are top-notch.",
      author: "Michael Ross",
      role: "Real Estate Investor",
      avatar: "MR"
    },
    {
      text: "I needed help with estate planning and was overwhelmed by the process. LawEZY connected me with an attorney who explained everything clearly and helped me create a comprehensive plan.",
      author: "Elena Rodriguez",
      role: "Client",
      avatar: "ER"
    },
    {
      text: "The platform has streamlined my practice and expanded my client base. The scheduling tools and secure messaging features make client communication efficient and professional.",
      author: "Adv. David Miller",
      role: "Senior Advocate",
      avatar: "DM"
    },
    {
      text: "From the professional side, LawEZY has helped me connect with clients who truly need my expertise. The platform handles scheduling and initial consultations, allowing me to focus on providing legal assistance.",
      author: "Adv. Priya Sharma",
      role: "Legal Consultant",
      avatar: "PS"
    },
    {
      text: "LawEZY allowed me to reach a nationwide client base from my home premises. It's the best approach to grow my legal practice and reach more customers who need specialized help.",
      author: "Sita Iyer",
      role: "Senior Advocate",
      avatar: "SI"
    }
  ];

  // Stabilized Infinite Loop Logic
  useEffect(() => {
    const timer = setInterval(() => {
      setStartIndex((prev) => (prev + 1) % allTestimonials.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [allTestimonials.length]);

  const getVisibleItems = () => {
    // We double the list to ensure we have enough for a smooth infinite overflow
    return [...allTestimonials, ...allTestimonials];
  };

  return (
    <section 
      ref={sectionRef} 
      className={`community-showcase ${isVisible ? 'reveal-active' : 'reveal-hidden'}`}
    >
      <div className="community-layout">
        <div className="net-intro">
          <h2 className="net-title">The LawEZY <br />Community Network <span className="net-dot">.</span></h2>
          
          <p className="net-desc">
            Building trust through visibility. Our community is a 
            living ecosystem of top-tier legal and financial 
            experts serving thousands daily.
          </p>

          <button className="btn-explore-community">
            Explore Community Network →
          </button>
        </div>

        <div className="testimonial-ticker-wrapper">
          <div className="ticker-label-vertical">SUCCESS STORIES</div>
          <div className="ticker-viewport">
            <div 
                className="ticker-stream"
                style={{ transform: `translateY(-${startIndex * 195}px)` }}
            >
              {getVisibleItems().map((t, idx) => (
                <div 
                  key={idx} 
                  className="testimonial-card ticker-item"
                >
                  <p className="t-text">"{t.text}"</p>
                  <div className="t-author">
                    <div className="t-avatar">{t.avatar}</div>
                    <div className="t-info">
                      <span className="t-name">{t.author}</span>
                      <span className="t-role">{t.role}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CommunityShowcase;
