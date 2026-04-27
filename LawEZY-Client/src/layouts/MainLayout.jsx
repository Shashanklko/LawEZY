import React, { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import FloatingMessenger from '../components/FloatingMessenger';
import useAuthStore from '../store/useAuthStore';
import apiClient from '../services/apiClient';
import { whenConnected, subscribe, unsubscribe } from '../services/stompClient';

const MainLayout = () => {
  const location = useLocation();
  const path = location.pathname;
  const { systemMode, setSystemMode, user, updateLastSeen } = useAuthStore();
  const [activeAlert, setActiveAlert] = React.useState(null);

  // 🕒 DYNAMIC BANNER CALCULATOR: Ensure UI shifts correctly for stacked alerts
  const showTestingBanner = systemMode === 'TESTING' && !isAdminPage;
  const showGlobalAlert = !!activeAlert;
  
  const testingBannerHeight = showTestingBanner ? 36 : 0;
  const alertBannerHeight = showGlobalAlert ? 48 : 0;
  const totalBannerHeight = testingBannerHeight + alertBannerHeight;

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
  }, [path, setSystemMode]);

  // 🚀 REAL-TIME SYSTEM SYNC: Listen for Global Status Changes via shared STOMP client
  useEffect(() => {
    whenConnected(() => {
      subscribe('/topic/system-status', (data) => {
        if (data.mode) setSystemMode(data.mode);
      });

      subscribe('/topic/public-alerts', (data) => {
        setActiveAlert(data);
        setTimeout(() => setActiveAlert(null), 15000);
      });
    });

    return () => {
      unsubscribe('/topic/system-status');
      unsubscribe('/topic/public-alerts');
    };
  }, [setSystemMode]);

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
                                 user?.role?.toUpperCase() !== 'ADMIN' &&
                                 user?.role?.toUpperCase() !== 'MASTER_ADMIN';

  return (
    <div className="layout-root">
      {!isAuthPage && !isAdminPage && <Navbar />}
      
      {showTestingBanner && (
        <div className="system-global-banner testing-mode" style={{ top: '0px' }}>
          <span className="banner-icon">🧪</span>
          <div className="banner-text">
            <strong>INSTITUTIONAL TESTING ENVIRONMENT:</strong> You are currently operating in an experimental mode. Data may be reset or modified during this cycle.
          </div>
        </div>
      )}

      {showGlobalAlert && (
        <div 
          className={`system-global-banner alert-banner ${activeAlert.level?.toLowerCase()}`}
          style={{ top: `${testingBannerHeight}px`, height: '48px' }}
        >
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
          /* Handle global banner offsets dynamically */
          --banner-height: ${totalBannerHeight}px;
          padding-top: var(--banner-height);
          transition: padding-top 0.4s cubic-bezier(0.16, 1, 0.3, 1);
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
          font-size: 0.85rem;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          color: inherit;
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

        .system-global-banner {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          z-index: 2100; /* Above Navbar */
          font-family: 'Inter', sans-serif;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.3px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .system-global-banner.alert-banner {
          background: var(--elite-gold);
          color: #000;
        }

        .system-global-banner.alert-banner.warning {
          background: #f59e0b;
        }

        .system-global-banner.alert-banner.danger {
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

        .banner-icon { font-size: 1rem; }
        
        .banner-text strong {
          color: #000;
          margin-right: 4px;
        }
      `}</style>
    </div>
  )
}

export default MainLayout

