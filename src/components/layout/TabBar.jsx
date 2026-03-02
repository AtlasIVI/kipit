import { NavLink } from 'react-router-dom'
import { Home, Wallet, PieChart, Settings, Plus } from 'lucide-react'

export default function TabBar({ onAddClick }) {
  const tabs = [
    { to: '/', icon: Home },
    { to: '/transactions', icon: Wallet },
    { isAction: true }, // Bouton central
    { to: '/reports', icon: PieChart },
    { to: '/settings', icon: Settings },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-100 dark:border-zinc-800 px-6 pb-safe h-tab-bar z-40">
      <div className="flex items-center justify-between h-16 max-w-lg mx-auto">
        {tabs.map((tab, i) => (
          tab.isAction ? (
            <button 
              key="add"
              onClick={onAddClick}
              className="w-12 h-12 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full flex items-center justify-center shadow-lg -translate-y-4 border-4 border-white dark:border-zinc-950"
            >
              <Plus size={24} />
            </button>
          ) : (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) => 
                `p-2 transition-colors ${isActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`
              }
            >
              <tab.icon size={24} />
            </NavLink>
          )
        ))}
      </div>
    </nav>
  )
}