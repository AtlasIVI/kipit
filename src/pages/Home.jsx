import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, RefreshCw, Settings } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, isToday, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmt(amount) {
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(amount)
}

// ─── HOOKS ────────────────────────────────────────────────────────────────────
function useDashboard(currentMonth) {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      setLoading(true)
      const from = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
      const to   = format(endOfMonth(currentMonth),   'yyyy-MM-dd')

      // Transactions du mois
      const { data: txs } = await supabase
        .from('transactions')
        .select('*, category:categories(id, name, icon, color, type, parent_id)')
        .eq('user_id', user.id)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: false })

      // Abonnements actifs + prochaines échéances
      const { data: subs } = await supabase
        .from('recurring_rules')
        .select('*, category:categories(id, name, icon, color)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('is_subscription', true)
        .order('next_due_date', { ascending: true })

      // Budget limits
      const { data: limits } = await supabase
        .from('budget_limits')
        .select('*, category:categories(id, name, icon, color)')
        .eq('user_id', user.id)

      setData({ txs: txs || [], subs: subs || [], limits: limits || [] })
      setLoading(false)
    }
    load()
  }, [user, currentMonth])

  return { data, loading }
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Home() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const { data, loading } = useDashboard(currentMonth)

  const isCurrentMonth = isSameMonth(currentMonth, new Date())

  // Compute totals
  const totals = data ? computeTotals(data.txs) : null

  // Upcoming subs (next 7 days from today if current month, else all)
  const upcomingSubs = data?.subs.slice(0, 4) ?? []

  return (
    <div style={styles.root}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <div>
          <p style={styles.greeting}>Bonjour, {profile?.full_name?.split(' ')[0] ?? 'vous'} 👋</p>
          <h1 style={styles.monthTitle}>
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </h1>
        </div>
        <button onClick={() => navigate('/settings')} style={styles.settingsBtn}>
          <Settings size={20} />
        </button>
      </div>

      {/* ── Month navigator ── */}
      <div style={styles.monthNav}>
        <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} style={styles.navBtn}>
          <ChevronLeft size={18} />
        </button>
        <span style={styles.navLabel}>
          {isCurrentMonth ? 'Ce mois-ci' : format(currentMonth, 'MMM yyyy', { locale: fr })}
        </span>
        <button
          onClick={() => setCurrentMonth(m => addMonths(m, 1))}
          style={{ ...styles.navBtn, opacity: isCurrentMonth ? 0.3 : 1 }}
          disabled={isCurrentMonth}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {loading ? <LoadingSkeleton /> : (
        <div style={styles.cards}>
          {/* ── Card 1 : Balance ── */}
          <BalanceCard totals={totals} />

          {/* ── Card 2 : Catégories ── */}
          <CategoriesCard txs={data.txs} limits={data.limits} />

          {/* ── Card 3 : Abonnements à venir ── */}
          <UpcomingSubsCard subs={upcomingSubs} navigate={navigate} />
        </div>
      )}
    </div>
  )
}

// ─── BALANCE CARD ─────────────────────────────────────────────────────────────
function BalanceCard({ totals }) {
  const net = totals.income - totals.expense
  const isPositive = net >= 0

  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>Balance du mois</h2>
      <div style={styles.balanceRow}>
        <BalancePill icon={<TrendingUp size={14} />} label="Revenus" amount={totals.income} color="#22c55e" bg="rgba(34,197,94,0.1)" />
        <BalancePill icon={<TrendingDown size={14} />} label="Dépenses" amount={totals.expense} color="#ef4444" bg="rgba(239,68,68,0.1)" />
        {totals.investment > 0 && (
          <BalancePill icon={<span style={{ fontSize: '12px' }}>📈</span>} label="Investis" amount={totals.investment} color="#06b6d4" bg="rgba(6,182,212,0.1)" />
        )}
      </div>
      <div style={styles.balanceDivider} />
      <div style={styles.balanceNet}>
        <span style={styles.balanceNetLabel}>Net</span>
        <span style={{ ...styles.balanceNetAmount, color: isPositive ? '#22c55e' : '#ef4444' }}>
          {isPositive ? '+' : ''}{fmt(net)}
        </span>
      </div>
    </div>
  )
}

