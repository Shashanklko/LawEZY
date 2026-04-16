import React, { useState } from 'react';
import './FAQ.css';

const FAQ = () => {
  const [activeId, setActiveId] = useState(null);

  const toggleFAQ = (id) => {
    setActiveId(activeId === id ? null : id);
  };

  const SECTIONS = [
    {
      title: "For Seekers (Clients & Individuals)",
      questions: [
        { id: 1, q: "How do I find a lawyer if I can't travel to court?", a: "LawEZY is built for doorstep access. You can find and consult with world-class lawyers from the comfort of your home via our 'Experts' module. We offer video consultations and digital document sharing to eliminate the need for physical travel." },
        { id: 2, q: "Is LawEZY suitable for senior citizens?", a: "Absolutely. We've prioritized accessibility for elders. Our interface is designed for simplicity, and our experts are trained to provide empathetic, home-based support for estate planning, legal notices, and family matters." },
        { id: 3, q: "I am a student starting a business. Can LawEZY help?", a: "Yes. Our 'Startup Launchpad' connects you with CAs, Lawyers, and CFAs who specialize in new ventures. They can help with registration, IP protection, and financial planning at founder-friendly rates." }
      ]
    },
    {
      title: "For Professionals (Lawyers, CAs, CFAs)",
      questions: [
        { id: 4, q: "How can I serve clients who aren't in my city?", a: "LawEZY provides a 'Digital Command Center' that gives you global reach. You can accept consultations from clients across the country, conduct video meetings, and manage cases entirely online." },
        { id: 5, q: "What are the infrastructure costs for experts?", a: "LawEZY has zero infrastructure costs. We provide the AI workspace, secure messaging, and client reach. You focus on providing your expertise, and we handle the digital logistics." }
      ]
    },
    {
      title: "Security & Trust",
      questions: [
        { id: 6, q: "Is my data secure?", a: "We use institutional-grade encryption for all communications. Your consultations and documents are protected by multi-layer security protocols, ensuring total confidentiality." },
        { id: 7, q: "How do you verify the experts?", a: "Every professional on LawEZY undergoes a rigorous multi-stage verification process, including BAR ID checks, certificate validation, and professional background reviews." }
      ]
    }
  ];

  return (
    <div className="faq-page">
      <div className="faq-header">
        <h1>LawEZY <span>Institutional Support</span>.</h1>
        <p>Find institutional answers to your questions about the LawEZY ecosystem. Whether you are a seeker of justice or a provider of expertise, we are here to help.</p>
      </div>

      <div className="faq-container">
        {SECTIONS.map((section, sIndex) => (
          <div key={sIndex} className="faq-section">
            <h2>{section.title}</h2>
            {section.questions.map((item) => (
              <div 
                key={item.id} 
                className={`faq-item ${activeId === item.id ? 'active' : ''}`}
                onClick={() => toggleFAQ(item.id)}
              >
                <div className="faq-question">
                  <span>{item.q}</span>
                  <span className="accordion-arrow">▼</span>
                </div>
                {activeId === item.id && (
                  <div className="faq-answer">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQ;
