import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/layouts/AdminLayout'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/client'

const STAT_DEFS = [
  { key: 'total_programs',    label: 'Total Programs',  emoji: '📚', bg: 'linear-gradient(135deg,#059669,#10b981)', sub: 'programs created' },
  { key: 'active_programs',   label: 'Active',          emoji: '✅', bg: 'linear-gradient(135deg,#0d9488,#06b6d4)', sub: 'currently running' },
  { key: 'total_sessions',    label: 'Sessions',        emoji: '🎬', bg: 'linear-gradient(135deg,#1d4ed8,#4f46e5)', sub: 'all time' },
  { key: 'live_sessions',     label: 'Live Now',        emoji: '🔴', bg: 'linear-gradient(135deg,#dc2626,#f97316)', sub: 'in progress' },
  { key: 'total_users',       label: 'Total Users',     emoji: '👥', bg: 'linear-gradient(135deg,#7c3aed,#a855f7)', sub: 'registered' },
  { key: 'total_mentors',     label: 'Mentors',         emoji: '🧑‍🏫', bg: 'linear-gradient(135deg,#0f766e,#059669)', sub: 'active' },
  { key: 'total_enrollments', label: 'Enrollments',     emoji: '📋', bg: 'linear-gradient(135deg,#d97706,#f59e0b)', sub: 'total enrollments' },
  { key: 'certificate_eligible', label: 'Cert Eligible', emoji: '🏆', bg: 'linear-gradient(135deg,#b45309,#d97706)', sub: 'ready to issue' },
]

