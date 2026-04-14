import React from 'react';
import './ResourceHub.css';

const ResourceHub = () => {
  const resources = [
    { title: "SME Compliance Kit", type: "Bundle", desc: "Complete set of legal documents for small businesses.", icon: "📁" },
    { title: "Startup IP Guide", type: "Guide", desc: "Protect your intellectual property from day one.", icon: "💡" },
    { title: "Employment Contracts", type: "Template", desc: "Professional hiring documents for every role.", icon: "📄" },
    { title: "Direct Tax Handbook", type: "Compliance", desc: "Stay updated with India's latest tax regulations.", icon: "⚖️" }
  ];

  return (
    <section className="resource-hub-section">
      <div className="resource-container">
        <div className="resource-header">
          <span className="hub-label">Corporate Excellence</span>
          <h2 className="hub-title">E-Resource Hub</h2>
          <p className="hub-subtitle">Access our curated library of high-impact legal templates, compliance guides, and contract builders. The tools the pros use, simplified for you.</p>
        </div>

        <div className="resource-grid">
          {resources.map((res, i) => (
            <div key={i} className="resource-card glass">
              <div className="res-icon">{res.icon}</div>
              <span className="res-type">{res.type}</span>
              <h3 className="res-title">{res.title}</h3>
              <p className="res-desc">{res.desc}</p>
              <button className="btn-res-action">Get Access →</button>
            </div>
          ))}
        </div>

        <div className="hub-cta-banner">
          <div className="banner-content">
            <h4>Can't find what you're looking for?</h4>
            <p>Our experts can draft custom documents tailored to your specific venture.</p>
          </div>
          <button className="btn-primary-red">Request Custom Document</button>
        </div>
      </div>
    </section>
  );
};

export default ResourceHub;
