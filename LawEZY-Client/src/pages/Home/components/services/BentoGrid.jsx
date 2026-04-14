import React from 'react';
import './BentoGrid.css';

const services = [
  {
    id: 'lexchat',
    title: 'LexChat.ai',
    description: 'Advanced AI for instant legal research, drafting, and real-time advice. Professional power, simplified for everyone.',
    icon: '🤖',
    size: 'large',
    tag: 'Flagship AI'
  },
  {
    id: 'appointments',
    title: 'Expert Consultations',
    description: 'Book seamless video or text appointments with top legal professionals. Expert advice is now just a click away.',
    icon: '🎥',
    size: 'medium',
    tag: 'Video & Text'
  },
  {
    id: 'resources',
    title: 'E-Resources',
    description: 'A vast library of legal templates, compliance guides, and contract builders. The tools the pros use, simplified.',
    icon: '📚',
    size: 'medium',
    tag: 'MNC Standards'
  },
  {
    id: 'community',
    title: 'Legal Community',
    description: 'Join the LawEZY Forum to network with experts and fellow entrepreneurs.',
    icon: '👥',
    size: 'small',
    tag: 'Network'
  },
  {
    id: 'startup',
    title: 'Startup Hub',
    description: 'Localized compliance and legal setup for new businesses.',
    icon: '🚀',
    size: 'small',
    tag: 'New'
  }
];

const BentoGrid = () => {
  return (
    <section className="bento-section">
      <div className="section-container">
        <div className="bento-header">
          <h2 className="section-title accent-text">Legal Solutions Made Simple</h2>
          <p className="section-subtitle">
            MNC-Grade legal technology, designed for everyone—from everyday individuals to global startups.
          </p>
        </div>
        <div className="bento-grid">
          {services.map((service) => (
            <div key={service.id} className={`bento-card ${service.size} glass`}>
              <div className="card-tag">{service.tag}</div>
              <div className="card-content">
                <span className="card-icon">{service.icon}</span>
                <h3 className="card-title">{service.title}</h3>
                <p className="card-description">{service.description}</p>
              </div>
              <div className="card-action">
                <button className="btn-minimal">Learn More →</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BentoGrid;
