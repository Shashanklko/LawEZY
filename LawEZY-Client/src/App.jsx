import React, { Suspense, lazy } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './layouts/MainLayout'
import useAuthStore from './store/useAuthStore'
import ToastContainer from './components/ToastContainer'
import SocketNotificationManager from './components/SocketNotificationManager'

// Dynamic Route Splitting for Performance
const Home = lazy(() => import('./pages/Home/Home'));
const LawinoAI = lazy(() => import('./pages/LawinoAI/LawinoAI'));
const Login = lazy(() => import('./pages/Auth/Login/Login'));
const Signup = lazy(() => import('./pages/Auth/Signup/Signup'));
const ForgotPassword = lazy(() => import('./pages/Auth/ForgotPassword/ForgotPassword'));
const ExpertListing = lazy(() => import('./pages/Experts/ExpertListing'));
const ExpertProfile = lazy(() => import('./pages/Experts/ExpertProfile'));
const Messages = lazy(() => import('./pages/Messages/Messages'));
const Profile = lazy(() => import('./pages/Account/Profile/Profile'));
const Library = lazy(() => import('./pages/Library/Library'));
const Community = lazy(() => import('./pages/Community/Community'));
const About = lazy(() => import('./pages/About/About'));
const FAQ = lazy(() => import('./pages/FAQ/FAQ'));
const Contact = lazy(() => import('./pages/Contact/Contact'));
const Wallet = lazy(() => import('./pages/Wallet/Wallet'));
const ExpertDashboard = lazy(() => import('./pages/Account/Dashboard/ExpertDashboard'));
const ClientDashboard = lazy(() => import('./pages/Account/Dashboard/ClientDashboard'));
const DocumentAnalyzer = lazy(() => import('./pages/LawinoAI/DocumentAnalyzer'));
const Notifications = lazy(() => import('./pages/Notifications/Notifications'));
const JoinNetwork = lazy(() => import('./pages/Institutional/JoinNetwork'));
const AdminPortal = lazy(() => import('./pages/Admin/AdminPortal'));
const ExpertAuditLogs = lazy(() => import('./pages/Admin/ExpertAuditLogs'));
const ExpertAuditProfile = lazy(() => import('./pages/Admin/ExpertAuditProfile'));
const ClientAuditLogs = lazy(() => import('./pages/Admin/ClientAuditLogs'));
const ClientAuditProfile = lazy(() => import('./pages/Admin/ClientAuditProfile'));

const DashboardSwitcher = () => {
  const { user, viewMode, impersonatedUser } = useAuthStore();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  if (!user && !impersonatedUser) return <LoadingFallback />;
  if (!viewMode) return <LoadingFallback />;

  if (viewMode === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  return (
    <>
      {viewMode === 'CLIENT'
        ? <ClientDashboard overrideUser={impersonatedUser} />
        : <ExpertDashboard overrideUser={impersonatedUser} />}
    </>
  );
};

const LoadingFallback = () => (
  <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
    <div className="elite-sync-spinner"></div>
  </div>
);

const App = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SocketNotificationManager />
      <ToastContainer />
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route 
            path="lawino-ai" 
            element={
              <ProtectedRoute>
                <LawinoAI />
              </ProtectedRoute>
            } 
          />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="experts" element={<ExpertListing />} />
          <Route path="expert/:id" element={<ExpertProfile />} />
          <Route path="p/:slug" element={<ExpertProfile />} />
          <Route 
            path="messages" 
            element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="wallet" 
            element={
              <ProtectedRoute>
                <Wallet />
              </ProtectedRoute>
            } 
          />
          <Route path="library" element={<Library />} />
          <Route path="resources" element={<Navigate to="/library" replace />} />
          <Route path="community" element={<Community />} />
          <Route path="about" element={<About />} />
          <Route 
            path="dashboard" 
            element={
              <ProtectedRoute>
                <DashboardSwitcher />
              </ProtectedRoute>
            } 
          />
          <Route path="faq" element={<FAQ />} />
          <Route path="contact" element={<Contact />} />
          <Route path="join-network" element={<JoinNetwork />} />
          <Route 
            path="lawino-ai/analyzer" 
            element={
              <ProtectedRoute>
                <DocumentAnalyzer />
              </ProtectedRoute>
            } 
          />
          {/* Legacy Institutional Bridges */}
          <Route path="account/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="account/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
          <Route
            path="notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route 
            path="admin" 
            element={
              <ProtectedRoute>
                <AdminPortal />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="admin/experts/:id/logs" 
            element={
              <ProtectedRoute>
                <ExpertAuditLogs />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="admin/experts/:id/profile" 
            element={
              <ProtectedRoute>
                <ExpertAuditProfile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="admin/clients/:id/logs" 
            element={
              <ProtectedRoute>
                <ClientAuditLogs />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="admin/clients/:id/profile" 
            element={
              <ProtectedRoute>
                <ClientAuditProfile />
              </ProtectedRoute>
            } 
          />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App

