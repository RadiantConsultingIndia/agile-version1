import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import MentorLayout from '../../components/layouts/MentorLayout'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/client'

export default function MentorDashboard() {
  const { user } = useAuth()
  const [stats,    setStats]    = useState(null)
  const [sessions, setSessions] = useState([])
  const [requests, setRequests] = useState([])

  useEffect(() => {
    api.get('/api/mentor/dashboard').then(r => setStats(r.data?.stats ?? r.data)).catch(() => {})
    api.get('/api/mentor/enrollment-requests').then(r => setRequests(r.data)).catch(() => {})
    api.get('/api/mentor/sessions').then(r => {
      const now = new Date()
      setSessions(r.data
        .filter(s => s.scheduled_at && new Date(s.scheduled_at) > now)
        .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
        .slice(0, 5))
    }).catch(() => {})
  }, [])

  const liveCount = sessions.filter(s => s.session_type === 'live').length
  const name = user?.full_name?.split(' ')[0] ?? 'Mentor'

  const STATS = [
    { label: 'Sessions Created', value: stats?.total_sessions ?? 0, sub: `${liveCount} live`, subColor: '#4f46e5', bg: 'linear-gradient(135deg,#4f46e5,#6366f1)', emoji: '🎯' },
    { label: 'Mentees',          value: stats?.total_mentees ?? 0,  sub: 'across programs', subColor: '#0d9488', bg: 'linear-gradient(135deg,#0d9488,#0891b2)', emoji: '👥' },
    { label: 'Certificates',     value: stats?.total_certs ?? 0,   sub: 'on profile',      subColor: '#d97706', bg: 'linear-gradient(135deg,#f59e0b,#f97316)', emoji: '🏆' },
  ]

  const ACTIONS = [
    { label: 'My Sessions',    sub: 'Create and manage sessions',          emoji: '📅', href: '/mentor/sessions' },
    { label: 'Mark Attendance', sub: 'Review and mark mentee attendance',  emoji: '✅', href: '/admin/attendance' },
    { label: 'My Certificates', sub: 'Upload your certifications',         emoji: '🏆', href: '/mentor/certificates' },
    { label: 'Update Profile',  sub: 'Edit bio, expertise, LinkedIn',      emoji: '👤', href: '/mentor/profile' },
  ]

  return (
    <MentorLayout>

      {/* ── Welcome banner ── */}
      <div style={{ background: 'linear-gradient(135deg,#1e293b 0%,#0f172a 100%)', borderRadius: 20, padding: '28px 32px', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 220, background: 'radial-gradient(ellipse at right center,rgba(99,102,241,0.25),transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.3px' }}>
            Welcome back, {name} 👋
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            Manage your sessions and guide your mentees to success.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexShrink: 0, position: 'relative' }}>
          <Link to="/mentor/profile" style={{ textDecoration: 'none', fontSize: 13, fontWeight: 600, color: '#e2e8f0', padding: '10px 20px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.04)' }}>
            Edit Profile
          </Link>
          <Link to="/mentor/sessions" style={{ textDecoration: 'none', fontSize: 13, fontWeight: 700, color: '#fff', padding: '10px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#6366f1)', boxShadow: '0 4px 14px rgba(99,102,241,0.45)' }}>
            + New Session
          </Link>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, marginBottom: 28 }}>
        {STATS.map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              {s.emoji}
            </div>
            <div>
              <p style={{ fontSize: 32, fontWeight: 900, color: '#0f172a', margin: '0 0 2px', lineHeight: 1 }}>
                {s.value}
              </p>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 4px' }}>{s.label}</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: s.subColor, margin: 0 }}>{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Pending Enrollment Requests (mentor's programs) ── */}
      {requests.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #fde68a', marginBottom: 28, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #fef3c7', background: '#fffbeb', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>📋</span>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#92400e', margin: 0 }}>Pending Enrollment Requests</h2>
              <p style={{ fontSize: 12, color: '#b45309', margin: 0 }}>Mentees awaiting admin approval for your programs</p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, padding: '4px 12px', borderRadius: 50, background: '#fde68a', color: '#92400e' }}>{requests.length}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Mentee', 'Email', 'Program', 'Requested'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map((r, i) => (
                  <tr key={r.enrollment_id} style={{ background: i % 2 === 0 ? '#fff' : '#fffbeb', borderBottom: '1px solid #fef9c3' }}>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                          {r.full_name[0]}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{r.full_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 12, color: '#64748b' }}>{r.email}</td>
                    <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600, color: '#4f46e5' }}>{r.program_title}</td>
                    <td style={{ padding: '12px 20px', fontSize: 12, color: '#94a3b8' }}>
                      {r.requested_at ? new Date(r.requested_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '12px 20px', background: '#fffbeb', borderTop: '1px solid #fef3c7' }}>
            <p style={{ fontSize: 12, color: '#b45309', margin: 0 }}>🔑 Admin approves/rejects enrollment requests. Contact your admin to process these.</p>
          </div>
        </div>
      )}

      {/* ── Quick Actions + My Sessions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.75fr', gap: 20 }}>

        {/* Quick Actions */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4f46e5', display: 'inline-block' }} />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Quick Actions</h2>
          </div>
          {ACTIONS.map((a, i) => (
            <Link key={a.label} to={a.href} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px', borderBottom: i < ACTIONS.length - 1 ? '1px solid #f8fafc' : 'none', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                {a.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: '0 0 2px' }}>{a.label}</p>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{a.sub}</p>
              </div>
              <svg width="16" height="16" fill="none" stroke="#cbd5e1" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </Link>
          ))}
        </div>

        {/* My Sessions */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4f46e5', display: 'inline-block' }} />
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>My Sessions</h2>
            </div>
            <Link to="/mentor/sessions" style={{ fontSize: 12, fontWeight: 600, color: '#4f46e5', textDecoration: 'none' }}>View all</Link>
          </div>

          <div style={{ flex: 1, padding: '8px 0' }}>
            {sessions.length > 0 ? (
              sessions.map(s => (
                <div key={s.session_id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 20px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
                    {s.session_type === 'live' ? '🎥' : '📹'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                      {new Date(s.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}&nbsp;·&nbsp;
                      {new Date(s.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 44, marginBottom: 12, lineHeight: 1 }}>🎬</div>
                <p style={{ fontSize: 13, color: '#64748b', fontWeight: 500, margin: '0 0 4px' }}>No sessions yet.</p>
                <Link to="/mentor/sessions" style={{ fontSize: 12, fontWeight: 600, color: '#4f46e5', textDecoration: 'none' }}>
                  Create your first session →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </MentorLayout>
  )
}
