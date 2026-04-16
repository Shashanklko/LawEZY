import React, { useState } from 'react';
import './Contact.css';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    role: 'Seeker'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Institutional message sent. Our support council will respond within 4 hours.');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="contact-page">
      <div className="contact-header">
        <span className="section-tag">24/7 Institutional Continuity</span>
        <h1>Contact <span>LawEZY Support</span>.</h1>
        <p>Our global support council is available to assist both seekers and professionals with any navigational or technical queries within the LawEZY ecosystem.</p>
      </div>

      <div className="contact-grid">
        <div className="contact-form-card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" name="name" placeholder="Enter your full name" required onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Official Email</label>
              <input type="email" name="email" placeholder="email@example.com" required onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>I am a...</label>
              <select name="role" onChange={handleChange}>
                <option value="Seeker">Seeker (Individual / Startup / Senior)</option>
                <option value="Professional">Professional (Lawyer / CA / CFA)</option>
                <option value="Enterprise">Enterprise Partner</option>
              </select>
            </div>
            <div className="form-group">
              <label>Institutional Message</label>
              <textarea name="message" rows="5" placeholder="Please describe your query in detail..." required onChange={handleChange}></textarea>
            </div>
            <button type="submit" className="btn-contact-submit">DISPATCH MESSAGE</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;
