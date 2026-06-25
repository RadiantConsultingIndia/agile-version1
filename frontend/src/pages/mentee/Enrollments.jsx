import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import MenteeLayout from '../../components/layouts/MenteeLayout'
import api from '../../api/client'

const STATUS_STYLE = {
  enrolled:              { bg: '#eff6ff', color: '#1d4ed8', label: 'Enrolled' },
  active:                { bg: '#eff6ff', color: '#1d4ed8', label: 'Enrolled' },
  certificate_eligible:  { bg: '#fffbeb', color: '#92400e', label: 'Cert. Eligible' },
  completed:             { bg: '#f0fdf4', color: '#15803d', label: 'Completed' },
  dropped:               { bg: '#fef2f2', color: '#dc2626', label: 'Dropped' },
}

export default function MenteeEnrollments() {
  const [enrollments, setEnrollments] = useState([])

  const load = () => api.get('/api/mentee/enrollments').then(r => setEnrollments(r.data))
  useEffect(() => { load() }, [])

  const handleUnenroll = async id => {
    if (!confirm('Unenroll from this program?')) return
    await api.delete(`/api/mentee/enrollments/${id}`)
    load()
  }

  return (
    <MenteeLayout>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
          My <span style={{ color: '#7c3aed' }}>Enrollments</span>
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Track all the programs you've enrolled in and monitor your progress.</p>
      </div>

      {enrollments.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', boxShadow: '0 1px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 16, lineHeight: 1 }}>📋</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 6px' }}>No enrollments yet</p>
          <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 24px' }}>Browse programs and enroll to get started.</p>
          <Link to="/programs" style={{ textDecoration: 'none', padding: '11px 28px', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 4px 12px rgba(124,58,237,0.35)' }}>
            Browse Programs →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 18 }}>
          {enrollments.map(e => {
            const st = STATUS_STYLE[e.status] || { bg: '#f8fafc', color: '#64748b', label: e.status }
            const progress = e.progress ?? 0
            return (
              <div key={e.enrollment_id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', boxShadow: '0 1px 8px rgba(0,0,0,0.05)', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 4px', lineHeight: 1.3 }}>{e.program_title}</h3>
                    <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Mentor: {e.mentor_name || '—'}</p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 50, whiteSpace: 'nowrap', background: st.bg, color: st.color, flexShrink: 0 }}>
                    {st.label}
                  </span>
                </div>

                {/* Progress */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600 }}>Progress</span>
                    <span style={{ fontWeight: 700, color: '#7c3aed' }}>{progress}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#7c3aed,#a855f7)', width: `${progress}%`, transition: 'width 0.4s ease' }} />
                  </div>
                </div>

                {/* Certificate badge */}
                {e.certificate_issued && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: '#fffbeb', border: '1px solid #fde68a' }}>
                    <span style={{ fontSize: 16 }}>🏆</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>Certificate Earned!</span>
                  </div>
                )}

                {/* Actions */}
                {(e.status === 'enrolled' || e.status === 'active') && (
                  <div style={{ display: 'flex', gap: 12, paddingTop: 4, borderTop: '1px solid #f8fafc' }}>
                    <button onClick={() => handleUnenroll(e.enrollment_id)}
                      style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      Unenroll
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </MenteeLayout>
  )
}
