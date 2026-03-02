import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

// Layout
import AppLayout from '@/components/layout/AppLayout'

// Pages
import Home from '@/pages/Home'
import Transactions from '@/pages/Transactions'
import Subscriptions from '@/pages/Subscriptions'
import Reports from '@/pages/Reports'
import Settings from '@/pages/Settings'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Admin from '@/pages/Admin'
import NotFound from '@/pages/NotFound'

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen"><LoadingSpinner /></div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

// Admin only route
function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return null
  if (!user || !profile?.is_admin) return <Navigate to="/" replace />
  return children
}

function LoadingSpinner() {
  return (
    <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
  )
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes inside app layout */}
      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Home />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="subscriptions" element={<Subscriptions />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="admin" element={
          <AdminRoute>
            <Admin />
          </AdminRoute>
        } />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
