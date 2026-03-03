import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Home, ArrowLeftRight, RefreshCw, BarChart2, Plus, Settings, LogOut, Shield } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import AddModal from '@/components/ui/AddModal'

const navItems = [
  { to: '/',              icon: Home,           label: 'Accueil'       },
  { to: '/transactions',  icon: ArrowLeftRight,  label: 'Transactions'  },
  { to: '/subscriptions', icon: RefreshCw,       label: 'Abonnements'   },
  { to: '/reports',       icon: BarChart2,        label: 'Rapports'      },
  { to: '/settings',      icon: Settings,         label: 'Paramètres'    },
]

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = e => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

export default function AppLayout() {
  const [showAdd, setShowAdd] = useState(false)
  const isDesktop = useIsDesktop()
  const { profile, isAdmin, signOut } = useAuth()

  return (
    <div style={isDesktop ? styles.desktopRoot : styles.mobileRoot}>
      {isDesktop
        ? <Sidebar showAdd={() => setShowAdd(true)} profile={profile} isAdmin={isAdmin} signOut={signOut} />
        : <BottomBar showAdd={() => setShowAdd(true)} isAdmin={isAdmin} />
      }

      <main style={isDesktop ? styles.desktopMain : styles.mobileMain}>
        <Outlet />
      </main>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

// ─── SIDEBAR (desktop) ────────────────────────────────────────────────────────
function Sidebar({ showAdd, profile, isAdmin, signOut }) {
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <aside style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.sidebarLogo}>
        <img src="/src/img/logo.png" alt="Logo" style={styles.logoIcon} />
        <span style={styles.logoText}>budget</span>
      </div>

      {/* Add button */}
      <button onClick={showAdd} style={styles.sidebarAddBtn}>
        <Plus size={18} strokeWidth={2.5} />
        Ajouter
      </button>

      {/* Nav links */}
      <nav style={styles.sidebarNav}>
        {navItems.map(item => (
          <SidebarItem key={item.to} {...item} />
        ))}
        {isAdmin && <SidebarItem to="/admin" icon={Shield} label="Admin" />}
      </nav>

      {/* Profile at bottom */}
      <div style={styles.sidebarFooter}>
        <div style={styles.sidebarProfile}>
          <div style={styles.sidebarAvatar}>
            {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div style={styles.sidebarProfileInfo}>
            <span style={styles.sidebarProfileName}>{profile?.full_name ?? 'Utilisateur'}</span>
            <span style={styles.sidebarProfileEmail}>{profile?.email ?? ''}</span>
          </div>
        </div>
        <button onClick={handleSignOut} style={styles.sidebarSignOut} title="Déconnexion">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )
}

function SidebarItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      style={({ isActive }) => ({
        ...styles.sidebarItem,
        ...(isActive ? styles.sidebarItemActive : {})
      })}
    >
      {({ isActive }) => (
        <>
          <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  )
}

// ─── BOTTOM BAR (mobile) ──────────────────────────────────────────────────────
function BottomBar({ showAdd, isAdmin }) {
  const mobileItems = navItems.slice(0, 4) // Settings accessible via Home sur mobile

  return (
    <nav style={styles.bottomBar}>
      {mobileItems.slice(0, 2).map(item => (
        <BottomTabItem key={item.to} {...item} />
      ))}

      {/* Center Add button */}
      <button onClick={showAdd} style={styles.bottomAddWrap}>
        <span style={styles.bottomAddBtn}>
          <Plus size={26} color="white" strokeWidth={2.5} />
        </span>
        <span style={styles.bottomAddLabel}>Ajouter</span>
      </button>

      {mobileItems.slice(2).map(item => (
        <BottomTabItem key={item.to} {...item} />
      ))}
    </nav>
  )
}

function BottomTabItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      style={({ isActive }) => ({
        ...styles.bottomItem,
        color: isActive ? '#22c55e' : '#64748b'
      })}
    >
      {({ isActive }) => (
        <>
          <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
          <span style={styles.bottomItemLabel}>{label}</span>
        </>
      )}
    </NavLink>
  )
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = {
  // Desktop layout
  desktopRoot: {
    display: 'flex',
    height: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '"DM Sans", sans-serif',
  },
  desktopMain: {
    flex: 1,
    overflowY: 'auto',
    backgroundColor: '#f1f5f9',
  },

  // Mobile layout
  mobileRoot: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    maxWidth: '430px',
    margin: '0 auto',
    fontFamily: '"DM Sans", sans-serif',
    position: 'relative',
  },
  mobileMain: {
    flex: 1,
    overflowY: 'auto',
    paddingBottom: '80px',
  },

  // Sidebar
  sidebar: {
    width: '240px',
    flexShrink: 0,
    backgroundColor: '#080f1a',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem 1rem',
    borderRight: '1px solid #1e3a4a',
  },
  sidebarLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    marginBottom: '1.75rem',
    paddingLeft: '0.5rem',
  },
  logoIcon: {
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    objectFit: 'contain',
  },
  logoText: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: '#f1f5f9',
    letterSpacing: '-0.03em',
    fontFamily: '"Sora", sans-serif',
  },
  sidebarAddBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    width: '100%',
    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
    border: 'none',
    borderRadius: '12px',
    padding: '0.7rem 1rem',
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '1.5rem',
    fontFamily: '"DM Sans", sans-serif',
    boxShadow: '0 4px 12px rgba(34,197,94,0.25)',
    transition: 'opacity 0.15s',
  },
  sidebarNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    flex: 1,
  },
  sidebarItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.65rem 0.75rem',
    borderRadius: '10px',
    color: '#64748b',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'background 0.15s, color 0.15s',
  },
  sidebarItemActive: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    color: '#22c55e',
  },
  sidebarFooter: {
    borderTop: '1px solid #1e3a4a',
    paddingTop: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  sidebarProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    flex: 1,
    minWidth: 0,
  },
  sidebarAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '0.8rem',
    fontWeight: '700',
    flexShrink: 0,
  },
  sidebarProfileInfo: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  sidebarProfileName: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#f1f5f9',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  sidebarProfileEmail: {
    fontSize: '0.7rem',
    color: '#475569',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  sidebarSignOut: {
    background: 'none',
    border: 'none',
    color: '#475569',
    cursor: 'pointer',
    padding: '0.4rem',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    transition: 'color 0.15s',
  },

  // Bottom bar
  bottomBar: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '430px',
    backgroundColor: '#080f1a',
    borderTop: '1px solid #1e3a4a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: '0.5rem 0.5rem max(env(safe-area-inset-bottom), 0.5rem)',
    zIndex: 40,
  },
  bottomItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '0.3rem 0.75rem',
    textDecoration: 'none',
    transition: 'color 0.15s',
  },
  bottomItemLabel: {
    fontSize: '10px',
    fontWeight: '500',
  },
  bottomAddWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    marginTop: '-20px',
    padding: '0 0.75rem',
  },
  bottomAddBtn: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(34,197,94,0.4)',
  },
  bottomAddLabel: {
    fontSize: '10px',
    fontWeight: '500',
    color: '#64748b',
  },
}