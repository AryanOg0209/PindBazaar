import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import SplashPage      from './pages/SplashPage';
import WelcomePage     from './pages/WelcomePage';
import WhyPage         from './pages/WhyPage';
import AuthGatePage    from './pages/AuthGatePage';
import AccountTypePage from './pages/AccountTypePage';
import PhonePage       from './pages/PhonePage';
import OtpPage         from './pages/OtpPage';
import ProfilePage     from './pages/ProfilePage';
import DocumentsPage   from './pages/DocumentsPage';
import PendingPage     from './pages/PendingPage';
import DashboardPage   from './pages/DashboardPage';
import MarketPage      from './pages/MarketPage';
import OrdersPage      from './pages/OrdersPage';
import ReportsPage     from './pages/ReportsPage';
import ProfilesPage    from './pages/ProfilesPage';
import SettingsPage    from './pages/SettingsPage';
import MarketInsightsPage from './pages/MarketInsightsPage';
import EquipmentPage   from './pages/EquipmentPage';
import MapPage         from './pages/MapPage';
import SchemesPage     from './pages/SchemesPage';
import AdminLogin      from './pages/admin/AdminLogin';
import AdminDashboard  from './pages/admin/AdminDashboard';
import AdminDetail     from './pages/admin/AdminDetail';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" style={{ marginTop: 80 }} />;
  if (!user)   return <Navigate to="/" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" style={{ marginTop: 80 }} />;
  if (user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.status === 'pending' || user.status === 'rejected') return <Navigate to="/pending" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Splash screen — auto-redirects to /auth after 2.5s */}
          <Route path="/"            element={<SplashPage />} />

          {/* Onboarding info pages */}
          <Route path="/language"    element={<WelcomePage />} />
          <Route path="/why"         element={<WhyPage />} />

          {/* Auth gate — redirects logged-in users to their destination */}
          <Route path="/auth"        element={<AuthGatePage />} />
          <Route path="/signup/type" element={<AccountTypePage />} />
          <Route path="/signup/phone" element={<PhonePage mode="signup" />} />
          <Route path="/login/phone"  element={<PhonePage mode="login" />} />
          <Route path="/signup/otp"  element={<OtpPage mode="signup" />} />
          <Route path="/login/otp"   element={<OtpPage mode="login" />} />

          {/* Profile setup (auth required, pending ok) */}
          <Route path="/setup/profile"   element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/setup/documents" element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />

          {/* Status screens */}
          <Route path="/pending"   element={<ProtectedRoute><PendingPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/market"    element={<ProtectedRoute><MarketPage /></ProtectedRoute>} />
          <Route path="/orders"    element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
          <Route path="/reports"         element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
          <Route path="/profile"         element={<ProtectedRoute><ProfilesPage /></ProtectedRoute>} />
          <Route path="/settings"        element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/market-insights" element={<ProtectedRoute><MarketInsightsPage /></ProtectedRoute>} />
          <Route path="/equipment"       element={<ProtectedRoute><EquipmentPage /></ProtectedRoute>} />
          <Route path="/map"             element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
          <Route path="/schemes"         element={<ProtectedRoute><SchemesPage /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin"       element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/application/:id" element={<ProtectedRoute adminOnly><AdminDetail /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
