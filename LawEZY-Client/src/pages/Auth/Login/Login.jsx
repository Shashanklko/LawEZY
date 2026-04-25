import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import apiClient from '../../../services/apiClient';
import useAuthStore from '../../../store/useAuthStore';
import './Login.css';

const Login = () => {
  const [role, setRole] = useState('client');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [showMfa, setShowMfa] = useState(false);
  const [mfaOtp, setMfaOtp] = useState('');
  const [mfaEmail, setMfaEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpEmail, setHelpEmail] = useState('');
  const [helpQuery, setHelpQuery] = useState('');
  const [helpLoading, setHelpLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/api/auth/login', {
        email,
        password,
      });

      const apiResponse = response.data;

      if (apiResponse.message && apiResponse.message.startsWith("MFA_REQUIRED")) {
        setMfaEmail(email);
        setShowMfa(true);
        setLoading(false);
        return;
      }

      const { token, firstName, lastName, id, role: serverRole } = apiResponse.data;
      
      // Persist full institutional identity directly into the Auth Store
      setAuth({ 
        id, // Institutional Primary Identifier
        email, 
        firstName, 
        lastName, 
        role: serverRole 
      }, token);
      
      console.log('Login successful:', apiResponse.message);
      
      if (serverRole === 'ADMIN' || serverRole === 'MASTER_ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Login error details:', err.response?.data);
      
      // Prevent React crash by extracting string message from error object
      const errorMsg = err.response?.data?.message || 
                     err.response?.data?.data || 
                     (typeof err.response?.data === 'string' ? err.response?.data : null) ||
                     'Internal institutional server error. Please check backend logs.';
                     
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/api/auth/mfa-verify', {
        email: mfaEmail,
        otp: mfaOtp
      });

      const { token, firstName, lastName, id, role: serverRole } = response.data.data;
      setAuth({ id, email: mfaEmail, firstName, lastName, role: serverRole }, token);
      
      if (serverRole === 'ADMIN' || serverRole === 'MASTER_ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleHelpSubmit = async (e) => {
    e.preventDefault();
    setHelpLoading(true);
    try {
      await apiClient.post('/api/support/query', {
        name: email || 'GUEST',
        email: helpEmail || email || 'Not Provided',
        query: helpQuery,
        role: role
      });
      alert('Your query has been sent to LawEZY Support. We will get back to you soon.');
      setShowHelpModal(false);
      setHelpQuery('');
    } catch (err) {
      alert('Failed to send query. Please try again later.');
    } finally {
      setHelpLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-overlay"></div>

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
      
      {/* DYNAMIC MESH BACKDROP */}
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
      >
        <div className="ring-inner">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
        </div>
        <div className="ring-glow"></div>
      </div>

      <div className="login-content-wrapper">
        {/* LEFT SIDE: HERO CONTENT */}
        <div className="login-hero-section">
          <h1 className="hero-login-title" style={{ fontSize: '5.5rem', marginBottom: '16px' }}>Welcome<br />Back.</h1>
          <p className="hero-login-desc" style={{ fontSize: '1.25rem', opacity: '0.9', fontWeight: '500', lineHeight: '1.6', maxWidth: '500px' }}>
            <Link to="/" className="hero-brand-link">
              <span className="lawezy-logo tiny" style={{ display: 'inline-flex', color: role === 'pro' ? '#8B5A2B' : '#7F1D1D' }}>LAWEZY<span className="logo-dot">.</span></span>
            </Link> provide you platform to find expert to help you,
            and for professionals to reach the clients who need them.
          </p>
        </div>

        {/* RIGHT SIDE: GLASS FORM */}
        <div className="login-form-section">
          <div className="glass-login-card">
            {showMfa ? (
              <div className="mfa-container stagger-reveal">
                <div className="admin-header">
                  <h2 className="admin-title">MFA CHALLENGE</h2>
                  <p className="admin-subtitle">Verification code sent to {mfaEmail}</p>
                </div>
                <form className="login-form" onSubmit={handleMfaVerify}>
                  <div className="login-group">
                    <label className="login-label">Verification Code</label>
                    <input 
                      type="text" 
                      placeholder="6-Digit OTP" 
                      className="login-input" 
                      value={mfaOtp}
                      onChange={(e) => setMfaOtp(e.target.value)}
                      required 
                      disabled={loading} 
                    />
                  </div>
                  <button type="submit" className="btn-login-primary" disabled={loading}>
                    <span>{loading ? 'VERIFYING...' : 'CONFIRM IDENTITY'}</span>
                  </button>
                  <button 
                    type="button" 
                    className="login-link-subtle" 
                    onClick={() => setShowMfa(false)}
                    style={{ background: 'none', border: 'none', marginTop: '16px', cursor: 'pointer' }}
                  >
                    Back to Login
                  </button>
                </form>
              </div>
            ) : isAdminLogin ? (
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
                    const apiResponse = response.data;
                    
                    if (apiResponse.message && apiResponse.message.startsWith("MFA_REQUIRED")) {
                      setMfaEmail(loginEmail);
                      setShowMfa(true);
                      setLoading(false);
                      return;
                    }

                    const { token, firstName, lastName, id, role: serverRole } = apiResponse.data;
                    setAuth({ id, email: loginEmail, firstName, lastName, role: serverRole }, token);
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
                    <div className="input-with-icon">
                      <input 
                        name="adminKey" 
                        type={showAdminPassword ? "text" : "password"} 
                        placeholder="••••••••••••" 
                        className="login-input" 
                        required 
                        disabled={loading} 
                      />
                      <button 
                        type="button" 
                        className="password-toggle"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                      >
                        {showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="btn-login-primary admin-btn" disabled={loading}>
                    <span>{loading ? 'INITIALIZING...' : 'INITIALIZE ACCESS'}</span>
                  </button>
                  <p className="admin-notice">LawEZY Governance Protocol Active.</p>
                </form>
              </div>
            ) : (
              <>
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

                <form className="login-form" onSubmit={handleSubmit}>
                  {error && <div className="login-error-message">{error}</div>}
                  
                  <div className="login-group stagger-reveal delay-2">
                    <label className="login-label">Email Address</label>
                    <div className="input-with-icon">
                      <input 
                        type="email" 
                        className="login-input" 
                        placeholder="Enter your email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required 
                      />
                      <div className="input-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      </div>
                    </div>
                  </div>

                  <div className="login-group stagger-reveal delay-2">
                    <label className="login-label">Password</label>
                    <div className="input-with-icon">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        className="login-input" 
                        placeholder="••••••••••••" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required 
                      />
                      <div className="input-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      </div>
                      <button 
                        type="button" 
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="login-forgot stagger-reveal delay-3">
                    <Link to="/forgot-password" title="Recover your access" className="login-link-subtle">Forgot password?</Link>
                  </div>

                  <button type="submit" className="btn-login-primary stagger-reveal delay-4" disabled={loading}>
                    <div className="btn-content">
                      <span>{loading ? 'Logging in...' : 'Login'}</span>
                      {!loading && (
                        <svg className="btn-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                      )}
                    </div>
                  </button>

                  <p className="login-footer stagger-reveal delay-5">
                    Are you new?
                    <Link to="/signup" className="login-link-bold">Create an Account</Link>
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      {/* HELP FLOATING BUTTON */}
      <button 
        className="help-float-btn stagger-reveal delay-5" 
        onClick={() => setShowHelpModal(true)}
        title="Need Help?"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <span>Support</span>
      </button>

      {/* HELP MODAL */}
      {showHelpModal && (
        <div className="help-modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="help-modal-content" onClick={e => e.stopPropagation()}>
            <div className="help-header">
              <h3>Institutional Support</h3>
              <p>Send your query directly to our governance team.</p>
            </div>
            <form onSubmit={handleHelpSubmit} className="help-form">
              <div className="login-group">
                <label className="login-label">Your Email</label>
                <input 
                  type="email" 
                  className="login-input" 
                  placeholder="Where should we reply?"
                  value={helpEmail}
                  onChange={e => setHelpEmail(e.target.value)}
                  required 
                />
              </div>
              <div className="login-group">
                <label className="login-label">Describe your query</label>
                <textarea 
                  className="help-textarea" 
                  placeholder="How can we assist you today?"
                  value={helpQuery}
                  onChange={e => setHelpQuery(e.target.value)}
                  required
                ></textarea>
              </div>
              <div className="help-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowHelpModal(false)}>Cancel</button>
                <button type="submit" className="btn-send" disabled={helpLoading}>
                  {helpLoading ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;

