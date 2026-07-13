import { useState, useEffect } from 'react'
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import NotificationBell from '../../components/NotificationBell'

const NAV = [
  {
    section: 'OVERVIEW',
    items: [
      { to: '/mentee/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    ],
  },
  {
    section: 'LEARN',
    items: [
      { to: '/programs',           label: 'Browse Programs', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
      { to: '/mentee/enrollments', label: 'My Enrollments', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
      { to: '/mentee/sessions',    label: 'My Sessions',    icon: 'M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
      { to: '/mentee/ai-interview', label: 'AI Interview',  icon: 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3' },
    ],
  },
  {
    section: 'TRACK',
    items: [
      { to: '/mentee/attendance', label: 'Attendance',  icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
      { to: '/mentee/resources',  label: 'Resources',   icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
    ],
  },
]

const CRUMBS = {
  '/mentee/dashboard':    ['Dashboard',      'Overview'],
  '/programs':            ['Browse Programs','All Programs'],
  '/mentee/enrollments':  ['My Enrollments', 'Active'],
  '/mentee/sessions':     ['My Sessions',    'All Sessions'],
  '/mentee/ai-interview': ['AI Interview',   'Practice'],
  '/mentee/attendance':   ['Attendance',     'My Record'],
  '/mentee/resources':    ['Resources',      'Study Materials'],
}

export default function MenteeLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const crumb = CRUMBS[pathname] || ['Mentee Portal', '']
  const handleLogout = async () => { await logout(); navigate('/') }
  const initial = (user?.full_name?.[0] ?? 'L').toUpperCase()

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setSidebarOpen(false)
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const closeNav = () => { if (isMobile) setSidebarOpen(false) }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 49 }} />
      )}

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220, minWidth: 220, background: '#0f172a', display: 'flex', flexDirection: 'column',
        boxShadow: '2px 0 20px rgba(0,0,0,0.25)',
        ...(isMobile ? {
          position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 50,
          width: 260, minWidth: 'unset',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-260px)',
          transition: 'transform 0.25s ease',
        } : {
          height: '100vh', position: 'sticky', top: 0,
        }),
      }}>

        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }} title="Go to Home">
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(124,58,237,0.4)' }}>
                <svg viewBox="0 0 32 28" width="18" height="18" fill="none">
                  <path d="M2 18 Q6 4 12 14 Q16 20 20 8 Q24 0 30 12" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </div>
              <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px' }}>
                <span style={{ color: '#fff' }}>Agile</span>
                <span style={{ color: '#c4b5fd' }}>Mentor</span>
              </span>
            </Link>
            {isMobile && (
              <button onClick={() => setSidebarOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4, display: 'flex', alignItems: 'center' }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* User */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
              {initial}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                {user?.full_name ?? 'Learner'}
              </p>
              <p style={{ color: '#475569', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', margin: 0, marginTop: 2 }}>MENTEE</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          {NAV.map(section => (
            <div key={section.section} style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#334155', margin: '0 0 6px 8px' }}>
                {section.section}
              </p>
              {section.items.map(item => (
                <NavLink key={item.to} to={item.to} onClick={closeNav}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 10px', borderRadius: 10, marginBottom: 2,
                    textDecoration: 'none', fontSize: 13, fontWeight: 500,
                    transition: 'all 0.15s',
                    background: isActive ? '#7c3aed' : 'transparent',
                    color: isActive ? '#fff' : '#94a3b8',
                  })}>
                  {({ isActive }) => (<>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon}/>
                    </svg>
                    <span>{item.label}</span>
                  </>)}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Sign out */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={handleLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, border: 'none', background: 'transparent', color: '#64748b', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Top bar */}
        <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: isMobile ? '0 16px' : '0 32px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isMobile && (
              <button onClick={() => setSidebarOpen(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: '#475569' }}>
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span style={{ fontWeight: 700, color: '#1e293b' }}>{crumb[0]}</span>
              {crumb[1] && !isMobile && <>
                <span style={{ color: '#cbd5e1' }}>/</span>
                <span style={{ color: '#94a3b8' }}>{crumb[1]}</span>
              </>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <NotificationBell accentColor="#7c3aed" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#7c3aed', padding: '4px 12px', borderRadius: 50, letterSpacing: '0.04em' }}>Mentee</span>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px' : '32px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
