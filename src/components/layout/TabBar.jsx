import { NavLink, useNavigate } from 'react-router-dom'
import { Home, List, BarChart2, RefreshCw, Plus } from 'lucide-react'
import { useState } from 'react'
import AddModal from '../ui/AddModal'

const tabs = [
  { to: '/',              icon: Home,       label: 'Home'      },
  { to: '/transactions',  icon: List,       label: 'Transactions' },
  { to: '/subscriptions', icon: RefreshCw,  label: 'Subs'      },
  { to: '/reports',       icon: BarChart2,  label: 'Reports'   },
]

export default function TabBar() {
  const [showAdd, setShowAdd] = useState(false)

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 h-tab-bar">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {tabs.slice(0, 2).map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-colors ${
                  isActive
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'
                }`
              }
            >
              <Icon size={22} strokeWidth={isActive => isActive ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          ))}

          {/* Center add button */}
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center justify-center w-14 h-14 -mt-6 rounded-full bg-brand-500 hover:bg-brand-600 active:scale-95 text-white shadow-lg shadow-brand-500/30 transition-all"
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>

          {tabs.slice(2).map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-colors ${
                  isActive
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'
                }`
              }
            >
              <Icon size={22} />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} />}
    </>
  )
}
