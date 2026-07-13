import { useEffect, useState } from 'react'
import AdminLayout from '../../components/layouts/AdminLayout'
import api from '../../api/client'
import { toast } from '../../utils/toast'

const ROLE_STYLE = {
  mentor:  { bg: '#f0fdfa', color: '#0f766e', label: 'Mentor' },
  mentee:  { bg: '#f5f3ff', color: '#6d28d9', label: 'Mentee' },
  admin:   { bg: '#fef2f2', color: '#be123c', label: 'Admin'  },
}

export default function AdminUsers() {
  const [users,       setUsers]       = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteCode,  setInviteCode]  = useState('')
  const [inviteError, setInviteError] = useState('')
  const [inviting,    setInviting]    = useState(false)
  const [search,      setSearch]      = useState('')

  useEffect(() => {
    api.get('/api/admin/users').then(r => setUsers(r.data)).catch(() => {})
  }, [])

  const handleDelete = async id => {
    if (!confirm('Delete this user and all their data?')) return
    try {
      await api.delete(`/api/admin/users/${id}`)
      setUsers(u => u.filter(x => x.user_id !== id))
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to delete user')
    }
  }

  const toggleAiInterviewAccess = async u => {
    const next = !u.ai_interview_access
    try {
      await api.post(`/api/admin/users/${u.user_id}/ai-interview-access?has_access=${next}`)
      setUsers(list => list.map(x => x.user_id === u.user_id ? { ...x, ai_interview_access: next } : x))
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to update AI Interview access')
    }
  }

  const handleInvite = async e => {
    e.preventDefault(); setInviteError(''); setInviteCode(''); setInviting(true)
    try {
      const res = await api.post('/api/admin/generate-invite', { mentor_email: inviteEmail })
      setInviteCode(res.data.invite_code); setInviteEmail('')
    } catch (err) { setInviteError(err.response?.data?.detail || 'Error generating invite') }
    finally { setInviting(false) }
  }

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const mentors = users.filter(u => u.role === 'mentor').length
  const mentees = users.filter(u => u.role === 'mentee').length

  return (
    <AdminLayout>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
          <span style={{ color: '#059669' }}>Users</span>
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Manage all platform users, invite mentors, and control access.</p>
      </div>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Users', value: users.length,   emoji: '👥', bg: 'linear-gradient(135deg,#059669,#10b981)' },
          { label: 'Mentors',     value: mentors,        emoji: '🧑‍🏫', bg: 'linear-gradient(135deg,#0f766e,#0d9488)' },
          { label: 'Mentees',     value: mentees,        emoji: '📚', bg: 'linear-gradient(135deg,#7c3aed,#a855f7)' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', border: '1px solid #f1f5f9', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, boxShadow: '0 4px 10px rgba(0,0,0,0.12)' }}>{s.emoji}</div>
            <div>
              <p style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', margin: '0 0 2px', lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, fontWeight: 600 }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Invite card */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', boxShadow: '0 1px 8px rgba(0,0,0,0.05)', padding: '22px 24px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>📨</div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Invite a Mentor</h2>
        </div>
        <form onSubmit={handleInvite} style={{ display: 'flex', gap: 12 }}>
          <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
            placeholder="mentor@example.com"
            style={{ flex: 1, padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#1e293b', outline: 'none', background: '#fafafa', fontFamily: 'inherit' }}
            onFocus={e => e.target.style.borderColor = '#059669'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
          <button type="submit" disabled={inviting}
            style={{ padding: '11px 24px', borderRadius: 10, border: 'none', cursor: inviting ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', background: inviting ? '#6ee7b7' : 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 4px 14px rgba(5,150,105,0.35)', whiteSpace: 'nowrap' }}>
            {inviting ? 'Sending…' : 'Send Invite'}
          </button>
        </form>
        {inviteCode && (
          <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>✅</span>
            <p style={{ fontSize: 13, color: '#15803d', margin: 0 }}>
              Invite sent! Code: <span style={{ fontFamily: 'monospace', fontWeight: 800, letterSpacing: '0.1em' }}>{inviteCode}</span>
            </p>
          </div>
        )}
        {inviteError && (
          <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca' }}>
            <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>⚠ {inviteError}</p>
          </div>
        )}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}
          width="15" height="15" fill="none" stroke="#475569" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          style={{ width: '100%', padding: '11px 16px 11px 40px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#1e293b', outline: 'none', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit' }}
          onFocus={e => e.target.style.borderColor = '#059669'}
          onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', boxShadow: '0 1px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['User','Email','Role','Status','AI Interview','Joined','Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>No users found</td></tr>
            ) : filtered.map((u, i) => {
              const rs = ROLE_STYLE[u.role] || { bg: '#f8fafc', color: '#64748b', label: u.role }
              return (
                <tr key={u.user_id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {u.profile_photo ? (
                        <img src={u.profile_photo} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                      ) : (
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#059669,#10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                          {u.full_name[0]}
                        </div>
                      )}
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{u.full_name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#64748b' }}>{u.email}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 50, background: rs.bg, color: rs.color }}>{rs.label}</span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 50, background: u.status === 'active' ? '#f0fdf4' : '#fffbeb', color: u.status === 'active' ? '#15803d' : '#92400e' }}>
                      {u.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    {u.role === 'mentee' ? (
                      <button onClick={() => toggleAiInterviewAccess(u)}
                        style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 50, border: 'none', cursor: 'pointer',
                          background: u.ai_interview_access ? '#f0fdf4' : '#f8fafc', color: u.ai_interview_access ? '#15803d' : '#94a3b8' }}>
                        {u.ai_interview_access ? 'Unlocked' : 'Locked'}
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, color: '#cbd5e1' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 12, color: '#94a3b8' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <button onClick={() => handleDelete(u.user_id)} style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Delete</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}
