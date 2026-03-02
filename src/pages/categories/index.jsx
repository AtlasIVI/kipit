import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { ChevronLeft, Edit2, Save, X, Layers, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function CategoriesManager() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [newAmount, setNewAmount] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (user) fetchCategoriesWithLimits()
  }, [user])

  async function fetchCategoriesWithLimits() {
    // On récupère les catégories ET on joint la table budget_limits
    const { data, error } = await supabase
      .from('categories')
      .select(`
        *,
        budget_limits (
          amount
        )
      `)
      .eq('user_id', user.id)
      .order('name')

    if (data) {
      // On aplatit le résultat pour avoir le montant directement dans l'objet
      const formatted = data.map(cat => ({
        ...cat,
        budget: cat.budget_limits?.[0]?.amount || 0
      }))
      setCategories(formatted)
    }
  }

  const handleUpdateBudget = async (categoryId) => {
    if (isUpdating) return
    setIsUpdating(true)
    
    try {
      const amount = parseFloat(newAmount)
      
      // Upsert dans budget_limits : on utilise category_id et user_id comme clés
      // Note : Pour que l'upsert fonctionne bien, il faut une contrainte unique sur category_id dans ta DB
      // sinon on fait un delete puis insert, ou on cherche l'ID existant.
      
      // Approche la plus sûre :
      const { data: existingLimit } = await supabase
        .from('budget_limits')
        .select('id')
        .eq('category_id', categoryId)
        .eq('user_id', user.id)
        .single()

      let error
      if (existingLimit) {
        // Update
        const res = await supabase
          .from('budget_limits')
          .update({ amount })
          .eq('id', existingLimit.id)
        error = res.error
      } else {
        // Insert
        const res = await supabase
          .from('budget_limits')
          .insert([{ 
            category_id: categoryId, 
            user_id: user.id, 
            amount 
          }])
        error = res.error
      }

      if (error) throw error

      // Mise à jour locale
      setCategories(categories.map(c => 
        c.id === categoryId ? { ...c, budget: amount } : c
      ))
      setEditingId(null)
    } catch (err) {
      console.error("Erreur update budget:", err.message)
      alert("Erreur lors de la sauvegarde")
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 p-4">
      <header className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
          <ChevronLeft size={24} className="text-zinc-900 dark:text-white" />
        </button>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Budgets & Catégories</h1>
      </header>

      <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-sm">
        {categories.map((cat, index) => (
          <div 
            key={cat.id} 
            className={`p-4 flex items-center justify-between transition-colors ${
              editingId === cat.id ? 'bg-zinc-50 dark:bg-zinc-800/50' : ''
            } ${index !== categories.length - 1 ? 'border-b border-zinc-50 dark:border-zinc-800/50' : ''}`}
          >
            <div className="flex items-center gap-4">
              <div className="text-xl w-10 h-10 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center">
                {cat.icon || '📦'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm text-zinc-900 dark:text-white">{cat.name}</p>
                  {cat.parent_id && <Layers size={12} className="text-zinc-400" />}
                </div>
                <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-tight">
                  Limite actuelle : {(cat.budget || 0).toLocaleString()} €
                </p>
              </div>
            </div>

            {editingId === cat.id ? (
              <div className="flex items-center gap-2 animate-in slide-in-from-right-1">
                <div className="relative">
                  <input 
                    type="number"
                    className="w-24 p-2 pr-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold focus:ring-2 ring-zinc-900 dark:ring-white outline-none text-zinc-900 dark:text-white transition-all"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    autoFocus
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 font-bold">€</span>
                </div>
                <button 
                  onClick={() => handleUpdateBudget(cat.id)} 
                  disabled={isUpdating}
                  className="p-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl"
                >
                  {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                </button>
                <button onClick={() => setEditingId(null)} className="p-2 text-zinc-400">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => { setEditingId(cat.id); setNewAmount(cat.budget || ''); }}
                className="p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-400 transition-all"
              >
                <Edit2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}