function BalancePill({ icon, label, amount, color, bg }) {
  return (
    <div style={{ ...styles.pill, backgroundColor: bg }}>
      <span style={{ color, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '600' }}>
        {icon} {label}
      </span>
      <span style={{ color, fontSize: '1rem', fontWeight: '700', fontFamily: 'monospace' }}>{fmt(amount)}</span>
    </div>
  )
}

// ─── CATEGORIES CARD ──────────────────────────────────────────────────────────
function CategoriesCard({ txs, limits }) {
  // Group expenses by top-level category
  const grouped = {}
  txs.filter(t => t.type === 'expense').forEach(t => {
    const cat = t.category
    if (!cat) return
    const key = cat.parent_id ?? cat.id
    const name = cat.parent_id ? null : cat.name
    if (!grouped[key]) grouped[key] = { name: cat.parent_id ? '...' : cat.name, icon: cat.icon, color: cat.color, total: 0, id: key }
    grouped[key].total += Number(t.amount)
    if (!cat.parent_id) { grouped[key].name = cat.name; grouped[key].icon = cat.icon; grouped[key].color = cat.color }
  })

  const rows = Object.values(grouped).sort((a, b) => b.total - a.total)
  const limitsMap = Object.fromEntries(limits.map(l => [l.category_id, l.amount]))

  if (rows.length === 0) {
    return (
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Par catégorie</h2>
        <p style={styles.empty}>Aucune dépense ce mois-ci.</p>
      </div>
    )
  }

  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>Par catégorie</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {rows.map(row => {
          const limit = limitsMap[row.id]
          const pct = limit ? Math.min((row.total / limit) * 100, 100) : null
          const status = pct === null ? null : pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok'
          const barColor = status === 'over' ? '#ef4444' : status === 'warn' ? '#f59e0b' : '#22c55e'

          return (
            <div key={row.id}>
              <div style={styles.catRow}>
                <span style={styles.catIcon}>{row.icon}</span>
                <span style={styles.catName}>{row.name}</span>
                <span style={styles.catAmount}>{fmt(row.total)}</span>
                {status === 'over' && <span style={styles.badge('over')}>⚠️</span>}
                {status === 'warn' && <span style={styles.badge('warn')}>!</span>}
              </div>
              {limit && (
                <div style={styles.barTrack}>
                  <div style={{ ...styles.barFill, width: `${pct}%`, backgroundColor: barColor }} />
                </div>
              )}
              {limit && (
                <div style={styles.catLimit}>
                  <span>{fmt(row.total)} / {fmt(limit)}</span>
                  <span style={{ color: barColor }}>{Math.round(pct)}%</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── UPCOMING SUBS CARD ───────────────────────────────────────────────────────
function UpcomingSubsCard({ subs, navigate }) {
  if (subs.length === 0) {
    return (
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Abonnements à venir</h2>
        <p style={styles.empty}>Aucun abonnement actif.</p>
      </div>
    )
  }

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>Abonnements à venir</h2>
        <button onClick={() => navigate('/subscriptions')} style={styles.cardLink}>Voir tout →</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {subs.map(sub => {
          const due = parseISO(sub.next_due_date)
          const daysUntil = Math.ceil((due - new Date()) / (1000 * 60 * 60 * 24))
          const isUrgent = daysUntil <= 2
          return (
            <div key={sub.id} style={styles.subRow}>
              <span style={styles.subIcon}>{sub.category?.icon ?? '🔄'}</span>
              <div style={{ flex: 1 }}>
                <div style={styles.subName}>{sub.name}</div>
                <div style={{ ...styles.subDue, color: isUrgent ? '#f59e0b' : '#64748b' }}>
                  {daysUntil <= 0 ? "Aujourd'hui" : daysUntil === 1 ? 'Demain' : `Dans ${daysUntil} jours`}
                </div>
              </div>
              <span style={styles.subAmount}>{fmt(sub.amount)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── LOADING SKELETON ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div style={styles.cards}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ ...styles.card, minHeight: '120px' }}>
          <div style={styles.skeleton} />
          <div style={{ ...styles.skeleton, width: '60%', marginTop: '0.75rem' }} />
        </div>
      ))}
    </div>
  )
}

// ─── COMPUTE TOTALS ───────────────────────────────────────────────────────────
function computeTotals(txs) {
  return txs.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] ?? 0) + Number(t.amount)
    return acc
  }, { expense: 0, income: 0, investment: 0 })
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = {
  root: {
    padding: '1.5rem 1rem 2rem',
    maxWidth: '680px',
    fontFamily: '"DM Sans", sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
  },
  greeting: {
    margin: '0 0 0.1rem',
    fontSize: '0.85rem',
    color: '#64748b',
  },
  monthTitle: {
    margin: 0,
    fontSize: '1.6rem',
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: '-0.03em',
    fontFamily: '"Sora", sans-serif',
    textTransform: 'capitalize',
  },
  settingsBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '0.4rem',
    borderRadius: '8px',
  },
  monthNav: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.25rem',
  },
  navBtn: {
    background: 'none',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '0.3rem',
    cursor: 'pointer',
    color: '#475569',
    display: 'flex',
    alignItems: 'center',
  },
  navLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#475569',
    minWidth: '90px',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  cards: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '1.25rem',
    boxShadow: '0 1px 12px rgba(0,0,0,0.06)',
    border: '1px solid #f1f5f9',
  },
  cardTitle: {
    margin: '0 0 1rem',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  cardLink: {
    background: 'none',
    border: 'none',
    color: '#22c55e',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 0,
  },
  balanceRow: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  pill: {
    flex: 1,
    minWidth: '100px',
    borderRadius: '12px',
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  balanceDivider: {
    height: '1px',
    backgroundColor: '#f1f5f9',
    margin: '1rem 0',
  },
  balanceNet: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceNetLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#64748b',
  },
  balanceNetAmount: {
    fontSize: '1.4rem',
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: '-0.02em',
  },
  catRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    marginBottom: '0.3rem',
  },
  catIcon: { fontSize: '1rem' },
  catName: { flex: 1, fontSize: '0.875rem', fontWeight: '500', color: '#334155' },
  catAmount: { fontSize: '0.875rem', fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' },
  badge: (type) => ({
    fontSize: '0.7rem',
    fontWeight: '700',
    color: type === 'over' ? '#ef4444' : '#f59e0b',
  }),
  barTrack: {
    height: '4px',
    backgroundColor: '#f1f5f9',
    borderRadius: '2px',
    overflow: 'hidden',
    marginBottom: '0.2rem',
  },
  barFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.4s ease',
  },
  catLimit: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.7rem',
    color: '#94a3b8',
    fontFamily: 'monospace',
  },
  subRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 0',
    borderBottom: '1px solid #f8fafc',
  },
  subIcon: { fontSize: '1.2rem' },
  subName: { fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' },
  subDue: { fontSize: '0.75rem', fontWeight: '500' },
  subAmount: { fontSize: '0.875rem', fontWeight: '700', fontFamily: 'monospace', color: '#334155' },
  empty: { color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0', margin: 0 },
  skeleton: {
    height: '16px',
    backgroundColor: '#f1f5f9',
    borderRadius: '8px',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
}

// Inject styles
const s = document.createElement('style')
s.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
  @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
`
if (!document.getElementById('home-styles')) { s.id = 'home-styles'; document.head.appendChild(s) }