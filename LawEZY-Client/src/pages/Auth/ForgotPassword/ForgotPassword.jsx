import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import apiClient from '../../../services/apiClient';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1); // 1: Email, 2: OTP + New Password
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiClient.post('/api/auth/request-otp', { email, purpose: 'FORGOT_PASSWORD' });
      setStep(2);
      setSuccess('Security code dispatched to your email.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiClient.post('/api/auth/reset-password', { email, otp, newPassword });
      setSuccess('Password reset successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Invalid code or link expired.');
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  return (
    <div className="forgot-page">
      <div className="forgot-overlay"></div>
      
      <div className="login-portal-header">
        <Link to="/" className="portal-brand-link-wrapper">
          <div className="portal-brand-block">
            <span className="portal-brand-name">LAWEZY</span>
          </div>
        </Link>
      </div>

      <div className="forgot-content-wrapper">
        <div className="glass-forgot-card">
          <h2 className="forgot-title">Security Recovery</h2>
          <p className="forgot-subtitle">Restore access to your institutional account.</p>

          {error && <div className="login-error-message">{error}</div>}
          {success && <div className="login-success-message">{success}</div>}

          {step === 1 ? (
            <form onSubmit={handleRequestOtp} className="forgot-form">
              <div className="login-group">
                <label className="login-label">Email Address</label>
                <input 
                  type="email" 
                  className="login-input" 
                  placeholder="Enter your registered email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
              <button type="submit" className="btn-login-primary" disabled={loading}>
                {loading ? 'REQUESTING...' : 'SEND RECOVERY CODE'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="forgot-form">
              <div className="login-group">
                <label className="login-label">Verification Code</label>
                <input 
                  type="text" 
                  className="login-input" 
                  placeholder="6-Digit OTP" 
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required 
                />
              </div>
              <div className="login-group">
                <label className="login-label">New Password</label>
                <div className="input-with-icon">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="login-input" 
                    placeholder="••••••••" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required 
                  />
                  <button 
                    type="button" 
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="login-group">
                <label className="login-label">Confirm Password</label>
                <div className="input-with-icon">
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    className="login-input" 
                    placeholder="••••••••" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required 
                  />
                  <button 
                    type="button" 
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn-login-primary" disabled={loading}>
                {loading ? 'RESETTING...' : 'RESET PASSWORD'}
              </button>
            </form>
          )}

          <div className="forgot-footer">
            <Link to="/login" className="login-link-bold">Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
