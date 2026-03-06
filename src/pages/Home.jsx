import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Settings, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

function fmt(amount) {
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(amount)
}

function useDashboard(currentMonth) {
  const { user } = useAuth()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      setLoading(true)
      const from = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
      const to   = format(endOfMonth(currentMonth),   'yyyy-MM-dd')
      const [{ data: txs }, { data: subs }, { data: limits }, { data: profile }, { data: allTxs }, { data: categories }] = await Promise.all([
        supabase.from('transactions').select('*, category:categories(id,name,icon,color,type,parent_id)')
          .eq('user_id', user.id).gte('date', from).lte('date', to).order('date', { ascending: false }),
        supabase.from('recurring_rules').select('*, category:categories(id,name,icon,color)')
          .eq('user_id', user.id).eq('is_active', true).eq('is_subscription', true).order('next_due_date', { ascending: true }),
        supabase.from('budget_limits').select('*, category:categories(id,name,icon,color)').eq('user_id', user.id),
        supabase.from('profiles').select('emergency_fund_target,emergency_fund_current').eq('id', user.id).single(),
        supabase.from('transactions').select('amount,type,date').eq('user_id', user.id).eq('type', 'investment').eq('is_virtual', false),
        supabase.from('categories').select('id,name,icon,color,parent_id').eq('type', 'expense').or(`user_id.eq.${user.id},user_id.is.null`),
      ])
      setData({
        txs: txs || [],
        subs: subs || [],
        limits: limits || [],
        profile: profile || {},
        allInvestments: allTxs || [],
        categories: categories || [],
      })
      setLoading(false)
    }
    load()
  }, [user, currentMonth])

  return { data, loading }
}

function computeTotals(txs) {
  return txs.reduce((acc, t) => {
    if (!t.is_virtual) acc[t.type] = (acc[t.type] ?? 0) + Number(t.amount)
    return acc
  }, { expense: 0, income: 0, investment: 0 })
}

