import { useNavigate } from 'react-router-dom'
import { TrendingDown, TrendingUp, RefreshCw, X, Sprout } from 'lucide-react'

const options = [
  { label: 'Dépense',      icon: TrendingDown, color: 'text-red-500',   bg: 'bg-red-50 dark:bg-red-950',   to: '/transactions/add?type=expense' },
  { label: 'Revenu',       icon: TrendingUp,   color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950', to: '/transactions/add?type=income' },
  { label: 'Abonnement',   icon: RefreshCw,    color: 'text-blue-500',  bg: 'bg-blue-50 dark:bg-blue-950',  to: '/subscriptions/add' },
  { label: 'Investissement', icon: Sprout,     color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', to: '/transactions/add?type=investment' },
]

export default function AddModal({ onClose }) {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-t-[40px] p-8 pb-safe shadow-2xl transition-all border-t border-white/10">
        <div className="w-12 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-6" />
        <h2 className="text-xl font-bold mb-8 text-center">Que voulez-vous ajouter ?</h2>
        <div className="grid grid-cols-2 gap-4">
          {options.map(({ label, icon: Icon, color, bg, to }) => (
            <button
              key={label}
              onClick={() => { onClose(); navigate(to); }}
              className="flex flex-col items-center gap-4 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 hover:scale-95 active:scale-90 transition-all"
            >
              <div className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center`}>
                <Icon size={28} className={color} />
              </div>
              <span className="text-sm font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}