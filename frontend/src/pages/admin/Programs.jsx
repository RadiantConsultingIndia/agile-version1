import { useEffect, useState } from 'react'
import AdminLayout from '../../components/layouts/AdminLayout'
import api from '../../api/client'

const empty = { title: '', description: '', category: '', duration_weeks: '', start_date: '', end_date: '', assigned_mentor: '' }

const inp = { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#1e293b', outline: 'none', background: '#fafafa', boxSizing: 'border-box', fontFamily: 'inherit' }
const lbl = { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.02em' }

const STATUS = {
  active:   { bg: '#f0fdf4', color: '#15803d', dot: '#22c55e', label: 'Active' },
  pending:  { bg: '#fffbeb', color: '#92400e', dot: '#f59e0b', label: 'Pending' },
  rejected: { bg: '#fef2f2', color: '#dc2626', dot: '#ef4444', label: 'Rejected' },
  archived: { bg: '#f8fafc', color: '#64748b', dot: '#94a3b8', label: 'Archived' },
}

const CAT_GRADS = [
  'linear-gradient(135deg,#059669,#10b981)',
  'linear-gradient(135deg,#1d4ed8,#4f46e5)',
  'linear-gradient(135deg,#7c3aed,#a855f7)',
  'linear-gradient(135deg,#d97706,#f97316)',
  'linear-gradient(135deg,#db2777,#e879f9)',
  'linear-gradient(135deg,#0f766e,#0d9488)',
]
const EMOJIS = ['📚', '🎯', '🚀', '⚡', '🧩', '📐']

function ProgramCard({ p, idx, onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const st    = STATUS[p.status] || { bg: '#f8fafc', color: '#64748b', dot: '#94a3b8', label: p.status }
  const grad  = CAT_GRADS[idx % CAT_GRADS.length]
  const emoji = EMOJIS[idx % EMOJIS.length]
  const fmt   = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  return (
    <div style={{ background: '#fff', borderRadius: 18, boxShadow: open ? '0 8px 32px rgba(0,0,0,0.10)' : '0 1px 4px rgba(0,0,0,0.04)', border: `1px solid ${open ? '#e2e8f0' : '#f1f5f9'}`, overflow: 'hidden', transition: 'box-shadow 0.2s, border-color 0.2s' }}>

      {/* Header row — always visible, click to expand */}
      <div onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', cursor: 'pointer', userSelect: 'none' }}
        onMouseEnter={e => !open && (e.currentTarget.style.background = '#fafafa')}
        onMouseLeave={e => !open && (e.currentTarget.style.background = 'transparent')}>

        <div style={{ width: 46, height: 46, borderRadius: 14, background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {emoji}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>{p.title}</h3>
            {p.category && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 50, background: '#f1f5f9', color: '#475569' }}>{p.category}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {p.mentor_name    && <span style={{ fontSize: 12, color: '#94a3b8' }}>👤 {p.mentor_name}</span>}
            {p.duration_weeks && <span style={{ fontSize: 12, color: '#94a3b8' }}>📅 {p.duration_weeks} weeks</span>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 50, background: st.bg, border: `1px solid ${st.dot}30` }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.dot, display: 'inline-block' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: st.color }}>{st.label}</span>
          </div>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.22s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>
            <svg width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded dropdown body */}
      {open && (
        <div style={{ borderTop: '1px solid #f1f5f9', animation: 'fadeSlide 0.18s ease' }}>

          {/* Detail chips */}
          <div style={{ display: 'flex', gap: 12, padding: '16px 20px', flexWrap: 'wrap', borderBottom: '1px solid #f8fafc' }}>
            {[
              { icon: '🆔', label: 'ID',       value: p.program_id },
              { icon: '📅', label: 'Start',    value: fmt(p.start_date) },
              { icon: '🏁', label: 'End',      value: fmt(p.end_date) },
              { icon: '⏱',  label: 'Duration', value: p.duration_weeks ? `${p.duration_weeks} weeks` : '—' },
              { icon: '👤', label: 'Mentor',   value: p.mentor_name || '—' },
            ].map(chip => (
              <div key={chip.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 15 }}>{chip.icon}</span>
                <div>
                  <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, margin: '0 0 1px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{chip.label}</p>
                  <p style={{ fontSize: 13, color: '#1e293b', fontWeight: 600, margin: 0 }}>{chip.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Description */}
          {p.description && (
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f8fafc' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>Description</p>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, margin: 0 }}>{p.description}</p>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, padding: '14px 20px', background: '#fafafa' }}>
            <button onClick={e => { e.stopPropagation(); onEdit(p) }}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 4px 12px rgba(5,150,105,0.3)' }}>
              ✏️ Edit Program
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete(p.program_id) }}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 10, border: '1.5px solid #fecaca', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#dc2626', background: '#fef2f2' }}>
              🗑 Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminPrograms() {
  const [programs, setPrograms] = useState([])
  const [mentors,  setMentors]  = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [form,     setForm]     = useState(empty)
  const [error,    setError]    = useState('')
  const [saving,   setSaving]   = useState(false)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('all')

  const load = () => Promise.all([
    api.get('/api/admin/programs').then(r => setPrograms(r.data)),
    api.get('/api/admin/mentors').then(r => setMentors(r.data)),
  ])
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(empty); setError(''); setShowForm(true) }
  const openEdit   = p => {
    setEditing(p.program_id)
    setForm({ title: p.title, description: p.description || '', category: p.category || '',
               duration_weeks: p.duration_weeks || '', start_date: p.start_date || '',
               end_date: p.end_date || '', assigned_mentor: p.assigned_mentor || '', status: p.status })
    setError(''); setShowForm(true)
  }

  const handleSubmit = async e => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      if (editing) await api.put(`/api/admin/programs/${editing}`, form)
      else         await api.post('/api/admin/programs', form)
      setShowForm(false); load()
    } catch (err) { setError(err.response?.data?.detail || 'Error saving program') }
    finally { setSaving(false) }
  }

  const handleDelete = async id => {
    if (!confirm('Delete this program and all its sessions/enrollments?')) return
    await api.delete(`/api/admin/programs/${id}`); load()
  }

  const f = k => e => setForm(prev => ({ ...prev, [k]: e.target.value }))

  const FILTERS = ['all', 'active', 'pending', 'rejected', 'archived']
  const counts  = FILTERS.reduce((acc, s) => {
    acc[s] = s === 'all' ? programs.length : programs.filter(p => p.status === s).length
    return acc
  }, {})

  const FILTER_COLORS = { all: '#059669', active: '#22c55e', pending: '#f59e0b', rejected: '#ef4444', archived: '#94a3b8' }

  const filtered = programs.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || p.status === filter
    return matchSearch && matchFilter
  })

  return (
    <AdminLayout>

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            <span style={{ color: '#059669' }}>Programs</span>
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Click any card to expand details, edit, or delete.</p>
        </div>
        <button onClick={openCreate}
          style={{ padding: '11px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 4px 14px rgba(5,150,105,0.4)' }}>
          + New Program
        </button>
      </div>

      {/* Search + Status filter pills */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <svg style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}
            width="15" height="15" fill="none" stroke="#475569" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or category…"
            style={{ width: '100%', padding: '11px 14px 11px 40px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#1e293b', outline: 'none', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit' }}
            onFocus={e => e.target.style.borderColor = '#059669'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {FILTERS.map(s => {
            const active = filter === s
            const col    = FILTER_COLORS[s]
            return (
              <button key={s} onClick={() => setFilter(s)}
                style={{ padding: '9px 16px', borderRadius: 10, border: active ? 'none' : `1.5px solid #e2e8f0`, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                         color: active ? '#fff' : '#64748b',
                         background: active ? `linear-gradient(135deg,${col},${col}cc)` : '#fff',
                         boxShadow: active ? `0 2px 8px ${col}44` : 'none', transition: '0.15s' }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}{' '}
                <span style={{ opacity: 0.75 }}>({counts[s]})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Accordion program cards */}
      {filtered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>📚</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 6px' }}>No programs found</p>
          <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 20px' }}>
            {search || filter !== 'all' ? 'Try adjusting your search or filter.' : 'Create your first mentorship program.'}
          </p>
          {!search && filter === 'all' && (
            <button onClick={openCreate}
              style={{ padding: '11px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 4px 14px rgba(5,150,105,0.35)' }}>
              + Create First Program
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((p, i) => (
            <ProgramCard key={p.program_id} p={p} idx={i} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', padding: '32px', width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>{editing ? 'Edit Program' : 'New Program'}</h2>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{editing ? 'Update program details' : 'Fill in the details to create a new program'}</p>
              </div>
              <button onClick={() => setShowForm(false)}
                style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#64748b' }}>✕</button>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>⚠ {error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={lbl}>Title *</p>
                  <input style={inp} required value={form.title} onChange={f('title')} placeholder="e.g. Agile Fundamentals"
                    onFocus={e => e.target.style.borderColor = '#059669'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
                <div>
                  <p style={lbl}>Category</p>
                  <input style={inp} value={form.category} onChange={f('category')} placeholder="e.g. Scrum, Kanban"
                    onFocus={e => e.target.style.borderColor = '#059669'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
                <div>
                  <p style={lbl}>Duration (weeks)</p>
                  <input style={inp} type="number" value={form.duration_weeks} onChange={f('duration_weeks')} placeholder="8"
                    onFocus={e => e.target.style.borderColor = '#059669'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
                <div>
                  <p style={lbl}>Start Date</p>
                  <input style={inp} type="date" value={form.start_date} onChange={f('start_date')}
                    onFocus={e => e.target.style.borderColor = '#059669'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
                <div>
                  <p style={lbl}>End Date</p>
                  <input style={inp} type="date" value={form.end_date} onChange={f('end_date')}
                    onFocus={e => e.target.style.borderColor = '#059669'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={lbl}>Description</p>
                  <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={form.description} onChange={f('description')} placeholder="Program overview…"
                    onFocus={e => e.target.style.borderColor = '#059669'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={lbl}>Assign Mentor</p>
                  <select style={inp} value={form.assigned_mentor} onChange={f('assigned_mentor')}
                    onFocus={e => e.target.style.borderColor = '#059669'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}>
                    <option value="">— None —</option>
                    {mentors.map(m => <option key={m.mentor_profile_id} value={m.mentor_profile_id}>{m.full_name}</option>)}
                  </select>
                </div>
                {editing && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <p style={lbl}>Status</p>
                    <select style={inp} value={form.status} onChange={f('status')}
                      onFocus={e => e.target.style.borderColor = '#059669'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}>
                      {['pending','active','rejected','archived'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" disabled={saving}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', background: saving ? '#6ee7b7' : 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 4px 14px rgba(5,150,105,0.35)' }}>
                  {saving ? 'Saving…' : editing ? 'Update Program' : 'Create Program'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: '1.5px solid #e2e8f0', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748b', background: '#fff' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </AdminLayout>
  )
}
