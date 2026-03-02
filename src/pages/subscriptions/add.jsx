import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Calendar, RefreshCw, Tag, Info, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export default function AddSubscription() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState([])

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'monthly',
    category_id: '',
    start_date: new Date().toISOString().split('T')[0],
    smooth_monthly: true, // Par défaut, on propose l'étalonnage
  })

  useEffect(() => {
    if (user) fetchCategories()
  }, [user])

  async function fetchCategories() {
    const { data } = await supabase.from('categories').select('*').order('name')
    if (data) setCategories(data)
  }

  // Calcul du montant lissé (étalonnage)
  const getSmoothedAmount = () => {
    const val = parseFloat(formData.amount) || 0
    if (formData.frequency === 'yearly') return (val / 12).toFixed(2)
    if (formData.frequency === 'quarterly') return (val / 3).toFixed(2)
    return val.toFixed(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const amount = parseFloat(formData.amount)
    const smoothed = formData.smooth_monthly ? parseFloat(getSmoothedAmount()) : amount

    try {
      const { error } = await supabase.from('recurring_rules').insert([{
        user_id: user.id,
        name: formData.name,
        amount: amount,
        smoothed_amount: smoothed,
        frequency: formData.frequency,
        category_id: formData.category_id,
        start_date: formData.start_date,
        next_due_date: formData.start_date, // Première échéance
        is_subscription: true,
        smooth_monthly: formData.smooth_monthly,
        type: 'expense'
      }])

      if (error) throw error
      navigate('/subscriptions')
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto pb-10 px-4">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
          <ChevronLeft size={24} className="dark:text-white" />
        </button>
        <h1 className="text-xl font-bold dark:text-white">Nouvel abonnement</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Montant & Nom */}
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-6 text-center">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Coût du prélèvement</label>
            <div className="flex items-center justify-center gap-2">
              <input 
                type="number" 
                step="0.01"
                placeholder="0.00"
                required
                className="text-5xl font-black bg-transparent text-center outline-none w-full dark:text-white"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
              />
              <span className="text-2xl font-bold text-zinc-300">€</span>
            </div>
          </div>
          
          <input 
            type="text" 
            placeholder="Nom (ex: Netflix, Salle de sport...)"
            required
            className="w-full text-center bg-transparent font-bold text-lg outline-none dark:text-white"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
        </div>

        {/* Configuration Récurrence */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center gap-4 p-2">
            <RefreshCw size={20} className="text-zinc-400" />
            <select 
              className="flex-1 bg-transparent font-bold outline-none dark:text-white appearance-none"
              value={formData.frequency}
              onChange={(e) => setFormData({...formData, frequency: e.target.value})}
            >
              <option value="monthly">Mensuel</option>
              <option value="quarterly">Trimestriel</option>
              <option value="yearly">Annuel</option>
            </select>
          </div>

          <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

          <div className="flex items-center gap-4 p-2 text-sm">
            <Tag size={20} className="text-zinc-400" />
            <select 
              required
              className="flex-1 bg-transparent font-bold outline-none dark:text-white appearance-none"
              value={formData.category_id}
              onChange={(e) => setFormData({...formData, category_id: e.target.value})}
            >
              <option value="">Sélectionner une catégorie</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
        </div>

        {/* Option d'étalonnage (Smoothing) */}
        {formData.frequency !== 'monthly' && (
          <div className={`p-6 rounded-[32px] border-2 transition-all ${formData.smooth_monthly ? 'border-brand-500 bg-brand-50/10' : 'border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className={`p-2 rounded-xl ${formData.smooth_monthly ? 'bg-brand-500 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                  <Info size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm dark:text-white">Étalonner le budget ?</p>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    Au lieu de voir un gros retrait de {formData.amount}€ une fois par an, nous compterons <strong>{getSmoothedAmount()}€ chaque mois</strong> dans votre analyse.
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setFormData({...formData, smooth_monthly: !formData.smooth_monthly})}
                className={`w-12 h-6 rounded-full relative transition-colors ${formData.smooth_monthly ? 'bg-brand-500' : 'bg-zinc-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.smooth_monthly ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        )}

        <button 
          type="submit"
          disabled={loading}
          className="w-full py-5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black rounded-[24px] shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? 'Création...' : 'Enregistrer l\'abonnement'}
        </button>
      </form>
    </div>
  )
}