const QUICK = [
  { label: '+ New Program', emoji: '📚', href: '/admin/programs', bg: 'linear-gradient(135deg,#059669,#10b981)', shadow: 'rgba(5,150,105,0.4)' },
  { label: '+ New Session', emoji: '🎬', href: '/admin/sessions', bg: 'linear-gradient(135deg,#1d4ed8,#4f46e5)', shadow: 'rgba(29,78,216,0.4)' },
  { label: '+ Invite Mentor', emoji: '🧑‍🏫', href: '/admin/users', bg: 'linear-gradient(135deg,#7c3aed,#a855f7)', shadow: 'rgba(124,58,237,0.4)' },
  { label: 'Attendance',    emoji: '✅', href: '/admin/attendance', bg: 'linear-gradient(135deg,#d97706,#f97316)', shadow: 'rgba(217,119,6,0.4)' },
]

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats,    setStats]    = useState(null)
  const [requests, setRequests] = useState([])
  const [acting,   setActing]   = useState(null)

  const loadRequests = () => api.get('/api/admin/enrollment-requests').then(r => setRequests(r.data)).catch(() => {})

  useEffect(() => {
    api.get('/api/admin/dashboard').then(r => setStats(r.data)).catch(() => {})
    loadRequests()
  }, [])

  const approve = async id => {
    setActing(id + 'approve')
    await api.post(`/api/admin/enrollment-requests/${id}/approve`).catch(() => {})
    await loadRequests()
    setActing(null)
  }

  const reject = async id => {
    if (!confirm('Reject this enrollment request?')) return
    setActing(id + 'reject')
    await api.post(`/api/admin/enrollment-requests/${id}/reject`).catch(() => {})
    await loadRequests()
    setActing(null)
  }

  const name = user?.full_name?.split(' ')[0] ?? 'Admin'

  return (
    <AdminLayout>

      {/* Welcome banner */}
      <div style={{ background: 'linear-gradient(135deg,#1e293b 0%,#0f172a 100%)', borderRadius: 20, padding: '28px 32px', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 220, background: 'radial-gradient(ellipse at right center,rgba(5,150,105,0.25),transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.3px' }}>
            Welcome back, {name} 👋
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            Here's what's happening on your platform today.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 50, background: 'rgba(5,150,105,0.15)', border: '1px solid rgba(5,150,105,0.3)', flexShrink: 0, position: 'relative' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#6ee7b7' }}>Platform Online</span>
        </div>
      </div>

      {/* Stat grid (2 rows × 4 cols) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
        {STAT_DEFS.map(s => (
          <div key={s.key} style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, boxShadow: '0 4px 10px rgba(0,0,0,0.13)' }}>
              {s.emoji}
            </div>
            <div>
              <p style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', margin: '0 0 2px', lineHeight: 1 }}>
                {stats ? (stats[s.key] ?? 0) : '—'}
              </p>
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 2px', fontWeight: 600 }}>{s.label}</p>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Enrollment Requests */}
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#f59e0b,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>📋</div>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Enrollment Requests</h2>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Review and approve mentee enrollment applications</p>
            </div>
          </div>
          {requests.length > 0 && (
            <span style={{ fontSize: 12, fontWeight: 800, padding: '4px 14px', borderRadius: 50, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
              {requests.length} pending
            </span>
          )}
        </div>
        {requests.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#475569', margin: '0 0 4px' }}>All caught up!</p>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>No pending enrollment requests at the moment.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Mentee', 'Email', 'Program', 'Requested', 'Action'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((r, i) => (
                <tr key={r.enrollment_id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '13px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                        {r.full_name[0]}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{r.full_name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 20px', fontSize: 12, color: '#64748b' }}>{r.email}</td>
                  <td style={{ padding: '13px 20px', fontSize: 13, fontWeight: 600, color: '#1e293b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.program_title}</td>
                  <td style={{ padding: '13px 20px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {r.requested_at ? new Date(r.requested_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td style={{ padding: '13px 20px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => approve(r.enrollment_id)} disabled={acting === r.enrollment_id + 'approve'}
                        style={{ padding: '6px 16px', borderRadius: 8, border: 'none', cursor: acting ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, color: '#fff', background: acting === r.enrollment_id + 'approve' ? '#6ee7b7' : 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 2px 8px rgba(5,150,105,0.3)' }}
                        onMouseEnter={e => { if (!acting) e.currentTarget.style.opacity = '0.85' }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
                        {acting === r.enrollment_id + 'approve' ? '…' : '✓ Approve'}
                      </button>
                      <button onClick={() => reject(r.enrollment_id)} disabled={!!acting}
                        style={{ padding: '6px 16px', borderRadius: 8, border: '1.5px solid #fecaca', cursor: acting ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, color: '#dc2626', background: '#fef2f2' }}
                        onMouseEnter={e => { if (!acting) { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = '#fff' } }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626' }}>
                        {acting === r.enrollment_id + 'reject' ? '…' : '✕ Reject'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick Actions + Module Links */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Quick Actions */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Quick Actions</h2>
          </div>
          <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {QUICK.map(q => (
              <Link key={q.label} to={q.href} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 12, background: q.bg, boxShadow: `0 4px 12px ${q.shadow}` }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                <span style={{ fontSize: 20 }}>{q.emoji}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{q.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Module Links */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Platform Modules</h2>
          </div>
          {[
            { label: 'Programs',   sub: 'Create and manage mentorship programs',  emoji: '📚', href: '/admin/programs',   color: '#059669' },
            { label: 'Sessions',   sub: 'Schedule live and recorded sessions',     emoji: '🎬', href: '/admin/sessions',   color: '#1d4ed8' },
            { label: 'Users',      sub: 'Manage mentors, mentees and invites',     emoji: '👥', href: '/admin/users',      color: '#7c3aed' },
            { label: 'Resources',  sub: 'Upload and manage study materials',       emoji: '📁', href: '/admin/resources',  color: '#d97706' },
          ].map((m, i, arr) => (
            <Link key={m.label} to={m.href} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', borderBottom: i < arr.length - 1 ? '1px solid #f8fafc' : 'none', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                {m.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: '0 0 2px' }}>{m.label}</p>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{m.sub}</p>
              </div>
              <svg width="14" height="14" fill="none" stroke="#cbd5e1" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}
