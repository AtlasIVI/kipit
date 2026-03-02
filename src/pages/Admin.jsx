import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Copy, Check } from 'lucide-react'

function randomToken() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 24)
}

export default function Admin() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [invites, setInvites] = useState([])
  const [copied, setCopied] = useState(null)

  async function generateInvite() {
    setLoading(true)
    const token = randomToken()
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('invites')
      .insert({ token, created_by: profile.id, expires_at: expires })
      .select()
      .single()

    if (!error) setInvites(prev => [data, ...prev])
    setLoading(false)
  }

  function copyLink(token) {
    const url = `${window.location.origin}/register?token=${token}`
    navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="p-4 pt-6 space-y-4">
      <h1 className="text-2xl font-bold">Admin</h1>

      <button onClick={generateInvite} disabled={loading} className="btn-primary w-full">
        {loading ? 'Generating...' : 'Generate Invite Link'}
      </button>

      <div className="space-y-2">
        {invites.map(inv => (
          <div key={inv.id} className="card flex items-center justify-between gap-3">
            <code className="text-xs text-surface-500 truncate">{inv.token}</code>
            <button onClick={() => copyLink(inv.token)} className="shrink-0">
              {copied === inv.token
                ? <Check size={16} className="text-brand-500" />
                : <Copy size={16} className="text-surface-400" />
              }
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
