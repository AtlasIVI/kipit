import { useNavigate } from 'react-router-dom'
import { TrendingDown, TrendingUp, RefreshCw, Grid, Plus, Sprout } from 'lucide-react'

export default function AddModal({ onClose }) {
  const navigate = useNavigate()

  const actions = [
    { label: 'Dépense', icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50', to: '/transactions/add?type=expense' },
    { label: 'Revenu', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50', to: '/transactions/add?type=income' },
    { label: 'Investissement', icon: Sprout, color: 'text-emerald-600', bg: 'bg-emerald-100', to: '/transactions/add?type=investment' },
    { label: 'Abonnement', icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-50', to: '/subscriptions/add' },
    { label: 'Catégorie', icon: Grid, color: 'text-purple-500', bg: 'bg-purple-50', to: '/categories/add' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[32px] p-8 shadow-2xl border border-zinc-100 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
        <h2 className="text-xl font-bold mb-8 text-center dark:text-white">Ajouter</h2>
        
        <div className="grid grid-cols-2 gap-4">
          {actions.map(({ label, icon: Icon, color, bg, to }) => (
            <button
              key={label}
              onClick={() => { onClose(); navigate(to); }}
              className="flex flex-col items-center gap-4 p-5 rounded-3xl border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all active:scale-95"
            >
              <div className={`w-12 h-12 rounded-2xl ${bg} dark:bg-zinc-800 flex items-center justify-center`}>
                <Icon size={24} className={color} />
              </div>
              <span className="text-xs font-semibold dark:text-zinc-200">{label}</span>
            </button>
          ))}
        </div>

        <button onClick={onClose} className="mt-8 w-full py-2 text-zinc-400 font-medium text-sm">
          Fermer
        </button>
      </div>
    </div>
  )
}