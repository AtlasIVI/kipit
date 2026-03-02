import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Copy, Check, Trash2, Clock, User } from 'lucide-react'
import { format, parseISO, isPast } from 'date-fns'
import { fr } from 'date-fns/locale'

function randomToken() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 24)
}

export default function Admin() {
  const { profile, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [invites, setInvites] = useState([])
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied]   = useState(null)
  const [expiryDays, setExpiry] = useState(7)

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return }
    loadData()
  }, [isAdmin])

  async function loadData() {
    setLoading(true)
    const [{ data: inv }, { data: usr }] = await Promise.all([
      supabase.from('invites').select('*, created_by_profile:profiles!invites_created_by_fkey(full_name), used_by_profile:profiles!invites_used_by_fkey(full_name)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false })
    ])
    setInvites(inv || [])
    setUsers(usr  || [])
    setLoading(false)
  }

  async function generateInvite() {
    setGenerating(true)
    const token   = randomToken()
    const expires = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('invites')
      .insert({ token, created_by: profile.id, expires_at: expires })
      .select('*, created_by_profile:profiles!invites_created_by_fkey(full_name)')
      .single()
    if (!error && data) setInvites(prev => [data, ...prev])
    setGenerating(false)
  }

  async function deleteInvite(id) {
    await supabase.from('invites').delete().eq('id', id)
    setInvites(prev => prev.filter(i => i.id !== id))
  }

  function copyLink(token) {
    const url = `${window.location.origin}/register?token=${token}`
    navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  const activeInvites = invites.filter(i => !i.used_by && !isPast(parseISO(i.expires_at)))
  const usedInvites   = invites.filter(i => i.used_by)
  const expiredInvites = invites.filter(i => !i.used_by && isPast(parseISO(i.expires_at)))

  return (
    <div style={styles.root}>
      <h1 style={styles.title}>Administration</h1>

      {/* Stats */}
      <div style={styles.statsRow}>
        <StatCard label="Utilisateurs" value={users.length} icon="👥" color="#3b82f6" />
        <StatCard label="Invitations actives" value={activeInvites.length} icon="🔑" color="#22c55e" />
        <StatCard label="Invitations utilisées" value={usedInvites.length} icon="✓" color="#8b5cf6" />
      </div>

      {/* Generate invite */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Générer une invitation</h3>
        <div style={styles.generateRow}>
          <div style={styles.field}>
            <label style={styles.label}>Expire dans</label>
            <select value={expiryDays} onChange={e => setExpiry(Number(e.target.value))} style={styles.input}>
              <option value={1}>1 jour</option>
              <option value={3}>3 jours</option>
              <option value={7}>7 jours</option>
              <option value={30}>30 jours</option>
            </select>
          </div>
          <button onClick={generateInvite} disabled={generating} style={{ ...styles.generateBtn, opacity: generating ? 0.6 : 1 }}>
            {generating ? '...' : '+ Générer'}
          </button>
        </div>
      </div>

      {/* Active invites */}
      {activeInvites.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Invitations actives ({activeInvites.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {activeInvites.map(inv => (
              <InviteRow key={inv.id} inv={inv} onCopy={() => copyLink(inv.token)} onDelete={() => deleteInvite(inv.id)} copied={copied === inv.token} />
            ))}
          </div>
        </div>
      )}

      {/* Users */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Utilisateurs ({users.length})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {loading ? <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Chargement...</p> : users.map(u => (
            <div key={u.id} style={styles.userRow}>
              <div style={styles.userAvatar}>{u.full_name?.[0]?.toUpperCase() ?? '?'}</div>
              <div style={{ flex: 1 }}>
                <div style={styles.userName}>{u.full_name}</div>
                <div style={styles.userEmail}>{u.email}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                {u.is_admin && <span style={styles.adminBadge}>Admin</span>}
                <span style={styles.dateBadge}>{format(parseISO(u.created_at), 'd MMM yyyy', { locale: fr })}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Used + expired (collapsed) */}
      {(usedInvites.length > 0 || expiredInvites.length > 0) && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Historique</h3>
          {[...usedInvites, ...expiredInvites].map(inv => (
            <div key={inv.id} style={{ ...styles.inviteRow, opacity: 0.5 }}>
              <code style={styles.token}>{inv.token}</code>
              <span style={{ fontSize: '0.72rem', color: inv.used_by ? '#22c55e' : '#ef4444' }}>
                {inv.used_by ? `✓ ${inv.used_by_profile?.full_name ?? 'utilisé'}` : 'Expiré'}
              </span>
              <button onClick={() => deleteInvite(inv.id)} style={{ ...styles.iconBtn, color: '#ef4444' }}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InviteRow({ inv, onCopy, onDelete, copied }) {
  const expiresAt = parseISO(inv.expires_at)
  const daysLeft  = Math.ceil((expiresAt - new Date()) / 86400000)

  return (
    <div style={styles.inviteRow}>
      <code style={styles.token}>{inv.token}</code>
      <span style={{ fontSize: '0.72rem', color: '#f59e0b' }}>
        <Clock size={10} style={{ marginRight: '3px', verticalAlign: 'middle' }} />
        {daysLeft}j
      </span>
      <button onClick={onCopy} style={styles.copyBtn} title="Copier le lien">
        {copied ? <Check size={15} style={{ color: '#22c55e' }} /> : <Copy size={15} />}
      </button>
      <button onClick={onDelete} style={{ ...styles.iconBtn, color: '#ef4444' }}><Trash2 size={13} /></button>
    </div>
  )
}

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{ ...styles.statCard, borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: '1.4rem' }}>{icon}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: '700', color, fontFamily: 'monospace' }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  )
}

const styles = {
  root: { padding: '1.5rem 1rem 2rem', maxWidth: '680px', fontFamily: '"DM Sans", sans-serif' },
  title: { margin: '0 0 1.25rem', fontSize: '1.6rem', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.03em', fontFamily: '"Sora", sans-serif' },
  statsRow: { display: 'flex', gap: '0.75rem', marginBottom: '1rem' },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: '12px', padding: '0.75rem', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'center', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: '16px', padding: '1.25rem', marginBottom: '1rem', boxShadow: '0 1px 12px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' },
  cardTitle: { margin: '0 0 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' },
  generateRow: { display: 'flex', gap: '0.75rem', alignItems: 'flex-end' },
  field: { flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  label: { fontSize: '0.72rem', fontWeight: '600', color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' },
  input: { padding: '0.7rem 0.9rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem', outline: 'none', fontFamily: '"DM Sans", sans-serif', color: '#0f172a' },
  generateBtn: { padding: '0.7rem 1.25rem', background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: '700', cursor: 'pointer', fontSize: '0.875rem', fontFamily: '"DM Sans", sans-serif', whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(34,197,94,0.2)' },
  inviteRow: { display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0', borderBottom: '1px solid #f8fafc' },
  token: { flex: 1, fontSize: '0.75rem', color: '#334155', backgroundColor: '#f8fafc', padding: '0.3rem 0.6rem', borderRadius: '6px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' },
  copyBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: '2px' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px', display: 'flex', borderRadius: '4px' },
  userRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid #f8fafc' },
  userAvatar: { width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.8rem', fontWeight: '700', flexShrink: 0 },
  userName: { fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' },
  userEmail: { fontSize: '0.75rem', color: '#94a3b8' },
  adminBadge: { backgroundColor: 'rgba(139,92,246,0.12)', color: '#8b5cf6', fontSize: '0.65rem', fontWeight: '700', padding: '2px 6px', borderRadius: '20px' },
  dateBadge: { fontSize: '0.72rem', color: '#94a3b8' },
}