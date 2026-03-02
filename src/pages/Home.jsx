import { BarChart2, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function Home() {
  return (
    <div className="p-4 pt-safe space-y-6">
      {/* Header avec Solde */}
      <header className="flex justify-between items-center pt-4">
        <div>
          <h1 className="text-sm text-surface-500 dark:text-zinc-400 font-medium text-zinc-500">Solde Total</h1>
          <p className="text-3xl font-bold font-mono tracking-tight dark:text-white">$4,250.00</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600">
          <BarChart2 size={24} />
        </div>
      </header>

      {/* Carte Principale (Dépenses) */}
      <div className="bg-zinc-900 dark:bg-brand-600 text-white p-6 rounded-3xl shadow-xl shadow-brand-500/20">
        <div className="flex justify-between items-start mb-8">
          <div className="space-y-1">
            <span className="text-xs opacity-80 uppercase tracking-wider font-medium">Dépenses du mois</span>
            <p className="text-3xl font-mono font-semibold">$1,240.50</p>
          </div>
          <span className="bg-white/20 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1">
            <ArrowDownRight size={12} /> -12%
          </span>
        </div>
        
        {/* Barre de progression de budget */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] uppercase tracking-widest opacity-70">
            <span>Budget mensuel</span>
            <span>65%</span>
          </div>
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="w-[65%] h-full bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-100 dark:border-zinc-800">
          <div className="w-8 h-8 rounded-full bg-success/10 text-success flex items-center justify-center mb-3">
            <ArrowUpRight size={18} />
          </div>
          <p className="text-xs text-zinc-500">Revenus</p>
          <p className="text-lg font-mono font-bold dark:text-zinc-100">+$2,800</p>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-100 dark:border-zinc-800">
          <div className="w-8 h-8 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-3">
            <ArrowDownRight size={18} />
          </div>
          <p className="text-xs text-zinc-500">Dépenses</p>
          <p className="text-lg font-mono font-bold dark:text-zinc-100">-$840</p>
        </div>
      </div>
    </div>
  )
}