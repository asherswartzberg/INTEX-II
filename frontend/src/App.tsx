import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import Landing from './pages/Landing'
import LoginPage from './pages/LoginPage'
import AdminLayout from './components/AdminLayout'
import { BrowserRouter, Routes, Route } from 'react-router'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Admin from './pages/Admin'
import AdminDonors from './pages/AdminDonors'
import AdminCaseload from './pages/AdminCaseload'
import AdminCounseling from './pages/AdminCounseling'
import AdminVisitations from './pages/AdminVisitations'
import AdminSocialMedia from './pages/AdminSocialMedia'
import AdminReports from './pages/AdminReports'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Admin portal — all share the sidebar layout */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Admin />} />
          <Route path="donors" element={<AdminDonors />} />
          <Route path="caseload" element={<AdminCaseload />} />
          <Route path="counseling" element={<AdminCounseling />} />
          <Route path="visitations" element={<AdminVisitations />} />
          <Route path="social-media" element={<AdminSocialMedia />} />
          <Route path="reports" element={<AdminReports />} />
        </Route>
      </Routes>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Staff']}>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Staff']}>
                <Admin />
              </ProtectedRoute>
            }
          />
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
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
