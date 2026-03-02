import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Home, ArrowLeftRight, RefreshCw, BarChart2, Plus } from 'lucide-react'
import { useState } from 'react'
import AddModal from '@/components/ui/AddModal'

const tabs = [
  { to: '/',              icon: Home,           label: 'Home'          },
  { to: '/transactions',  icon: ArrowLeftRight,  label: 'Transactions'  },
  { to: '/subscriptions', icon: RefreshCw,       label: 'Subscriptions' },
  { to: '/reports',       icon: BarChart2,        label: 'Reports'       },
]

export default function AppLayout() {
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto relative">
      {/* Page content */}
      <main className="flex-1 overflow-y-auto scrollbar-hide pb-24">
        <Outlet />
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white dark:bg-surface-900 border-t border-surface-100 dark:border-surface-800 tab-bar z-40">
        <div className="flex items-center justify-around px-2 pt-2">
          {tabs.slice(0, 2).map(tab => <TabItem key={tab.to} {...tab} />)}

          {/* Center Add button */}
          <button
            onClick={() => setShowAdd(true)}
            className="flex flex-col items-center -mt-6"
          >
            <span className="w-14 h-14 rounded-full bg-brand-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform">
              <Plus size={26} className="text-white" strokeWidth={2.5} />
            </span>
            <span className="text-[10px] mt-1 text-surface-400">Add</span>
          </button>

          {tabs.slice(2).map(tab => <TabItem key={tab.to} {...tab} />)}
        </div>
      </nav>

      {/* Add modal */}
      {showAdd && <AddModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

function TabItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${
          isActive
            ? 'text-brand-600 dark:text-brand-400'
            : 'text-surface-400 hover:text-surface-600 dark:hover:text-surface-300'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
          <span className="text-[10px] font-medium">{label}</span>
        </>
      )}
    </NavLink>
  )
}