export default function Home() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const { data, loading } = useDashboard(currentMonth)
  const isCurrentMonth = isSameMonth(currentMonth, new Date())

  const totals = data ? computeTotals(data.txs) : null
  const upcomingSubs = data?.subs.slice(0, 5) ?? []
  const cumulativeInvested = data?.allInvestments
    .filter(t => t.date <= format(endOfMonth(currentMonth), 'yyyy-MM-dd'))
    .reduce((acc, t) => acc + Number(t.amount), 0) ?? 0

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <p style={styles.greeting}>Bonjour, {profile?.full_name?.split(' ')[0] ?? 'vous'} 👋</p>
          <h1 style={styles.monthTitle}>{format(currentMonth, 'MMMM yyyy', { locale: fr })}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={styles.monthNav}>
            <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} style={styles.navBtn}><ChevronLeft size={18} /></button>
            <span style={styles.navLabel}>{isCurrentMonth ? 'Ce mois-ci' : format(currentMonth, 'MMM yyyy', { locale: fr })}</span>
            <button onClick={() => setCurrentMonth(m => addMonths(m, 1))}
              style={{ ...styles.navBtn, opacity: isCurrentMonth ? 0.3 : 1 }} disabled={isCurrentMonth}>
              <ChevronRight size={18} />
            </button>
          </div>
          <button onClick={() => navigate('/settings')} style={styles.settingsBtn}><Settings size={20} /></button>
        </div>
      </div>

      {loading ? <LoadingSkeleton /> : (
        <div style={styles.grid}>
          {/* LEFT COLUMN */}
          <div style={styles.col}>
            <BilanCard totals={totals} profile={data.profile} />
            {(totals.investment > 0 || cumulativeInvested > 0) && (
              <InvestCard totals={totals} cumulativeInvested={cumulativeInvested} />
            )}
            <CategoriesCard txs={data.txs} limits={data.limits} categories={data.categories} />
          </div>

          {/* RIGHT COLUMN */}
          <div style={styles.col}>
            <UpcomingSubsCard subs={upcomingSubs} navigate={navigate} />
            <MonthlyStatsCard totals={totals} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── BILAN CARD ───────────────────────────────────────────────────────────────
function BilanCard({ totals, profile }) {
  const disponible = totals.income - totals.expense - totals.investment
  const isPositive = disponible >= 0

  const emergencyTarget  = Number(profile?.emergency_fund_target  ?? 0)
  const emergencyCurrent = Number(profile?.emergency_fund_current ?? 0)
  const emergencyGap     = Math.max(emergencyTarget - emergencyCurrent, 0)
  const suggestEmergency = isPositive && emergencyGap > 0 ? Math.min(disponible, emergencyGap) : 0

  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>Bilan du mois</h2>
      <div style={styles.bilanRows}>
        {totals.income > 0 && (
          <div style={styles.bilanRow}>
            <span style={styles.bilanLabel}>Revenus</span>
            <span style={{ ...styles.bilanValue, color: '#22c55e' }}>+{fmt(totals.income)}</span>
          </div>
        )}
        {totals.expense > 0 && (
          <div style={styles.bilanRow}>
            <span style={styles.bilanLabel}>Dépenses</span>
            <span style={{ ...styles.bilanValue, color: '#ef4444' }}>-{fmt(totals.expense)}</span>
          </div>
        )}
        {totals.investment > 0 && (
          <div style={styles.bilanRow}>
            <span style={styles.bilanLabel}>Investissements</span>
            <span style={{ ...styles.bilanValue, color: '#06b6d4' }}>-{fmt(totals.investment)}</span>
          </div>
        )}
      </div>
      <div style={styles.bilanDivider} />
      <div style={styles.bilanRow}>
        <span style={{ ...styles.bilanLabel, fontWeight: '700', color: '#0f172a' }}>Disponible</span>
        <span style={{ ...styles.bilanValue, fontSize: '1.3rem', color: isPositive ? '#22c55e' : '#ef4444' }}>
          {isPositive ? '+' : ''}{fmt(disponible)}
        </span>
      </div>
      {suggestEmergency > 0 && (
        <div style={styles.emergencySuggestion}>
          <ShieldCheck size={14} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '1px' }} />
          <span>
            Suggéré fonds d'urgence : <strong>{fmt(suggestEmergency)}</strong>
            <span style={{ color: '#94a3b8' }}> ({fmt(emergencyCurrent)} / {fmt(emergencyTarget)})</span>
          </span>
        </div>
      )}
      {emergencyTarget > 0 && emergencyCurrent >= emergencyTarget && disponible > 0 && (
        <div style={{ ...styles.emergencySuggestion, backgroundColor: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.2)' }}>
          <ShieldCheck size={14} style={{ color: '#22c55e', flexShrink: 0 }} />
          <span style={{ color: '#15803d' }}>Fonds d'urgence atteint 🎉 — <strong>{fmt(disponible)}</strong> libre</span>
        </div>
      )}
    </div>
  )
}

