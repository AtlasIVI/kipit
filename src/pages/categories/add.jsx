import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Save, Layers, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export default function AddCategory() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [parentCategories, setParentCategories] = useState([])
  
  const [formData, setFormData] = useState({
    name: '',
    budget: '',
    icon: '📦',
    parent_id: null
  })

  useEffect(() => {
    if (user) fetchParents()
  }, [user])

  async function fetchParents() {
    const { data } = await supabase
      .from('categories')
      .select('id, name, icon')
      .is('parent_id', null) // On ne peut être l'enfant que d'une catégorie racine
      .eq('user_id', user?.id)
    
    if (data) setParentCategories(data)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase
        .from('categories')
        .insert([{ 
          name: formData.name, 
          budget: formData.budget ? parseFloat(formData.budget) : 0, 
          user_id: user.id,
          icon: formData.icon,
          parent_id: formData.parent_id 
        }])

      if (error) throw error
      navigate(-1)
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto pb-10">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
          <ChevronLeft size={24} className="dark:text-white" />
        </button>
        <h1 className="text-xl font-bold dark:text-white">Nouvelle catégorie</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-6">
          
          {/* Nom & Icône */}
          <div className="flex gap-4 items-center">
             <input 
              type="text" 
              value={formData.icon} 
              onChange={e => setFormData({...formData, icon: e.target.value})}
              className="w-16 h-16 text-3xl bg-zinc-50 dark:bg-zinc-800 rounded-2xl text-center focus:ring-2 ring-brand-500 outline-none transition-all"
            />
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Nom de la catégorie</label>
              <input 
                type="text"
                placeholder="Ex: Netflix, Essence..."
                required
                className="w-full bg-transparent text-lg font-bold focus:outline-none dark:text-white"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
          </div>

          <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

          {/* STYLE DU SELECT PARENT */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase ml-1">Catégorie parente (Optionnel)</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-brand-500 transition-colors">
                <Layers size={18} />
              </div>
              
              <select 
                className="w-full pl-12 pr-10 py-4 bg-zinc-50 dark:bg-zinc-800/50 border border-transparent focus:border-brand-500 focus:bg-white dark:focus:bg-zinc-800 rounded-2xl font-bold text-sm dark:text-white appearance-none outline-none transition-all cursor-pointer"
                value={formData.parent_id || ''}
                onChange={(e) => setFormData({...formData, parent_id: e.target.value || null})}
              >
                <option value="">Aucune (Catégorie principale)</option>
                {parentCategories.map(cat => (
                  <option key={cat.id} value={cat.id} className="dark:bg-zinc-900">
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>

              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                <ChevronDown size={18} />
              </div>
            </div>
          </div>
        </div>

        {/* Section Budget */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Budget mensuel</label>
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              placeholder="0"
              className="w-full bg-transparent text-4xl font-black focus:outline-none dark:text-white"
              value={formData.budget}
              onChange={(e) => setFormData({...formData, budget: e.target.value})}
            />
            <span className="text-2xl font-bold text-zinc-400">€</span>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black text-lg rounded-[24px] shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? 'Création en cours...' : 'Créer la catégorie'}
        </button>
      </form>
    </div>
  )
}