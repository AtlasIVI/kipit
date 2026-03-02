import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Save, Calendar, Tag, AlignLeft, Camera } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export default function AddTransaction() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const typeFromUrl = searchParams.get('type') || 'expense'
  
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState([])
  const [formData, setFormData] = useState({
    amount: '',
    category_id: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    type: typeFromUrl
  })

  // Charger les catégories depuis la BD au montage du composant
  useEffect(() => {
    async function fetchCategories() {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })
      
      if (data) {
        setCategories(data)
        // Optionnel : sélectionne la première catégorie par défaut
        if (data.length > 0) setFormData(prev => ({ ...prev, category_id: data[0].id }))
      }
    }
    fetchCategories()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.amount || !formData.category_id) return alert("Remplissez les champs obligatoires")

    setLoading(true)
    try {
      const { error } = await supabase
        .from('transactions')
        .insert([
          {
            user_id: user.id,
            amount: parseFloat(formData.amount),
            category_id: formData.category_id,
            description: formData.description,
            date: formData.date,
            type: formData.type
          }
        ])

      if (error) throw error
      navigate('/transactions')
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto pb-10">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
          <ChevronLeft size={24} className="dark:text-white" />
        </button>
        <h1 className="text-xl font-bold dark:text-white capitalize">
          {formData.type === 'expense' ? 'Nouvelle Dépense' : 'Nouveau Revenu'}
        </h1>
        <div className="w-10" /> {/* Spacer pour centrer le titre */}
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Card Montant (Focus principal) */}
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-sm text-center">
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Montant</label>
          <div className="flex items-center justify-center gap-2">
            <input 
              type="number" 
              step="0.01"
              placeholder="0.00"
              required
              autoFocus
              className="w-full bg-transparent text-5xl font-black text-center focus:outline-none dark:text-white"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
            />
            <span className="text-3xl font-bold text-zinc-400">€</span>
          </div>
        </div>

        {/* Détails */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-6">
          
          {/* Catégorie */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400">
              <Tag size={20} />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Catégorie</label>
              <select 
                required
                className="w-full bg-transparent font-bold dark:text-white focus:outline-none appearance-none"
                value={formData.category_id}
                onChange={(e) => setFormData({...formData, category_id: e.target.value})}
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id} className="dark:bg-zinc-900">
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="h-px bg-zinc-100 dark:bg-zinc-800 ml-14" />

          {/* Date */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400">
              <Calendar size={20} />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Date</label>
              <input 
                type="date"
                required
                className="w-full bg-transparent font-bold dark:text-white focus:outline-none"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
            </div>
          </div>

          <div className="h-px bg-zinc-100 dark:bg-zinc-800 ml-14" />

          {/* Description */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400">
              <AlignLeft size={20} />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Note</label>
              <input 
                type="text"
                placeholder="Ajouter un détail..."
                className="w-full bg-transparent font-medium dark:text-white focus:outline-none"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Scan / Receipt Placeholder */}
        <button type="button" className="w-full py-6 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[32px] flex flex-col items-center justify-center gap-2 text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
          <Camera size={24} />
          <span className="text-sm font-semibold">Scanner le reçu</span>
        </button>

        {/* Submit Button */}
        <button 
          type="submit"
          disabled={loading}
          className="w-full py-5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black text-lg rounded-[24px] shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? 'Enregistrement...' : 'Enregistrer la transaction'}
        </button>
      </form>
    </div>
  )
}