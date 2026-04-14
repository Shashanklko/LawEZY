import React, { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './layouts/MainLayout'
import useAuthStore from './store/useAuthStore'

// Dynamic Route Splitting for Performance
const Home = lazy(() => import('./pages/Home/Home'));
const LawinoAI = lazy(() => import('./pages/LawinoAI/LawinoAI'));
const Login = lazy(() => import('./pages/Auth/Login/Login'));
const Signup = lazy(() => import('./pages/Auth/Signup/Signup'));
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

const DashboardSwitcher = () => {
  const { user } = useAuthStore();
  const [viewMode, setViewMode] = React.useState(null);

  // Initialize view mode based on role
  React.useEffect(() => {
    if (user && viewMode === null) {
      setViewMode(user.role === 'CLIENT' ? 'CLIENT' : 'EXPERT');
    }
  }, [user, viewMode]);

  if (!user || viewMode === null) return <LoadingFallback />;

  return viewMode === 'CLIENT' 
    ? <ClientDashboard onToggleView={() => setViewMode('EXPERT')} /> 
    : <ExpertDashboard onToggleView={() => setViewMode('CLIENT')} />;
};

const LoadingFallback = () => (
  <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
    <div className="elite-sync-spinner"></div>
  </div>
);

const App = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
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
          <Route path="experts" element={<ExpertListing />} />
          <Route path="expert/:id" element={<ExpertProfile />} />
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
          
          {/* Legacy Institutional Bridges */}
          <Route path="account/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="account/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App
