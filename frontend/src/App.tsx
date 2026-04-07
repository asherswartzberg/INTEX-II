import { BrowserRouter, Routes, Route } from 'react-router'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing'
import LoginPage from './pages/LoginPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Staff']}>
                <div className="flex h-screen items-center justify-center">
                  <p className="text-lg text-medium-gray">Admin dashboard coming soon</p>
                </div>
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
