import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import MentorLayout from '../../components/layouts/MentorLayout'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/client'

const C = '#4f46e5'

const PROG_GRADS = [
  'linear-gradient(135deg,#4f46e5,#6366f1)',
  'linear-gradient(135deg,#0d9488,#0891b2)',
  'linear-gradient(135deg,#7c3aed,#a855f7)',
  'linear-gradient(135deg,#d97706,#f97316)',
  'linear-gradient(135deg,#db2777,#e879f9)',
  'linear-gradient(135deg,#0f766e,#0d9488)',
]
const PROG_EMOJIS = ['🎯', '📚', '🚀', '⚡', '🧩', '📐']

function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (target == null) return
    let start = null
    const step = ts => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      setVal(Math.round(p * target))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return val
}

function Dropdown({ trigger, items }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)}>{trigger}</div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: 210, background: '#fff', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: '1px solid #f1f5f9', zIndex: 100, overflow: 'hidden' }}>
          {items.map((item, i) => item === 'divider'
            ? <div key={i} style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }} />
            : <div key={i} onClick={() => { item.onClick?.(); setOpen(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'pointer', fontSize: 13, color: item.danger ? '#dc2626' : '#1e293b', fontWeight: 500 }}
                onMouseEnter={e => e.currentTarget.style.background = item.danger ? '#fef2f2' : '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>{item.label}
              </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, subColor, bg, emoji }) {
  const counted = useCountUp(value)
  return (
    <div style={{ background: '#fff', borderRadius: 18, padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 18 }}>
      <div style={{ width: 52, height: 52, borderRadius: 15, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>{emoji}</div>
      <div>
        <p style={{ fontSize: 32, fontWeight: 900, color: '#0f172a', margin: '0 0 2px', lineHeight: 1 }}>{counted}</p>
        <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 3px' }}>{label}</p>
        <p style={{ fontSize: 11, fontWeight: 700, color: subColor, margin: 0 }}>{sub}</p>
      </div>
    </div>
  )
}

function ProgramCard({ p, idx }) {
  const grad  = PROG_GRADS[idx % PROG_GRADS.length]
  const emoji = PROG_EMOJIS[idx % PROG_EMOJIS.length]
  const isActive = p.status === 'active'

  return (
    <div style={{ minWidth: 220, maxWidth: 220, background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9', overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s, transform 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(0)' }}>
      <div style={{ background: p.cover_image ? '#f8fafc' : grad, padding: '20px 18px', position: 'relative', minHeight: 76, overflow: 'hidden' }}>
        {p.cover_image
          ? <img src={p.cover_image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 36, lineHeight: 1 }}>{emoji}</span>}
        <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 50, background: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.25)', color: isActive ? '#15803d' : 'rgba(255,255,255,0.8)', zIndex: 1 }}>
          {isActive ? '● Active' : p.status}
        </span>
      </div>
      <div style={{ padding: '12px 16px 14px' }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          {p.category && <span style={{ fontSize: 10, fontWeight: 700, color: C, background: '#eef2ff', padding: '2px 8px', borderRadius: 50 }}>{p.category}</span>}
          {p.duration_weeks && <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b' }}>📅 {p.duration_weeks}w</span>}
        </div>
        <Link to="/mentor/sessions"
          style={{ display: 'block', textAlign: 'center', padding: '8px 0', borderRadius: 9, textDecoration: 'none', fontSize: 12, fontWeight: 700, color: '#fff', background: grad, boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>
          Manage Sessions →
        </Link>
      </div>
    </div>
  )
}

function SessionCard({ s }) {
  const d      = new Date(s.scheduled_at)
  const isLive = s.session_type === 'live'
  const isToday = d.toDateString() === new Date().toDateString()
  const isTomorrow = d.toDateString() === new Date(Date.now() + 86400000).toDateString()
  const dayLabel = isToday ? 'TODAY' : isTomorrow ? 'TMRW' : d.toLocaleString('en-IN', { month: 'short' }).toUpperCase()

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: isToday ? `2px solid ${C}` : '1px solid #f1f5f9', padding: '16px 18px', boxShadow: isToday ? `0 4px 16px rgba(79,70,229,0.12)` : '0 1px 6px rgba(0,0,0,0.05)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div style={{ width: 46, height: 50, borderRadius: 12, background: isToday ? `linear-gradient(135deg,${C},#6366f1)` : '#f8fafc', border: isToday ? 'none' : '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 800, color: isToday ? 'rgba(255,255,255,0.7)' : '#94a3b8', margin: 0, letterSpacing: '0.06em' }}>{dayLabel}</p>
        <p style={{ fontSize: 18, fontWeight: 900, color: isToday ? '#fff' : C, margin: 0, lineHeight: 1.1 }}>{d.getDate()}</p>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</p>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 50, flexShrink: 0, background: isLive ? '#fee2e2' : '#ede9fe', color: isLive ? '#dc2626' : '#6d28d9' }}>
            {isLive ? '🔴 Live' : '📹 Rec'}
          </span>
        </div>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 8px' }}>
          {d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {s.program_title ?? 'Program'}
        </p>
        {isLive && s.meeting_link && (
          <a href={s.meeting_link} target="_blank" rel="noreferrer"
            style={{ display: 'inline-block', padding: '5px 12px', borderRadius: 8, textDecoration: 'none', fontSize: 11, fontWeight: 700, color: '#fff', background: `linear-gradient(135deg,${C},#6366f1)`, boxShadow: '0 2px 8px rgba(79,70,229,0.3)' }}>
            Start Meeting →
          </a>
        )}
      </div>
    </div>
  )
}

export default function MentorDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [stats,    setStats]    = useState(null)
  const [sessions, setSessions] = useState([])
  const [programs, setPrograms] = useState([])
  const [requests, setRequests] = useState([])
  const [sessionFilter, setSessionFilter] = useState('all')

  useEffect(() => {
    api.get('/api/mentor/dashboard').then(r => setStats(r.data?.stats ?? r.data)).catch(() => {})
    api.get('/api/mentor/enrollment-requests').then(r => setRequests(r.data)).catch(() => {})
    api.get('/api/mentor/programs').then(r => setPrograms(r.data)).catch(() => {})
    api.get('/api/mentor/sessions').then(r => {
      const now = new Date()
      setSessions(r.data
        .filter(s => s.scheduled_at && new Date(s.scheduled_at) > now)
        .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
        .slice(0, 8))
    }).catch(() => {})
  }, [])

  const name  = user?.full_name?.split(' ')[0] ?? 'Mentor'
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  const hour  = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const filteredSessions = sessionFilter === 'all' ? sessions
    : sessions.filter(s => s.session_type === sessionFilter)

  const createItems = [
    { icon: '🎥', label: 'New Live Session',     onClick: () => navigate('/mentor/sessions') },
    { icon: '📹', label: 'New Recorded Session', onClick: () => navigate('/mentor/sessions') },
    { icon: '🏆', label: 'Add Certificate',      onClick: () => navigate('/mentor/certificates') },
  ]
  const manageItems = [
    { icon: '📅', label: 'All Sessions',    onClick: () => navigate('/mentor/sessions') },
    { icon: '✅', label: 'Mark Attendance', onClick: () => navigate('/admin/attendance') },
    { icon: '📊', label: 'Analytics',       onClick: () => navigate('/mentor/analytics') },
  ]
  const userItems = [
    { icon: '👤', label: 'Edit Profile', onClick: () => navigate('/mentor/profile') },
    { icon: '🏆', label: 'Certificates', onClick: () => navigate('/mentor/certificates') },
    'divider',
    { icon: '🚪', label: 'Sign out', danger: true, onClick: () => { logout(); navigate('/login') } },
  ]

  const STATS = [
    { label: 'Sessions Created', value: stats?.total_sessions ?? 0, sub: 'total created',   subColor: C,         bg: `linear-gradient(135deg,${C},#6366f1)`,   emoji: '🎯' },
    { label: 'Mentees',          value: stats?.total_mentees  ?? 0, sub: 'across programs', subColor: '#0d9488', bg: 'linear-gradient(135deg,#0d9488,#0891b2)', emoji: '👥' },
    { label: 'Certificates',     value: stats?.total_certs    ?? 0, sub: 'on your profile', subColor: '#d97706', bg: 'linear-gradient(135deg,#f59e0b,#f97316)', emoji: '🏆' },
  ]

  const SESSION_FILTERS = [
    { key: 'all',      label: 'All' },
    { key: 'live',     label: '🔴 Live' },
    { key: 'recorded', label: '📹 Recorded' },
  ]

  return (
    <MentorLayout>

      {/* ── Welcome Banner ── */}
      <div className="am-banner" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#1e1b4b 100%)', borderRadius: 22, padding: '26px 32px', marginBottom: 26, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 80% 50%,rgba(79,70,229,0.22),transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -50, right: 60, width: 180, height: 180, borderRadius: '50%', background: 'rgba(79,70,229,0.07)', pointerEvents: 'none' }} />

        <div className="am-banner-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          <div>
            <p style={{ color: '#a5b4fc', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 6px' }}>{today}</p>
            <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 900, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
              {greet}, {name} 👋
            </h1>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
              Guide your mentees and manage your sessions.
              {requests.length > 0 && <span style={{ marginLeft: 10, background: 'rgba(251,191,36,0.2)', color: '#fbbf24', padding: '2px 10px', borderRadius: 50, fontSize: 12, fontWeight: 700 }}>📋 {requests.length} pending</span>}
            </p>
          </div>

          <div className="am-hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <Dropdown
              trigger={
                <button style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
                  ⚙ Manage <span style={{ fontSize: 10, opacity: 0.7 }}>▾</span>
                </button>
              }
              items={manageItems}
            />
            <Dropdown
              trigger={
                <button style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${C},#6366f1)`, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(79,70,229,0.45)' }}>
                  + Create <span style={{ fontSize: 10 }}>▾</span>
                </button>
              }
              items={createItems}
            />
            <Dropdown
              trigger={
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg,${C},#6366f1)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer', border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
                  {name[0]}
                </div>
              }
              items={userItems}
            />
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="am-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        {STATS.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* ── My Programs ── */}
      {programs.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', overflow: 'hidden', marginBottom: 22 }}>
          <div style={{ padding: '14px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C }} />
              <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}>My Programs</h2>
              <span style={{ fontSize: 11, fontWeight: 700, color: C, background: '#eef2ff', padding: '2px 8px', borderRadius: 50 }}>{programs.length}</span>
            </div>
            <Link to="/mentor/sessions" style={{ fontSize: 12, fontWeight: 700, color: C, textDecoration: 'none', padding: '5px 12px', borderRadius: 8, background: '#eef2ff' }}>Manage →</Link>
          </div>
          <div style={{ display: 'flex', gap: 16, padding: '16px 20px 20px', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {programs.map((p, idx) => <ProgramCard key={p.program_id} p={p} idx={idx} />)}
          </div>
        </div>
      )}

      {/* ── Upcoming Sessions ── */}
      <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', overflow: 'hidden', marginBottom: 22 }}>
        <div style={{ padding: '14px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: C }} />
            <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}>Upcoming Sessions</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {SESSION_FILTERS.map(f => (
                <button key={f.key} onClick={() => setSessionFilter(f.key)}
                  style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                           background: sessionFilter === f.key ? `linear-gradient(135deg,${C},#6366f1)` : '#eef2ff',
                           color: sessionFilter === f.key ? '#fff' : C, transition: '0.15s' }}>
                  {f.label}
                </button>
              ))}
            </div>
            <Link to="/mentor/sessions" style={{ fontSize: 12, fontWeight: 700, color: C, textDecoration: 'none', padding: '5px 12px', borderRadius: 8, background: '#eef2ff' }}>View all →</Link>
          </div>
        </div>

        {filteredSessions.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🎬</div>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 8px' }}>No {sessionFilter !== 'all' ? sessionFilter : 'upcoming'} sessions</p>
            <Link to="/mentor/sessions" style={{ fontSize: 13, fontWeight: 700, color: C, textDecoration: 'none' }}>Create your first session →</Link>
          </div>
        ) : (
          <div className="am-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14, padding: '16px 20px' }}>
            {filteredSessions.map(s => <SessionCard key={s.session_id} s={s} />)}
          </div>
        )}
      </div>

      {/* ── Quick Actions + Pending Requests ── */}
      <div className="am-grid-2" style={{ display: 'grid', gridTemplateColumns: requests.length > 0 ? '1fr 1fr' : '1fr', gap: 20 }}>

        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
          <div style={{ padding: '14px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: C }} />
            <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}>Quick Actions</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {[
              { label: 'My Sessions',     sub: 'Create & manage',        emoji: '📅', href: '/mentor/sessions' },
              { label: 'Mark Attendance', sub: 'Review mentee records',  emoji: '✅', href: '/admin/attendance' },
              { label: 'My Certificates', sub: 'Upload certifications',  emoji: '🏆', href: '/mentor/certificates' },
              { label: 'Analytics',       sub: 'View insights',          emoji: '📊', href: '/mentor/analytics' },
              { label: 'Update Profile',  sub: 'Bio, expertise, links',  emoji: '👤', href: '/mentor/profile' },
              { label: 'Resources',       sub: 'Manage materials',       emoji: '📁', href: '/mentor/resources' },
            ].map((a, i) => (
              <Link key={a.label} to={a.href}
                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRight: i % 2 === 0 ? '1px solid #f8fafc' : 'none', borderBottom: i < 4 ? '1px solid #f8fafc' : 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{a.emoji}</div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.label}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{a.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {requests.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: '1px solid #fde68a', overflow: 'hidden' }}>
            <div style={{ padding: '14px 22px', borderBottom: '1px solid #fef3c7', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>📋</span>
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: '#92400e', margin: 0 }}>Pending Enrollments</h2>
                  <p style={{ fontSize: 12, color: '#b45309', margin: 0 }}>Awaiting admin approval</p>
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, padding: '4px 12px', borderRadius: 50, background: '#fde68a', color: '#92400e' }}>{requests.length}</span>
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {requests.map((r, i) => (
                <div key={r.enrollment_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < requests.length - 1 ? '1px solid #fef9c3' : 'none', background: i % 2 === 0 ? '#fff' : '#fffbeb' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{r.full_name[0]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.full_name}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.program_title}</p>
                  </div>
                  <span style={{ fontSize: 11, color: '#b45309', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {r.requested_at ? new Date(r.requested_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 20px', background: '#fffbeb', borderTop: '1px solid #fef3c7' }}>
              <p style={{ fontSize: 11, color: '#b45309', margin: 0 }}>🔑 Contact your admin to approve these requests.</p>
            </div>
          </div>
        )}
      </div>

    </MentorLayout>
  )
}
