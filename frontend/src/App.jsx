import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import PublicLayout from './components/layout/PublicLayout.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import VerifyPage from './pages/VerifyPage.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import CertificateDetail from './pages/university/CertificateDetail.jsx';
import UniversityDashboard from './pages/university/UniversityDashboard.jsx';

export default function App() {
  return (
    <Routes>
      {/* ── Public routes (no authentication required) ───────────────────── */}
      <Route
        path="/"
        element={
          <PublicLayout>
            <Landing />
          </PublicLayout>
        }
      />
      <Route
        path="/login"
        element={
          <PublicLayout>
            <Login />
          </PublicLayout>
        }
      />
      {/* /verify without an ID redirects to home so users use the VerifyPanel */}
      <Route path="/verify" element={<Navigate to="/" replace />} />
      <Route
        path="/verify/:certificateId"
        element={
          <PublicLayout>
            <VerifyPage />
          </PublicLayout>
        }
      />

      {/* ── Admin routes ─────────────────────────────────────────────────── */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* ── University routes ─────────────────────────────────────────────── */}
      <Route
        path="/university"
        element={
          <ProtectedRoute role="university">
            <UniversityDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/university/certificate/:certificateId"
        element={
          <ProtectedRoute role="university">
            <CertificateDetail />
          </ProtectedRoute>
        }
      />

      {/* ── Catch-all ─────────────────────────────────────────────────────── */}
      <Route
        path="*"
        element={
          <PublicLayout>
            <NotFound />
          </PublicLayout>
        }
      />
    </Routes>
  );
}
