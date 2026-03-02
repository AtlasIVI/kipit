import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
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
import AddTransaction from '@/pages/transactions/add'
import AddCategory from '@/pages/categories/add'
import CategoriesManager from '@/pages/categories/index'
import AddSubscription from './pages/subscriptions/add'

// Composant de protection de route
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex h-screen items-center justify-center font-medium">Chargement...</div>
  if (!user) return <Navigate to="/login" replace />
  return children ? children : <Outlet />
}

// Composant de protection Admin
const AdminRoute = ({ children }) => {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (!profile?.is_admin) return <Navigate to="/" replace />
  return children
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Routes publiques */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Routes protégées avec le Layout principal */}
      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Home />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="transactions/add" element={<AddTransaction />} />
        <Route path="categories/add" element={<AddCategory />} />
        <Route path="subscriptions" element={<Subscriptions />} />
        <Route path="subscriptions/add" element={<AddSubscription />} />
        <Route path="settings" element={<Settings />} />
        <Route path="categories">
          <Route index element={<CategoriesManager />} />
          <Route path="add" element={<AddCategory />} />
        </Route>        
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