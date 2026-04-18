import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import useAuthStore from '../store/useAuthStore'
import apiClient from '../services/apiClient'
import { getSocket } from '../services/socket'

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Real Auth State from Zustand Store
  const { user, token, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
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
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Professional Pulse: Socket Listener for Global Alerts
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !token) return;

    const socket = getSocket(token);
    
    const handleNewNotification = (notification) => {
      console.log('🔔 [NAVBAR] Real-time link pulse received:', notification);
      setNotifications(prev => [notification, ...prev].slice(0, 10)); // Keep only recent
      setUnreadCount(prev => prev + 1);
      
      // If the browser supports it, show a native toast or play a brief sound
      if (Notification.permission === 'granted') {
          new window.Notification(notification.title, { body: notification.message });
      }
    };

    socket.on('notification_received', handleNewNotification);
    
    // Initial Sync
    fetchNotifications();
    fetchUnreadCount();

    return () => {
      socket.off('notification_received', handleNewNotification);
    };
  }, [isAuthenticated, user?.id, token]);

  const fetchNotifications = async () => {
    try {
      const targetId = user.uid || user.id;
      const response = await apiClient.get(`/api/notifications?userId=${targetId}`);
      setNotifications(response.data?.data?.slice(0, 5) || []);
    } catch (err) {
      console.warn('[NAVBAR] Could not fetch alert history');
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const targetId = user.uid || user.id;
      const response = await apiClient.get(`/api/notifications/unread-count?userId=${targetId}`);
      setUnreadCount(response.data?.data || 0);
    } catch (err) {
      console.warn('[NAVBAR] Could not fetch unread tally');
    }
  };

  const handleMarkAsRead = async (notifyId) => {
    try {
      await apiClient.put(`/api/notifications/${notifyId}/read`);
      setNotifications(prev => prev.map(n => n.id === notifyId ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[NAVBAR] Failed to update read status');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      apiClient.get('/api/wallet/balance')
        .then(res => setWalletBalance(`₹ ${res.data.earnedBalance?.toLocaleString() || '0'}`))
        .catch(() => setWalletBalance('₹ --'));
    }
  }, [isAuthenticated, location.pathname]); 
  
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
                <div className="logged-in-actions mobile-only">
                  {/* 📊 Quick Dashboard Link */}
                  <Link to="/dashboard" className="btn-secondary dashboard-quick-btn" onClick={closeMenu} style={{ padding: '12px 14px', fontSize: '0.85rem', width: '100%' }}>
                    Dashboard
                  </Link>

                  {/* 👤 Mobile User Info (Simple Text) */}
                  <div className="mobile-user-info">
                    <span className="user-name-text">{user?.firstName} {user?.lastName}</span>
                    <span className="user-role-text">{userRoleLabel}</span>
                  </div>

                  {/* 🚪 Sign out Button */}
                  <button 
                    className="nav-link logout-link-mobile" 
                    onClick={() => { logout(); closeMenu(); }}
                    style={{ border: 'none', background: 'transparent', color: '#ef4444', fontWeight: '700', cursor: 'pointer', padding: '10px 0' }}
                  >
                     Sign out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* PERSISTENT ACTIONS (Notifications & Desktop Profile) */}
          {isLoggedIn && (
            <div className="persistent-header-actions">
              {/* 📊 Desktop Dashboard Link */}
              <Link to="/dashboard" className="btn-secondary dashboard-desktop-link desktop-only" style={{ marginRight: '10px' }}>
                Dashboard
              </Link>

              {/* 🔔 Notifications */}
              <div className="nav-notifications-container" ref={notifyRef}>
                <button 
                  className={`btn-icon-nav ${isNotificationsOpen ? 'active' : ''} ${unreadCount > 0 ? 'alert-pulse' : ''}`}
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                >
                  <span className="notify-bell">🔔</span>
                  {unreadCount > 0 && <span className="notify-badge">{unreadCount}</span>}
                </button>
                {isNotificationsOpen && (
                  <div className="notifications-dropdown glass">
                    <div className="notify-header">NOTIFICATIONS</div>
                    <div className="notify-list">
                      {notifications.length > 0 ? (
                        notifications.map(n => (
                          <div 
                            key={n.id} 
                            className={`notify-item ${n.read ? 'read' : 'unread'}`}
                            onClick={() => handleMarkAsRead(n.id)}
                          >
                            <div className="notify-status-dot"></div>
                            <div className="notify-content">
                              <span className="notify-title">{n.title}</span>
                              <span className="notify-text">{n.message}</span>
                              <span className="notify-time">
                                {(() => {
                                  if (!n.timestamp) return 'Just Now';
                                  try {
                                    if (Array.isArray(n.timestamp)) {
                                      const [y, m, d, h, min, s] = n.timestamp;
                                      return new Date(y, m - 1, d, h, min, s || 0).toLocaleString([], { hour: '2-digit', minute: '2-digit' });
                                    }
                                    const d = new Date(n.timestamp);
                                    return isNaN(d.getTime()) ? 'Just Now' : d.toLocaleString([], { hour: '2-digit', minute: '2-digit' });
                                  } catch (e) { return 'Just Now'; }
                                })()}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="notify-empty">No unread alerts for this cycle.</div>
                      )}
                    </div>
                    <div className="notify-footer">
                      {unreadCount > 0 && (
                        <button className="notify-mark-all" onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const id = user?.uid || user?.id;
                            await apiClient.put(`/api/notifications/mark-all-read?userId=${id}`);
                            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                            setUnreadCount(0);
                          } catch {}
                        }}>Mark all read</button>
                      )}
                      <button className="notify-view-all" onClick={() => { setIsNotificationsOpen(false); navigate('/notifications'); }}>View all →</button>
                    </div>
                  </div>
                )}
              </div>

              {/* 👤 Desktop Profile (Hidden on Mobile) */}
              <div className="nav-profile-container desktop-profile-item" ref={profileRef}>
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
                    <button className="dropdown-item logout-item" onClick={() => { logout(); closeMenu(); }}>
                       Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
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
        .brand-divider { width: 1px; height: 30px; background: rgba(212, 175, 55, 0.15); }
        .ai-brand { display: flex; flex-direction: column; }
        .ai-name { font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 1.1rem; color: var(--accent-burgundy); }
        .ai-tagline { font-family: 'Outfit', sans-serif; font-size: 0.55rem; font-weight: 800; color: #D4AF37; letter-spacing: 0.5px; margin-top: -2px; }

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
        .persistent-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-left: 15px;
          position: relative;
          z-index: 2100; /* Higher than mobile-menu-wrapper (2050) */
        }
        .mobile-only { display: none !important; }
        .desktop-only { display: flex !important; }

        @media (max-width: 1200px) {
          .mobile-only { display: flex !important; }
          .desktop-only { display: none !important; }
          
          .brand-section { order: 1; }
          .persistent-header-actions {
            margin-left: auto;
            order: 2;
          }
          .mobile-toggle { 
            order: 3;
            display: flex !important;
            margin-left: 15px !important;
          }
          
          .desktop-profile-item { display: none !important; }
          .mobile-profile-item { 
            display: block !important; 
            margin-bottom: 20px;
            width: fit-content;
          }
        }
        
        .desktop-profile-item { display: block; }
        .mobile-profile-item { display: none; }
        
        .notifications-dropdown, .profile-dropdown {
          z-index: 2200;
        }

        @media (max-width: 1200px) {
          .profile-dropdown {
            position: static !important;
            width: 100% !important;
            margin-top: 10px;
            box-shadow: none !important;
            transform: none !important;
          }
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
          transition: all 0.3s;
        }
        .btn-icon-nav.alert-pulse {
            border-color: #ef4444;
            animation: nav-border-pulse 2s infinite;
        }
        @keyframes nav-border-pulse {
            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
            70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .notify-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 18px;
          height: 18px;
          background: #ef4444;
          color: white;
          font-size: 0.55rem;
          font-weight: 800;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          animation: badge-pulse 1s ease-out;
        }
        @keyframes badge-pulse {
            0% { transform: scale(0.5); opacity: 0; }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); opacity: 1; }
        }
        
        .notifications-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 10px;
          min-width: 340px;
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
          text-transform: uppercase;
        }
        .notify-list {
          max-height: 400px;
          overflow-y: auto;
        }
        .notify-item {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(0,0,0,0.03);
          display: flex;
          gap: 12px;
          transition: all 0.2s;
          cursor: pointer;
          align-items: flex-start;
        }
        .notify-item.unread { background: rgba(127, 29, 29, 0.025); }
        .notify-item:hover {
          background: rgba(127, 29, 29, 0.05);
        }
        .notify-status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #ef4444;
            margin-top: 4px;
            flex-shrink: 0;
            opacity: 0;
        }
        .notify-item.unread .notify-status-dot { opacity: 1; }
        .notify-content { display: flex; flex-direction: column; gap: 2px; }
        .notify-title { font-size: 0.75rem; font-weight: 800; color: var(--accent-burgundy); }
        .notify-text {
          font-size: 0.7rem;
          font-weight: 600;
          color: #555;
          line-height: 1.4;
        }
        .notify-time {
          font-size: 0.6rem;
          color: #999;
          font-weight: 600;
          margin-top: 4px;
        }
        .notify-empty {
          padding: 30px 20px;
          text-align: center;
          font-size: 0.85rem;
          color: #bbb;
        }
        .notify-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 20px;
          border-top: 1px solid rgba(0,0,0,0.05);
          background: #fbfbfb;
          gap: 8px;
        }
        .notify-mark-all, .notify-view-all {
          border: none;
          background: transparent;
          cursor: pointer;
          font-family: 'Outfit', sans-serif;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 4px 0;
          transition: color 0.2s;
        }
        .notify-mark-all {
          color: #64748b;
        }
        .notify-mark-all:hover { color: #059669; }
        .notify-view-all {
          color: var(--accent-burgundy);
          margin-left: auto;
        }
        .notify-view-all:hover { text-decoration: underline; }

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
          margin-top: 8px;
          min-width: 180px;
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          z-index: 2500;
          overflow: hidden;
          padding: 4px 0;
        }
        .profile-dropdown-header {
          padding: 10px 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .user-name { 
          font-size: 0.8rem; 
          font-weight: 700; 
          color: var(--text-main); 
          text-transform: capitalize;
        }
        .user-role-badge { 
          font-size: 0.55rem; 
          font-weight: 800; 
          color: #D4AF37; 
          letter-spacing: 1px;
        }
        .dropdown-divider { height: 1px; background: rgba(0,0,0,0.06); margin: 4px 0; }
        
        .dropdown-item {
          padding: 10px 16px;
          text-decoration: none;
          color: rgba(15, 23, 42, 0.7);
          font-size: 0.7rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.2s;
          border: none;
          background: transparent;
          width: 100%;
          cursor: pointer;
          text-align: left;
        }
        .dropdown-item:hover { background: rgba(0, 0, 0, 0.03); color: var(--text-main); }
        .logout-item { color: rgba(15, 23, 42, 0.7); }
        .logout-item:hover { background: rgba(239, 68, 68, 0.05) !important; color: #ef4444 !important; }

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
          .logged-in-actions {
            display: flex;
            flex-direction: column;
            gap: 20px;
            width: 100%;
            align-items: center;
          }
          .mobile-user-info {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            margin-top: 10px;
          }
          .user-name-text {
            font-size: 1.1rem;
            font-weight: 700;
            color: #1a1a1a;
          }
          .user-role-text {
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--accent-burgundy);
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .logout-link-mobile {
            font-size: 1rem !important;
            margin-top: 5px;
          }
          .btn-secondary, .btn-premium { font-size: 0.95rem; padding: 14px; }
          .help-icon-wrapper { padding: 12px; border-width: 2px; }
          .help-text { font-size: 0.9rem; }
        }

        @media (max-width: 480px) {
          .brand-divider, .ai-brand-link { display: none; }
          .brand-name { font-size: 1.15rem; }
          .nav-menu-wrapper { width: 100%; max-width: none; }
          .notifications-dropdown {
            min-width: 280px;
            width: calc(100vw - 30px);
            position: fixed;
            left: 15px;
            right: 15px;
            top: 70px;
          }
        }
      `}</style>
    </nav>
    </>
  )
}

export default Navbar
