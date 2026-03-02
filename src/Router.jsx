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
// AJOUTE CETTE LIGNE :
import AddTransaction from '@/pages/AddTransaction' 

// ... (Garde tes fonctions ProtectedRoute, AdminRoute et LoadingSpinner telles quelles)

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
        <Route path="transactions/add" element={<AddTransaction />} />
        
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