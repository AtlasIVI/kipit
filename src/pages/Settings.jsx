import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { supabase } from '@/lib/supabase'
import { LogOut, ChevronRight, Sun, Moon, Monitor, Plus, Trash2, X, Shield } from 'lucide-react'

function fmt(amount) {
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(amount)
}

export default function Settings() {
  const { profile, signOut, isAdmin, updateProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [section, setSection] = useState(null) // null | 'profile' | 'categories' | 'budget'

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  if (section === 'profile')    return <ProfileSection onBack={() => setSection(null)} />
  if (section === 'categories') return <CategoriesSection onBack={() => setSection(null)} />
  if (section === 'budget')     return <BudgetSection onBack={() => setSection(null)} />

  return (
    <div style={styles.root}>
      <h1 style={styles.title}>Paramètres</h1>

      {/* Profile card */}
      <div style={styles.profileCard}>
        <div style={styles.avatar}>{profile?.full_name?.[0]?.toUpperCase() ?? '?'}</div>
        <div style={{ flex: 1 }}>
          <div style={styles.profileName}>{profile?.full_name}</div>
          <div style={styles.profileEmail}>{profile?.email}</div>
        </div>
        {isAdmin && (
          <span style={styles.adminBadge}>Admin</span>
        )}
      </div>

      {/* Sections */}
      <div style={styles.group}>
        <div style={styles.groupLabel}>Compte</div>
        <SettingsRow label="Mon profil" icon="👤" onPress={() => setSection('profile')} />
        <SettingsRow label="Catégories" icon="🗂️" onPress={() => setSection('categories')} />
        <SettingsRow label="Limites de budget" icon="🎯" onPress={() => setSection('budget')} />
        {isAdmin && (
          <SettingsRow label="Administration" icon="🛡️" onPress={() => navigate('/admin')} />
        )}
      </div>

      <div style={styles.group}>
        <div style={styles.groupLabel}>Apparence</div>
        <div style={styles.themeRow}>
          {[
            { value: 'light',  label: 'Clair',   icon: <Sun  size={16} /> },
            { value: 'dark',   label: 'Sombre',  icon: <Moon size={16} /> },
            { value: 'system', label: 'Système', icon: <Monitor size={16} /> },
          ].map(opt => (
            <button key={opt.value} onClick={() => setTheme(opt.value)}
              style={{ ...styles.themeBtn, ...(theme === opt.value ? styles.themeBtnActive : {}) }}>
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={styles.group}>
        <div style={styles.groupLabel}>Application</div>
        <SettingsRow label="Version" icon="ℹ️" value="1.0.0" />
        <SettingsRow label="Devise" icon="💶" value="EUR (€)" />
      </div>

      <button onClick={handleSignOut} style={styles.signOutBtn}>
        <LogOut size={16} />
        Se déconnecter
      </button>
    </div>
  )
}

// ─── SETTINGS ROW ─────────────────────────────────────────────────────────────
function SettingsRow({ label, icon, value, onPress }) {
  return (
    <button onClick={onPress} style={{ ...styles.row, cursor: onPress ? 'pointer' : 'default' }}>
      <span style={styles.rowIcon}>{icon}</span>
      <span style={styles.rowLabel}>{label}</span>
      {value
        ? <span style={styles.rowValue}>{value}</span>
        : onPress && <ChevronRight size={16} style={{ color: '#94a3b8' }} />
      }
    </button>
  )
}

// ─── BACK HEADER ──────────────────────────────────────────────────────────────
function BackHeader({ title, onBack }) {
  return (
    <div style={styles.backHeader}>
      <button onClick={onBack} style={styles.backBtn}>← Retour</button>
      <h2 style={styles.subTitle}>{title}</h2>
    </div>
  )
}

// ─── PROFILE SECTION ──────────────────────────────────────────────────────────
function ProfileSection({ onBack }) {
  const { profile, updateProfile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    setLoading(true)
    await updateProfile({ full_name: fullName })
    setSuccess(true)
    setLoading(false)
    setTimeout(() => setSuccess(false), 2000)
  }

  const focusStyle = e => { e.target.style.borderColor = '#22c55e'; e.target.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.12)' }
  const blurStyle  = e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }

  return (
    <div style={styles.root}>
      <BackHeader title="Mon profil" onBack={onBack} />
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={styles.field}>
          <label style={styles.label}>Nom complet</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
            style={styles.input} onFocus={focusStyle} onBlur={blurStyle} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Email</label>
          <input type="email" value={profile?.email ?? ''} disabled
            style={{ ...styles.input, opacity: 0.5, cursor: 'not-allowed' }} />
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>L'email ne peut pas être modifié.</span>
        </div>
        {success && <div style={styles.successMsg}>✓ Profil mis à jour</div>}
        <button type="submit" disabled={loading} style={{ ...styles.submitBtn, opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Enregistrement...' : 'Sauvegarder'}
        </button>
      </form>
    </div>
  )
}

// ─── CATEGORIES SECTION ───────────────────────────────────────────────────────
function CategoriesSection({ onBack }) {
  const { user } = useAuth()
  const [categories, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editCat, setEditCat] = useState(null)

  async function loadCats() {
    setLoading(true)
    const { data } = await supabase.from('categories').select('*').eq('user_id', user.id).order('type').order('parent_id', { nullsFirst: true }).order('name')
    setCats(data || [])
    setLoading(false)
  }

  useEffect(() => { loadCats() }, [])

  async function deleteCat(id) {
    await supabase.from('categories').delete().eq('id', id)
    setCats(prev => prev.filter(c => c.id !== id))
  }

  const grouped = {
    expense:    categories.filter(c => c.type === 'expense'    && !c.parent_id),
    income:     categories.filter(c => c.type === 'income'     && !c.parent_id),
    investment: categories.filter(c => c.type === 'investment' && !c.parent_id),
  }
  const children = categories.filter(c => c.parent_id)

  const typeLabels = { expense: '💸 Dépenses', income: '💰 Revenus', investment: '📈 Investissements' }

  return (
    <div style={styles.root}>
      <BackHeader title="Catégories" onBack={onBack} />
      <button onClick={() => { setEditCat(null); setShowForm(true) }} style={styles.addRowBtn}>
        <Plus size={16} /> Nouvelle catégorie
      </button>

      {loading ? <p style={{ color: '#94a3b8', textAlign: 'center' }}>Chargement...</p> : (
        Object.entries(grouped).map(([type, parents]) => parents.length === 0 ? null : (
          <div key={type} style={styles.group}>
            <div style={styles.groupLabel}>{typeLabels[type]}</div>
            {parents.map(cat => (
              <div key={cat.id}>
                <div style={styles.catRow}>
                  <span style={styles.catDot(cat.color)} />
                  <span style={{ fontSize: '1rem' }}>{cat.icon}</span>
                  <span style={styles.catName}>{cat.name}</span>
                  <button onClick={() => { setEditCat(cat); setShowForm(true) }} style={styles.iconBtn}><Trash2 size={13} style={{ display: 'none' }} /></button>
                  <button onClick={() => deleteCat(cat.id)} style={{ ...styles.iconBtn, color: '#ef4444' }}><Trash2 size={14} /></button>
                </div>
                {children.filter(c => c.parent_id === cat.id).map(child => (
                  <div key={child.id} style={{ ...styles.catRow, paddingLeft: '2.5rem' }}>
                    <span style={styles.catDot(child.color)} />
                    <span style={{ fontSize: '0.9rem' }}>{child.icon}</span>
                    <span style={{ ...styles.catName, color: '#64748b' }}>↳ {child.name}</span>
                    <button onClick={() => deleteCat(child.id)} style={{ ...styles.iconBtn, color: '#ef4444' }}><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))
      )}

      {showForm && (
        <CategoryForm
          cat={editCat}
          userId={user.id}
          categories={categories.filter(c => !c.parent_id)}
          onClose={() => { setShowForm(false); setEditCat(null) }}
          onSaved={() => { setShowForm(false); setEditCat(null); loadCats() }}
        />
      )}
    </div>
  )
}

function CategoryForm({ cat, userId, categories, onClose, onSaved }) {
  const [name, setName]       = useState(cat?.name ?? '')
  const [icon, setIcon]       = useState(cat?.icon ?? '📦')
  const [color, setColor]     = useState(cat?.color ?? '#6b7280')
  const [type, setType]       = useState(cat?.type ?? 'expense')
  const [parentId, setParent] = useState(cat?.parent_id ?? '')
  const [loading, setLoading] = useState(false)

  const focusStyle = e => { e.target.style.borderColor = '#22c55e'; e.target.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.12)' }
  const blurStyle  = e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const payload = { user_id: userId, name, icon, color, type, parent_id: parentId || null }
    if (cat) await supabase.from('categories').update(payload).eq('id', cat.id)
    else     await supabase.from('categories').insert(payload)
    onSaved()
    setLoading(false)
  }

  const parents = categories.filter(c => c.type === type && !c.parent_id)

  return (
    <>
      <div style={styles.backdrop} onClick={onClose} />
      <div style={styles.formSheet}>
        <div style={styles.formHeader}>
          <h2 style={styles.formTitle}>{cat ? 'Modifier' : 'Nouvelle catégorie'}</h2>
          <button onClick={onClose} style={styles.closeBtn}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={styles.typeRow}>
            {['expense','income','investment'].map(t => (
              <button key={t} type="button" onClick={() => { setType(t); setParent('') }}
                style={{ ...styles.typeBtn, backgroundColor: type === t ? '#0f172a' : '#f8fafc', color: type === t ? '#fff' : '#94a3b8', border: `2px solid ${type === t ? '#0f172a' : 'transparent'}` }}>
                {t === 'expense' ? 'Dépense' : t === 'income' ? 'Revenu' : 'Investis'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ ...styles.field, width: '70px' }}>
              <label style={styles.label}>Icône</label>
              <input value={icon} onChange={e => setIcon(e.target.value)} style={{ ...styles.input, textAlign: 'center', fontSize: '1.3rem' }} onFocus={focusStyle} onBlur={blurStyle} />
            </div>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Nom</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required style={styles.input} onFocus={focusStyle} onBlur={blurStyle} />
            </div>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Couleur</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#64748b'].map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: c, border: color === c ? '3px solid #0f172a' : '3px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
          </div>
          {parents.length > 0 && (
            <div style={styles.field}>
              <label style={styles.label}>Catégorie parente (optionnel)</label>
              <select value={parentId} onChange={e => setParent(e.target.value)} style={styles.input}>
                <option value="">Aucune (catégorie principale)</option>
                {parents.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
              </select>
            </div>
          )}
          <button type="submit" disabled={loading} style={{ ...styles.submitBtn, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Enregistrement...' : cat ? 'Modifier' : 'Créer'}
          </button>
        </form>
      </div>
    </>
  )
}

// ─── BUDGET LIMITS SECTION ────────────────────────────────────────────────────
function BudgetSection({ onBack }) {
  const { user } = useAuth()
  const [limits, setLimits]   = useState([])
  const [cats, setCats]       = useState([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId]   = useState(null)
  const [editVal, setEditVal] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: l }, { data: c }] = await Promise.all([
        supabase.from('budget_limits').select('*, category:categories(id,name,icon,color)').eq('user_id', user.id),
        supabase.from('categories').select('*').eq('user_id', user.id).eq('type', 'expense').is('parent_id', null).order('name')
      ])
      setLimits(l || [])
      setCats(c  || [])
      setLoading(false)
    }
    load()
  }, [])

  async function saveLimit(categoryId, amount) {
    const existing = limits.find(l => l.category_id === categoryId)
    if (existing) {
      await supabase.from('budget_limits').update({ amount: Number(amount) }).eq('id', existing.id)
      setLimits(prev => prev.map(l => l.category_id === categoryId ? { ...l, amount: Number(amount) } : l))
    } else {
      const { data } = await supabase.from('budget_limits').insert({ user_id: user.id, category_id: categoryId, amount: Number(amount) }).select('*, category:categories(id,name,icon,color)').single()
      if (data) setLimits(prev => [...prev, data])
    }
    setEditId(null)
  }

  async function deleteLimit(id) {
    await supabase.from('budget_limits').delete().eq('id', id)
    setLimits(prev => prev.filter(l => l.id !== id))
  }

  const limitsMap = Object.fromEntries(limits.map(l => [l.category_id, l]))
  const catsWithoutLimit = cats.filter(c => !limitsMap[c.id])

  return (
    <div style={styles.root}>
      <BackHeader title="Limites de budget" onBack={onBack} />
      <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem', marginTop: '-0.5rem' }}>
        Définissez un plafond mensuel par catégorie.
      </p>

      {loading ? <p style={{ color: '#94a3b8', textAlign: 'center' }}>Chargement...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {/* Existing limits */}
          {limits.map(lim => (
            <div key={lim.id} style={styles.limitRow}>
              <span style={{ fontSize: '1rem' }}>{lim.category?.icon}</span>
              <span style={styles.limitName}>{lim.category?.name}</span>
              {editId === lim.category_id ? (
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <input type="number" value={editVal} onChange={e => setEditVal(e.target.value)}
                    style={{ ...styles.input, width: '90px', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                    autoFocus onFocus={e => { e.target.style.borderColor = '#22c55e' }} onBlur={e => { e.target.style.borderColor = '#e2e8f0' }}
                  />
                  <button onClick={() => saveLimit(lim.category_id, editVal)} style={{ ...styles.submitBtn, padding: '0.4rem 0.75rem', fontSize: '0.8rem', marginTop: 0 }}>✓</button>
                  <button onClick={() => setEditId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={16} /></button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={styles.limitAmt} onClick={() => { setEditId(lim.category_id); setEditVal(lim.amount) }}>{fmt(lim.amount)}/mois</span>
                  <button onClick={() => deleteLimit(lim.id)} style={{ ...styles.iconBtn, color: '#ef4444' }}><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          ))}

          {/* Add limit for categories without one */}
          {catsWithoutLimit.length > 0 && (
            <>
              <div style={{ ...styles.groupLabel, marginTop: '0.75rem' }}>Ajouter une limite</div>
              {catsWithoutLimit.map(cat => (
                <div key={cat.id} style={styles.limitRow}>
                  <span style={{ fontSize: '1rem' }}>{cat.icon}</span>
                  <span style={styles.limitName}>{cat.name}</span>
                  {editId === cat.id ? (
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <input type="number" value={editVal} onChange={e => setEditVal(e.target.value)}
                        style={{ ...styles.input, width: '90px', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                        autoFocus placeholder="€" onFocus={e => { e.target.style.borderColor = '#22c55e' }} onBlur={e => { e.target.style.borderColor = '#e2e8f0' }}
                      />
                      <button onClick={() => saveLimit(cat.id, editVal)} style={{ ...styles.submitBtn, padding: '0.4rem 0.75rem', fontSize: '0.8rem', marginTop: 0 }}>✓</button>
                      <button onClick={() => setEditId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={16} /></button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditId(cat.id); setEditVal('') }} style={styles.addLimitBtn}>
                      <Plus size={13} /> Ajouter
                    </button>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = {
  root: { padding: '1.5rem 1rem 2rem', maxWidth: '680px', fontFamily: '"DM Sans", sans-serif' },
  title: { margin: '0 0 1.25rem', fontSize: '1.6rem', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.03em', fontFamily: '"Sora", sans-serif' },
  profileCard: { display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#fff', borderRadius: '16px', padding: '1rem 1.25rem', marginBottom: '1.25rem', boxShadow: '0 1px 12px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' },
  avatar: { width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1rem', fontWeight: '700', flexShrink: 0 },
  profileName: { fontSize: '0.95rem', fontWeight: '700', color: '#0f172a' },
  profileEmail: { fontSize: '0.78rem', color: '#64748b', marginTop: '1px' },
  adminBadge: { backgroundColor: 'rgba(139,92,246,0.12)', color: '#8b5cf6', fontSize: '0.7rem', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', letterSpacing: '0.05em' },
  group: { backgroundColor: '#fff', borderRadius: '16px', padding: '0.25rem 0', marginBottom: '1rem', boxShadow: '0 1px 12px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden' },
  groupLabel: { fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.75rem 1rem 0.3rem' },
  row: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', width: '100%', background: 'none', border: 'none', borderBottom: '1px solid #f8fafc', textAlign: 'left', fontFamily: '"DM Sans", sans-serif' },
  rowIcon: { fontSize: '1rem', width: '24px', textAlign: 'center' },
  rowLabel: { flex: 1, fontSize: '0.875rem', fontWeight: '500', color: '#0f172a' },
  rowValue: { fontSize: '0.8rem', color: '#94a3b8' },
  themeRow: { display: 'flex', gap: '0.5rem', padding: '0.75rem 1rem' },
  themeBtn: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', padding: '0.6rem 0.25rem', borderRadius: '10px', border: '2px solid transparent', background: '#f8fafc', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '500', color: '#64748b', fontFamily: '"DM Sans", sans-serif', transition: 'all 0.15s' },
  themeBtnActive: { backgroundColor: '#f0fdf4', border: '2px solid #22c55e', color: '#16a34a' },
  signOutBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.85rem', border: '1px solid #fee2e2', borderRadius: '12px', background: 'none', color: '#ef4444', fontWeight: '600', cursor: 'pointer', fontSize: '0.875rem', fontFamily: '"DM Sans", sans-serif', marginTop: '0.5rem' },
  // Sub-sections
  backHeader: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' },
  backBtn: { background: 'none', border: 'none', color: '#22c55e', fontWeight: '600', cursor: 'pointer', fontSize: '0.875rem', padding: 0, fontFamily: '"DM Sans", sans-serif' },
  subTitle: { margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#0f172a', fontFamily: '"Sora", sans-serif' },
  addRowBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', color: '#16a34a', fontWeight: '600', cursor: 'pointer', fontSize: '0.875rem', fontFamily: '"DM Sans", sans-serif', marginBottom: '1rem' },
  catRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', borderBottom: '1px solid #f8fafc' },
  catDot: (color) => ({ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }),
  catName: { flex: 1, fontSize: '0.875rem', fontWeight: '500', color: '#0f172a' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px', display: 'flex', borderRadius: '4px' },
  limitRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0', borderBottom: '1px solid #f8fafc' },
  limitName: { flex: 1, fontSize: '0.875rem', fontWeight: '500', color: '#0f172a' },
  limitAmt: { fontSize: '0.875rem', fontWeight: '700', fontFamily: 'monospace', color: '#0f172a', cursor: 'pointer' },
  addLimitBtn: { display: 'flex', alignItems: 'center', gap: '4px', padding: '0.3rem 0.6rem', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', color: '#64748b', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' },
  // Form
  backdrop: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 50 },
  formSheet: { position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '500px', backgroundColor: '#fff', borderRadius: '24px 24px 0 0', zIndex: 51, padding: '1.5rem', maxHeight: '92vh', overflowY: 'auto', boxSizing: 'border-box' },
  formHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  formTitle: { margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#0f172a', fontFamily: '"Sora", sans-serif' },
  closeBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', padding: '0.25rem', borderRadius: '8px' },
  typeRow: { display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' },
  typeBtn: { flex: 1, padding: '0.5rem 0.25rem', borderRadius: '10px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s', fontFamily: '"DM Sans", sans-serif' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  label: { fontSize: '0.72rem', fontWeight: '600', color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' },
  input: { width: '100%', padding: '0.8rem 1rem', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box', fontFamily: '"DM Sans", sans-serif', color: '#0f172a', backgroundColor: '#fff' },
  successMsg: { backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', padding: '0.6rem 0.9rem', fontSize: '0.8rem', color: '#16a34a' },
  submitBtn: { width: '100%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', borderRadius: '12px', padding: '0.9rem', color: '#fff', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(34,197,94,0.25)', fontFamily: '"DM Sans", sans-serif', marginTop: '0.25rem' },
}