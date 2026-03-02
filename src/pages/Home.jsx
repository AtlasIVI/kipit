import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { ChevronLeft, ChevronRight, User, Loader2 } from 'lucide-react'

// Fonction utilitaire pour déterminer la couleur de la barre
const getBarColor = (spent, budget) => {
  if (!budget || budget === 0) return '#6366f1'; // Par défaut (Indigo)
  const ratio = spent / budget;
  if (ratio >= 1) return '#ef4444'; // Rouge (>100%)
  if (ratio >= 0.7) return '#f97316'; // Orange (70-100%)
  return '#6366f1'; // Indigo (<70%)
};

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ spent: 0, budget: 0, income: 0 })
  const [activeCategories, setActiveCategories] = useState([])

  useEffect(() => {
    if (user) fetchDashboardData()
  }, [user])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const { data: allCategories } = await supabase
        .from('categories')
        .select(`
          *,
          budget_limits (
            amount
          )
        `)
        .eq('user_id', user.id)

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startOfMonth)

      if (allCategories && transactions) {
        const formattedCategories = allCategories.map(cat => ({
          ...cat,
          budget: cat.budget_limits?.[0]?.amount || 0
        }))

        const spendMap = transactions.reduce((acc, t) => {
          if (t.type === 'expense') {
            acc[t.category_id] = (acc[t.category_id] || 0) + t.amount
          }
          return acc
        }, {})

        const parents = formattedCategories.filter(c => !c.parent_id).map(parent => {
          const children = formattedCategories.filter(c => c.parent_id === parent.id).map(child => ({
            ...child,
            amountSpent: spendMap[child.id] || 0
          }))

          const parentDirectSpend = spendMap[parent.id] || 0
          const childrenTotalSpend = children.reduce((acc, child) => acc + child.amountSpent, 0)
          
          return {
            ...parent,
            amountSpent: parentDirectSpend + childrenTotalSpend,
            children: children.filter(c => c.amountSpent > 0 || c.budget > 0)
          }
        })

        const activeDashboard = parents.filter(p => p.budget > 0 || p.amountSpent > 0)

        setActiveCategories(activeDashboard)
        
        const spentTotal = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)
        const incomeTotal = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0)
        const budgetTotal = formattedCategories.reduce((acc, c) => acc + (c.budget || 0), 0)
        
        setStats({ spent: spentTotal, budget: budgetTotal, income: incomeTotal })
      }
    } catch (error) {
      console.error("Erreur Dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-950">
      <Loader2 className="animate-spin text-zinc-400" size={32} />
    </div>
  )

  const globalBarColor = getBarColor(stats.spent, stats.budget);
  const isGlobalOver = stats.budget > 0 && stats.spent > stats.budget;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold dark:text-white">Mars 2026</h2>
          <div className="flex gap-1 text-zinc-400">
            <ChevronLeft size={20} className="cursor-pointer hover:text-zinc-900" />
            <ChevronRight size={20} className="cursor-pointer hover:text-zinc-900" />
          </div>
        </div>
        <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
          <User size={20} className="dark:text-white" />
        </div>
      </div>

      {/* Card: Monthly Budget Global */}
      <div className="bg-zinc-900 p-8 rounded-[32px] shadow-2xl text-white">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="opacity-60 text-sm font-medium">Dépenses du mois</p>
            <h3 className="text-4xl font-bold">
              {stats.spent.toLocaleString()} €
            </h3>
          </div>
          <div className="text-right">
            <p className="opacity-60 text-xs font-bold uppercase tracking-widest">Budget total</p>
            <p className="text-lg font-bold">{stats.budget.toLocaleString()} €</p>
          </div>
        </div>
        
        <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
          <div 
            className="h-full transition-all duration-700 ease-out" 
            style={{ 
              width: `${Math.min((stats.spent / (stats.budget || 1)) * 100, 100)}%`,
              backgroundColor: globalBarColor // Couleur dynamique ici
            }}
          />
        </div>
      </div>

      {/* Grid: Income & Net */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-50 dark:bg-emerald-950/20 p-6 rounded-[28px] border border-emerald-100 dark:border-emerald-900/30">
          <p className="text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1">Revenus</p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">+{stats.income} €</p>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-[28px] border border-zinc-100 dark:border-zinc-800">
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1">Solde Net</p>
          <p className="text-2xl font-bold dark:text-white">{(stats.income - stats.spent).toLocaleString()} €</p>
        </div>
      </div>

      {/* Card: Analyse par catégorie (Version Compacte) */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Limites</h3>
          <button onClick={() => navigate('/categories')} className="text-xs font-bold text-zinc-400 hover:text-zinc-900">Modifier</button>
        </div>

        <div className="space-y-6">
          {activeCategories.map((cat) => {
            const percentage = cat.budget > 0 ? Math.min((cat.amountSpent / cat.budget) * 100, 100) : 0;
            const isOver = cat.budget > 0 && cat.amountSpent > cat.budget;
            const catBarColor = getBarColor(cat.amountSpent, cat.budget); // Couleur dynamique par catégorie

            return (
              <div key={cat.id} onClick={() => navigate('/categories')} className="group cursor-pointer">
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cat.icon}</span>
                    <span className="text-sm font-bold dark:text-white">{cat.name}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-[11px] font-black ${isOver ? 'text-red-500' : 'dark:text-white'}`}>
                      {cat.amountSpent.toLocaleString()}€
                    </span>
                    {cat.budget > 0 && (
                      <span className="text-[10px] text-zinc-400 font-bold uppercase ml-1">/ {cat.budget}€</span>
                    )}
                  </div>
                </div>
                
                {cat.budget > 0 && (
                  <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ease-out`}
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: catBarColor // Couleur dynamique ici
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  )
}