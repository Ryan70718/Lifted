import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { Layout } from './components/layout/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Reps } from './pages/Reps'
import { DispensaryMap } from './pages/DispensaryMap'
import { Routing } from './pages/Routing'
import { Inventory } from './pages/Inventory'
import { Timeline } from './pages/Timeline'
import { Calculator } from './pages/Calculator'
import { Compliance } from './pages/Compliance'
import { Leads } from './pages/Leads'

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080b12] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-indigo-500/40 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/reps" element={<Reps />} />
        <Route path="/map" element={<DispensaryMap />} />
        <Route path="/routing" element={<Routing />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/calculator" element={<Calculator />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
