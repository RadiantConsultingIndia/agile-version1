import { useEffect, useState } from 'react'
import MenteeLayout from '../../components/layouts/MenteeLayout'
import api from '../../api/client'

const C = '#7c3aed'

const GRAD = [
  'linear-gradient(135deg,#7c3aed,#a855f7)',
  'linear-gradient(135deg,#0d9488,#0891b2)',
  'linear-gradient(135deg,#1d4ed8,#4f46e5)',
  'linear-gradient(135deg,#d97706,#f97316)',
  'linear-gradient(135deg,#db2777,#e879f9)',
  'linear-gradient(135deg,#0f766e,#0d9488)',
]
const EMOJIS = ['⚡', '🎯', '🚀', '📐', '🧩', '📊']

function ProgramCard({ p, idx, enrolled, pending, enrolling, onEnroll }) {
  const [open, setOpen] = useState(false)
  const grad  = GRAD[idx % GRAD.length]
  const emoji = EMOJIS[idx % EMOJIS.length]
  const fmt   = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  return (
    <div style={{ background: '#fff', borderRadius: 20, boxShadow: open ? '0 10px 36px rgba(0,0,0,0.12)' : '0 1px 8px rgba(0,0,0,0.06)', border: `1.5px solid ${open ? '#e2e8f0' : '#f1f5f9'}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'box-shadow 0.22s, border-color 0.22s' }}>

      {/* Gradient header banner */}
      <div style={{ background: grad, padding: '28px 24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', minHeight: 100 }}>
        <span style={{ fontSize: 46, lineHeight: 1 }}>{emoji}</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          {pending && (
            <div style={{ background: 'rgba(255,255,255,0.9)', borderRadius: 50, padding: '4px 12px', fontSize: 11, fontWeight: 700, color: '#92400e' }}>
              ⏳ Pending
            </div>
          )}
          {enrolled && (
            <div style={{ background: 'rgba(255,255,255,0.9)', borderRadius: 50, padding: '4px 12px', fontSize: 11, fontWeight: 700, color: '#15803d' }}>
              ✓ Enrolled
            </div>
          )}
          {p.duration_weeks && (
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 50, padding: '4px 12px', fontSize: 11, fontWeight: 700, color: '#fff' }}>
              📅 {p.duration_weeks}w
            </div>
          )}
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: '18px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Title + category */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: 0, lineHeight: 1.4 }}>{p.title}</h3>
          {p.category && (
            <span style={{ fontSize: 11, fontWeight: 700, color: C, background: '#f5f3ff', padding: '3px 10px', borderRadius: 50, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {p.category}
            </span>
          )}
        </div>

        {/* Description preview (always shown) */}
        {p.description && !open && (
          <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {p.description}
          </p>
        )}

        {/* Expanded dropdown details */}
        {open && (
          <div style={{ animation: 'fadeSlide 0.18s ease' }}>
            {p.description && (
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 14px', lineHeight: 1.65 }}>
                {p.description}
              </p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              {[
                { icon: '📅', label: 'Start Date',    value: fmt(p.start_date) },
                { icon: '🏁', label: 'End Date',      value: fmt(p.end_date) },
                { icon: '⏱',  label: 'Duration',      value: p.duration_weeks ? `${p.duration_weeks} weeks` : '—' },
                { icon: '👤', label: 'Mentor',        value: p.mentor_name || '—' },
              ].map(item => (
                <div key={item.label} style={{ padding: '10px 12px', borderRadius: 10, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.icon} {item.label}</p>
                  <p style={{ fontSize: 13, color: '#1e293b', fontWeight: 700, margin: 0 }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View details toggle */}
        <button onClick={() => setOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 0', borderRadius: 8, border: `1px solid #f1f5f9`, background: '#f8fafc', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#64748b' }}>
          <span style={{ display: 'inline-block', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
          </span>
          {open ? 'Hide Details' : 'View Details'}
        </button>

        {/* Enroll / status button */}
        <div style={{ marginTop: 'auto' }}>
          {enrolled ? (
            <div style={{ width: '100%', padding: '11px 0', borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#15803d' }}>
              ✓ Enrolled
            </div>
          ) : pending ? (
            <div style={{ width: '100%', padding: '11px 0', borderRadius: 12, background: '#fffbeb', border: '1px solid #fde68a', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#92400e' }}>
              ⏳ Awaiting Approval
            </div>
          ) : (
            <button onClick={() => onEnroll(p.program_id)} disabled={!!enrolling}
              style={{ width: '100%', padding: '11px 0', borderRadius: 12, border: 'none', cursor: enrolling === p.program_id ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', background: enrolling === p.program_id ? '#c4b5fd' : `linear-gradient(135deg,${C},#a855f7)`, boxShadow: '0 4px 14px rgba(124,58,237,0.35)', transition: '0.15s' }}>
              {enrolling === p.program_id ? 'Sending Request…' : 'Request Enrollment'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MenteePrograms() {
  const [programs,    setPrograms]    = useState([])
  const [enrolledIds, setEnrolledIds] = useState(new Set())
  const [pendingIds,  setPendingIds]  = useState(new Set())
  const [enrolling,   setEnrolling]   = useState(null)
  const [search,      setSearch]      = useState('')

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

  const enrolled = filtered.filter(p => enrolledIds.has(p.program_id)).length
  const available = filtered.filter(p => !enrolledIds.has(p.program_id) && !pendingIds.has(p.program_id)).length

  return (
    <MenteeLayout>

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
          Browse <span style={{ color: C }}>Programs</span>
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Discover mentorship programs — click "View Details" to expand any card before enrolling.</p>
      </div>

      {/* Summary row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Programs', value: filtered.length, bg: '#f5f3ff', color: C, dot: C },
          { label: 'Enrolled',       value: enrolled,        bg: '#f0fdf4', color: '#15803d', dot: '#22c55e' },
          { label: 'Available',      value: available,       bg: '#f8fafc', color: '#475569', dot: '#94a3b8' },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderRadius: 12, background: s.bg, border: `1px solid ${s.dot}30` }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.value} {s.label}</span>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 28 }}>
        <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}
          width="16" height="16" fill="none" stroke="#475569" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by title or category…"
          style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1e293b', outline: 'none', background: '#fff', boxSizing: 'border-box', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', fontFamily: 'inherit' }}
          onFocus={e => e.target.style.borderColor = C}
          onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
      </div>

      {/* Program cards grid */}
      {filtered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🔍</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 6px' }}>No programs found</p>
          <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>Try a different search term.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
          {filtered.map((p, idx) => (
            <ProgramCard
              key={p.program_id}
              p={p} idx={idx}
              enrolled={enrolledIds.has(p.program_id)}
              pending={pendingIds.has(p.program_id)}
              enrolling={enrolling}
              onEnroll={handleEnroll}
            />
          ))}
        </div>
      )}

    </MenteeLayout>
  )
}
