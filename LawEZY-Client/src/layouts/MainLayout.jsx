import React, { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import FloatingMessenger from '../components/FloatingMessenger';
import useAuthStore from '../store/useAuthStore';
import apiClient from '../services/apiClient';

const MainLayout = () => {
  const location = useLocation();
  const path = location.pathname;
  const { systemMode, setSystemMode, user, updateLastSeen } = useAuthStore();

  // 🕒 INSTITUTIONAL SESSION HEARTBEAT: Update 'lastSeen' on navigation and every 5 minutes
  useEffect(() => {
    if (user) {
      updateLastSeen();
      const heartbeat = setInterval(() => updateLastSeen(), 5 * 60 * 1000);
      return () => clearInterval(heartbeat);
    }
  }, [user, path, updateLastSeen]);

  // 🔄 AUTO SCROLL-TO-TOP ON NAVIGATION
  useEffect(() => {
    window.scrollTo(0, 0);
    // Fetch global system mode on navigation
    apiClient.get('/api/system/mode').then(res => {
      if (res.data?.mode) setSystemMode(res.data.mode);
    }).catch(err => console.error("Failed to sync system mode"));

    // 🚀 REAL-TIME SYSTEM SYNC: Listen for Global Status Changes
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    const wsUrl = apiUrl.replace('/api', '') + '/ws';
    const socket = new SockJS(wsUrl);
    const stompClient = Stomp.over(socket);
    stompClient.debug = null; // Disable logging to keep console clean

    stompClient.connect({}, () => {
      stompClient.subscribe('/topic/system-status', (message) => {
        const data = JSON.parse(message.body);
        if (data.mode) {
          setSystemMode(data.mode);
        }
      });

      stompClient.subscribe('/topic/public-alerts', (message) => {
        const data = JSON.parse(message.body);
        setActiveAlert(data);
        // Auto-dismiss after 15 seconds
        setTimeout(() => setActiveAlert(null), 15000);
      });
    });

    return () => {
      if (stompClient.connected) stompClient.disconnect();
    };
  }, [path, setSystemMode]);

  const [activeAlert, setActiveAlert] = React.useState(null);

  // 🛡️ NAVIGATION GOVERNANCE
  const isAuthPage = path === '/login' || path === '/signup';
  const isAdminPage = path.startsWith('/admin');
  
  const hideFooterRoutes = [
    '/lawino-ai', '/messages', '/dashboard', '/profile',
    '/account', '/library', '/wallet', '/admin'
  ];

  const isWorkspacePage = hideFooterRoutes.some(route => path.startsWith(route));

  // MAINTENANCE GOVERNANCE
  const maintenanceBlockedRoutes = ['/experts', '/dashboard', '/messages'];
  const isBlockedByMaintenance = systemMode === 'MAINTENANCE' && 
                                 maintenanceBlockedRoutes.some(route => path.startsWith(route)) && 
                                 user?.role?.toUpperCase() !== 'ADMIN';

  return (
    <div className="layout-root">
      {!isAuthPage && !isAdminPage && <Navbar />}
      
      {systemMode === 'TESTING' && !isAdminPage && (
        <div className="testing-mode-banner">
          ⚠️ <strong>SYSTEM IN TESTING MODE:</strong> Some features may be unstable or experimental.
        </div>
      )}

      {activeAlert && (
        <div className={`system-alert-banner ${activeAlert.level?.toLowerCase()}`}>
          <div className="alert-content">
            <span className="alert-icon">
              {activeAlert.level === 'DANGER' ? '🛑' : activeAlert.level === 'WARNING' ? '⚠️' : '📢'}
            </span>
            <div className="alert-text">
              <strong>INSTITUTIONAL NOTICE:</strong> {activeAlert.message}
            </div>
          </div>
          <button className="btn-close-alert" onClick={() => setActiveAlert(null)}>×</button>
        </div>
      )}

      <main className="content">
        {isBlockedByMaintenance ? (
          <div className="maintenance-lock-screen">
            <div className="lock-icon">🚧</div>
            <h2>System Under Maintenance</h2>
            <p>This module is currently offline for critical institutional upgrades. Please check back later.</p>
          </div>
        ) : (
          <Suspense fallback={
            <div className="page-loader-inline">
              <div className="loader-institutional"></div>
              <p>Institutional Intel Incoming...</p>
            </div>
          }>
            <Outlet />
          </Suspense>
        )}
      </main>
      {!isAuthPage && !isAdminPage && !isWorkspacePage && <Footer />}
      {!isAuthPage && !isAdminPage && !isWorkspacePage && user?.role !== 'ADMIN' && user?.role !== 'MASTER_ADMIN' && <FloatingMessenger />}

      <style jsx="true">{`
        .layout-root {
          width: 100%;
          min-height: 100vh;
          background: var(--primary-bg);
          display: flex;
          flex-direction: column;
        }
        .content {
          flex: 1;
          width: 100%;
          position: relative;
          min-height: calc(100vh - 70px); /* Fill screen to keep footer down */
          display: flex;
          flex-direction: column;
        }
        .page-loader-inline {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 100px 0;
          color: var(--accent-burgundy);
          font-weight: 700;
          font-size: 0.8rem;
          letter-spacing: 1px;
        }

        .system-alert-banner {
          background: var(--elite-gold);
          color: #000;
          padding: 12px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 1000;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }

        .system-alert-banner.warning {
          background: #f59e0b;
        }

        .system-alert-banner.danger {
          background: #ef4444;
          color: white;
        }

        .alert-content {
          display: flex;
          align-items: center;
          gap: 12px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .alert-text {
          font-size: 0.95rem;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
        }

        .btn-close-alert {
          background: transparent;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .btn-close-alert:hover {
          opacity: 1;
        }

        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }

        .testing-mode-banner {
          background: #f59e0b;
          color: #000;
          padding: 8px;
          text-align: center;
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
      `}</style>
    </div>
  )
}

export default MainLayout

