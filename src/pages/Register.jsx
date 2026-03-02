import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Eye, EyeOff, ArrowRight, Key } from 'lucide-react'

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [token, setToken] = useState(params.get('token') || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const passwordStrength = password.length === 0 ? null : password.length < 6 ? 'weak' : password.length < 10 ? 'medium' : 'strong'
  const strengthColor = { weak: '#ef4444', medium: '#f59e0b', strong: '#22c55e' }
  const strengthLabel = { weak: 'Faible', medium: 'Moyen', strong: 'Fort' }
  const strengthWidth = { weak: '33%', medium: '66%', strong: '100%' }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    setLoading(true)
    const { error } = await signUp(email, password, fullName, token)
    if (error) setError(error.message)
    else navigate('/')
    setLoading(false)
  }

  const focusStyle = e => { e.target.style.borderColor = '#22c55e'; e.target.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.12)' }
  const blurStyle  = e => { e.target.style.borderColor = '#1e3a4a'; e.target.style.boxShadow = 'none' }

  return (
    <div style={styles.root}>
      <div style={styles.blob1} />
      <div style={styles.blob2} />

      <div style={styles.container}>
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>💶</div>
          <span style={styles.logoText}>budget</span>
        </div>

        <div style={styles.headlineWrap}>
          <h1 style={styles.headline}>Créer un compte.</h1>
          <p style={styles.sub}>Invitation requise pour rejoindre.</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Full name */}
          <div style={styles.field}>
            <label style={styles.label}>Nom complet</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Votre prénom et nom" required style={styles.input} onFocus={focusStyle} onBlur={blurStyle} />
          </div>

          {/* Email */}
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.com" required style={styles.input} onFocus={focusStyle} onBlur={blurStyle} />
          </div>

          {/* Password + strength */}
          <div style={styles.field}>
            <label style={styles.label}>Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 caractères"
                required
                style={{ ...styles.input, paddingRight: '3rem' }}
                onFocus={focusStyle} onBlur={blurStyle}
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {/* Strength bar */}
            {passwordStrength && (
              <div style={styles.strengthWrap}>
                <div style={styles.strengthTrack}>
                  <div style={{ ...styles.strengthFill, width: strengthWidth[passwordStrength], backgroundColor: strengthColor[passwordStrength] }} />
                </div>
                <span style={{ ...styles.strengthText, color: strengthColor[passwordStrength] }}>{strengthLabel[passwordStrength]}</span>
              </div>
            )}
          </div>

          {/* Invite token */}
          <div style={styles.field}>
            <label style={styles.label}>Token d'invitation</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="Collez votre token ici"
                required
                style={{ ...styles.input, paddingLeft: '2.8rem', fontFamily: 'monospace', fontSize: '0.85rem', letterSpacing: '0.05em' }}
                onFocus={focusStyle} onBlur={blurStyle}
              />
              <Key size={15} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
            </div>
            {token && token.length > 10 && (
              <p style={styles.tokenValid}>✓ Token détecté</p>
            )}
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={loading} style={{ ...styles.submitBtn, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Création...' : <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>Créer mon compte <ArrowRight size={18} /></span>}
          </button>
        </form>

        <p style={styles.footerText}>
          Déjà un compte ?{' '}
          <Link to="/login" style={styles.footerLink}>Se connecter</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  root: { minHeight: '100vh', backgroundColor: '#080f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative', overflow: 'hidden', fontFamily: '"DM Sans", sans-serif' },
  blob1: { position: 'absolute', top: '-10%', left: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 70%)', pointerEvents: 'none' },
  blob2: { position: 'absolute', bottom: '-20%', right: '-10%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.05) 0%, transparent 70%)', pointerEvents: 'none' },
  container: { width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1, animation: 'fadeUp 0.5s ease both' },
  logoWrap: { display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem' },
  logoIcon: { width: '40px', height: '40px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 0 24px rgba(34,197,94,0.3)' },
  logoText: { fontSize: '1.4rem', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.03em', fontFamily: '"Sora", "DM Sans", sans-serif' },
  headlineWrap: { marginBottom: '1.8rem' },
  headline: { fontSize: '2.2rem', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.04em', margin: '0 0 0.3rem 0', fontFamily: '"Sora", "DM Sans", sans-serif', lineHeight: 1.1 },
  sub: { fontSize: '0.95rem', color: '#64748b', margin: 0 },
  form: { display: 'flex', flexDirection: 'column', gap: '1.1rem', marginBottom: '1.5rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  label: { fontSize: '0.75rem', fontWeight: '500', color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' },
  input: { width: '100%', backgroundColor: '#0f1f2e', border: '1px solid #1e3a4a', borderRadius: '12px', padding: '0.85rem 1rem', color: '#f1f5f9', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box', fontFamily: '"DM Sans", sans-serif' },
  eyeBtn: { position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center' },
  strengthWrap: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.3rem' },
  strengthTrack: { flex: 1, height: '3px', backgroundColor: '#1e3a4a', borderRadius: '2px', overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: '2px', transition: 'width 0.3s, background-color 0.3s' },
  strengthText: { fontSize: '0.75rem', fontWeight: '500', minWidth: '40px' },
  tokenValid: { margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#22c55e' },
  error: { backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '0.75rem 1rem', color: '#fca5a5', fontSize: '0.875rem' },
  submitBtn: { width: '100%', background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: '12px', padding: '0.9rem', color: '#fff', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', transition: 'opacity 0.15s', boxShadow: '0 4px 20px rgba(34,197,94,0.25)', fontFamily: '"DM Sans", sans-serif', marginTop: '0.3rem' },
  footerText: { textAlign: 'center', color: '#475569', fontSize: '0.875rem', margin: 0 },
  footerLink: { color: '#22c55e', fontWeight: '600', textDecoration: 'none' },
}