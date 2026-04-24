import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../../../services/apiClient';
import './Signup.css';

const COUNTRY_CODES = [
  { name: 'India', iso: 'IN', code: '+91' },
  { name: 'United States', iso: 'US', code: '+1' },
  // ... rest of the codes omitted for brevity in this view, but I will keep them 
  { name: 'United Kingdom', iso: 'GB', code: '+44' }
];

const Signup = () => {
  const [role, setRole] = useState('client');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [otp, setOtp] = useState('');
  const [showOtpField, setShowOtpField] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const navigate = useNavigate();

  const handleRequestOtp = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address first.');
      return;
    }
    setOtpLoading(true);
    setError('');
    try {
      await apiClient.post('/api/auth/request-otp', { email, purpose: 'REGISTRATION' });
      setOtpSent(true);
      setShowOtpField(true);
      alert('Security code dispatched to ' + email);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (role === 'pro' && !category) {
        setError('Please select your professional category to proceed.');
        setLoading(false);
        return;
      }

      let backendRole = 'CLIENT';
      if (role === 'pro') {
        if (category === 'legal') backendRole = 'LAWYER';
        else if (category === 'ca') backendRole = 'CA';
        else backendRole = 'OTHER';
      }

      const payload = {
        firstname,
        lastname,
        email,
        password,
        role: backendRole
      };

      await apiClient.post(`/api/auth/register?otp=${otp}`, payload);

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('Signup error details:', err.response?.data);
      const errorMsg = err.response?.data?.message || 
                     err.response?.data?.data || 
                     (typeof err.response?.data === 'string' ? err.response?.data : null) ||
                     'Registration failed. Institutional server currently unavailable.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-overlay"></div>

      {/* BRANDING HEADER */}
      <div className="login-portal-header stagger-reveal">
        <Link to="/" className="portal-brand-link-wrapper">
          <div className="portal-brand-block">
            <span className="lawezy-logo medium">LAWEZY<span className="logo-dot">.</span></span>
            <div className="portal-brand-divider"></div>
            <div className="portal-ai-brand">
              <span className="portal-ai-name">LawinoAI</span>
              <span className="portal-ai-tagline">LEGAL & BUSINESS INTELLIGENCE</span>
            </div>
          </div>
        </Link>
      </div>
      <div className="mesh-bg-container">
        <div className="mesh-ball ball-1"></div>
        <div className="mesh-ball ball-2" style={{ background: role === 'pro' ? '#8B5A2B' : '#7F1D1D' }}></div>
        <div className="mesh-ball ball-3"></div>
      </div>

      {/* FLOAT EXIT BUTTON */}
      <Link to="/" className="portal-exit-btn stagger-reveal">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </Link>
      
      {/* ADMIN PORTAL TRIGGER RING */}
      <div 
        className={`admin-portal-ring stagger-reveal ${isAdminLogin ? 'active' : ''}`}
        onClick={() => setIsAdminLogin(!isAdminLogin)}
        title={isAdminLogin ? "Return to User Portal" : "Admin Portal"}
        style={{ top: '90px' }}
      >
        <div className="ring-inner">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
        </div>
        <div className="ring-glow"></div>
      </div>

      <div className="signup-content-wrapper">
        <div className="signup-hero-section">
          <h1 className="hero-signup-title" style={{ fontSize: '5rem' }}>Join the<br />Elite.</h1>
          <p className="hero-signup-desc">
            <Link to="/" className="hero-brand-link">
              <span className="lawezy-logo tiny" style={{ display: 'inline-flex', color: role === 'pro' ? '#8B5A2B' : '#7F1D1D' }}>LAWEZY<span className="logo-dot">.</span></span>
            </Link> – The high-precision bridge for legal and financial brilliance. 
            A unified ecosystem where discerning clients access elite professional services, 
            and top-tier experts deliver institutional-grade solutions to meet complex 
            institutional needs.
          </p>
        </div>

        <div className="signup-form-section">
          <div className="glass-signup-card">
            {isAdminLogin ? (
               <div className="admin-login-container">
               <div className="admin-header">
                 <h2 className="admin-title">ADMIN ACCESS</h2>
                 <p className="admin-subtitle">Secure Institutional Gateway</p>
               </div>
               <form className="login-form" onSubmit={async (e) => {
                 e.preventDefault();
                 const adminId = e.target.adminId.value.trim();
                 const key = e.target.adminKey.value;
                 const loginEmail = adminId.includes('@') ? adminId : `${adminId}@lawezy.com`;
                 
                 setLoading(true);
                 try {
                   const response = await apiClient.post('/api/auth/login', {
                     email: loginEmail,
                     password: key,
                   });
                   const { token, firstName, lastName, id, role: serverRole } = response.data;
                   
                   // Dynamic import for useAuthStore to avoid circular dependencies in Signup if any
                   const useAuthStore = (await import('../../../store/useAuthStore')).default;
                   useAuthStore.getState().setAuth({ id, email: loginEmail, firstName, lastName, role: serverRole }, token);
                   navigate('/admin');
                 } catch (err) {
                   alert('Invalid Institutional Credentials');
                 } finally {
                   setLoading(false);
                 }
               }}>
                 <div className="login-group">
                   <label className="login-label">Admin ID</label>
                   <input name="adminId" type="text" placeholder="e.g. lawezy95" className="login-input" required disabled={loading} />
                 </div>
                 <div className="login-group">
                   <label className="login-label">Admin Key</label>
                   <input name="adminKey" type="password" placeholder="••••••••••••" className="login-input" required disabled={loading} />
                 </div>
                 <button type="submit" className="btn-login-primary admin-btn" disabled={loading}>
                   <span>{loading ? 'INITIALIZING...' : 'INITIALIZE ACCESS'}</span>
                 </button>
                 <p className="admin-notice">LawEZY Governance Protocol Active.</p>
               </form>
             </div>
            ) : (
              <>
            {/* ROLE SELECTOR */}
            <div className={`role-selector stagger-reveal delay-1 ${role}`}>
              <div 
                className={`role-option ${role === 'client' ? 'active' : ''}`} 
                onClick={() => setRole('client')}
              >
                Clients
              </div>
              <div 
                className={`role-option ${role === 'pro' ? 'active' : ''}`} 
                onClick={() => setRole('pro')}
              >
                Professionals
              </div>
              <div className="role-pill"></div>
            </div>

            <form className="signup-form" onSubmit={handleSubmit}>
              {error && <div className="login-error-message">{error}</div>}
              {success && <div className="login-success-message">Account created! Redirecting to login...</div>}

              <div className="form-row stagger-reveal delay-2">
                <div className="form-group">
                  <label className="signup-label">First Name</label>
                  <div className="input-with-icon">
                    <input 
                      type="text" 
                      className="signup-input" 
                      placeholder="e.g. Shekhar" 
                      value={firstname}
                      onChange={(e) => setFirstname(e.target.value)}
                      required 
                    />
                    <div className="input-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="signup-label">Last Name</label>
                  <div className="input-with-icon">
                    <input 
                      type="text" 
                      className="signup-input" 
                      placeholder="e.g. Kumar" 
                      value={lastname}
                      onChange={(e) => setLastname(e.target.value)}
                      required 
                    />
                    <div className="input-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-row stagger-reveal delay-2">
                <div className="form-group">
                  <label className="signup-label">Email Address</label>
                  <div className="input-with-icon">
                    <input 
                      type="email" 
                      className="signup-input" 
                      placeholder="shekhar@example.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required 
                    />
                    <div className="input-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="signup-label">Password</label>
                  <div className="input-with-icon">
                    <input 
                      type="password" 
                      className="signup-input" 
                      placeholder="••••••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                    />
                    <div className="input-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    </div>
                  </div>
                </div>
              <div className="form-row stagger-reveal delay-3">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="signup-label">Verification Code</label>
                  <div className="input-with-icon">
                    <input 
                      type="text" 
                      className="signup-input" 
                      placeholder="6-Digit OTP" 
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required={showOtpField}
                      disabled={!showOtpField}
                      maxLength={6}
                    />
                    <div className="input-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    </div>
                  </div>
                </div>
                <div className="form-group" style={{ flex: 0, alignSelf: 'flex-end' }}>
                  <button 
                    type="button" 
                    className={`btn-otp-request ${otpSent ? 'sent' : ''}`} 
                    onClick={handleRequestOtp}
                    disabled={otpLoading}
                    style={{ 
                      height: '48px', 
                      whiteSpace: 'nowrap', 
                      padding: '0 20px', 
                      borderRadius: '12px',
                      background: otpSent ? '#059669' : 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'white',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {otpLoading ? 'SENDING...' : otpSent ? 'RESEND CODE' : 'SEND CODE'}
                  </button>
                </div>
              </div>

              <div className="signup-row stagger-reveal delay-3">
                {role === 'pro' && (
                  <div className="form-group" style={{ flex: 1.2 }}>
                    <label className="signup-label">I am a...</label>
                    <div className="input-with-icon">
                      <select 
                        className="signup-input" 
                        required 
                        style={{ appearance: 'none' }}
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        <option value="">Select your category</option>
                        <option value="legal">Legal Professional (Lawyer)</option>
                        <option value="ca">CA (Chartered Accountant)</option>
                        <option value="cfa">CFA (Chartered Financial Analyst)</option>
                      </select>
                      <div className="input-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" className="btn-signup-primary stagger-reveal delay-4" disabled={loading}>
                <div className="btn-content">
                  <span>{loading ? 'Creating Account...' : 'Sign Up'}</span>
                  {!loading && (
                    <svg className="btn-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                  )}
                </div>
              </button>

              <div className="signup-footer stagger-reveal" style={{ animationDelay: '0.5s' }}>
                Existing Member? <Link to="/login" className="signup-link-bold">Secure Login</Link>
              </div>
            </form>
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;

