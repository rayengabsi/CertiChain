import { Navigate, Route, Routes } from 'react-router-dom';
import NavBar from './components/NavBar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import VerifyPage from './pages/VerifyPage.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import CertificateDetail from './pages/university/CertificateDetail.jsx';
import UniversityDashboard from './pages/university/UniversityDashboard.jsx';

export default function App() {
  return (
    <>
      <NavBar />
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify" element={<Navigate to="/" replace />} />
          <Route path="/verify/:certificateId" element={<VerifyPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="footer">
        <div className="container">
          CertiChain — blockchain-anchored diploma verification (Hardhat local chain · chainId 31337).
          The blockchain is the source of truth; student personal data never leaves the off-chain database.
        </div>
      </footer>
    </>
  );
}
