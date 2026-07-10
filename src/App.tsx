import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PatientsPage from './pages/PatientsPage';
import AlertsPage from './pages/AlertsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AIInsightsPage from './pages/AIInsightsPage';
import DevicesPage from './pages/DevicesPage';
import { isAuthenticated } from './services/authService';

/**
 * Route guard component that redirects unauthenticated requests
 * to the login page.
 */
function ProtectedRoute() {
  const [auth, setAuth] = useState<boolean | null>(null);

  useEffect(() => {
    setAuth(isAuthenticated());
  }, []);

  if (auth === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="text-gray-500 font-medium animate-pulse">Authenticating session...</p>
      </div>
    );
  }

  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Dashboard routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/ai-insights" element={<AIInsightsPage />} />
            <Route path="/devices" element={<DevicesPage />} />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
