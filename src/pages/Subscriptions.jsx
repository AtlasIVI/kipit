import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { 
  CreditCard, 
  Calendar, 
  ArrowRight, 
  AlertCircle, 
  Plus, 
  Loader2,
  RefreshCw
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Subscriptions() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetchSubscriptions()
  }, [user])

  async function fetchSubscriptions() {
    setLoading(true)
    const { data, error } = await supabase
      .from('recurring_rules')
      .select(`
        *,
        categories (name, icon)
      `)
      .eq('user_id', user?.id)
      .eq('is_subscription', true)
      .order('next_due_date', { ascending: true })
    
    if (data) setSubs(data)
    setLoading(false)
  }

  // Calculs financiers
  const totalRealThisMonth = subs
    .filter(s => {
      const dueDate = new Date(s.next_due_date)
      const now = new Date()
      return dueDate.getMonth() === now.getMonth() && dueDate.getFullYear() === now.getFullYear()
    })
    .reduce((acc, s) => acc + s.amount, 0)

  // Coût lissé (mensualisation des abonnements annuels/trimestriels)
  const totalSmoothed = subs.reduce((acc, s) => acc + (s.smoothed_amount || s.amount), 0)

  if (loading) return (
    <div className="flex h-60 items-center justify-center">
      <Loader2 className="animate-spin text-zinc-400" size={32} />
    </div>
  )

  return (
    <div className="space-y-6 pb-24">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Abonnements</h1>
          <p className="text-zinc-500 text-sm font-medium">Gestion de vos services récurrents</p>
        </div>
        <button 
          onClick={() => navigate('/transactions/add?type=expense&sub=true')}
          className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text-zinc-900 dark:text-white hover:scale-105 transition-transform"
        >
          <Plus size={20} />
        </button>
      </header>

      {/* Card: Résumé Financier (Style Revolut) */}
      <div className="bg-zinc-900 dark:bg-white p-8 rounded-[32px] text-white dark:text-zinc-900 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="opacity-60 text-xs font-black uppercase tracking-widest">Réel ce mois-ci</p>
              <h2 className="text-3xl font-black mt-1">{totalRealThisMonth.toLocaleString()} €</h2>
            </div>
            <RefreshCw className="opacity-20" size={40} />
          </div>
          
          <div className="h-px bg-white/10 dark:bg-zinc-100" />
          
          <div className="flex justify-between items-end">
            <div>
              <p className="opacity-60 text-xs font-black uppercase tracking-widest">Coût mensuel lissé</p>
              <p className="text-xl font-bold text-brand-400 dark:text-brand-600">
                {totalSmoothed.toFixed(2)} € <span className="text-xs opacity-60">/ mois</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] bg-white/10 dark:bg-zinc-100 px-2 py-1 rounded-lg font-bold uppercase">
                {subs.length} Services
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des abonnements par récurrence */}
      {['monthly', 'yearly', 'quarterly'].map((period) => {
        const filteredSubs = subs.filter(s => s.frequency === period)
        if (filteredSubs.length === 0) return null

        return (
          <div key={period} className="space-y-4">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] px-2">
              {period === 'monthly' ? 'Mensuels' : period === 'yearly' ? 'Annuels' : 'Trimestriels'}
            </h3>
            
            <div className="grid gap-3">
              {filteredSubs.map((sub) => (
                <div 
                  key={sub.id} 
                  className="bg-white dark:bg-zinc-900 p-5 rounded-[28px] border border-zinc-100 dark:border-zinc-800 flex items-center justify-between group hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-xl shadow-sm">
                      {sub.categories?.icon || '💳'}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-white">{sub.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-bold uppercase tracking-tighter">
                        <Calendar size={12} />
                        Prochain : {new Date(sub.next_due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-black text-zinc-900 dark:text-white">{sub.amount} €</p>
                    {sub.smooth_monthly && period !== 'monthly' && (
                      <p className="text-[10px] text-brand-500 font-black">
                        Lissé : {sub.smoothed_amount?.toFixed(2)}€/ms
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Empty State */}
      {subs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
            <RefreshCw size={32} className="text-zinc-300" />
          </div>
          <h3 className="text-lg font-bold dark:text-white">Aucun abonnement</h3>
          <p className="text-zinc-500 text-sm max-w-[240px] mt-2">
            Ajoutez vos services (Netflix, Spotify, Loyer) pour lisser votre budget.
          </p>
        </div>
      )}
    </div>
  )
}