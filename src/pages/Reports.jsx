import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  format, startOfMonth, endOfMonth, subMonths,
  parseISO, getMonth, getYear, eachMonthOfInterval, startOfYear, endOfYear
} from 'date-fns'
import { fr } from 'date-fns/locale'

function fmt(amount) {
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount)
}
function fmtFull(amount) {
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(amount)
}

const COLORS = ['#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16']

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Reports() {
  const [tab, setTab] = useState('monthly')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const currentYear = getYear(new Date())

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <h1 style={styles.title}>Rapports</h1>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button onClick={() => setTab('monthly')} style={{ ...styles.tab, ...(tab === 'monthly' ? styles.tabActive : {}) }}>
          Mensuel
        </button>
        <button onClick={() => setTab('yearly')} style={{ ...styles.tab, ...(tab === 'yearly' ? styles.tabActive : {}) }}>
          Annuel
        </button>
      </div>

      {tab === 'monthly'
        ? <MonthlyReport currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} />
        : <YearlyReport year={currentYear} />
      }
    </div>
  )
}

// ─── MONTHLY REPORT ───────────────────────────────────────────────────────────
function MonthlyReport({ currentMonth, setCurrentMonth }) {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const from = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const to   = format(endOfMonth(currentMonth),   'yyyy-MM-dd')

    const [{ data: txs }, { data: limits }, { data: categories }] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, category:categories(id, name, icon, color, parent_id, type)')
        .eq('user_id', user.id)
        .gte('date', from).lte('date', to),
      supabase
        .from('budget_limits')
        .select('*, category:categories(id, name, icon, color)')
        .eq('user_id', user.id),
      supabase
        .from('categories')
        .select('id, name, icon, color, parent_id, type')
        .eq('type', 'expense')
        .or(`user_id.eq.${user.id},user_id.is.null`),
    ])

    // Last 6 months for trend
    const trendMonths = Array.from({ length: 6 }, (_, i) => subMonths(currentMonth, 5 - i))
    const trendData = await Promise.all(trendMonths.map(async m => {
      const f = format(startOfMonth(m), 'yyyy-MM-dd')
      const t = format(endOfMonth(m),   'yyyy-MM-dd')
      const { data: mtxs } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', user.id)
        .gte('date', f).lte('date', t)
      const expense = mtxs?.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0) ?? 0
      const income  = mtxs?.filter(t => t.type === 'income').reduce((a, t)  => a + Number(t.amount), 0) ?? 0
      return { month: format(m, 'MMM', { locale: fr }), expense, income }
    }))

    setData({ txs: txs || [], limits: limits || [], categories: categories || [], trendData })
    setLoading(false)
  }, [user, currentMonth])

  useEffect(() => { load() }, [load])

  if (loading) return <LoadingSkeleton />
  if (!data)   return null

  // Category breakdown (all categories, including 0 expense and no limit)
  const categoriesById = Object.fromEntries((data.categories || []).map(c => [c.id, c]))
  const catMap = {}
  ;(data.categories || []).filter(c => !c.parent_id).forEach(cat => {
    catMap[cat.id] = { name: cat.name, icon: cat.icon, color: cat.color, value: 0, id: cat.id }
  })

  data.txs.filter(t => t.type === 'expense' && !t.is_virtual).forEach(t => {
    const cat = t.category
    if (!cat) return
    const key = cat.parent_id ?? cat.id
    const parent = cat.parent_id ? categoriesById[cat.parent_id] : cat
    if (!catMap[key]) {
      catMap[key] = {
        name: parent?.name || cat.name || 'Sans categorie',
        icon: parent?.icon || cat.icon,
        color: parent?.color || cat.color,
        value: 0,
        id: key,
      }
    }

    if (!cat.parent_id) {
      catMap[key].name = cat.name
      catMap[key].icon = cat.icon
      catMap[key].color = cat.color
    }

    catMap[key].value += Number(t.amount)
  })
  const allCategoryRows = Object.values(catMap).sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value
    return String(a.name).localeCompare(String(b.name), 'fr')
  })
  const pieData = allCategoryRows.filter(c => c.value > 0)

  // Totals
  const totalExpense    = data.txs.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
  const totalIncome     = data.txs.filter(t => t.type === 'income').reduce((a, t)  => a + Number(t.amount), 0)
  const totalInvestment = data.txs.filter(t => t.type === 'investment').reduce((a, t) => a + Number(t.amount), 0)
  const savingsRate     = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0

  // Budget limits status
  const limitsMap = Object.fromEntries(data.limits.map(l => [l.category_id, l.amount]))
  const limitRows = data.limits.map(l => {
    const spent = catMap[l.category_id]?.value ?? 0
    const pct   = l.amount > 0 ? Math.round((spent / l.amount) * 100) : 0
    const status = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok'
    return { ...l, spent, pct, status }
  })

  const isCurrentMonth = format(currentMonth, 'yyyy-MM') === format(new Date(), 'yyyy-MM')

  return (
    <div style={styles.content}>
      {/* Month nav */}
      <div style={styles.monthNav}>
        <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} style={styles.navBtn}>‹</button>
        <span style={styles.navLabel}>{format(currentMonth, 'MMMM yyyy', { locale: fr })}</span>
        <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          style={{ ...styles.navBtn, opacity: isCurrentMonth ? 0.3 : 1 }} disabled={isCurrentMonth}>›</button>
      </div>

      {/* Summary pills */}
      <div style={styles.pillRow}>
        <SummaryPill label="Revenus"   value={fmtFull(totalIncome)}     color="#22c55e" bg="rgba(34,197,94,0.08)"  />
        <SummaryPill label="Dépenses"  value={fmtFull(totalExpense)}    color="#ef4444" bg="rgba(239,68,68,0.08)" />
        <SummaryPill label="Épargne"   value={`${savingsRate}%`}        color="#3b82f6" bg="rgba(59,130,246,0.08)" />
        {totalInvestment > 0 &&
          <SummaryPill label="Investis" value={fmtFull(totalInvestment)} color="#06b6d4" bg="rgba(6,182,212,0.08)" />
        }
      </div>

      {/* Donut chart */}
      {pieData.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Répartition des dépenses</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                dataKey="value" nameKey="name" paddingAngle={2}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color ?? COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => fmtFull(v)} />
              <Legend formatter={(name) => {
                const item = pieData.find(p => p.name === name)
                return `${item?.icon ?? ''} ${name}`
              }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Budget limits */}
      {limitRows.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Limites de budget</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {limitRows.map(row => (
              <div key={row.id}>
                <div style={styles.limitRow}>
                  <span style={styles.limitName}>{row.category?.icon} {row.category?.name}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', fontFamily: 'monospace',
                    color: row.status === 'over' ? '#ef4444' : row.status === 'warn' ? '#f59e0b' : '#22c55e' }}>
                    {fmt(row.spent)} / {fmt(row.amount)}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: row.status === 'over' ? '#ef4444' : row.status === 'warn' ? '#f59e0b' : '#94a3b8' }}>
                    {row.status === 'over' ? '⚠️' : row.status === 'warn' ? '!' : '✓'}
                  </span>
                </div>
                <div style={styles.barTrack}>
                  <div style={{ ...styles.barFill, width: `${Math.min(row.pct, 100)}%`,
                    backgroundColor: row.status === 'over' ? '#ef4444' : row.status === 'warn' ? '#f59e0b' : '#22c55e' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All categories tracking */}
      {allCategoryRows.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Toutes les catégories</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {allCategoryRows.map(row => {
              const limit = limitsMap[row.id]
              return (
                <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.95rem' }}>{row.icon || '•'}</span>
                  <span style={{ flex: 1, fontSize: '0.83rem', color: '#334155' }}>{row.name}</span>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    {limit ? `Limite: ${fmt(limit)}` : 'Sans limite'}
                  </span>
                  <span style={{ fontSize: '0.82rem', fontWeight: '700', color: row.value > 0 ? '#0f172a' : '#94a3b8' }}>
                    {fmtFull(row.value)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 6-month trend */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Tendance 6 mois</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data.trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}k`} />
            <Tooltip formatter={(v) => fmtFull(v)} labelStyle={{ color: '#0f172a', fontWeight: '600' }} />
            <Line type="monotone" dataKey="income"  stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: '#22c55e' }} name="Revenus" />
            <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} name="Dépenses" />
            <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── YEARLY REPORT ────────────────────────────────────────────────────────────
function YearlyReport({ year }) {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      setLoading(true)
      const from = format(startOfYear(new Date(year, 0)), 'yyyy-MM-dd')
      const to   = format(endOfYear(new Date(year, 0)),   'yyyy-MM-dd')

      const [{ data: txs }, { data: limits }, { data: categories }] = await Promise.all([
        supabase
          .from('transactions')
          .select('*, category:categories(id, name, icon, color, parent_id, type)')
          .eq('user_id', user.id)
          .gte('date', from).lte('date', to),
        supabase
          .from('budget_limits')
          .select('*, category:categories(id, name, icon, color)')
          .eq('user_id', user.id),
        supabase
          .from('categories')
          .select('id, name, icon, color, parent_id, type')
          .eq('type', 'expense')
          .or(`user_id.eq.${user.id},user_id.is.null`),
      ])

      setData({ txs: txs || [], limits: limits || [], categories: categories || [] })
      setLoading(false)
    }
    load()
  }, [user, year])

  if (loading) return <LoadingSkeleton />
  if (!data)   return null

  // Monthly breakdown for bar chart
  const months = eachMonthOfInterval({ start: new Date(year, 0), end: new Date(year, 11) })
  const monthlyData = months.map(m => {
    const mStr = format(m, 'yyyy-MM')
    const mTxs = data.txs.filter(t => t.date.startsWith(mStr))
    const expense    = mTxs.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
    const income     = mTxs.filter(t => t.type === 'income').reduce((a, t)  => a + Number(t.amount), 0)
    const investment = mTxs.filter(t => t.type === 'investment').reduce((a, t) => a + Number(t.amount), 0)
    const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0
    return { month: format(m, 'MMM', { locale: fr }), expense, income, investment, savingsRate }
  })

  // Yearly totals
  const totalExpense    = data.txs.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
  const totalIncome     = data.txs.filter(t => t.type === 'income').reduce((a, t)  => a + Number(t.amount), 0)
  const totalInvestment = data.txs.filter(t => t.type === 'investment').reduce((a, t) => a + Number(t.amount), 0)
  const yearlySavings   = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0

  // Category breakdown for the year (all categories, including 0 expense and no limit)
  const categoriesById = Object.fromEntries((data.categories || []).map(c => [c.id, c]))
  const catMap = {}
  ;(data.categories || []).filter(c => !c.parent_id).forEach(cat => {
    catMap[cat.id] = { name: cat.name, icon: cat.icon, color: cat.color, value: 0, id: cat.id }
  })

  data.txs.filter(t => t.type === 'expense' && !t.is_virtual).forEach(t => {
    const cat = t.category
    if (!cat) return
    const key = cat.parent_id ?? cat.id
    const parent = cat.parent_id ? categoriesById[cat.parent_id] : cat
    if (!catMap[key]) {
      catMap[key] = {
        name: parent?.name || cat.name || 'Sans categorie',
        icon: parent?.icon || cat.icon,
        color: parent?.color || cat.color,
        value: 0,
        id: key,
      }
    }

    if (!cat.parent_id) {
      catMap[key].name = cat.name
      catMap[key].icon = cat.icon
      catMap[key].color = cat.color
    }

    catMap[key].value += Number(t.amount)
  })
  const allCategoryRows = Object.values(catMap).sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value
    return String(a.name).localeCompare(String(b.name), 'fr')
  })
  const pieData = allCategoryRows.filter(c => c.value > 0)

  // Budget heatmap: for each limit, each month status
  const heatmapData = data.limits.map(lim => {
    const row = { name: `${lim.category?.icon} ${lim.category?.name}`, limit: lim.amount }
    months.forEach(m => {
      const mStr  = format(m, 'yyyy-MM')
      const spent = data.txs
        .filter(t => t.date.startsWith(mStr) && t.category_id === lim.category_id && t.type === 'expense')
        .reduce((a, t) => a + Number(t.amount), 0)
      const pct = lim.amount > 0 ? Math.round((spent / lim.amount) * 100) : 0
      row[format(m, 'MMM', { locale: fr })] = pct
    })
    return row
  })
  const monthLabels = months.map(m => format(m, 'MMM', { locale: fr }))

  return (
    <div style={styles.content}>
      <div style={styles.yearTitle}>{year}</div>

      {/* Yearly summary */}
      <div style={styles.pillRow}>
        <SummaryPill label="Revenus"    value={fmt(totalIncome)}      color="#22c55e" bg="rgba(34,197,94,0.08)"  />
        <SummaryPill label="Dépenses"   value={fmt(totalExpense)}     color="#ef4444" bg="rgba(239,68,68,0.08)" />
        <SummaryPill label="Taux épargne" value={`${yearlySavings}%`} color="#3b82f6" bg="rgba(59,130,246,0.08)" />
        {totalInvestment > 0 &&
          <SummaryPill label="Investis"  value={fmt(totalInvestment)} color="#06b6d4" bg="rgba(6,182,212,0.08)" />
        }
      </div>

      {/* Savings rate line chart */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Taux d'épargne mensuel</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
            <Tooltip formatter={(v) => `${v}%`} labelStyle={{ color: '#0f172a', fontWeight: '600' }} />
            <Line type="monotone" dataKey="savingsRate" stroke="#3b82f6" strokeWidth={2.5}
              dot={{ r: 3, fill: '#3b82f6' }} name="Taux d'épargne" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly income vs expense bar chart */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Revenus vs Dépenses</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}k`} />
            <Tooltip formatter={(v) => fmtFull(v)} labelStyle={{ color: '#0f172a', fontWeight: '600' }} />
            <Bar dataKey="income"  fill="#22c55e" radius={[4,4,0,0]} name="Revenus"  maxBarSize={20} />
            <Bar dataKey="expense" fill="#ef4444" radius={[4,4,0,0]} name="Dépenses" maxBarSize={20} />
            <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Budget limits heatmap */}
      {heatmapData.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Limites dépassées</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.heatTable}>
              <thead>
                <tr>
                  <th style={styles.heatTh}></th>
                  {monthLabels.map(m => <th key={m} style={styles.heatTh}>{m}</th>)}
                </tr>
              </thead>
              <tbody>
                {heatmapData.map((row, i) => (
                  <tr key={i}>
                    <td style={styles.heatLabel}>{row.name}</td>
                    {monthLabels.map(m => {
                      const pct = row[m] ?? 0
                      const bg = pct === 0 ? '#f8fafc' : pct >= 100 ? 'rgba(239,68,68,0.15)' : pct >= 80 ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.12)'
                      const icon = pct === 0 ? '—' : pct >= 100 ? '⚠️' : pct >= 80 ? '!' : '✓'
                      const color = pct === 0 ? '#94a3b8' : pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#22c55e'
                      return (
                        <td key={m} style={{ ...styles.heatCell, backgroundColor: bg }}>
                          <span style={{ color, fontSize: '0.7rem', fontWeight: '700' }}>{icon}</span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Year category donut */}
      {pieData.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Répartition annuelle</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                dataKey="value" nameKey="name" paddingAngle={2}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color ?? COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => fmtFull(v)} />
              <Legend formatter={(name) => {
                const item = pieData.find(p => p.name === name)
                return `${item?.icon ?? ''} ${name}`
              }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* All categories tracking */}
      {allCategoryRows.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Toutes les catégories</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {allCategoryRows.map(row => {
              const hasLimit = data.limits.some(l => l.category_id === row.id)
              return (
                <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.95rem' }}>{row.icon || '•'}</span>
                  <span style={{ flex: 1, fontSize: '0.83rem', color: '#334155' }}>{row.name}</span>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{hasLimit ? 'Avec limite' : 'Sans limite'}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: '700', color: row.value > 0 ? '#0f172a' : '#94a3b8' }}>
                    {fmtFull(row.value)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Yearly totals card */}
      <div style={{ ...styles.card, backgroundColor: '#080f1a', border: '1px solid #1e3a4a' }}>
        <h3 style={{ ...styles.cardTitle, color: '#64748b' }}>Bilan {year}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <TotalRow label="Revenus totaux"    value={fmtFull(totalIncome)}         color="#22c55e" />
          <TotalRow label="Dépenses totales"  value={fmtFull(totalExpense)}        color="#ef4444" />
          {totalInvestment > 0 && <TotalRow label="Investissements" value={fmtFull(totalInvestment)} color="#06b6d4" />}
          <div style={{ height: '1px', backgroundColor: '#1e3a4a', margin: '0.25rem 0' }} />
          <TotalRow label="Net épargné"       value={fmtFull(totalIncome - totalExpense)} color={totalIncome - totalExpense >= 0 ? '#22c55e' : '#ef4444'} bold />
          <TotalRow label="Taux d'épargne"    value={`${yearlySavings}%`}         color="#3b82f6" bold />
        </div>
      </div>
    </div>
  )
}

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────
function SummaryPill({ label, value, color, bg }) {
  return (
    <div style={{ flex: 1, minWidth: '80px', backgroundColor: bg, borderRadius: '12px', padding: '0.6rem 0.75rem' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: '600', color, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontSize: '0.9rem', fontWeight: '700', color, fontFamily: 'monospace' }}>{value}</div>
    </div>
  )
}

function TotalRow({ label, value, color, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: bold ? '600' : '400' }}>{label}</span>
      <span style={{ fontSize: bold ? '1rem' : '0.875rem', fontWeight: '700', fontFamily: 'monospace', color }}>{value}</span>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '1.25rem', height: '180px', boxShadow: '0 1px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ height: '12px', backgroundColor: '#f1f5f9', borderRadius: '6px', width: '40%', marginBottom: '1rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ height: '120px', backgroundColor: '#f8fafc', borderRadius: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
      ))}
    </div>
  )
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = {
  root: { padding: '1.5rem 1rem 2rem', maxWidth: '680px', fontFamily: '"DM Sans", sans-serif' },
  header: { marginBottom: '1rem' },
  title: { margin: 0, fontSize: '1.6rem', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.03em', fontFamily: '"Sora", sans-serif' },
  tabs: { display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', backgroundColor: '#f1f5f9', borderRadius: '12px', padding: '4px' },
  tab: { flex: 1, padding: '0.55rem', border: 'none', borderRadius: '10px', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', backgroundColor: 'transparent', color: '#64748b', fontFamily: '"DM Sans", sans-serif', transition: 'all 0.15s' },
  tabActive: { backgroundColor: '#fff', color: '#0f172a', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  content: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  monthNav: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' },
  navBtn: { background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.25rem 0.6rem', cursor: 'pointer', color: '#475569', fontSize: '1.1rem' },
  navLabel: { fontSize: '0.875rem', fontWeight: '600', color: '#475569', minWidth: '130px', textAlign: 'center', textTransform: 'capitalize' },
  yearTitle: { fontSize: '1.2rem', fontWeight: '700', color: '#0f172a', fontFamily: '"Sora", sans-serif', marginBottom: '0.25rem' },
  pillRow: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  card: { backgroundColor: '#fff', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 1px 12px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' },
  cardTitle: { margin: '0 0 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' },
  limitRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' },
  limitName: { flex: 1, fontSize: '0.875rem', fontWeight: '500', color: '#334155' },
  barTrack: { height: '5px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '3px', transition: 'width 0.4s ease' },
  heatTable: { width: '100%', borderCollapse: 'separate', borderSpacing: '3px', fontSize: '0.75rem' },
  heatTh: { padding: '0.2rem 0.4rem', textAlign: 'center', fontSize: '0.65rem', fontWeight: '600', color: '#94a3b8', whiteSpace: 'nowrap' },
  heatLabel: { padding: '0.3rem 0.5rem', fontSize: '0.75rem', fontWeight: '500', color: '#334155', whiteSpace: 'nowrap' },
  heatCell: { padding: '0.3rem 0.4rem', textAlign: 'center', borderRadius: '6px' },
}