import { useEffect, useState } from 'react'
import MentorLayout from '../../components/layouts/MentorLayout'
import api from '../../api/client'

function StarDisplay({ rating, size = 14 }) {
  return (
    <span>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: size, color: i <= Math.round(rating) ? '#f59e0b' : '#e2e8f0' }}>★</span>
      ))}
    </span>
  )
}

function RatingsPanel({ sessionId }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/api/mentor/sessions/${sessionId}/ratings`)
      .then(r => setData(r.data))
      .catch(() => setData({ avg_rating: null, count: 0, ratings: [] }))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) return <div style={{ padding: '14px 20px', fontSize: 13, color: '#94a3b8' }}>Loading ratings…</div>
  if (!data || data.count === 0) return (
    <div style={{ padding: '20px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>⭐</div>
      <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>No ratings yet for this session.</p>
    </div>
  )

  return (
    <div style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
      {/* Aggregate */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, padding: '14px 16px', background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 32, fontWeight: 900, color: '#f59e0b', margin: 0, lineHeight: 1 }}>{data.avg_rating}</p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>out of 5</p>
        </div>
        <div>
          <StarDisplay rating={data.avg_rating} size={18} />
          <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0', fontWeight: 600 }}>{data.count} rating{data.count !== 1 ? 's' : ''}</p>
        </div>
      </div>
      {/* Individual comments */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.ratings.map((r, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', border: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: r.comments ? 6 : 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                {r.mentee_name[0]}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', flex: 1 }}>{r.mentee_name}</span>
              <StarDisplay rating={r.rating} size={13} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>{r.rating}/5</span>
            </div>
            {r.comments && <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.6, fontStyle: 'italic', paddingLeft: 36 }}>"{r.comments}"</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

const emptyForm = { title: '', description: '', session_type: 'live', scheduled_at: '', meeting_link: '', video_url: '', duration_minutes: '' }

const inp = { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#1e293b', outline: 'none', background: '#fafafa', boxSizing: 'border-box', fontFamily: 'inherit' }
const label = { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.02em' }

function SessionCard({ s, isLive, isPast, onEdit, onDelete }) {
  const [showRatings, setShowRatings] = useState(false)
  const hasRatings = s.rating_count > 0

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: isLive ? '#eff6ff' : '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
          {isLive ? '🎥' : '📹'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</p>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 50, flexShrink: 0, background: isLive ? '#dbeafe' : '#ede9fe', color: isLive ? '#1d4ed8' : '#6d28d9' }}>
              {isLive ? 'Live' : 'Recorded'}
            </span>
            {isPast && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 50, background: '#f1f5f9', color: '#94a3b8', flexShrink: 0 }}>Past</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
              {s.scheduled_at ? new Date(s.scheduled_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Recorded session'}
              {s.duration_minutes ? ` · ${s.duration_minutes} min` : ''}
            </p>
            {/* Avg rating badge */}
            {hasRatings && (
              <button onClick={() => setShowRatings(o => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 50, border: '1px solid #fde68a', background: '#fffbeb', cursor: 'pointer' }}>
                <span style={{ fontSize: 12 }}>⭐</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>{s.avg_rating} · {s.rating_count} review{s.rating_count !== 1 ? 's' : ''}</span>
                <svg width="10" height="10" fill="none" stroke="#92400e" strokeWidth="2.5" viewBox="0 0 24 24"
                  style={{ transform: showRatings ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {s.meeting_link && (
            <a href={s.meeting_link} target="_blank" rel="noreferrer"
              style={{ textDecoration: 'none', fontSize: 12, fontWeight: 700, color: '#fff', padding: '8px 16px', borderRadius: 8, background: '#4f46e5' }}>
              Join
            </a>
          )}
          <button onClick={() => onEdit(s)}
            style={{ fontSize: 12, fontWeight: 600, color: '#64748b', padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}>
            Edit
          </button>
          <button onClick={() => onDelete(s.session_id)}
            style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', padding: '8px 14px', borderRadius: 8, border: '1px solid #fee2e2', background: '#fff', cursor: 'pointer' }}>
            Delete
          </button>
        </div>
      </div>
      {showRatings && <RatingsPanel sessionId={s.session_id} />}
    </div>
  )
}

export default function MentorSessions() {
  const [sessions, setSessions] = useState([])
  const [programs, setPrograms] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [selectedProgram, setSelectedProgram] = useState('')
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => Promise.all([
    api.get('/api/mentor/sessions').then(r => setSessions(r.data)),
    api.get('/api/mentor/programs').then(r => setPrograms(r.data)),
  ])
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setSelectedProgram(''); setError(''); setShowForm(true) }
  const openEdit   = s  => {
    setEditing(s.session_id)
    setForm({ title: s.title, description: s.description || '', session_type: s.session_type,
               scheduled_at: s.scheduled_at?.slice(0, 16) || '', meeting_link: s.meeting_link || '',
               video_url: s.video_url || '', duration_minutes: s.duration_minutes || '' })
    setError(''); setShowForm(true)
  }

  const handleSubmit = async e => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      if (editing) await api.put(`/api/mentor/sessions/${editing}`, form)
      else         await api.post('/api/mentor/sessions', { ...form, program_id: selectedProgram })
      setShowForm(false); setEditing(null); setForm(emptyForm); setSelectedProgram(''); load()
    } catch (err) { setError(err.response?.data?.detail || 'Failed to save session') }
    finally { setSaving(false) }
  }

  const handleDelete = async id => {
    if (!confirm('Delete this session?')) return
    await api.delete(`/api/mentor/sessions/${id}`); load()
  }

  const filtered = filter === 'all' ? sessions : sessions.filter(s => s.session_type === filter)

  const FILTERS = [
    { key: 'all',      label: `All (${sessions.length})` },
    { key: 'live',     label: '🔴  Live' },
    { key: 'recorded', label: '📹  Recorded' },
  ]

  return (
    <MentorLayout>

      {/* ── Create/Edit accordion ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 8px rgba(0,0,0,0.05)', marginBottom: 24, overflow: 'hidden' }}>
        <button onClick={() => showForm && !editing ? setShowForm(false) : openCreate()}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '18px 24px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>+</div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{editing ? 'Edit Session' : 'Create New Session'}</span>
          <svg style={{ marginLeft: 'auto', transform: showForm ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
            width="18" height="18" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7"/>
          </svg>
        </button>

        {showForm && (
          <div style={{ borderTop: '1px solid #f1f5f9', padding: '24px 24px 28px' }}>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>⚠ {error}</p>
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
                <div>
                  <p style={label}>Session Title *</p>
                  <input style={inp} required placeholder="e.g. Introduction to Scrum"
                    value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
                    onFocus={e => e.target.style.borderColor = '#4f46e5'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
                {!editing && (
                  <div>
                    <p style={label}>Program *</p>
                    <select style={inp} required value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)}>
                      <option value="">Select a program</option>
                      {programs.map(p => <option key={p.program_id} value={p.program_id}>{p.title}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <p style={label}>Session Type *</p>
                  <select style={inp} value={form.session_type} onChange={e => setForm(f => ({...f, session_type: e.target.value}))}>
                    <option value="live">🔴 Live Session</option>
                    <option value="recorded">📹 Recorded</option>
                  </select>
                </div>
                <div>
                  <p style={label}>Duration (minutes)</p>
                  <input style={inp} type="number" min="1" placeholder="e.g. 60"
                    value={form.duration_minutes} onChange={e => setForm(f => ({...f, duration_minutes: e.target.value}))}
                    onFocus={e => e.target.style.borderColor = '#4f46e5'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
              </div>

              {form.session_type === 'live' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
                  <div>
                    <p style={label}>Scheduled At</p>
                    <input style={inp} type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({...f, scheduled_at: e.target.value}))}
                      onFocus={e => e.target.style.borderColor = '#4f46e5'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                  </div>
                  <div>
                    <p style={label}>Meeting Link</p>
                    <input style={inp} placeholder="https://meet.google.com/..."
                      value={form.meeting_link} onChange={e => setForm(f => ({...f, meeting_link: e.target.value}))}
                      onFocus={e => e.target.style.borderColor = '#4f46e5'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: 18 }}>
                  <p style={label}>Video URL</p>
                  <input style={inp} placeholder="https://youtube.com/..."
                    value={form.video_url} onChange={e => setForm(f => ({...f, video_url: e.target.value}))}
                    onFocus={e => e.target.style.borderColor = '#4f46e5'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <p style={label}>Description</p>
                <textarea style={{ ...inp, minHeight: 90, resize: 'vertical' }} placeholder="Session agenda or notes..."
                  value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  onFocus={e => e.target.style.borderColor = '#4f46e5'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" disabled={saving}
                  style={{ padding: '12px 28px', borderRadius: 10, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', background: saving ? '#a5b4fc' : 'linear-gradient(135deg,#4f46e5,#6366f1)', boxShadow: saving ? 'none' : '0 4px 14px rgba(99,102,241,0.4)' }}>
                  {saving ? 'Saving…' : editing ? 'Update Session' : 'Create Session →'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null) }}
                  style={{ padding: '12px 28px', borderRadius: 10, border: '1.5px solid #e2e8f0', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748b', background: '#fff' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ── Filter tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {FILTERS.map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            style={{ padding: '8px 18px', borderRadius: 50, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              background: filter === t.key ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : '#fff',
              color: filter === t.key ? '#fff' : '#64748b',
              boxShadow: filter === t.key ? '0 2px 8px rgba(99,102,241,0.35)' : '0 1px 4px rgba(0,0,0,0.06)',
              border: filter === t.key ? 'none' : '1px solid #e2e8f0',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Session cards ── */}
      {filtered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', boxShadow: '0 1px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 16, lineHeight: 1 }}>🎬</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 6px' }}>No sessions yet</p>
          <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 24px' }}>Click "Create New Session" above to get started</p>
          <button onClick={openCreate}
            style={{ padding: '12px 28px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#4f46e5,#6366f1)' }}>
            Create First Session
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(s => {
            const isLive = s.session_type === 'live'
            const isPast = s.scheduled_at && new Date(s.scheduled_at) < new Date()
            return (
              <SessionCard key={s.session_id} s={s} isLive={isLive} isPast={isPast} onEdit={openEdit} onDelete={handleDelete} />
            )
          })}
        </div>
      )}
    </MentorLayout>
  )
}
