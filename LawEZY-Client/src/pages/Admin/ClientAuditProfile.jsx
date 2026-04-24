import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import './AdminPortal.css';

const ClientAuditProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    location: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    upiId: ''
  });

  useEffect(() => {
    fetchClient();
  }, [id]);

  const fetchClient = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/admin/clients/${id}`);
      const data = res.data;
      setClient(data);
      setFormData({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        mobile: data.phoneNumber || '',
        location: data.location || '',
        bankName: data.bankName || '',
        accountNumber: data.accountNumber || '',
        ifscCode: data.ifscCode || '',
        accountHolderName: data.accountHolderName || '',
        upiId: data.upiId || ''
      });

      const aptRes = await apiClient.get(`/api/admin/clients/${id}/appointments`).catch(() => ({ data: [] }));
      setAppointments(aptRes.data || []);
    } catch (err) {
      console.error("Failed to fetch client for audit:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/api/admin/clients/${id}`, {
        ...formData,
        phoneNumber: formData.mobile
      });
      alert('Client profile synchronized successfully.');
      fetchClient();
    } catch (err) {
      alert("Synchronization failure: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleBlock = async () => {
    try {
      if (client.enabled) {
        await apiClient.put(`/api/admin/users/${id}/block`);
        alert('Account suspended.');
      } else {
        await apiClient.put(`/api/admin/users/${id}/unblock`);
        alert('Account reactivated.');
      }
      fetchClient();
    } catch (err) {
      alert("State transition failure.");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-IN', { 
      day: '2-digit', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      COMPLETED: '#10b981',
      CONFIRMED: '#3b82f6',
      PROPOSED: '#f59e0b',
      CANCELLED: '#ef4444',
      EXPIRED: '#6b7280',
      REJECTED: '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  if (loading) return (
    <div className="admin-portal-wrapper">
      <div className="saas-loading-state" style={{width: '100%'}}>
        <div className="elite-sync-spinner"></div>
        <p>Decrypting Client Dossier...</p>
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
            <span className="nav-icon">👤</span> Client Dossier
          </button>
          <button onClick={() => navigate(`/admin/clients/${id}/logs`)}>
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
              <span onClick={() => navigate('/admin')}>Governance</span> / <span className="active">Client Profile Audit</span>
            </div>
            <h1>Institutional Dossier: {formData.firstName} {formData.lastName}</h1>
            <p>Verification UID: {id} • Status: {client?.enabled ? 'ACTIVE' : 'SUSPENDED'}</p>
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
              
              {/* LEFT COLUMN: PRIMARY IDENTITY & CONSULTATION HISTORY */}
              <div className="dossier-column-main">
                <div className="dossier-card">
                  <div className="card-header">
                    <h3><span className="card-icon">🆔</span> Client Identification</h3>
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
                        <label>Registered Email</label>
                        <input name="email" className="saas-input" value={formData.email} onChange={handleInputChange} />
                      </div>
                      <div className="form-group">
                        <label>Contact Phone</label>
                        <input name="mobile" className="saas-input" value={formData.mobile} onChange={handleInputChange} />
                      </div>
                    </div>
                    <div className="dossier-form-row">
                      <div className="form-group">
                        <label>Official Location</label>
                        <input name="location" className="saas-input" value={formData.location} onChange={handleInputChange} />
                      </div>
                      <div className="form-group">
                        <label>Account Role</label>
                        <input className="saas-input" value={client?.role || 'CLIENT'} disabled 
                          style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dossier-card">
                  <div className="card-header">
                    <h3><span className="card-icon">📋</span> Consultation History ({appointments.length} Sessions)</h3>
                  </div>
                  <div className="card-body">
                    {appointments.length > 0 ? (
                      <div className="saas-history-list">
                        {appointments.map((apt, idx) => (
                          <div key={idx} className="history-item">
                            <span className="dot" style={{ background: getStatusColor(apt.status) }}></span>
                            <div className="history-content">
                              <strong>
                                {apt.expertName || 'Unknown Expert'}
                                <span className="saas-chip" style={{ 
                                  marginLeft: '10px', 
                                  fontSize: '0.7rem',
                                  background: `${getStatusColor(apt.status)}22`,
                                  color: getStatusColor(apt.status),
                                  border: `1px solid ${getStatusColor(apt.status)}44`
                                }}>
                                  {apt.status}
                                </span>
                              </strong>
                              <p>{apt.reason || 'General Consultation'} • {apt.durationMinutes || 30} min</p>
                              <span className="year">
                                {formatDate(apt.scheduledAt || apt.createdAt)}
                                {apt.fee ? ` • ₹${apt.fee}` : ''}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="empty-subtext">No consultation records in the system.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: FINANCIAL & GOVERNANCE */}
              <div className="dossier-column-side">
                <div className="dossier-card">
                  <div className="card-header">
                    <h3><span className="card-icon">🏛️</span> Bank Settlement Details</h3>
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
                      <label>UPI ID</label>
                      <input name="upiId" className="saas-input highlight-gold" value={formData.upiId} onChange={handleInputChange} />
                    </div>
                  </div>
                </div>

                <div className="dossier-card side-highlight">
                  <div className="card-header">
                    <h3><span className="card-icon">💰</span> Financial Summary</h3>
                  </div>
                  <div className="card-body">
                    <div className="fee-breakdown-cluster" style={{ padding: '15px', background: '#0f1115', borderRadius: '10px' }}>
                      <div className="fee-line">
                        <span>Cash Balance:</span>
                        <strong style={{ color: 'var(--elite-gold)' }}>₹{client?.cashBalance || 0}</strong>
                      </div>
                      <div className="fee-line" style={{ marginTop: '10px' }}>
                        <span>Total Spent:</span>
                        <strong style={{ color: '#ef4444' }}>₹{client?.totalSpent || 0}</strong>
                      </div>
                      <div className="fee-line" style={{ marginTop: '10px' }}>
                        <span>Earned Balance:</span>
                        <strong style={{ color: '#10b981' }}>₹{client?.earnedBalance || 0}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dossier-card">
                  <div className="card-header">
                    <h3><span className="card-icon">🎫</span> Token Governance</h3>
                  </div>
                  <div className="card-body">
                    <div className="fee-breakdown-cluster" style={{ padding: '15px', background: '#0f1115', borderRadius: '10px' }}>
                      <div className="fee-line">
                        <span>Cash Portfolio:</span>
                        <strong>₹{client?.cashBalance?.toLocaleString() || 0}</strong>
                      </div>
                      <div className="fee-line" style={{ marginTop: '8px' }}>
                        <span>Free AI Tokens:</span>
                        <strong>{client?.freeAiTokens || 0}</strong>
                      </div>
                      <div className="fee-line" style={{ marginTop: '8px' }}>
                        <span>Free Chat Tokens:</span>
                        <strong>{client?.freeChatTokens || 0}</strong>
                      </div>
                      <div className="fee-line" style={{ marginTop: '8px' }}>
                        <span>Free Doc Tokens:</span>
                        <strong>{client?.freeDocTokens || 0}</strong>
                      </div>
                      <div className="fee-line" style={{ marginTop: '8px' }}>
                        <span>Unlimited Access:</span>
                        <strong style={{ color: client?.isUnlimited ? '#10b981' : '#6b7280' }}>
                          {client?.isUnlimited ? 'YES' : 'NO'}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dossier-card">
                  <div className="card-header">
                    <h3><span className="card-icon">📊</span> Engagement Metrics</h3>
                  </div>
                  <div className="card-body">
                    <div className="fee-breakdown-cluster" style={{ padding: '15px', background: '#0f1115', borderRadius: '10px' }}>
                      <div className="fee-line">
                        <span>Total Sessions:</span>
                        <strong>{client?.totalAppointments || 0}</strong>
                      </div>
                      <div className="fee-line" style={{ marginTop: '8px' }}>
                        <span>Completed:</span>
                        <strong style={{ color: '#10b981' }}>{client?.completedAppointments || 0}</strong>
                      </div>
                      <div className="fee-line" style={{ marginTop: '8px' }}>
                        <span>Pending/Active:</span>
                        <strong style={{ color: '#f59e0b' }}>{client?.pendingAppointments || 0}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dossier-card" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
                  <div className="action-stack-vertical" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button className="btn-saas-primary" onClick={handleSave} disabled={saving}>
                      {saving ? 'Synchronizing...' : 'Update Profile'}
                    </button>
                    <button 
                      className="btn-saas-secondary" 
                      style={{ borderColor: client?.enabled ? '#ef4444' : '#10b981', color: client?.enabled ? '#ef4444' : '#10b981' }} 
                      onClick={handleBlock}
                    >
                      {client?.enabled ? 'Suspend Account' : 'Reactivate Account'}
                    </button>
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

export default ClientAuditProfile;
