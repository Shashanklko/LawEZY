import React, { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const MainLayout = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const isWorkspacePage = location.pathname === '/lawino-ai' || location.pathname === '/messages' || location.pathname === '/profile' || location.pathname === '/library' || location.pathname === '/dashboard';

  return (
    <div className="layout-root">
      {!isAuthPage && <Navbar />}
      <main className="content">
        <Suspense fallback={
          <div className="page-loader-inline">
            <div className="loader-strategic"></div>
            <p>Institutional Intel Incoming...</p>
          </div>
        }>
          <Outlet />
        </Suspense>
      </main>
      {!isAuthPage && !isWorkspacePage && <Footer />}

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
      `}</style>
    </div>
  )
}

export default MainLayout
