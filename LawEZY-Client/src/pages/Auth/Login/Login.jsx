import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../../../services/apiClient';
import useAuthStore from '../../../store/useAuthStore';
import './Login.css';

const Login = () => {
  const [role, setRole] = useState('client');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

      const { token, firstName, lastName, id, publicUid: uid, role: serverRole, message } = response.data;
      
      // Persist full institutional identity directly into the Auth Store
      setAuth({ 
        id, // Internal Database ID (CRITICAL for handshakes)
        email, 
        firstName, 
        lastName, 
        uid, // Institutional Public Identifier
        role: serverRole 
      }, token);
      
      console.log('Login successful:', message);
      navigate('/');
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

  return (
    <div className="login-page">
      <div className="login-overlay"></div>

      {/* BRANDING HEADER */}
      <div className="login-portal-header stagger-reveal">
        <Link to="/" className="portal-brand-link-wrapper">
          <div className="portal-brand-block">
            <span className="portal-brand-name">LAWEZY</span>
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

      <div className="login-content-wrapper">
        {/* LEFT SIDE: HERO CONTENT */}
        <div className="login-hero-section">
          <h1 className="hero-login-title" style={{ fontSize: '5.5rem', marginBottom: '16px' }}>Welcome<br />Back.</h1>
          <p className="hero-login-desc" style={{ fontSize: '1.25rem', opacity: '0.9', fontWeight: '500', lineHeight: '1.6', maxWidth: '500px' }}>
            <Link to="/" className="hero-brand-link">
              <span style={{ color: role === 'pro' ? '#8B5A2B' : '#7F1D1D', fontWeight: '800' }}>LAWEZY</span>
            </Link> provide you platform to find expert to help you,
            and for professionals to reach the clients who need them.
          </p>
        </div>

        {/* RIGHT SIDE: GLASS FORM */}
        <div className="login-form-section">
          <div className="glass-login-card">
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

            <form className="login-form" onSubmit={handleSubmit}>
              {error && <div className="login-error-message">{error}</div>}
              
              <div className="login-group stagger-reveal delay-2">
                <label className="login-label">Email or Phone Number</label>
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
                    type="password" 
                    className="login-input" 
                    placeholder="••••••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                  />
                  <div className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  </div>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
