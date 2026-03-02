import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search, X, ChevronDown, Lock, Trash2, Pencil } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { format, startOfMonth, endOfMonth, parseISO, subMonths, addMonths, isSameMonth } from 'date-fns'
import { fr } from 'date-fns/locale'

function fmt(amount) {
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(amount)
}

function groupByDate(txs) {
  const groups = {}
  txs.forEach(t => {
    const key = t.date
    if (!groups[key]) groups[key] = []
    groups[key].push(t)
  })
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Transactions() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [txs, setTxs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all') // all | expense | income | investment
  const [showForm, setShowForm] = useState(false)
  const [editTx, setEditTx] = useState(null)

  // Open form if coming from Add button with ?type=
  useEffect(() => {
    const type = searchParams.get('type')
    if (type && type !== 'subscription') setShowForm(true)
  }, [searchParams])

  const loadTxs = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const from = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const to   = format(endOfMonth(currentMonth),   'yyyy-MM-dd')
    const { data } = await supabase
      .from('transactions')
      .select('*, category:categories(id, name, icon, color, type, parent_id)')
      .eq('user_id', user.id)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    setTxs(data || [])
    setLoading(false)
  }, [user, currentMonth])

  useEffect(() => { loadTxs() }, [loadTxs])

  async function deleteTx(id) {
    await supabase.from('transactions').delete().eq('id', id)
    setTxs(prev => prev.filter(t => t.id !== id))
  }

  const filtered = txs.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false
    if (search && !t.description?.toLowerCase().includes(search.toLowerCase()) &&
        !t.category?.name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const mandatory = filtered.filter(t => t.is_virtual)
  const regular   = filtered.filter(t => !t.is_virtual)
  const grouped   = groupByDate(regular)
  const isCurrentMonth = isSameMonth(currentMonth, new Date())

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Transactions</h1>
        <button onClick={() => { setEditTx(null); setShowForm(true) }} style={styles.addBtn}>
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Month nav */}
      <div style={styles.monthNav}>
        <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} style={styles.navBtn}>‹</button>
        <span style={styles.navLabel}>
          {format(currentMonth, 'MMMM yyyy', { locale: fr })}
        </span>
        <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} style={{ ...styles.navBtn, opacity: isCurrentMonth ? 0.3 : 1 }} disabled={isCurrentMonth}>›</button>
      </div>

      {/* Search + filter */}
      <div style={styles.toolbar}>
        <div style={styles.searchWrap}>
          <Search size={15} style={styles.searchIcon} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher..."
            style={styles.searchInput}
          />
          {search && <button onClick={() => setSearch('')} style={styles.clearBtn}><X size={14} /></button>}
        </div>
        <div style={styles.filters}>
          {['all','expense','income','investment'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              style={{ ...styles.filterBtn, ...(filterType === type ? styles.filterBtnActive : {}) }}
            >
              {type === 'all' ? 'Tout' : type === 'expense' ? 'Dépenses' : type === 'income' ? 'Revenus' : 'Investis'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={styles.center}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🧾</div>
          <p>Aucune transaction ce mois-ci.</p>
          <button onClick={() => setShowForm(true)} style={styles.emptyBtn}>Ajouter une transaction</button>
        </div>
      ) : (
        <div>
          {/* Mandatory section */}
          {mandatory.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <Lock size={12} />
                <span>Abonnements (lissés)</span>
              </div>
              {mandatory.map(t => <TxRow key={t.id} tx={t} onDelete={null} onEdit={null} />)}
            </div>
          )}

          {/* Regular transactions grouped by date */}
          {grouped.map(([date, items]) => (
            <div key={date} style={styles.section}>
              <div style={styles.dateHeader}>
                {format(parseISO(date), 'EEEE d MMMM', { locale: fr })}
              </div>
              {items.map(t => (
                <TxRow key={t.id} tx={t}
                  onDelete={() => deleteTx(t.id)}
                  onEdit={() => { setEditTx(t); setShowForm(true) }}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <TransactionForm
          tx={editTx}
          userId={user.id}
          defaultType={searchParams.get('type') || 'expense'}
          onClose={() => { setShowForm(false); setEditTx(null) }}
          onSaved={() => { setShowForm(false); setEditTx(null); loadTxs() }}
        />
      )}
    </div>
  )
}

// ─── TX ROW ───────────────────────────────────────────────────────────────────
function TxRow({ tx, onDelete, onEdit }) {
  const isExpense = tx.type === 'expense'
  const isIncome  = tx.type === 'income'
  const color = isExpense ? '#ef4444' : isIncome ? '#22c55e' : '#06b6d4'
  const sign  = isExpense ? '-' : '+'

  return (
    <div style={styles.txRow}>
      <div style={{ ...styles.txIcon, backgroundColor: tx.category?.color ? `${tx.category.color}20` : '#f1f5f9' }}>
        {tx.category?.icon ?? '💳'}
      </div>
      <div style={styles.txInfo}>
        <div style={styles.txDesc}>{tx.description || tx.category?.name || '—'}</div>
        <div style={styles.txCat}>{tx.category?.name ?? 'Sans catégorie'}</div>
      </div>
      <div style={styles.txRight}>
        <div style={{ ...styles.txAmount, color }}>
          {tx.is_virtual ? '' : sign}{fmt(tx.amount)}
        </div>
        {!tx.is_locked && (
          <div style={styles.txActions}>
            {onEdit   && <button onClick={onEdit}   style={styles.iconBtn}><Pencil size={13} /></button>}
            {onDelete && <button onClick={onDelete} style={{ ...styles.iconBtn, color: '#ef4444' }}><Trash2 size={13} /></button>}
          </div>
        )}
        {tx.is_locked && <Lock size={11} style={{ color: '#94a3b8', marginTop: '4px' }} />}
      </div>
    </div>
  )
}

// ─── TRANSACTION FORM ─────────────────────────────────────────────────────────
function TransactionForm({ tx, userId, defaultType, onClose, onSaved }) {
  const [type, setType]         = useState(tx?.type ?? defaultType ?? 'expense')
  const [amount, setAmount]     = useState(tx?.amount?.toString() ?? '')
  const [date, setDate]         = useState(tx?.date ?? format(new Date(), 'yyyy-MM-dd'))
  const [description, setDesc]  = useState(tx?.description ?? '')
  const [notes, setNotes]       = useState(tx?.notes ?? '')
  const [categoryId, setCatId]  = useState(tx?.category_id ?? '')
  const [categories, setCats]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    supabase.from('categories').select('*').eq('user_id', userId).eq('type', type).order('name')
      .then(({ data }) => setCats(data || []))
  }, [userId, type])

  // Build hierarchical display
  const parents  = categories.filter(c => !c.parent_id)
  const children = categories.filter(c => c.parent_id)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Montant invalide.')
      return
    }
    setLoading(true)

    const payload = {
      user_id: userId,
      type,
      amount: Number(amount),
      date,
      description,
      notes,
      category_id: categoryId || null,
    }

    let err
    if (tx) {
      const { error } = await supabase.from('transactions').update(payload).eq('id', tx.id)
      err = error
    } else {
      const { error } = await supabase.from('transactions').insert(payload)
      err = error
    }

    if (err) setError(err.message)
    else onSaved()
    setLoading(false)
  }

  const focusStyle = e => { e.target.style.borderColor = '#22c55e'; e.target.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.12)' }
  const blurStyle  = e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }

  const typeConfig = {
    expense:    { label: 'Dépense',      color: '#ef4444', bg: 'rgba(239,68,68,0.1)'    },
    income:     { label: 'Revenu',       color: '#22c55e', bg: 'rgba(34,197,94,0.1)'    },
    investment: { label: 'Investissement', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)'  },
  }

  return (
    <>
      <div style={styles.backdrop} onClick={onClose} />
      <div style={styles.formSheet}>
        {/* Header */}
        <div style={styles.formHeader}>
          <h2 style={styles.formTitle}>{tx ? 'Modifier' : 'Ajouter'}</h2>
          <button onClick={onClose} style={styles.closeBtn}><X size={20} /></button>
        </div>

        {/* Type selector */}
        <div style={styles.typeRow}>
          {Object.entries(typeConfig).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => { setType(key); setCatId('') }}
              style={{
                ...styles.typeBtn,
                backgroundColor: type === key ? cfg.bg : '#f8fafc',
                color: type === key ? cfg.color : '#94a3b8',
                border: `2px solid ${type === key ? cfg.color : 'transparent'}`,
              }}
            >
              {cfg.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Amount */}
          <div style={styles.field}>
            <label style={styles.label}>Montant (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              required
              autoFocus
              style={{ ...styles.input, fontSize: '1.5rem', fontFamily: 'monospace', fontWeight: '700', textAlign: 'center' }}
              onFocus={focusStyle} onBlur={blurStyle}
            />
          </div>

          {/* Category */}
          <div style={styles.field}>
            <label style={styles.label}>Catégorie</label>
            <div style={{ position: 'relative' }}>
              <select
                value={categoryId}
                onChange={e => setCatId(e.target.value)}
                style={{ ...styles.input, appearance: 'none', paddingRight: '2.5rem' }}
              >
                <option value="">Sans catégorie</option>
                {parents.map(p => (
                  <optgroup key={p.id} label={`${p.icon} ${p.name}`}>
                    <option value={p.id}>{p.icon} {p.name}</option>
                    {children.filter(c => c.parent_id === p.id).map(c => (
                      <option key={c.id} value={c.id}>　↳ {c.icon} {c.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* Date */}
          <div style={styles.field}>
            <label style={styles.label}>Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              style={styles.input}
              onFocus={focusStyle} onBlur={blurStyle}
            />
          </div>

          {/* Description */}
          <div style={styles.field}>
            <label style={styles.label}>Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDesc(e.target.value)}
              placeholder="Ex: Courses Carrefour"
              style={styles.input}
              onFocus={focusStyle} onBlur={blurStyle}
            />
          </div>

          {/* Notes */}
          <div style={styles.field}>
            <label style={styles.label}>Notes (optionnel)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Détails supplémentaires..."
              rows={2}
              style={{ ...styles.input, resize: 'vertical' }}
              onFocus={focusStyle} onBlur={blurStyle}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={loading} style={{ ...styles.submitBtn, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Enregistrement...' : tx ? 'Modifier' : 'Ajouter'}
          </button>
        </form>
      </div>
    </>
  )
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = {
  root: { padding: '1.5rem 1rem 2rem', maxWidth: '680px', fontFamily: '"DM Sans", sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  title: { margin: 0, fontSize: '1.6rem', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.03em', fontFamily: '"Sora", sans-serif' },
  addBtn: { width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  monthNav: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' },
  navBtn: { background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.25rem 0.6rem', cursor: 'pointer', color: '#475569', fontSize: '1.1rem' },
  navLabel: { fontSize: '0.875rem', fontWeight: '600', color: '#475569', minWidth: '130px', textAlign: 'center', textTransform: 'capitalize' },
  toolbar: { marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  searchWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: '0.75rem', color: '#94a3b8' },
  searchInput: { width: '100%', padding: '0.65rem 0.75rem 0.65rem 2.2rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', fontFamily: '"DM Sans", sans-serif', color: '#0f172a' },
  clearBtn: { position: 'absolute', right: '0.75rem', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' },
  filters: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap' },
  filterBtn: { padding: '0.3rem 0.75rem', borderRadius: '20px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.78rem', fontWeight: '500', cursor: 'pointer', color: '#64748b', fontFamily: '"DM Sans", sans-serif' },
  filterBtnActive: { backgroundColor: '#0f172a', color: '#fff', borderColor: '#0f172a' },
  section: { marginBottom: '0.5rem' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.5rem', fontSize: '0.72rem', fontWeight: '600', color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' },
  dateHeader: { padding: '0.4rem 0.5rem', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', textTransform: 'capitalize' },
  txRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 0.5rem', borderBottom: '1px solid #f8fafc' },
  txIcon: { width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 },
  txInfo: { flex: 1, minWidth: 0 },
  txDesc: { fontSize: '0.875rem', fontWeight: '600', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  txCat: { fontSize: '0.75rem', color: '#94a3b8' },
  txRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 },
  txAmount: { fontSize: '0.9rem', fontWeight: '700', fontFamily: 'monospace' },
  txActions: { display: 'flex', gap: '0.25rem' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px', display: 'flex', borderRadius: '4px' },
  center: { textAlign: 'center', color: '#94a3b8', padding: '3rem 0' },
  empty: { textAlign: 'center', color: '#94a3b8', padding: '3rem 0', fontSize: '0.875rem' },
  emptyBtn: { marginTop: '0.75rem', padding: '0.6rem 1.25rem', background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: '600', cursor: 'pointer', fontFamily: '"DM Sans", sans-serif', fontSize: '0.875rem' },
  // Form
  backdrop: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 50 },
  formSheet: { position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '500px', backgroundColor: '#fff', borderRadius: '24px 24px 0 0', zIndex: 51, padding: '1.5rem', maxHeight: '92vh', overflowY: 'auto', boxSizing: 'border-box' },
  formHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  formTitle: { margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#0f172a', fontFamily: '"Sora", sans-serif' },
  closeBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', padding: '0.25rem', borderRadius: '8px' },
  typeRow: { display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' },
  typeBtn: { flex: 1, padding: '0.5rem 0.25rem', borderRadius: '10px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s', fontFamily: '"DM Sans", sans-serif' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  label: { fontSize: '0.72rem', fontWeight: '600', color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' },
  input: { width: '100%', padding: '0.8rem 1rem', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box', fontFamily: '"DM Sans", sans-serif', color: '#0f172a', backgroundColor: '#fff' },
  error: { backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '0.75rem', color: '#ef4444', fontSize: '0.875rem' },
  submitBtn: { width: '100%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', borderRadius: '12px', padding: '0.9rem', color: '#fff', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(34,197,94,0.25)', fontFamily: '"DM Sans", sans-serif', marginTop: '0.25rem' },
}