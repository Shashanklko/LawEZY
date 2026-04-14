import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

import useAuthStore from '../store/useAuthStore'
import apiClient from '../services/apiClient'

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Real Auth State from Zustand Store
  const { user, isAuthenticated, logout } = useAuthStore();
  const location = useLocation();
  const isLoggedIn = isAuthenticated;
  
  // Role Mapping: Map backend roles to readable display labels
  const getRoleLabel = (role) => {
    if (!role) return 'GUEST';
    const r = role.toUpperCase();
    if (r === 'CLIENT') return 'CLIENT';
    if (r === 'LAWYER') return 'LAWYER';
    if (r === 'CA') return 'CA';
    if (r === 'CFA') return 'CFA';
    return r;
  };

  const userRoleLabel = getRoleLabel(user?.role);
  const isExpert = ['LAWYER', 'CA', 'CFA', 'OTHER', 'PRO'].includes(user?.role?.toUpperCase());
  
  const [walletBalance, setWalletBalance] = useState('₹ 0');
  
  useEffect(() => {
    if (isAuthenticated) {
      apiClient.get('/api/wallet/balance')
        .then(res => setWalletBalance(`₹ ${res.data.earnedBalance?.toLocaleString() || '0'}`))
        .catch(() => setWalletBalance('₹ --'));
    }
  }, [isAuthenticated, location.pathname]); // Refresh on navigation to catch wallet changes
  
  const mockNotifications = [
    { id: 1, text: "New message from Rajesh Kumar (Advocate)", time: "2m ago", type: "message" },
    { id: 2, text: "Appointment scheduled: Tomorrow, 10:00 AM", time: "1h ago", type: "event" },
    { id: 3, text: "Strategic case document updated", time: "3h ago", type: "doc" }
  ];
  
  const notifyRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifyRef.current && !notifyRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closeMenu = () => {
    setIsMobileMenuOpen(false);
    setIsNotificationsOpen(false);
    setIsProfileOpen(false);
  };

  const isDashboard = location.pathname === '/dashboard';

  return (
    <>
      {isDashboard && <div className="navbar-hover-trigger" style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '10px', zIndex: 1999 }} />}
      <nav className={`navbar-premium glass ${isDashboard ? 'autohide' : ''}`}>
        <div className="section-container nav-content">
          <div className="brand-section">
            <Link to="/" className="brand-link" onClick={closeMenu}>
              <span className="brand-name">LAWEZY</span>
            </Link>
            <div className="brand-divider"></div>
            <Link to="/lawino-ai" className="ai-brand-link" onClick={closeMenu}>
              <div className="ai-brand">
                <span className="ai-name">LawinoAI</span>
                <span className="ai-tagline">LEGAL & BUSINESS INTELLIGENCE</span>
              </div>
            </Link>
          </div>

          <button 
            className={`mobile-toggle ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Navigation"
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>

          {/* COMBINED MOBILE MENU WRAPPER */}
          <div className={`nav-menu-wrapper ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
            <div className="nav-links">
              <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} onClick={closeMenu}>HOME</Link>
              <Link to="/lawino-ai" className={`nav-link ${location.pathname === '/lawino-ai' ? 'active' : ''}`} onClick={closeMenu}>LAWINOAI</Link>
              <Link to="/library" className={`nav-link ${location.pathname === '/library' ? 'active' : ''}`} onClick={closeMenu}>LIBRARY</Link>
              <Link to="/experts" className={`nav-link ${location.pathname === '/experts' ? 'active' : ''}`} onClick={closeMenu}>EXPERTS</Link>
              <Link to="/messages" className={`nav-link ${location.pathname === '/messages' ? 'active' : ''}`} onClick={closeMenu}>MESSAGES</Link>
              <Link to="/community" className={`nav-link ${location.pathname === '/community' ? 'active' : ''}`} onClick={closeMenu}>COMMUNITY</Link>
              <Link to="/about" className={`nav-link ${location.pathname === '/about' ? 'active' : ''}`} onClick={closeMenu}>ABOUT</Link>
            </div>

            <div className="nav-actions">
              
              {!isLoggedIn ? (
                <>
                  <Link to="/login" className="nav-link login-link" onClick={closeMenu}>Login</Link>
                  
                  {/* Professionals/Experts Onboarding */}
                  <Link to="/signup?role=expert" onClick={closeMenu}>
                    <button className="btn-secondary">Join Us (As Expert)</button>
                  </Link>

                  <Link to="/signup?role=seeker" onClick={closeMenu}>
                    <button className="btn-premium">Get Consultations</button>
                  </Link>
                </>
              ) : (
                <div className="logged-in-actions">
                  {/* 🔔 Notifications (Universal for logged in) */}
                  <div className="nav-notifications-container" ref={notifyRef}>
                    <button 
                      className={`btn-icon-nav ${isNotificationsOpen ? 'active' : ''}`}
                      onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    >
                      <span className="notify-bell">🔔</span>
                      <span className="notify-dot"></span>
                    </button>
                    {isNotificationsOpen && (
                      <div className="notifications-dropdown glass">
                        <div className="notify-header">STRATEGIC UPDATES</div>
                        <div className="notify-list">
                          {mockNotifications.map(n => (
                            <div key={n.id} className="notify-item">
                              <span className="notify-text">{n.text}</span>
                              <span className="notify-time">{n.time}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 👤 Profile Circular Avatar & Dropdown */}
                  <div className="nav-profile-container" ref={profileRef}>
                    <button 
                      className={`btn-avatar ${isProfileOpen ? 'active' : ''}`}
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                    >
                      {user?.profilePic ? (
                        <img src={user.profilePic} alt="Profile" className="user-avatar-img" />
                      ) : (
                        <div className="user-avatar-initials">
                          {user?.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
                          {user?.lastName ? user.lastName.charAt(0).toUpperCase() : 'S'}
                        </div>
                      )}
                    </button>
                    {isProfileOpen && (
                      <div className="profile-dropdown glass">
                        <div className="profile-dropdown-header">
                          <span className="user-name">{user?.firstName} {user?.lastName}</span>
                          <span className="user-role-badge">{userRoleLabel}</span>
                        </div>
                        <div className="dropdown-divider"></div>
                        <Link to="/dashboard" className="dropdown-item" onClick={closeMenu}>
                          <span className="drop-icon">📊</span> DASHBOARD
                        </Link>
                        <div className="dropdown-divider"></div>
                        <button className="dropdown-item logout-item" onClick={() => { logout(); closeMenu(); }}>
                           <span className="drop-icon">🚪</span> SIGN OUT
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      <style jsx="true">{`
        .navbar-premium {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(25px) saturate(180%);
          -webkit-backdrop-filter: blur(25px) saturate(180%);
          border-bottom: 1px solid rgba(127, 29, 29, 0.08);
          height: 70px;
          display: flex;
          align-items: center;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 2000;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.02);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .navbar-premium.autohide {
          transform: translateY(-100%);
          opacity: 0;
        }
        .navbar-premium.autohide:hover,
        .navbar-hover-trigger:hover + .navbar-premium.autohide {
          transform: translateY(0);
          opacity: 1;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }
        .nav-content {
          display: flex;
          align-items: center;
          padding: 0 40px;
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
        }
        .brand-section {
          display: flex;
          align-items: center;
          gap: 28px;
          min-width: 280px; /* Prevent shrinking */
        }
        .brand-link, .ai-brand-link { text-decoration: none; color: inherit; display: block; }
        .brand-name {
          font-family: 'Outfit', sans-serif;
          font-weight: 900;
          font-size: 1.35rem; /* Slightly larger */
          color: var(--accent-burgundy);
          letter-spacing: -0.05em;
        }
        .brand-divider { width: 1px; height: 30px; background: rgba(127, 29, 29, 0.15); }
        .ai-brand { display: flex; flex-direction: column; }
        .ai-name { font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 1.1rem; color: var(--accent-burgundy); }
        .ai-tagline { font-family: 'Outfit', sans-serif; font-size: 0.55rem; font-weight: 800; color: #8B5A2B; letter-spacing: 0.5px; margin-top: -2px; }

        .nav-menu-wrapper {
          display: flex;
          flex: 1;
          align-items: center;
          justify-content: space-between;
        }

        .nav-links { 
          display: flex; 
          gap: 32px; /* Increased from 20px to prevent overlap */
          margin-left: 2rem; 
        }
        .nav-link {
          color: rgba(15, 23, 42, 0.6);
          text-decoration: none;
          font-size: 0.72rem;
          font-weight: 800; /* Bolder for visibility */
          letter-spacing: 1px; /* Improved readability */
          text-transform: uppercase;
          transition: all 0.3s ease;
          white-space: nowrap; /* CRITICAL: Prevent overlap on narrow windows */
        }
        .nav-link:hover { color: var(--accent-burgundy); }
        .nav-link.active { 
          color: var(--accent-burgundy);
          border-bottom: 2px solid var(--accent-burgundy);
          padding-bottom: 4px;
        }

        /* NOTIFICATIONS & LOGGED IN */
        .nav-actions { 
          display: flex; 
          align-items: center; 
          gap: 18px; 
          margin-left: auto; 
        }
        .logged-in-actions { 
          display: flex; 
          align-items: center; 
          gap: 18px; 
        }
        .btn-icon-nav {
          background: transparent;
          border: 1.5px solid rgba(127, 29, 29, 0.1);
          width: 38px;
          height: 38px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
        }
        .notify-dot {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 6px;
          height: 6px;
          background: #ef4444;
          border-radius: 50%;
        }
        
        .notifications-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 10px;
          min-width: 320px;
          background: white;
          border: 1px solid rgba(127, 29, 29, 0.1);
          border-radius: 8px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          z-index: 2000;
          overflow: hidden;
        }
        .notify-header {
          padding: 12px 20px;
          border-bottom: 1px solid rgba(0,0,0,0.05);
          font-size: 0.6rem;
          font-weight: 800;
          color: #999;
          letter-spacing: 1.5px;
          background: #fbfbfb;
        }
        .notify-list {
          max-height: 400px;
          overflow-y: auto;
        }
        .notify-item {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(0,0,0,0.03);
          display: flex;
          flex-direction: column;
          gap: 4px;
          transition: all 0.2s;
          cursor: pointer;
        }
        .notify-item:hover {
          background: rgba(127, 29, 29, 0.02);
        }
        .notify-text {
          font-size: 0.72rem;
          font-weight: 700;
          color: #333;
          line-height: 1.4;
        }
        .notify-time {
          font-size: 0.6rem;
          color: #aaa;
          font-weight: 600;
        }
        .notify-empty {
          padding: 30px 20px;
          text-align: center;
          font-size: 0.85rem;
          color: #bbb;
        }

        .nav-profile-container { position: relative; }
        .btn-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid var(--accent-burgundy);
          padding: 2px;
          background: white;
          cursor: pointer;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-avatar:hover { transform: scale(1.05); border-color: #8B5A2B; }
        .user-avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
        .user-avatar-initials {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent-burgundy);
          color: white;
          font-weight: 800;
          font-size: 0.9rem;
          border-radius: 50%;
        }

        .profile-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 12px;
          min-width: 220px;
          background: white;
          border: 1px solid rgba(127, 29, 29, 0.1);
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          z-index: 2500;
          overflow: hidden;
          padding: 8px 0;
        }
        .profile-dropdown-header {
          padding: 12px 20px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .user-name { font-size: 0.85rem; font-weight: 800; color: var(--text-main); }
        .user-role-badge { 
          font-size: 0.6rem; 
          font-weight: 800; 
          color: #8B5A2B; 
          letter-spacing: 1px;
          background: rgba(139, 90, 43, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
          width: fit-content;
        }
        .dropdown-divider { height: 1px; background: rgba(0,0,0,0.05); margin: 8px 0; }
        
        .dropdown-item {
          padding: 8px 20px;
          text-decoration: none;
          color: rgba(15, 23, 42, 0.7);
          font-size: 0.65rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.2s;
          border: none;
          background: transparent;
          width: 100%;
          cursor: pointer;
          text-align: left;
        }
        .dropdown-item:hover { background: rgba(127, 29, 29, 0.04); color: var(--accent-burgundy); }
        .drop-icon { font-size: 1rem; opacity: 0.8; }
        .logout-item { color: #ef4444; }
        .logout-item:hover { background: rgba(239, 68, 68, 0.05) !important; color: #dc2626 !important; }

        .btn-secondary {
          padding: 8px 16px;
          background: transparent;
          color: var(--accent-burgundy);
          border: 1.5px solid var(--accent-burgundy);
          font-weight: 800;
          font-size: 0.68rem;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s ease;
          letter-spacing: 0.5px;
        }
        .btn-secondary:hover {
          background: rgba(127, 29, 29, 0.05);
        }
        
        .btn-premium {
          padding: 8px 18px;
          background: linear-gradient(135deg, var(--accent-burgundy) 0%, #8B5A2B 100%);
          color: white;
          border: none;
          font-weight: 800;
          font-size: 0.68rem;
          border-radius: 4px;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(127, 29, 29, 0.15);
          transition: all 0.3s;
        }
        .btn-premium:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(127, 29, 29, 0.25);
        }

        .mobile-toggle { display: none; }

        @media (max-width: 1200px) {
          .mobile-toggle {
            display: flex;
            flex-direction: column;
            gap: 5px;
            background: transparent;
            border: none;
            cursor: pointer;
            z-index: 2100;
            margin-left: auto;
          }
          .hamburger-line { width: 22px; height: 2px; background: var(--accent-burgundy); transition: 0.3s; }
          .mobile-toggle.active .hamburger-line:nth-child(1) { transform: translateY(7px) rotate(45deg); }
          .mobile-toggle.active .hamburger-line:nth-child(2) { opacity: 0; }
          .mobile-toggle.active .hamburger-line:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

          .nav-menu-wrapper {
            position: fixed;
            top: 0;
            right: -100%;
            width: 85%;
            max-width: 380px;
            height: 100vh;
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(20px);
            flex-direction: column;
            padding: 100px 40px;
            box-shadow: -10px 0 30px rgba(0,0,0,0.1);
            transition: 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            z-index: 2050;
            overflow-y: auto;
            justify-content: flex-start;
            gap: 40px;
          }
          .nav-menu-wrapper.mobile-open { right: 0; }

          .nav-links {
            flex-direction: column;
            width: 100%;
            margin-left: 0;
            gap: 25px;
          }
          .nav-links .nav-link { font-size: 1.1rem; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 10px; }

          .nav-actions {
            flex-direction: column;
            width: 100%;
            margin-left: 0;
            gap: 15px;
            padding-top: 20px;
            border-top: 2px solid rgba(127, 29, 29, 0.1);
          }
          .nav-actions > *, .nav-actions button { width: 100% !important; text-align: center; }
          .btn-secondary, .btn-premium { font-size: 0.95rem; padding: 14px; }
          .help-icon-wrapper { padding: 12px; border-width: 2px; }
          .help-text { font-size: 0.9rem; }
        }

        @media (max-width: 480px) {
          .brand-divider, .ai-brand-link { display: none; }
          .brand-name { font-size: 1.15rem; }
          .nav-menu-wrapper { width: 100%; max-width: none; }
        }
      `}</style>
    </nav>
    </>
  )
}

export default Navbar