// ─── INVEST CARD ──────────────────────────────────────────────────────────────
function InvestCard({ totals, cumulativeInvested }) {
  const savingsRate     = totals.income > 0 ? Math.round((totals.investment / totals.income) * 100) : 0
  const realSavingsRate = totals.income > 0 ? Math.round(((totals.income - totals.expense) / totals.income) * 100) : 0

  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>Investissements</h2>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <div style={styles.investPill}>
          <span style={styles.investPillLabel}>Ce mois</span>
          <span style={{ ...styles.investPillValue, color: '#06b6d4' }}>{fmt(totals.investment)}</span>
        </div>
        <div style={styles.investPill}>
          <span style={styles.investPillLabel}>Capital total</span>
          <span style={{ ...styles.investPillValue, color: '#8b5cf6' }}>{fmt(cumulativeInvested)}</span>
        </div>
        <div style={styles.investPill}>
          <span style={styles.investPillLabel}>Taux épargne</span>
          <span style={{ ...styles.investPillValue, color: '#22c55e' }}>{realSavingsRate}%</span>
        </div>
      </div>
      {savingsRate > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
            <span>Taux d'investissement</span>
            <span style={{ color: '#06b6d4', fontWeight: '600' }}>{savingsRate}% des revenus</span>
          </div>
          <div style={styles.barTrack}>
            <div style={{ ...styles.barFill, width: `${Math.min(savingsRate, 100)}%`, backgroundColor: '#06b6d4' }} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CATEGORIES CARD ──────────────────────────────────────────────────────────
function CategoriesCard({ txs, limits, categories }) {
  const categoriesById = Object.fromEntries((categories || []).map(c => [c.id, c]))
  const grouped = {}
  txs.filter(t => t.type === 'expense').forEach(t => {
    const cat = t.category
    if (!cat) return
    const key = cat.parent_id ?? cat.id

    // Resolve parent metadata even when only subcategory transactions exist this month.
    const parent = cat.parent_id ? categoriesById[cat.parent_id] : cat
    if (!grouped[key]) {
      grouped[key] = {
        name: parent?.name || cat.name || 'Sans categorie',
        icon: parent?.icon || cat.icon,
        color: parent?.color || cat.color,
        total: 0,
        id: key,
      }
    }

    grouped[key].total += Number(t.amount)

    if (!cat.parent_id) {
      grouped[key].name = cat.name
      grouped[key].icon = cat.icon
      grouped[key].color = cat.color
    }
  })

  // Ensure categories with a configured budget limit are visible even at 0 spent.
  limits.forEach(limit => {
    if (!grouped[limit.category_id]) {
      const cat = limit.category || categoriesById[limit.category_id]
      grouped[limit.category_id] = {
        name: cat?.name || 'Sans categorie',
        icon: cat?.icon || '•',
        color: cat?.color || '#94a3b8',
        total: 0,
        id: limit.category_id,
      }
    }
  })

  const rows = Object.values(grouped).sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total
    return String(a.name).localeCompare(String(b.name), 'fr')
  })
  const limitsMap = Object.fromEntries(limits.map(l => [l.category_id, l.amount]))
  const plannedLimitsTotal = limits.reduce((acc, l) => acc + Number(l.amount || 0), 0)
  const spentInLimitedCategories = limits.reduce((acc, l) => {
    const spent = grouped[l.category_id]?.total ?? 0
    return acc + spent
  }, 0)
  const limitsUsagePct = plannedLimitsTotal > 0
    ? Math.min((spentInLimitedCategories / plannedLimitsTotal) * 100, 100)
    : 0

  if (rows.length === 0 && limits.length === 0) return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>Par catégorie</h2>
      <p style={styles.empty}>Aucune dépense ce mois-ci.</p>
    </div>
  )

  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>Par catégorie</h2>
      {limits.length > 0 && (
        <div style={{ marginBottom: '0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#64748b', marginBottom: '0.35rem' }}>
            <span>Limites prévues</span>
            <span style={{ fontWeight: '700', color: '#334155' }}>{fmt(spentInLimitedCategories)} / {fmt(plannedLimitsTotal)}</span>
          </div>
          <div style={styles.barTrack}>
            <div
              style={{
                ...styles.barFill,
                width: `${limitsUsagePct}%`,
                backgroundColor: limitsUsagePct >= 100 ? '#ef4444' : limitsUsagePct >= 80 ? '#f59e0b' : '#22c55e'
              }}
            />
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {rows.map(row => {
          const limit = limitsMap[row.id]
          const hasLimit = Number.isFinite(limit) && limit > 0
          const isUnplanned = !hasLimit && row.total > 0
          const pct = hasLimit ? Math.min((row.total / limit) * 100, 100) : isUnplanned ? 100 : null
          const status = isUnplanned ? 'unplanned' : pct === null ? null : pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok'
          const barColor = status === 'over' ? '#ef4444' : status === 'warn' ? '#f59e0b' : '#22c55e'
          return (
            <div key={row.id}>
              <div style={styles.catRow}>
                <span style={styles.catIcon}>{row.icon}</span>
                <span style={styles.catName}>{row.name}</span>
                <span style={styles.catAmount}>{fmt(row.total)}</span>
                {(status === 'over' || status === 'unplanned') && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>⚠️</span>}
                {status === 'warn' && <span style={{ color: '#f59e0b', fontSize: '0.8rem' }}>!</span>}
              </div>
              {(hasLimit || isUnplanned) && (
                <>
                  <div style={styles.barTrack}>
                    <div
                      style={{
                        ...styles.barFill,
                        width: `${pct}%`,
                        backgroundColor: status === 'unplanned' ? '#ef4444' : barColor,
                      }}
                    />
                  </div>
                  <div style={styles.catLimit}>
                    <span>
                      {hasLimit ? `${fmt(row.total)} / ${fmt(limit)}` : `${fmt(row.total)} / Non prevu`}
                    </span>
                    <span style={{ color: status === 'unplanned' ? '#ef4444' : barColor }}>
                      {status === 'unplanned' ? 'Hors budget' : `${Math.round(pct)}%`}
                    </span>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── UPCOMING SUBS ────────────────────────────────────────────────────────────
function UpcomingSubsCard({ subs, navigate }) {
  if (subs.length === 0) return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>Abonnements à venir</h2>
      <p style={styles.empty}>Aucun abonnement actif.</p>
    </div>
  )

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>Abonnements à venir</h2>
        <button onClick={() => navigate('/subscriptions')} style={styles.cardLink}>Voir tout →</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {subs.map(sub => {
          const due      = parseISO(sub.next_due_date)
          const daysLeft = Math.ceil((due - new Date()) / (1000 * 60 * 60 * 24))
          const isUrgent = daysLeft <= 2
          return (
            <div key={sub.id} style={styles.subRow}>
              <span style={styles.subIcon}>{sub.category?.icon ?? '🔄'}</span>
              <div style={{ flex: 1 }}>
                <div style={styles.subName}>{sub.name}</div>
                <div style={{ ...styles.subDue, color: isUrgent ? '#f59e0b' : '#64748b' }}>
                  {daysLeft <= 0 ? "Aujourd'hui" : daysLeft === 1 ? 'Demain' : `Dans ${daysLeft} jours`}
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

// ─── MONTHLY STATS CARD ───────────────────────────────────────────────────────
function MonthlyStatsCard({ totals }) {
  const total = totals.expense + totals.income + totals.investment
  if (total === 0) return null

  const savingsRate = totals.income > 0
    ? Math.round(((totals.income - totals.expense - totals.investment) / totals.income) * 100)
    : 0

  const items = [
    { label: 'Revenus',         value: totals.income,     color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
    { label: 'Dépenses',        value: totals.expense,    color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
    { label: 'Investissements', value: totals.investment, color: '#06b6d4', bg: 'rgba(6,182,212,0.08)' },
  ].filter(i => i.value > 0)

  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>Résumé</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {items.map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', backgroundColor: item.bg, borderRadius: '10px' }}>
            <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>{item.label}</span>
            <span style={{ fontSize: '1rem', fontWeight: '700', fontFamily: 'monospace', color: item.color }}>{fmt(item.value)}</span>
          </div>
        ))}
      </div>
      {totals.income > 0 && (
        <div style={{ marginTop: '0.85rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>Taux d'épargne</span>
          <span style={{ fontSize: '1rem', fontWeight: '700', color: savingsRate >= 20 ? '#22c55e' : savingsRate >= 0 ? '#f59e0b' : '#ef4444' }}>
            {savingsRate}%
          </span>
        </div>
      )}
    </div>
  )
}

// ─── LOADING SKELETON ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div style={styles.grid}>
      <div style={styles.col}>
        {[1,2].map(i => <div key={i} style={{ ...styles.card, minHeight: '140px', marginBottom: 0 }}><div style={styles.skeleton} /><div style={{ ...styles.skeleton, width: '60%', marginTop: '0.75rem' }} /></div>)}
      </div>
      <div style={styles.col}>
        <div style={{ ...styles.card, minHeight: '200px' }}><div style={styles.skeleton} /></div>
      </div>
    </div>
  )
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = {
  root: { padding: '1.5rem 2rem 2rem', width: '100%', boxSizing: 'border-box', fontFamily: '"DM Sans", sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' },
  greeting: { margin: '0 0 0.1rem', fontSize: '0.85rem', color: '#64748b' },
  monthTitle: { margin: 0, fontSize: '1.6rem', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.03em', fontFamily: '"Sora", sans-serif', textTransform: 'capitalize' },
  monthNav: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  navBtn: { background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.3rem', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center' },
  navLabel: { fontSize: '0.875rem', fontWeight: '600', color: '#475569', minWidth: '90px', textAlign: 'center', textTransform: 'capitalize' },
  settingsBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.4rem', borderRadius: '8px' },

  // ── Responsive 2-column grid ──
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '1.25rem',
    alignItems: 'start',
  },
  col: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },

  card: { backgroundColor: '#fff', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 1px 12px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' },
  cardTitle: { margin: '0 0 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  cardLink: { background: 'none', border: 'none', color: '#22c55e', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', padding: 0 },

  bilanRows: { display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.25rem' },
  bilanRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  bilanLabel: { fontSize: '0.875rem', color: '#64748b', fontWeight: '500' },
  bilanValue: { fontSize: '0.95rem', fontWeight: '700', fontFamily: 'monospace' },
  bilanDivider: { height: '1px', backgroundColor: '#f1f5f9', margin: '0.75rem 0' },
  emergencySuggestion: { display: 'flex', alignItems: 'flex-start', gap: '0.5rem', backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', padding: '0.65rem 0.75rem', marginTop: '0.75rem', fontSize: '0.78rem', color: '#92400e', lineHeight: 1.5 },

  investPill: { flex: 1, backgroundColor: '#f8fafc', borderRadius: '12px', padding: '0.65rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'center' },
  investPillLabel: { fontSize: '0.65rem', fontWeight: '600', color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase' },
  investPillValue: { fontSize: '0.9rem', fontWeight: '700', fontFamily: 'monospace' },

  catRow: { display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' },
  catIcon: { fontSize: '1rem' },
  catName: { flex: 1, fontSize: '0.875rem', fontWeight: '500', color: '#334155' },
  catAmount: { fontSize: '0.875rem', fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' },
  barTrack: { height: '4px', backgroundColor: '#f1f5f9', borderRadius: '2px', overflow: 'hidden', marginBottom: '0.2rem' },
  barFill: { height: '100%', borderRadius: '2px', transition: 'width 0.4s ease' },
  catLimit: { display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' },

  subRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid #f8fafc' },
  subIcon: { fontSize: '1.2rem' },
  subName: { fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' },
  subDue: { fontSize: '0.75rem', fontWeight: '500' },
  subAmount: { fontSize: '0.875rem', fontWeight: '700', fontFamily: 'monospace', color: '#334155' },

  empty: { color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0', margin: 0 },
  skeleton: { height: '16px', backgroundColor: '#f1f5f9', borderRadius: '8px', animation: 'pulse 1.5s ease-in-out infinite' },
}

// Inject keyframes
const s = document.createElement('style')
s.textContent = `@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`
if (!document.getElementById('home-kf')) { s.id = 'home-kf'; document.head.appendChild(s) }