import { useEffect, useRef, useState } from 'react'
import AdminLayout from '../../components/layouts/AdminLayout'
import api from '../../api/client'

const empty = { program_id: '', mentor_id: '', title: '', description: '', session_type: 'live', scheduled_at: '', meeting_link: '', video_url: '', duration_minutes: '', cover_image: '' }

const inp = { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#1e293b', outline: 'none', background: '#fafafa', boxSizing: 'border-box', fontFamily: 'inherit' }
const lbl = { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.02em' }

const STATUS_STYLE = {
  scheduled:  { bg: '#eff6ff', color: '#1d4ed8' },
  completed:  { bg: '#f0fdf4', color: '#15803d' },
  cancelled:  { bg: '#fef2f2', color: '#dc2626' },
  live:       { bg: '#fef9c3', color: '#92400e' },
}

export default function AdminSessions() {
  const [sessions,     setSessions]     = useState([])
  const [programs,     setPrograms]     = useState([])
  const [mentors,      setMentors]      = useState([])
  const [showForm,     setShowForm]     = useState(false)
  const [editing,      setEditing]      = useState(null)
  const [form,         setForm]         = useState(empty)
  const [error,        setError]        = useState('')
  const [saving,       setSaving]       = useState(false)
  const [coverFile,    setCoverFile]    = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const coverInputRef = useRef(null)

  const load = () => Promise.all([
    api.get('/api/admin/sessions').then(r => setSessions(r.data)),
    api.get('/api/admin/programs').then(r => setPrograms(r.data)),
    api.get('/api/admin/mentors').then(r => setMentors(r.data)),
  ])
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(empty); setCoverFile(null); setCoverPreview(null); setError(''); setShowForm(true) }
  const openEdit   = s => {
    setEditing(s.session_id)
    setForm({ title: s.title, description: s.description || '', session_type: s.session_type,
               scheduled_at: s.scheduled_at ? s.scheduled_at.slice(0, 16) : '',
               meeting_link: s.meeting_link || '', video_url: s.video_url || '',
               duration_minutes: s.duration_minutes || '', status: s.status,
               program_id: s.program_id, mentor_id: s.mentor_id,
               cover_image: s.cover_image || '' })
    setCoverFile(null); setCoverPreview(null)
    setError(''); setShowForm(true)
  }

  const handleCoverChange = e => {
    const file = e.target.files[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async e => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      const payload = { ...form, cover_image: form.cover_image || null }
      let sessionId = editing
      if (editing) {
        await api.put(`/api/admin/sessions/${editing}`, payload)
      } else {
        const r = await api.post('/api/admin/sessions', payload)
        sessionId = r.data.session_id
      }

      if (coverFile && sessionId) {
        try {
          const fd = new FormData()
          fd.append('file', coverFile)
          const up = await api.post('/api/upload-cover', fd)
          await api.put(`/api/admin/sessions/${sessionId}`, { cover_image: up.data.url })
        } catch {
          // Cover upload failed — session saved without it
        }
      }

      setShowForm(false); setCoverFile(null); setCoverPreview(null); load()
    } catch (err) { setError(err.response?.data?.detail || 'Error saving session') }
    finally { setSaving(false) }
  }

  const handleDelete = async id => {
    if (!confirm('Delete this session?')) return
    try {
      await api.delete(`/api/admin/sessions/${id}`)
      load()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete session')
    }
  }

  const f = k => e => setForm(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <AdminLayout>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            <span style={{ color: '#059669' }}>Sessions</span>
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Schedule and manage live and recorded sessions across all programs.</p>
        </div>
        <button onClick={openCreate}
          style={{ padding: '11px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 4px 14px rgba(5,150,105,0.4)' }}>
          + New Session
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', padding: '32px', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>{editing ? 'Edit Session' : 'New Session'}</h2>
              <button onClick={() => { setShowForm(false); setCoverFile(null); setCoverPreview(null) }}
                style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#f1f5f9', cursor: 'pointer', fontSize: 16, color: '#64748b' }}>✕</button>
            </div>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>⚠ {error}</p>
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {!editing && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <p style={lbl}>Program *</p>
                      <select style={inp} required value={form.program_id} onChange={f('program_id')}
                        onFocus={e => e.target.style.borderColor = '#059669'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}>
                        <option value="">Select program</option>
                        {programs.map(p => <option key={p.program_id} value={p.program_id}>{p.title}</option>)}
                      </select>
                    </div>
                    <div>
                      <p style={lbl}>Mentor *</p>
                      <select style={inp} required value={form.mentor_id} onChange={f('mentor_id')}
                        onFocus={e => e.target.style.borderColor = '#059669'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}>
                        <option value="">Select mentor</option>
                        {mentors.map(m => <option key={m.mentor_profile_id} value={m.mentor_profile_id}>{m.full_name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                <div>
                  <p style={lbl}>Title *</p>
                  <input style={inp} required value={form.title} onChange={f('title')} placeholder="Session title"
                    onFocus={e => e.target.style.borderColor = '#059669'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <p style={lbl}>Session Type</p>
                    <select style={inp} value={form.session_type} onChange={f('session_type')}
                      onFocus={e => e.target.style.borderColor = '#059669'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}>
                      <option value="live">🔴 Live</option>
                      <option value="recorded">📹 Recorded</option>
                    </select>
                  </div>
                  <div>
                    <p style={lbl}>Duration (mins)</p>
                    <input style={inp} type="number" value={form.duration_minutes} onChange={f('duration_minutes')} placeholder="60"
                      onFocus={e => e.target.style.borderColor = '#059669'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                  </div>
                </div>
                {form.session_type === 'live' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <p style={lbl}>Scheduled At</p>
                      <input style={inp} type="datetime-local" value={form.scheduled_at} onChange={f('scheduled_at')}
                        onFocus={e => e.target.style.borderColor = '#059669'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                    </div>
                    <div>
                      <p style={lbl}>Meeting Link</p>
                      <input style={inp} value={form.meeting_link} onChange={f('meeting_link')} placeholder="https://meet.google.com/…"
                        onFocus={e => e.target.style.borderColor = '#059669'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={lbl}>Video URL</p>
                    <input style={inp} value={form.video_url} onChange={f('video_url')} placeholder="https://youtube.com/…"
                      onFocus={e => e.target.style.borderColor = '#059669'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                  </div>
                )}
                <div>
                  <p style={lbl}>Cover Image</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {(coverPreview || form.cover_image) && (
                      <img src={coverPreview || form.cover_image} alt="cover"
                        style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10, border: '1.5px solid #e2e8f0', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverChange} />
                      <button type="button" onClick={() => coverInputRef.current?.click()}
                        style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569' }}>
                        {coverPreview || form.cover_image ? '🔄 Change' : '📷 Upload Cover'}
                      </button>
                      {(coverPreview || form.cover_image) && (
                        <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(null); setForm(p => ({ ...p, cover_image: '' })); if (coverInputRef.current) coverInputRef.current.value = '' }}
                          style={{ marginLeft: 8, padding: '9px 14px', borderRadius: 10, border: '1.5px solid #fecaca', background: '#fef2f2', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#dc2626' }}>
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {editing && (
                  <div>
                    <p style={lbl}>Status</p>
                    <select style={inp} value={form.status} onChange={f('status')}
                      onFocus={e => e.target.style.borderColor = '#059669'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}>
                      {['scheduled','live','completed','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
                  <button type="submit" disabled={saving}
                    style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', background: saving ? '#6ee7b7' : 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 4px 14px rgba(5,150,105,0.35)' }}>
                    {saving ? 'Saving…' : editing ? 'Update Session' : 'Create Session'}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setCoverFile(null); setCoverPreview(null) }}
                    style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: '1.5px solid #e2e8f0', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748b', background: '#fff' }}>
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', boxShadow: '0 1px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Title','Type','Program','Scheduled','Duration','Status','Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>No sessions yet</td></tr>
            ) : sessions.map((s, i) => {
              const st = STATUS_STYLE[s.status] || { bg: '#f8fafc', color: '#64748b' }
              const prog = programs.find(p => p.program_id === s.program_id)
              return (
                <tr key={s.session_id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '13px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {s.cover_image
                        ? <img src={s.cover_image} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                        : <div style={{ width: 36, height: 36, borderRadius: 8, background: s.session_type === 'live' ? '#eff6ff' : '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{s.session_type === 'live' ? '🎥' : '📹'}</div>}
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{s.title}</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 50, background: s.session_type === 'live' ? '#eff6ff' : '#f5f3ff', color: s.session_type === 'live' ? '#1d4ed8' : '#6d28d9' }}>
                      {s.session_type === 'live' ? '🔴 Live' : '📹 Recorded'}
                    </span>
                  </td>
                  <td style={{ padding: '13px 18px', fontSize: 13, color: '#64748b', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prog?.title || '—'}</td>
                  <td style={{ padding: '13px 18px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {s.scheduled_at ? new Date(s.scheduled_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td style={{ padding: '13px 18px', fontSize: 13, color: '#64748b' }}>{s.duration_minutes ? `${s.duration_minutes}m` : '—'}</td>
                  <td style={{ padding: '13px 18px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 50, background: st.bg, color: st.color }}>{s.status}</span>
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button onClick={() => openEdit(s)} style={{ fontSize: 12, fontWeight: 600, color: '#059669', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Edit</button>
                      <button onClick={() => handleDelete(s.session_id)} style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Delete</button>
                    </div>
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
