import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import './AdminPortal.css';

const ExpertAuditProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expert, setExpert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local state for exhaustive edits
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    bio: '',
    expertCategory: '',
    practiceAreas: [],
    yearsOfExperience: '',
    baseFee: 0,
    educationList: [],
    experienceChapters: [],
    portfolioSnapshots: [],
    barCouncilId: '',
    firmName: '',
    designation: '',
    location: '',
    licenseDriveLink: '',
    linkedinUrl: '',
    youtubeUrl: '',
    websiteUrl: '',
    textChatFee: 100,
    chatDurationMinutes: 10,
    customGreeting: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    upiId: ''
  });

  useEffect(() => {
    fetchExpert();
  }, [id]);

  const fetchExpert = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/admin/experts/${id}`);
      const data = res.data;
      setExpert(data);
      
      setFormData({
        firstName: data.name?.split(' ')[0] || '',
        lastName: data.name?.split(' ').slice(1).join(' ') || '',
        email: data.email || '',
        mobile: data.phoneNumber || '',
        bio: data.bio || '',
        expertCategory: data.category || '',
        practiceAreas: data.domains || [],
        yearsOfExperience: data.experience || '',
        baseFee: data.price || 0,
        educationList: data.educationList || [],
        experienceChapters: data.experienceList || [],
        portfolioSnapshots: data.snapshots || [],
        barCouncilId: data.licenseNo || '',
        firmName: data.firmName || '',
        designation: data.title || 'Senior Professional',
        location: data.location || '',
        licenseDriveLink: data.licenseDriveLink || '',
        linkedinUrl: data.linkedinUrl || '',
        youtubeUrl: data.youtubeUrl || '',
        websiteUrl: data.websiteUrl || '',
        textChatFee: data.textChatFee || 100,
        chatDurationMinutes: data.chatDurationMinutes || 10,
        customGreeting: data.customGreeting || '',
        bankName: data.bankName || '',
        accountNumber: data.accountNumber || '',
        ifscCode: data.ifscCode || '',
        accountHolderName: data.accountHolderName || '',
        upiId: data.upiId || ''
      });
    } catch (err) {
      console.error("Failed to fetch expert for audit:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (section) => {
    setSaving(true);
    try {
      // Map frontend fields to backend specialized profile fields
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        consultationFee: formData.baseFee,
        bio: formData.bio,
        location: formData.location,
        title: formData.designation,
        experience: formData.yearsOfExperience,
        domains: JSON.stringify(formData.practiceAreas),
        textChatFee: formData.textChatFee,
        chatDurationMinutes: formData.chatDurationMinutes,
        customGreeting: formData.customGreeting,
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        ifscCode: formData.ifscCode,
        accountHolderName: formData.accountHolderName,
        upiId: formData.upiId
      };
      
      // Add specialized ID fields based on category
      if (expert.category === 'LAWYER') payload.barCouncilId = formData.barCouncilId;
      else if (expert.category === 'CA') payload.membershipNumber = formData.barCouncilId;
      else if (expert.category === 'CFA') payload.charterNumber = formData.barCouncilId;

      await apiClient.put(`/api/admin/experts/${id}`, payload);
      alert(`Expert Profile synchronized successfully.`);
      fetchExpert();
    } catch (err) {
      alert("Synchronization failure: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (status) => {
    try {
      await apiClient.put(`/api/admin/experts/${id}/verify?status=${status}`);
      alert(`Expert state transitioned: ${status ? 'VERIFIED' : 'SUSPENDED'}`);
      fetchExpert();
    } catch (err) {
      alert("State transition failure.");
    }
  };

  if (loading) return (
    <div className="admin-portal-wrapper">
      <div className="saas-loading-state" style={{width: '100%'}}>
        <div className="elite-sync-spinner"></div>
        <p>Decrypting High-Density Dossier...</p>
      </div>
    </div>
  );

  return (
    <div className="admin-portal-wrapper">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="brand-lzy">LAWEZY</span>
          <span className="brand-separator">|</span>
          <span className="brand-suffix">Command Center</span>
        </div>
        
        <nav className="admin-nav">
          <button onClick={() => navigate('/admin')}>
            <span className="nav-icon">📊</span> Portal Home
          </button>
          <button className="active">
            <span className="nav-icon">👤</span> Expert Dossier
          </button>
          <button onClick={() => navigate(`/admin/experts/${id}/logs`)}>
            <span className="nav-icon">📜</span> Audit Logs
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <button className="btn-public-mode" onClick={() => navigate('/')}>🌐 Public Mode</button>
          <button className="btn-logout-admin" onClick={() => { localStorage.clear(); navigate('/login'); }}>Exit Portal</button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-top-bar">
          <div className="header-title">
            <div className="breadcrumb-dossier">
              <span onClick={() => navigate('/admin')}>Governance</span> / <span className="active">Expert Profile Audit</span>
            </div>
            <h1>Institutional Dossier: {formData.firstName} {formData.lastName}</h1>
            <p>Verification UID: {id} • Status: {expert.isVerified ? 'VERIFIED' : 'PENDING'}</p>
          </div>
          <div className="header-meta">
             <div className="registry-id-badge dark">
                <span className="label">ACCOUNT UID</span>
                <span className="id-code">{id}</span>
             </div>
          </div>
        </header>

        <div className="admin-scroll-content animate-reveal">
          <div className="saas-dossier-full-page">
            <div className="dossier-layout-grid">
              
              {/* LEFT COLUMN: PRIMARY IDENTITY & BIO */}
              <div className="dossier-column-main">
                <div className="dossier-card">
                  <div className="card-header">
                    <h3><span className="card-icon">🆔</span> Credential Identification</h3>
                  </div>
                  <div className="card-body">
                    <div className="dossier-form-row">
                      <div className="form-group">
                        <label>First Name (Institutional Record)</label>
                        <input name="firstName" className="saas-input" value={formData.firstName} onChange={handleInputChange} />
                      </div>
                      <div className="form-group">
                        <label>Last Name (Institutional Record)</label>
                        <input name="lastName" className="saas-input" value={formData.lastName} onChange={handleInputChange} />
                      </div>
                    </div>
                    <div className="dossier-form-row">
                      <div className="form-group">
                        <label>Professional Designation</label>
                        <input name="designation" className="saas-input highlight-gold" value={formData.designation} onChange={handleInputChange} />
                      </div>
                      <div className="form-group">
                        <label>Contact Phone</label>
                        <input name="mobile" className="saas-input" value={formData.mobile} onChange={handleInputChange} />
                      </div>
                    </div>

                    <div className="dossier-form-row">
                      <div className="form-group">
                        <label>Base Consultation Fee (₹)</label>
                        <input type="number" name="baseFee" className="saas-input" value={formData.baseFee} onChange={handleInputChange} />
                      </div>
                      <div className="form-group">
                        <label>Chat Extension Fee (₹)</label>
                        <input type="number" name="textChatFee" className="saas-input" value={formData.textChatFee} onChange={handleInputChange} />
                      </div>
                      <div className="form-group">
                        <label>Extension Duration (Mins)</label>
                        <input type="number" name="chatDurationMinutes" className="saas-input" value={formData.chatDurationMinutes} onChange={handleInputChange} />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '15px' }}>
                      <label>Custom Chat Greeting (Automated Response)</label>
                      <textarea 
                        name="customGreeting" 
                        className="saas-textarea" 
                        style={{ minHeight: '80px', fontSize: '0.9rem' }}
                        value={formData.customGreeting} 
                        onChange={handleInputChange} 
                        placeholder="Welcome message sent when expert first responds..."
                      />
                    </div>
                    <div className="dossier-form-row">
                      <div className="form-group">
                        <label>Official Email (Institutional)</label>
                        <input name="email" className="saas-input" value={formData.email} onChange={handleInputChange} />
                      </div>
                      <div className="form-group">
                        <label>Official Location (City, State)</label>
                        <input name="location" className="saas-input" value={formData.location} onChange={handleInputChange} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dossier-card">
                  <div className="card-header">
                    <h3><span className="card-icon">📝</span> Expertise Bio & Institutional Profile</h3>
                  </div>
                  <div className="card-body">
                    <div className="form-group">
                      <label>Professional Biography (High Density Summary)</label>
                      <textarea name="bio" className="saas-textarea" value={formData.bio} onChange={handleInputChange} />
                    </div>
                  </div>
                </div>

                <div className="dossier-card">
                  <div className="card-header">
                    <h3><span className="card-icon">🎯</span> Discipline-Specific Practice Domains</h3>
                  </div>
                  <div className="card-body">
                    <div className="saas-domain-grid">
                      {formData.practiceAreas.map((domain, idx) => (
                        <span key={idx} className="saas-chip">{domain}</span>
                      ))}
                      {formData.practiceAreas.length === 0 && <p className="empty-subtext">No domains specified in registry.</p>}
                    </div>
                  </div>
                </div>

                <div className="dossier-card">
                  <div className="card-header">
                    <h3><span className="card-icon">🎓</span> Academic Pedigree</h3>
                  </div>
                  <div className="card-body">
                    <div className="saas-history-list">
                      {formData.educationList.map((edu, idx) => (
                        <div key={idx} className="history-item">
                          <span className="dot"></span>
                          <div className="history-content">
                            <strong>{edu.degree}</strong>
                            <p>{edu.institute}</p>
                            <span className="year">{edu.year}</span>
                            {edu.link && <a href={edu.link} target="_blank" className="doc-mini-link">Proof Document ↗</a>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="dossier-card">
                  <div className="card-header">
                    <h3><span className="card-icon">🚀</span> Professional Experience Journey</h3>
                  </div>
                  <div className="card-body">
                    <div className="saas-history-list">
                      {formData.experienceChapters.map((exp, idx) => (
                        <div key={idx} className="history-item">
                          <span className="dot" style={{background: '#10b981'}}></span>
                          <div className="history-content">
                            <strong>{exp.role}</strong>
                            <p>{exp.company}</p>
                            <span className="year">{exp.startDate} - {exp.endDate || 'Present'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="dossier-card">
                  <div className="card-header">
                    <h3><span className="card-icon">📸</span> Experience Snapshots (Portfolio Proof)</h3>
                  </div>
                  <div className="card-body">
                    <div className="saas-history-list">
                      {formData.portfolioSnapshots.map((item, idx) => (
                        <div key={idx} className="history-item">
                          <span className="dot" style={{background: 'var(--elite-gold)'}}></span>
                          <div className="history-content">
                            <strong>{item.title}</strong>
                            <p>{item.description}</p>
                            {item.link && <a href={item.link} target="_blank" className="doc-mini-link">Source Document ↗</a>}
                          </div>
                        </div>
                      ))}
                      {formData.portfolioSnapshots.length === 0 && <p className="empty-subtext">No portfolio snapshots recorded.</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: REGULATORY, FINANCIAL & SOCIAL */}
              <div className="dossier-column-side">
                <div className="dossier-card side-highlight">
                  <div className="card-header">
                    <h3><span className="card-icon">⚖️</span> Regulatory Verification & Authority</h3>
                  </div>
                  <div className="card-body">
                    <div className="form-group">
                      <label>Bar License Number / Registry ID</label>
                      <input name="barCouncilId" className="saas-input highlight-burgundy" value={formData.barCouncilId} onChange={handleInputChange} />
                    </div>
                    <div className="form-group" style={{marginTop: '15px'}}>
                      <label>Issuing Authority</label>
                      <input name="firmName" className="saas-input" value={formData.firmName} onChange={handleInputChange} />
                    </div>
                    <div className="proof-document-block" style={{marginTop: '20px'}}>
                      <label>Drive Link to Verification Certificate</label>
                      {formData.licenseDriveLink ? (
                        <a href={formData.licenseDriveLink} target="_blank" className="saas-doc-link">VIEW CERTIFICATE ↗</a>
                      ) : (
                        <div className="saas-doc-placeholder danger">NO CERTIFICATE PROVIDED</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="dossier-card">
                  <div className="card-header">
                    <h3><span className="card-icon">💰</span> Financial Settlement Coordinates</h3>
                  </div>
                  <div className="card-body">
                    <div className="form-group">
                      <label>Bank Name</label>
                      <input name="bankName" className="saas-input" value={formData.bankName} onChange={handleInputChange} />
                    </div>
                    <div className="form-group" style={{marginTop: '10px'}}>
                      <label>Account Holder Name</label>
                      <input name="accountHolderName" className="saas-input" value={formData.accountHolderName} onChange={handleInputChange} />
                    </div>
                    <div className="dossier-form-row" style={{marginTop: '10px'}}>
                      <div className="form-group">
                        <label>Account Number</label>
                        <input name="accountNumber" className="saas-input" value={formData.accountNumber} onChange={handleInputChange} />
                      </div>
                      <div className="form-group">
                        <label>IFSC Code</label>
                        <input name="ifscCode" className="saas-input" value={formData.ifscCode} onChange={handleInputChange} />
                      </div>
                    </div>
                    <div className="form-group" style={{marginTop: '10px'}}>
                      <label>UPI ID (Primary)</label>
                      <input name="upiId" className="saas-input highlight-gold" value={formData.upiId} onChange={handleInputChange} />
                    </div>
                  </div>
                </div>

                <div className="dossier-card">
                  <div className="card-header">
                    <h3><span className="card-icon">💸</span> Liquidity & Settlement Controls</h3>
                  </div>
                  <div className="card-body">
                    <div className="form-group">
                      <label>Base Consultation Fee (₹ per Session)</label>
                      <div className="fee-input-wrapper">
                        <span className="currency">₹</span>
                        <input name="baseFee" type="number" className="saas-input highlight-gold" value={formData.baseFee} onChange={handleInputChange} />
                      </div>
                    </div>
                    <div className="dossier-form-row" style={{marginTop: '15px'}}>
                      <div className="form-group">
                        <label>Total Payable (Institutional)</label>
                        <div className="saas-static-val highlight-burgundy">₹{expert?.earnedBalance?.toLocaleString() || '0'}</div>
                      </div>
                      <div className="form-group">
                        <label>Escrow Balance (Transit)</label>
                        <div className="saas-static-val">₹{expert?.escrowBalance?.toLocaleString() || '0'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dossier-card">
                  <div className="card-header">
                    <h3><span className="card-icon">🌐</span> Digital Footprint</h3>
                  </div>
                  <div className="card-body">
                    <div className="form-group">
                      <label>LinkedIn Professional Profile</label>
                      <input name="linkedinUrl" className="saas-input" value={formData.linkedinUrl} onChange={handleInputChange} />
                    </div>
                    <div className="form-group" style={{marginTop: '10px'}}>
                      <label>YouTube Channel / Portfolio</label>
                      <input name="youtubeUrl" className="saas-input" value={formData.youtubeUrl} onChange={handleInputChange} />
                    </div>
                    <div className="form-group" style={{marginTop: '10px'}}>
                      <label>Professional Website / Chamber</label>
                      <input name="websiteUrl" className="saas-input" value={formData.websiteUrl} onChange={handleInputChange} />
                    </div>
                  </div>
                </div>

                <div className="dossier-card" style={{border: 'none', background: 'transparent', boxShadow: 'none'}}>
                  <div className="action-stack-vertical" style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                    <button className="btn-saas-primary" onClick={() => handleSave('Dossier')} disabled={saving}>
                      {saving ? 'Synchronizing...' : 'Update Profile'}
                    </button>
                    {expert.isVerified ? (
                      <button className="btn-saas-secondary" style={{borderColor: '#ef4444', color: '#ef4444'}} onClick={() => handleVerify(false)}>Suspend Account</button>
                    ) : (
                      <button className="btn-saas-primary" style={{background: '#10b981'}} onClick={() => handleVerify(true)}>Verify Credentials</button>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ExpertAuditProfile;
