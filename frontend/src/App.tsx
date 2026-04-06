import { BrowserRouter, Routes, Route } from 'react-router'
import Landing from './pages/Landing'
import LoginPage from './pages/LoginPage'
import Admin from './pages/Admin'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/dashboard" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
