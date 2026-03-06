import { useState, useEffect, useCallback } from 'react'
import { Plus, X, ChevronDown, RefreshCw, Lock, ToggleLeft, ToggleRight, Bell, BellOff, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { format, parseISO, addMonths, addQuarters, addYears } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useSearchParams } from 'react-router-dom'


function fmt(amount) {
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(amount)
}

function computeSmoothed(amount, frequency) {
  if (frequency === 'monthly') return null
  if (frequency === 'quarterly') return amount / 3
  if (frequency === 'yearly') return amount / 12
  return null
}

function computeNextDue(startDate, frequency) {
  const today = new Date()
  let d = parseISO(startDate)
  while (d <= today) {
    if (frequency === 'weekly')    d = new Date(d.getTime() + 7 * 86400000)
    if (frequency === 'monthly')   d = addMonths(d, 1)
    if (frequency === 'quarterly') d = addQuarters(d, 1)
    if (frequency === 'yearly')    d = addYears(d, 1)
  }
  return format(d, 'yyyy-MM-dd')
}

const FREQ_LABELS = { weekly: 'Hebdo', monthly: 'Mensuel', quarterly: 'Trimestriel', yearly: 'Annuel' }
const FREQ_ORDER  = { monthly: 0, quarterly: 1, yearly: 2, weekly: 3 }

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Subscriptions() {
  const { user } = useAuth()
  const [subs, setSubs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editSub, setEditSub]  = useState(null)
  // dans Subscriptions(), après les useState
  const [searchParams] = useSearchParams()
  useEffect(() => {
  document.body.style.overflow = 'hidden'
  return () => { document.body.style.overflow = '' }
  }, [])
  useEffect(() => {
    if (searchParams.get('add') === 'true') setShowForm(true)
  }, [searchParams])

  const loadSubs = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('recurring_rules')
      .select('*, category:categories(id, name, icon, color)')
      .eq('user_id', user.id)
      .eq('is_subscription', true)
      .order('is_active', { ascending: false })
      .order('next_due_date', { ascending: true })
    setSubs(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { loadSubs() }, [loadSubs])

  async function toggleActive(sub) {
    const { error } = await supabase
      .from('recurring_rules')
      .update({ is_active: !sub.is_active, end_date: sub.is_active ? format(new Date(), 'yyyy-MM-dd') : null })
      .eq('id', sub.id)
    if (!error) loadSubs()
  }

  async function deleteSub(id) {
    await supabase.from('recurring_rules').delete().eq('id', id)
    setSubs(prev => prev.filter(s => s.id !== id))
  }

  const active   = subs.filter(s => s.is_active)
  const inactive = subs.filter(s => !s.is_active)

  // Group active by frequency
  const grouped = {}
  active.forEach(s => {
    const g = s.frequency
    if (!grouped[g]) grouped[g] = []
    grouped[g].push(s)
  })
  const groupOrder = Object.keys(grouped).sort((a, b) => FREQ_ORDER[a] - FREQ_ORDER[b])

  // Monthly cost summary
  const monthlyReal     = active.filter(s => s.frequency === 'monthly').reduce((acc, s) => acc + Number(s.amount), 0)
  const monthlySmoothed = active.reduce((acc, s) => {
    if (s.frequency === 'monthly') return acc + Number(s.amount)
    return acc + Number(s.smoothed_amount ?? computeSmoothed(s.amount, s.frequency) ?? 0)
  }, 0)

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Abonnements</h1>
        <button onClick={() => { setEditSub(null); setShowForm(true) }} style={styles.addBtn}>
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Summary card */}
      {active.length > 0 && (
        <div style={styles.summaryCard}>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Coût réel ce mois</span>
            <span style={styles.summaryAmount}>{fmt(monthlyReal)}</span>
          </div>
          <div style={styles.summaryDivider} />
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Coût lissé / mois</span>
            <span style={{ ...styles.summaryAmount, color: '#22c55e' }}>{fmt(monthlySmoothed)}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div style={styles.center}>Chargement...</div>
      ) : subs.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔄</div>
          <p>Aucun abonnement.</p>
          <button onClick={() => setShowForm(true)} style={styles.emptyBtn}>Ajouter un abonnement</button>
        </div>
      ) : (
        <div>
          {/* Active subs grouped by frequency */}
          {groupOrder.map(freq => (
            <div key={freq} style={styles.section}>
              <div style={styles.sectionHeader}>{FREQ_LABELS[freq]}</div>
              {grouped[freq].map(sub => (
                <SubRow
                  key={sub.id}
                  sub={sub}
                  onEdit={() => { setEditSub(sub); setShowForm(true) }}
                  onToggle={() => toggleActive(sub)}
                  onDelete={() => deleteSub(sub.id)}
                />
              ))}
            </div>
          ))}

          {/* Inactive */}
          {inactive.length > 0 && (
            <div style={styles.section}>
              <div style={{ ...styles.sectionHeader, color: '#94a3b8' }}>Inactifs / Annulés</div>
              {inactive.map(sub => (
                <SubRow
                  key={sub.id}
                  sub={sub}
                  onEdit={() => { setEditSub(sub); setShowForm(true) }}
                  onToggle={() => toggleActive(sub)}
                  onDelete={() => deleteSub(sub.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <SubscriptionForm
          sub={editSub}
          userId={user.id}
          onClose={() => { setShowForm(false); setEditSub(null) }}
          onSaved={() => { setShowForm(false); setEditSub(null); loadSubs() }}
        />
      )}
    </div>
  )
}

// ─── SUB ROW ─────────────────────────────────────────────────────────────────
function SubRow({ sub, onEdit, onToggle, onDelete }) {
  const due      = parseISO(sub.next_due_date)
  const daysLeft = Math.ceil((due - new Date()) / 86400000)
  const isUrgent = sub.is_active && daysLeft <= 3
  const smoothed = sub.smoothed_amount ?? computeSmoothed(sub.amount, sub.frequency)

  return (
    <div style={{ ...styles.subRow, opacity: sub.is_active ? 1 : 0.5 }}>
      <div style={{ ...styles.subIcon, backgroundColor: sub.category?.color ? `${sub.category.color}20` : '#f1f5f9' }}>
        {sub.category?.icon ?? '🔄'}
      </div>

      <div style={styles.subInfo}>
        <div style={styles.subName}>{sub.name}</div>
        <div style={styles.subMeta}>
          <span style={{ ...styles.freqBadge }}>{FREQ_LABELS[sub.frequency]}</span>
          {sub.is_active && (
            <span style={{ color: isUrgent ? '#f59e0b' : '#94a3b8', fontSize: '0.72rem' }}>
              {daysLeft <= 0 ? "Aujourd'hui" : daysLeft === 1 ? 'Demain' : `Dans ${daysLeft}j`}
            </span>
          )}
        </div>
        {smoothed && (
          <div style={styles.smoothed}>≈ {fmt(smoothed)}/mois</div>
        )}
      </div>

      <div style={styles.subRight}>
        <div style={styles.subAmount}>{fmt(sub.amount)}</div>
        <div style={styles.subActions}>
          <button onClick={onEdit} style={styles.iconBtn} title="Modifier"><Pencil size={13} /></button>
          <button onClick={onToggle} style={styles.iconBtn} title={sub.is_active ? 'Désactiver' : 'Réactiver'}>
            {sub.is_active
              ? <ToggleRight size={16} style={{ color: '#22c55e' }} />
              : <ToggleLeft size={16} style={{ color: '#94a3b8' }} />
            }
          </button>
          <button onClick={onDelete} style={{ ...styles.iconBtn, color: '#ef4444' }} title="Supprimer"><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  )
}

// ─── SUBSCRIPTION FORM ────────────────────────────────────────────────────────
function SubscriptionForm({ sub, userId, onClose, onSaved }) {
  const [name, setName]           = useState(sub?.name ?? '')
  const [provider, setProvider]   = useState(sub?.provider ?? '')
  const [amount, setAmount]       = useState(sub?.amount?.toString() ?? '')
  const [frequency, setFreq]      = useState(sub?.frequency ?? 'monthly')
  const [startDate, setStart]     = useState(sub?.start_date ?? format(new Date(), 'yyyy-MM-dd'))
  const [categoryId, setCatId]    = useState(sub?.category_id ?? '')
  const [reminder, setReminder]   = useState(sub?.reminder_enabled ?? false)
  const [reminderDays, setRemDays] = useState(sub?.reminder_days_before ?? 2)
  const [categories, setCats]     = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    supabase.from('categories').select('*').eq('user_id', userId).eq('type', 'expense').order('name')
      .then(({ data }) => setCats(data || []))
  }, [userId])

  const parents  = categories.filter(c => !c.parent_id)
  const children = categories.filter(c => c.parent_id)

  const smoothed = frequency !== 'monthly'
    ? computeSmoothed(Number(amount) || 0, frequency)
    : null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!amount || Number(amount) <= 0) { setError('Montant invalide.'); return }
    setLoading(true)

    const next_due_date    = computeNextDue(startDate, frequency)
    const smoothed_amount  = computeSmoothed(Number(amount), frequency)

    const payload = {
      user_id:              userId,
      name,
      provider:             provider || null,
      amount:               Number(amount),
      type:                 'expense',
      frequency,
      start_date:           startDate,
      next_due_date,
      is_subscription:      true,
      is_active:            true,
      smooth_monthly:       frequency !== 'monthly',
      smoothed_amount,
      category_id:          categoryId || null,
      reminder_enabled:     reminder,
      reminder_days_before: Number(reminderDays),
    }

    let err
    if (sub) {
      const { error } = await supabase.from('recurring_rules').update(payload).eq('id', sub.id)
      err = error
    } else {
      const { error } = await supabase.from('recurring_rules').insert(payload)
      err = error
    }

    if (err) setError(err.message)
    else onSaved()
    setLoading(false)
  }

  const focusStyle = e => { e.target.style.borderColor = '#22c55e'; e.target.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.12)' }
  const blurStyle  = e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }

  return (
    <>
      <div style={styles.backdrop} onClick={onClose} />
      <div style={styles.formSheet}>
        <div style={styles.formHeader}>
          <h2 style={styles.formTitle}>{sub ? 'Modifier' : 'Nouvel abonnement'}</h2>
          <button onClick={onClose} style={styles.closeBtn}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Name */}
          <div style={styles.field}>
            <label style={styles.label}>Nom</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex: Netflix" required style={styles.input}
              onFocus={focusStyle} onBlur={blurStyle} />
          </div>

          {/* Provider */}
          <div style={styles.field}>
            <label style={styles.label}>Fournisseur (optionnel)</label>
            <input type="text" value={provider} onChange={e => setProvider(e.target.value)}
              placeholder="Ex: Netflix Inc." style={styles.input}
              onFocus={focusStyle} onBlur={blurStyle} />
          </div>

          {/* Amount + frequency row */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Montant (€)</label>
              <input type="number" inputMode="decimal" step="0.01" min="0" value={amount}
                onChange={e => setAmount(e.target.value)} placeholder="0.00" required
                style={{ ...styles.input, fontFamily: 'monospace', fontWeight: '700', fontSize: '1.1rem', textAlign: 'center' }}
                onFocus={focusStyle} onBlur={blurStyle} />
            </div>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Fréquence</label>
              <div style={{ position: 'relative' }}>
                <select value={frequency} onChange={e => setFreq(e.target.value)}
                  style={{ ...styles.input, appearance: 'none', paddingRight: '2rem' }}>
                  <option value="monthly">Mensuel</option>
                  <option value="quarterly">Trimestriel</option>
                  <option value="yearly">Annuel</option>
                  <option value="weekly">Hebdo</option>
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          {/* Smoothed amount hint */}
          {smoothed !== null && amount && (
            <div style={styles.smoothedHint}>
              💡 Coût lissé : <strong>{fmt(smoothed)}/mois</strong> — sera compté dans votre budget mensuel
            </div>
          )}

          {/* Category */}
          <div style={styles.field}>
            <label style={styles.label}>Catégorie</label>
            <div style={{ position: 'relative' }}>
              <select value={categoryId} onChange={e => setCatId(e.target.value)}
                style={{ ...styles.input, appearance: 'none', paddingRight: '2rem' }}>
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
              <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* Start date */}
          <div style={styles.field}>
            <label style={styles.label}>Date de début</label>
            <input type="date" value={startDate} onChange={e => setStart(e.target.value)}
              required style={styles.input} onFocus={focusStyle} onBlur={blurStyle} />
          </div>

          {/* Reminder toggle */}
          <div style={styles.reminderRow}>
            <div>
              <div style={styles.reminderLabel}>🔔 Rappel avant paiement</div>
              <div style={styles.reminderSub}>Notification avant la prochaine échéance</div>
            </div>
            <button type="button" onClick={() => setReminder(v => !v)} style={styles.toggleBtn}>
              {reminder
                ? <ToggleRight size={28} style={{ color: '#22c55e' }} />
                : <ToggleLeft  size={28} style={{ color: '#94a3b8' }} />
              }
            </button>
          </div>

          {reminder && (
            <div style={styles.field}>
              <label style={styles.label}>Jours avant l'échéance</label>
              <div style={{ position: 'relative' }}>
                <select value={reminderDays} onChange={e => setRemDays(e.target.value)}
                  style={{ ...styles.input, appearance: 'none', paddingRight: '2rem' }}>
                  <option value={1}>1 jour avant</option>
                  <option value={2}>2 jours avant</option>
                  <option value={3}>3 jours avant</option>
                  <option value={7}>1 semaine avant</option>
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
              </div>
            </div>
          )}

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={loading}
            style={{ ...styles.submitBtn, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Enregistrement...' : sub ? 'Modifier' : 'Ajouter'}
          </button>
        </form>
      </div>
    </>
  )
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = {
  root: { padding: '1.5rem 1rem 2rem', maxWidth: '680px', fontFamily: '"DM Sans", sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  title: { margin: 0, fontSize: '1.6rem', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.03em', fontFamily: '"Sora", sans-serif' },
  addBtn: { width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  summaryCard: { backgroundColor: '#fff', borderRadius: '16px', padding: '1rem 1.25rem', marginBottom: '1.25rem', boxShadow: '0 1px 12px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '1rem' },
  summaryItem: { flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  summaryLabel: { fontSize: '0.72rem', fontWeight: '600', color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' },
  summaryAmount: { fontSize: '1.1rem', fontWeight: '700', fontFamily: 'monospace', color: '#0f172a' },
  summaryDivider: { width: '1px', height: '36px', backgroundColor: '#f1f5f9' },
  section: { marginBottom: '0.75rem' },
  sectionHeader: { fontSize: '0.72rem', fontWeight: '700', color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.4rem 0.5rem', marginBottom: '0.25rem' },
  subRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0.5rem', borderBottom: '1px solid #f8fafc' },
  subIcon: { width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 },
  subInfo: { flex: 1, minWidth: 0 },
  subName: { fontSize: '0.9rem', fontWeight: '600', color: '#0f172a' },
  subMeta: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' },
  freqBadge: { fontSize: '0.68rem', fontWeight: '600', backgroundColor: '#f1f5f9', color: '#64748b', padding: '1px 6px', borderRadius: '4px' },
  smoothed: { fontSize: '0.72rem', color: '#22c55e', fontWeight: '500', marginTop: '2px' },
  subRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 },
  subAmount: { fontSize: '0.9rem', fontWeight: '700', fontFamily: 'monospace', color: '#0f172a' },
  subActions: { display: 'flex', gap: '0.25rem', alignItems: 'center' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px', display: 'flex', borderRadius: '4px' },
  center: { textAlign: 'center', color: '#94a3b8', padding: '3rem 0' },
  empty: { textAlign: 'center', color: '#94a3b8', padding: '3rem 0', fontSize: '0.875rem' },
  emptyBtn: { marginTop: '0.75rem', padding: '0.6rem 1.25rem', background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: '600', cursor: 'pointer', fontFamily: '"DM Sans", sans-serif', fontSize: '0.875rem' },
  backdrop: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 50 },
  formSheet: { position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '500px', backgroundColor: '#fff', borderRadius: '24px 24px 0 0', zIndex: 51, padding: '1.5rem', maxHeight: '92vh', overflowY: 'auto', boxSizing: 'border-box' },
  formHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  formTitle: { margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#0f172a', fontFamily: '"Sora", sans-serif' },
  closeBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', padding: '0.25rem', borderRadius: '8px' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  label: { fontSize: '0.72rem', fontWeight: '600', color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' },
  input: { width: '100%', padding: '0.8rem 1rem', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box', fontFamily: '"DM Sans", sans-serif', color: '#0f172a', backgroundColor: '#fff' },
  smoothedHint: { backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', padding: '0.6rem 0.9rem', fontSize: '0.8rem', color: '#15803d' },
  reminderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0' },
  reminderLabel: { fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' },
  reminderSub: { fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' },
  toggleBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '0', display: 'flex' },
  error: { backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '0.75rem', color: '#ef4444', fontSize: '0.875rem' },
  submitBtn: { width: '100%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', borderRadius: '12px', padding: '0.9rem', color: '#fff', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(34,197,94,0.25)', fontFamily: '"DM Sans", sans-serif', marginTop: '0.25rem' },
}