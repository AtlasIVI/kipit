import { useNavigate } from 'react-router-dom'
import { TrendingDown, TrendingUp, RefreshCw, X } from 'lucide-react'

const options = [
  { label: 'Expense',      icon: TrendingDown, color: 'text-red-500',   bg: 'bg-red-50 dark:bg-red-950',   to: '/transactions/add?type=expense'      },
  { label: 'Income',       icon: TrendingUp,   color: 'text-brand-600', bg: 'bg-brand-50 dark:bg-brand-950', to: '/transactions/add?type=income'      },
  { label: 'Subscription', icon: RefreshCw,    color: 'text-blue-500',  bg: 'bg-blue-50 dark:bg-blue-950',  to: '/subscriptions/add'                  },
]

export default function AddModal({ onClose }) {
  const navigate = useNavigate()

  function handleOption(to) {
    onClose()
    navigate(to)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-t-3xl p-6 pb-safe shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Add new</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X size={20} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {options.map(({ label, icon: Icon, color, bg, to }) => (
            <button
              key={label}
              onClick={() => handleOption(to)}
              className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors"
            >
              <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center`}>
                <Icon size={22} className={color} />
              </div>
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
