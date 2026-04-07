import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { AuthProvider } from './context/AuthContext'
import { CookieConsentProvider } from './context/CookieConsentContext'
import CookieConsentBanner from './components/CookieConsentBanner'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './components/AdminLayout'
import Landing from './pages/Landing'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import LogoutPage from './pages/LogoutPage'
import CookiePolicyPage from './pages/CookiePolicyPage'
import Admin from './pages/Admin'
import AdminDonors from './pages/AdminDonors'
import AdminCaseload from './pages/AdminCaseload'
import AdminCounseling from './pages/AdminCounseling'
import AdminVisitations from './pages/AdminVisitations'
import AdminSocialMedia from './pages/AdminSocialMedia'
import AdminReports from './pages/AdminReports'

function App() {
  return (
    <CookieConsentProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/logout" element={<LogoutPage />} />
            <Route path="/cookies" element={<CookiePolicyPage />} />

            {/* Admin portal — protected, shared sidebar layout */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Staff']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Admin />} />
              <Route path="donors" element={<AdminDonors />} />
              <Route path="caseload" element={<AdminCaseload />} />
              <Route path="counseling" element={<AdminCounseling />} />
              <Route path="visitations" element={<AdminVisitations />} />
              <Route path="social-media" element={<AdminSocialMedia />} />
              <Route path="reports" element={<AdminReports />} />
            </Route>

            {/* Donor portal placeholder */}
            <Route
              path="/donor/*"
              element={
                <ProtectedRoute allowedRoles={['Donor']}>
                  <div className="flex h-screen items-center justify-center">
                    <p className="text-lg text-medium-gray">Donor dashboard coming soon</p>
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
          <CookieConsentBanner />
        </BrowserRouter>
      </AuthProvider>
    </CookieConsentProvider>
  )
}

export default App
