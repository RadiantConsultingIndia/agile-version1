import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import MenteeLayout from '../../components/layouts/MenteeLayout'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/client'

const C = '#7c3aed'

const PROG_GRADS = [
  'linear-gradient(135deg,#7c3aed,#a855f7)',
  'linear-gradient(135deg,#0d9488,#0891b2)',
  'linear-gradient(135deg,#1d4ed8,#4f46e5)',
  'linear-gradient(135deg,#d97706,#f97316)',
  'linear-gradient(135deg,#db2777,#e879f9)',
  'linear-gradient(135deg,#0f766e,#0d9488)',
]
const PROG_EMOJIS = ['📚', '🎯', '🚀', '⚡', '🧩', '📐']

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

function ProgramCard({ e, idx }) {
  const grad  = PROG_GRADS[idx % PROG_GRADS.length]
  const emoji = PROG_EMOJIS[idx % PROG_EMOJIS.length]
  const pct   = e.progress ?? 0
  const isCert = e.status === 'certificate_eligible'

  return (
    <div style={{ minWidth: 230, maxWidth: 230, background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9', overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s, transform 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(0)' }}>
      {/* Banner: cover image or gradient */}
      <div style={{ background: e.cover_image ? '#f8fafc' : grad, padding: '20px 18px', position: 'relative', minHeight: 80, overflow: 'hidden' }}>
        {e.cover_image
          ? <img src={e.cover_image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 38, lineHeight: 1 }}>{emoji}</span>}
        {isCert && (
          <span style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(251,191,36,0.9)', color: '#78350f', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 50, zIndex: 1 }}>🏆 Cert Ready</span>
        )}
      </div>
      {/* Body */}
      <div style={{ padding: '14px 16px 16px' }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.program_title ?? e.program_id}</p>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 12px' }}>
          {isCert ? '✓ Certificate eligible' : 'Enrolled'}
        </p>
        {/* Progress */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>Progress</span>
          <span style={{ fontSize: 10, fontWeight: 800, color: C }}>{pct}%</span>
        </div>
        <div style={{ height: 5, borderRadius: 99, background: '#e2e8f0', overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: isCert ? 'linear-gradient(90deg,#f59e0b,#f97316)' : grad, transition: 'width 0.8s ease' }} />
        </div>
        <Link to="/mentee/sessions" style={{ display: 'block', textAlign: 'center', padding: '8px 0', borderRadius: 9, textDecoration: 'none', fontSize: 12, fontWeight: 700, color: '#fff', background: isCert ? 'linear-gradient(135deg,#f59e0b,#f97316)' : grad, boxShadow: `0 3px 10px rgba(0,0,0,0.2)` }}>
          {isCert ? '🏆 View Certificate' : '▶ Continue Learning'}
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

  const dayLabel = isToday ? 'TODAY' : isTomorrow ? 'TOMORROW' : d.toLocaleString('en-IN', { month: 'short' }).toUpperCase()
  const dayNum   = isToday || isTomorrow ? d.getDate() : d.getDate()

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: isToday ? `2px solid ${C}` : '1px solid #f1f5f9', padding: '16px 18px', boxShadow: isToday ? `0 4px 16px rgba(124,58,237,0.12)` : '0 1px 6px rgba(0,0,0,0.05)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      {/* Date box */}
      <div style={{ width: 46, height: 50, borderRadius: 12, background: isToday ? `linear-gradient(135deg,${C},#a855f7)` : '#f8fafc', border: isToday ? 'none' : '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 800, color: isToday ? 'rgba(255,255,255,0.7)' : '#94a3b8', margin: 0, letterSpacing: '0.08em' }}>{dayLabel}</p>
        <p style={{ fontSize: 18, fontWeight: 900, color: isToday ? '#fff' : C, margin: 0, lineHeight: 1.1 }}>{dayNum}</p>
      </div>
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</p>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 50, flexShrink: 0, background: isLive ? '#fee2e2' : '#ede9fe', color: isLive ? '#dc2626' : '#6d28d9' }}>
            {isLive ? '🔴 Live' : '📹 Rec'}
          </span>
        </div>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 8px' }}>
          {d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {s.program_title}
        </p>
        {isLive && s.meeting_link && (
          <a href={s.meeting_link} target="_blank" rel="noreferrer"
            style={{ display: 'inline-block', padding: '6px 14px', borderRadius: 8, textDecoration: 'none', fontSize: 11, fontWeight: 700, color: '#fff', background: `linear-gradient(135deg,${C},#a855f7)`, boxShadow: '0 2px 8px rgba(124,58,237,0.3)' }}>
            Join Meeting →
          </a>
        )}
      </div>
    </div>
  )
}

export default function MenteeDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [enrollments, setEnrollments] = useState([])
  const [sessions,    setSessions]    = useState([])
  const [sessionFilter, setSessionFilter] = useState('all')

  useEffect(() => {
    api.get('/api/mentee/enrollments').then(r => setEnrollments(r.data)).catch(() => {})
    api.get('/api/mentee/sessions').then(r => {
      const now = new Date()
      setSessions(r.data
        .filter(s => !s.access_locked && s.scheduled_at && new Date(s.scheduled_at) > now)
        .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
        .slice(0, 8))
    }).catch(() => {})
  }, [])

  const name     = user?.full_name?.split(' ')[0] ?? 'Learner'
  const today    = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  const hour     = new Date().getHours()
  const greet    = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const activeEnrollments = enrollments.filter(e => e.status === 'enrolled' || e.status === 'active' || e.status === 'certificate_eligible')
  const completed  = enrollments.filter(e => e.status === 'completed').length
  const certReady  = enrollments.filter(e => e.status === 'certificate_eligible').length

  const filteredSessions = sessionFilter === 'all' ? sessions
    : sessions.filter(s => s.session_type === sessionFilter)

  const learningItems = [
    { icon: '📋', label: 'My Enrollments',  onClick: () => navigate('/mentee/enrollments') },
    { icon: '🎬', label: 'My Sessions',     onClick: () => navigate('/mentee/sessions') },
    { icon: '✅', label: 'My Attendance',   onClick: () => navigate('/mentee/attendance') },
    { icon: '📁', label: 'Resources',       onClick: () => navigate('/mentee/resources') },
    'divider',
    { icon: '🔍', label: 'Browse Programs', onClick: () => navigate('/programs') },
  ]
  const userItems = [
    { icon: '📋', label: 'My Enrollments', onClick: () => navigate('/mentee/enrollments') },
    { icon: '✅', label: 'My Attendance',  onClick: () => navigate('/mentee/attendance') },
    'divider',
    { icon: '🚪', label: 'Sign out', danger: true, onClick: () => { logout(); navigate('/login') } },
  ]

  const STATS = [
    { label: 'Active Programs',   value: activeEnrollments.length, sub: 'in progress',       subColor: C,         bg: `linear-gradient(135deg,${C},#a855f7)`,    emoji: '📚' },
    { label: 'Completed',         value: completed,                sub: 'programs finished', subColor: '#0d9488', bg: 'linear-gradient(135deg,#0d9488,#0891b2)', emoji: '✅' },
    { label: 'Upcoming Sessions', value: sessions.length,          sub: 'scheduled ahead',   subColor: '#d97706', bg: 'linear-gradient(135deg,#f59e0b,#f97316)', emoji: '📅' },
  ]

  const SESSION_FILTERS = [
    { key: 'all',      label: 'All' },
    { key: 'live',     label: '🔴 Live' },
    { key: 'recorded', label: '📹 Recorded' },
  ]

  return (
    <MenteeLayout>

      {/* ── Welcome Banner ── */}
      <div className="am-banner" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#2e1065 100%)', borderRadius: 22, padding: '26px 32px', marginBottom: 26, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 80% 50%,rgba(124,58,237,0.22),transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -50, right: 60, width: 180, height: 180, borderRadius: '50%', background: 'rgba(124,58,237,0.07)', pointerEvents: 'none' }} />

        <div className="am-banner-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          <div>
            <p style={{ color: '#c4b5fd', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 6px' }}>{today}</p>
            <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 900, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
              {greet}, {name} 👋
            </h1>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
              Keep learning and track your progress.
              {certReady > 0 && <span style={{ marginLeft: 10, background: 'rgba(251,191,36,0.2)', color: '#fbbf24', padding: '2px 10px', borderRadius: 50, fontSize: 12, fontWeight: 700 }}>🏆 {certReady} certificate{certReady > 1 ? 's' : ''} ready!</span>}
            </p>
          </div>

          <div className="am-hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {/* My Learning dropdown */}
            <Dropdown
              trigger={
                <button style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
                  📖 My Learning <span style={{ fontSize: 10, opacity: 0.7 }}>▾</span>
                </button>
              }
              items={learningItems}
            />
            {/* Browse Programs */}
            <Link to="/programs" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, textDecoration: 'none', background: `linear-gradient(135deg,${C},#a855f7)`, color: '#fff', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 14px rgba(124,58,237,0.45)', whiteSpace: 'nowrap' }}>
              🔍 Browse
            </Link>
            {/* User avatar dropdown */}
            <Dropdown
              trigger={
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg,${C},#a855f7)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer', border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
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
      {activeEnrollments.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', overflow: 'hidden', marginBottom: 22 }}>
          <div style={{ padding: '14px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C }} />
              <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}>My Programs</h2>
              <span style={{ fontSize: 11, fontWeight: 700, color: C, background: '#f5f3ff', padding: '2px 8px', borderRadius: 50 }}>{activeEnrollments.length}</span>
            </div>
            <Link to="/mentee/enrollments" style={{ fontSize: 12, fontWeight: 700, color: C, textDecoration: 'none', padding: '5px 12px', borderRadius: 8, background: '#f5f3ff' }}>View all →</Link>
          </div>
          <div style={{ display: 'flex', gap: 16, padding: '16px 20px 20px', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {activeEnrollments.map((e, idx) => <ProgramCard key={e.enrollment_id} e={e} idx={idx} />)}
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
            {/* Filter dropdown */}
            <div style={{ display: 'flex', gap: 6 }}>
              {SESSION_FILTERS.map(f => (
                <button key={f.key} onClick={() => setSessionFilter(f.key)}
                  style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                           background: sessionFilter === f.key ? `linear-gradient(135deg,${C},#a855f7)` : '#f5f3ff',
                           color: sessionFilter === f.key ? '#fff' : C, transition: '0.15s' }}>
                  {f.label}
                </button>
              ))}
            </div>
            <Link to="/mentee/sessions" style={{ fontSize: 12, fontWeight: 700, color: C, textDecoration: 'none', padding: '5px 12px', borderRadius: 8, background: '#f5f3ff' }}>View all →</Link>
          </div>
        </div>

        {filteredSessions.length === 0 ? (
          <div style={{ padding: '36px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 8px' }}>No {sessionFilter !== 'all' ? sessionFilter : ''} sessions coming up</p>
            <Link to="/programs" style={{ fontSize: 13, fontWeight: 700, color: C, textDecoration: 'none' }}>Enroll in a program →</Link>
          </div>
        ) : (
          <div className="am-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14, padding: '16px 20px' }}>
            {filteredSessions.map(s => <SessionCard key={s.session_id} s={s} />)}
          </div>
        )}
      </div>

      {/* ── Quick Links ── */}
      <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        <div style={{ padding: '14px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: C }} />
          <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}>Quick Links</h2>
        </div>
        <div className="am-grid-ql" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)' }}>
          {[
            { label: 'Browse Programs',  sub: 'Discover new programs',       emoji: '🔍', href: '/programs' },
            { label: 'My Enrollments',   sub: 'Track enrolled programs',     emoji: '📋', href: '/mentee/enrollments' },
            { label: 'My Sessions',      sub: 'Live and recorded sessions',  emoji: '🎬', href: '/mentee/sessions' },
            { label: 'My Attendance',    sub: 'Check attendance record',     emoji: '✅', href: '/mentee/attendance' },
            { label: 'Resources',        sub: 'Study materials and files',   emoji: '📁', href: '/mentee/resources' },
            { label: 'Certificates',     sub: 'Your earned certificates',    emoji: '🏆', href: '/mentee/enrollments' },
          ].map((a, i) => (
            <Link key={a.label} to={a.href}
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRight: i % 3 !== 2 ? '1px solid #f8fafc' : 'none', borderBottom: i < 3 ? '1px solid #f8fafc' : 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{a.emoji}</div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.label}</p>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </MenteeLayout>
  )
}
