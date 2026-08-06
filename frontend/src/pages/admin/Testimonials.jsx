import { useEffect, useState } from 'react'
import AdminLayout from '../../components/layouts/AdminLayout'
import api from '../../api/client'
import { toast } from '../../utils/toast'

const STATUS_STYLE = {
  pending:  { bg: '#fffbeb', color: '#92400e', label: 'Pending'  },
  approved: { bg: '#f0fdf4', color: '#15803d', label: 'Approved' },
  rejected: { bg: '#fef2f2', color: '#be123c', label: 'Rejected' },
}

export default function AdminTestimonials() {
  const [items,  setItems]  = useState([])
  const [filter, setFilter] = useState('pending')

  useEffect(() => {
    api.get('/api/admin/testimonials').then(r => setItems(r.data)).catch(() => {})
  }, [])

  const handleApprove = async id => {
    try {
      await api.post(`/api/admin/testimonials/${id}/approve`)
      setItems(list => list.map(x => x.id === id ? { ...x, status: 'approved' } : x))
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to approve testimonial')
    }
  }

  const handleReject = async id => {
    try {
      await api.post(`/api/admin/testimonials/${id}/reject`)
      setItems(list => list.map(x => x.id === id ? { ...x, status: 'rejected' } : x))
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to reject testimonial')
    }
  }

  const handleDelete = async id => {
    if (!confirm('Permanently delete this testimonial?')) return
    try {
      await api.delete(`/api/admin/testimonials/${id}`)
      setItems(list => list.filter(x => x.id !== id))
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to delete testimonial')
    }
  }

  const filtered = filter === 'all' ? items : items.filter(t => t.status === filter)
  const pendingCount = items.filter(t => t.status === 'pending').length

  return (
    <AdminLayout>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
          <span style={{ color: '#059669' }}>Testimonials</span>
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Review testimonials submitted from the site. Approved ones appear publicly with name, photo, program, and content only — email and WhatsApp stay private.</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['pending', 'approved', 'rejected', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              fontSize: 12.5, fontWeight: 700, padding: '8px 16px', borderRadius: 50, cursor: 'pointer',
              border: filter === f ? 'none' : '1.5px solid #e2e8f0',
              background: filter === f ? '#0f172a' : '#fff',
              color: filter === f ? '#fff' : '#64748b',
              textTransform: 'capitalize',
            }}>
            {f}{f === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', boxShadow: '0 1px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Submitted By', 'Program', 'Testimonial', 'Contact', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>No testimonials here</td></tr>
            ) : filtered.map((t, i) => {
              const ss = STATUS_STYLE[t.status] || { bg: '#f8fafc', color: '#64748b', label: t.status }
              return (
                <tr key={t.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {t.photo_url ? (
                        <img src={t.photo_url} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                      ) : (
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#059669,#10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                          {t.name[0]}
                        </div>
                      )}
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{t.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#64748b' }}>{t.program}</td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#374151', maxWidth: 320 }}>
                    <span style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.content}</span>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 12, color: '#64748b' }}>
                    <div>{t.email}</div>
                    <div>{t.whatsapp}</div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 50, background: ss.bg, color: ss.color }}>{ss.label}</span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      {t.status !== 'approved' && (
                        <button onClick={() => handleApprove(t.id)} style={{ fontSize: 12, fontWeight: 600, color: '#059669', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Approve</button>
                      )}
                      {t.status !== 'rejected' && (
                        <button onClick={() => handleReject(t.id)} style={{ fontSize: 12, fontWeight: 600, color: '#d97706', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Reject</button>
                      )}
                      <button onClick={() => handleDelete(t.id)} style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Delete</button>
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
