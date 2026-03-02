import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Filter, ArrowUpRight, ArrowDownLeft, Trash2, Loader2 } from 'lucide-react'

export default function Transactions() {
  const [filter, setFilter] = useState('all')
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null) // Pour l'état de chargement par ligne

  useEffect(() => {
    fetchTransactions()
  }, [filter])

  async function fetchTransactions() {
    setLoading(true)
    let query = supabase
      .from('transactions')
      .select('*, categories(name, icon)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (filter === 'expenses') query = query.eq('type', 'expense')
    if (filter === 'income') query = query.eq('type', 'income')
    
    const { data, error } = await query
    if (error) console.error("Erreur:", error)
    else setTransactions(data || [])
    setLoading(false)
  }

  // FONCTION DE SUPPRESSION
  const handleDelete = async (id) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette opération ?")) return

    setDeletingId(id)
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Mise à jour locale de la liste pour éviter un rechargement complet
      setTransactions(transactions.filter(t => t.id !== id))
    } catch (error) {
      alert("Erreur lors de la suppression : " + error.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6 pb-24">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">Transactions</h1>
        <div className="flex gap-2">
          <button className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl"><Search size={20} className="dark:text-white" /></button>
          <button className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl"><Filter size={20} className="dark:text-white" /></button>
        </div>
      </header>

      {/* Tabs Filtres */}
      <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl">
        {['all', 'expenses', 'income'].map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`flex-1 py-2 text-sm font-bold rounded-xl capitalize transition-all ${
              filter === t ? 'bg-white dark:bg-zinc-700 shadow-sm dark:text-white' : 'text-zinc-500'
            }`}
          >
            {t === 'all' ? 'Tout' : t === 'expenses' ? 'Dépenses' : 'Revenus'}
          </button>
        ))}
      </div>

      {/* Liste des Transactions */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-zinc-400" /></div>
        ) : transactions.length === 0 ? (
          <p className="text-center text-zinc-500 py-10">Aucune transaction trouvée.</p>
        ) : (
          transactions.map(item => (
            <div 
              key={item.id} 
              className="group flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-50 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${
                  item.type === 'income' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-900'
                }`}>
                  {item.categories?.icon || (item.type === 'income' ? '💰' : '💸')}
                </div>
                <div>
                  <p className="font-bold text-sm dark:text-white">{item.description || 'Sans titre'}</p>
                  <p className="text-[11px] text-zinc-400 font-medium">
                    {new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} • {item.categories?.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <p className={`font-bold ${item.type === 'income' ? 'text-emerald-500' : 'dark:text-white'}`}>
                  {item.type === 'income' ? '+' : '-'} {item.amount.toLocaleString()} €
                </p>
                
                {/* BOUTON SUPPRIMER : Apparaît au survol sur desktop ou reste accessible sur mobile */}
                <button 
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors disabled:opacity-50"
                >
                  {deletingId === item.id ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Trash2 size={18} />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}