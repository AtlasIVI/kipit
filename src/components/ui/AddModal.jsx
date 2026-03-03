import { useNavigate } from 'react-router-dom'
import { TrendingDown, TrendingUp, RefreshCw, X } from 'lucide-react'
import { useState, useEffect } from 'react'


const options = [
  { label: 'Dépense',      icon: TrendingDown, color: '#ef4444',  bg: 'rgba(239,68,68,0.08)',   type: 'expense'      },
  { label: 'Revenu',       icon: TrendingUp,   color: '#22c55e',  bg: 'rgba(34,197,94,0.08)',   type: 'income'       },
  { label: 'Abonnement',   icon: RefreshCw,    color: '#8b5cf6',  bg: 'rgba(139,92,246,0.08)',  type: 'subscription' },
]

export default function AddModal({ onClose }) {
  const navigate = useNavigate()

  function handleSelect(type) {
    onClose()
    if (type === 'subscription') {
      navigate('/subscriptions?add=true')
    } else {
      navigate(`/transactions?type=${type}`)
    }
  }
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])
  return (
    <>
      {/* Backdrop */}
      <div
        style={styles.backdrop}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div style={styles.sheet}>
        <div style={styles.header}>
          <h2 style={styles.title}>Ajouter</h2>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        <div style={styles.grid}>
          {options.map(({ label, icon: Icon, color, bg, type }) => (
            <button
              key={type}
              onClick={() => handleSelect(type)}
              style={{ ...styles.optionBtn, backgroundColor: bg }}
            >
              <div style={{ ...styles.optionIcon, color }}>
                <Icon size={26} strokeWidth={2} />
              </div>
              <span style={{ ...styles.optionLabel, color }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

const styles = {
  backdrop: {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(4px)',
    zIndex: 50,
  },
  sheet: {
    position: 'fixed', bottom: 0,
    left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: '500px',
    backgroundColor: '#fff',
    borderRadius: '24px 24px 0 0',
    zIndex: 51,
    padding: '1.5rem 1.5rem 2.5rem',
    boxSizing: 'border-box',
    fontFamily: '"DM Sans", sans-serif',
  },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: '1.25rem',
  },
  title: {
    margin: 0, fontSize: '1.2rem', fontWeight: '700',
    color: '#0f172a', fontFamily: '"Sora", sans-serif',
  },
  closeBtn: {
    background: 'none', border: 'none', color: '#94a3b8',
    cursor: 'pointer', display: 'flex', padding: '0.25rem', borderRadius: '8px',
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem',
  },
  optionBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '0.6rem', padding: '1.1rem 0.5rem',
    border: 'none', borderRadius: '16px', cursor: 'pointer',
    transition: 'transform 0.15s', fontFamily: '"DM Sans", sans-serif',
  },
  optionIcon: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  optionLabel: { fontSize: '0.82rem', fontWeight: '600' },
}