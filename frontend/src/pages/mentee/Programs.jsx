import { useEffect, useState } from 'react'
import MenteeLayout from '../../components/layouts/MenteeLayout'
import api from '../../api/client'

const GRAD = [
  'linear-gradient(135deg,#7c3aed,#a855f7)',
  'linear-gradient(135deg,#0d9488,#0891b2)',
  'linear-gradient(135deg,#1d4ed8,#4f46e5)',
  'linear-gradient(135deg,#d97706,#f97316)',
  'linear-gradient(135deg,#db2777,#e879f9)',
  'linear-gradient(135deg,#0f766e,#0d9488)',
]
const EMOJIS = ['⚡', '🎯', '🚀', '📐', '🧩', '📊']

export default function MenteePrograms() {
  const [programs, setPrograms] = useState([])
  const [enrolledIds, setEnrolledIds] = useState(new Set())
  const [pendingIds, setPendingIds]   = useState(new Set())
  const [enrolling, setEnrolling] = useState(null)
  const [search, setSearch] = useState('')

  const load = async () => {
    const [progs, enrollments] = await Promise.all([
      api.get('/api/mentee/programs/browse').then(r => r.data),
      api.get('/api/mentee/enrollments').then(r => r.data),
    ])
    setPrograms(progs)
    setEnrolledIds(new Set(enrollments.filter(e => e.status !== 'pending').map(e => e.program_id)))
    setPendingIds(new Set(enrollments.filter(e => e.status === 'pending').map(e => e.program_id)))
  }
  useEffect(() => { load() }, [])

  const handleEnroll = async id => {
    setEnrolling(id)
    try {
      await api.post('/api/mentee/enrollments', { program_id: id })
      setPendingIds(s => new Set([...s, id]))
    } catch (err) {
      alert(err.response?.data?.detail || 'Request failed')
    } finally { setEnrolling(null) }
  }

  const filtered = programs.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <MenteeLayout>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
          Browse <span style={{ color: '#7c3aed' }}>Programs</span>
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Discover mentorship programs and enroll to start learning.</p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 28 }}>
        <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}
          width="16" height="16" fill="none" stroke="#475569" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by title or category…"
          style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1e293b', outline: 'none', background: '#fff', boxSizing: 'border-box', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', fontFamily: 'inherit' }}
          onFocus={e => e.target.style.borderColor = '#7c3aed'}
          onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 16, lineHeight: 1 }}>🔍</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 6px' }}>No programs found</p>
          <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>Try a different search term.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          {filtered.map((p, idx) => {
            const enrolled = enrolledIds.has(p.program_id)
            const pending  = pendingIds.has(p.program_id)
            return (
              <div key={p.program_id} style={{ background: '#fff', borderRadius: 18, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* Gradient header */}
                <div style={{ background: GRAD[idx % GRAD.length], padding: '28px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 110, position: 'relative' }}>
                  <span style={{ fontSize: 52, lineHeight: 1 }}>{EMOJIS[idx % EMOJIS.length]}</span>
                  {pending && (
                    <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.9)', borderRadius: 50, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#92400e' }}>
                      ⏳ Pending
                    </div>
                  )}
                </div>
                {/* Body */}
                <div style={{ padding: '20px 20px 22px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0, lineHeight: 1.4 }}>{p.title}</h3>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', padding: '3px 10px', borderRadius: 50, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {p.category || 'General'}
                    </span>
                  </div>
                  {p.description && (
                    <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {p.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#94a3b8' }}>
                    {p.duration_weeks && <span>📅 {p.duration_weeks} weeks</span>}
                    {p.mentor_name   && <span>👤 {p.mentor_name}</span>}
                  </div>
                  <div style={{ marginTop: 'auto', paddingTop: 12 }}>
                    {enrolled ? (
                      <div style={{ width: '100%', padding: '10px 0', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#15803d' }}>
                        ✓ Enrolled
                      </div>
                    ) : pending ? (
                      <div style={{ width: '100%', padding: '10px 0', borderRadius: 10, background: '#fffbeb', border: '1px solid #fde68a', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#92400e' }}>
                        ⏳ Awaiting Approval
                      </div>
                    ) : (
                      <button onClick={() => handleEnroll(p.program_id)} disabled={enrolling === p.program_id}
                        style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', cursor: enrolling === p.program_id ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', background: enrolling === p.program_id ? '#c4b5fd' : 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 4px 12px rgba(124,58,237,0.35)' }}>
                        {enrolling === p.program_id ? 'Sending Request…' : 'Request Enrollment'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </MenteeLayout>
  )
}
