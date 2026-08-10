import { useEffect, useState } from 'react'
import AdminLayout from '../../components/layouts/AdminLayout'
import api from '../../api/client'

const C = '#059669'

const exportCSV = (path, filename) => {
  api.get(path, { responseType: 'blob' }).then(r => {
    const url = URL.createObjectURL(r.data)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  })
}

function SummaryCard({ label, value, icon, suffix = '' }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 18,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)',
      border: '1px solid #f1f5f9',
      borderLeft: `4px solid ${C}`,
      padding: '22px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        background: `${C}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 24,
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 32, fontWeight: 900, color: '#0f172a', margin: '0 0 2px', lineHeight: 1 }}>
          {value != null ? value : '—'}{suffix}
        </p>
        <p style={{ fontSize: 12, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: '0.02em' }}>{label}</p>
      </div>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 18,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)',
      border: '1px solid #f1f5f9',
      overflow: 'hidden',
      marginBottom: 22,
    }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: C }} />
        <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>{title}</h2>
      </div>
      <div style={{ padding: '20px 24px' }}>
        {children}
      </div>
    </div>
  )
}

export default function AdminAnalytics() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    api.get('/api/admin/analytics')
      .then(r => setData(r.data))
      .catch(() => setError('Failed to load analytics data.'))
      .finally(() => setLoading(false))
  }, [])

  const medals = ['🥇', '🥈', '🥉']

  const maxEnrollment = data?.enrollments_by_month?.length
    ? Math.max(...data.enrollments_by_month.map(m => m.count), 1)
    : 1

  const sortedMentors = data?.mentors
    ? [...data.mentors].sort((a, b) => b.sessions - a.sessions)
    : []

  return (
    <AdminLayout>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            <span style={{ color: C }}>Analytics</span>
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Platform insights and performance metrics</p>
        </div>

        {/* CSV Export buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Export Enrollments', path: '/api/admin/export/enrollments', file: 'enrollments.csv' },
            { label: 'Export Attendance',  path: '/api/admin/export/attendance',  file: 'attendance.csv' },
            { label: 'Export Completions', path: '/api/admin/export/completions', file: 'completions.csv' },
          ].map(btn => (
            <button
              key={btn.file}
              onClick={() => exportCSV(btn.path, btn.file)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 18px', borderRadius: 10, border: `1.5px solid ${C}30`,
                cursor: 'pointer', fontSize: 12, fontWeight: 700,
                color: C, background: `${C}08`,
                transition: '0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${C}18`; e.currentTarget.style.borderColor = C }}
              onMouseLeave={e => { e.currentTarget.style.background = `${C}08`; e.currentTarget.style.borderColor = `${C}30` }}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/>
              </svg>
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', flexDirection: 'column', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${C}30`, borderTop: `3px solid ${C}`, animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>Loading analytics…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '20px 24px', textAlign: 'center' }}>
          <p style={{ color: '#dc2626', fontSize: 14, margin: 0 }}>⚠ {error}</p>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Summary stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
            <SummaryCard icon="📚" label="Total Programs"    value={data.summary?.total_programs} />
            <SummaryCard icon="📋" label="Total Enrollments" value={data.summary?.total_enrollments} />
            <SummaryCard icon="🏆" label="Total Completions" value={data.summary?.total_completions} />
            <SummaryCard icon="📈" label="Completion Rate"   value={data.summary?.overall_completion_rate} suffix="%" />
          </div>

          {/* AgileHire usage & Anthropic cost */}
          <Card title="AgileHire Usage & Anthropic Cost (Est.)">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
              <SummaryCard icon="✉️" label="Invites Sent" value={data.hire_usage?.invites_sent} />
              <SummaryCard icon="▶️" label="Candidates Started" value={data.hire_usage?.candidates_started} />
              <SummaryCard icon="✅" label="Candidates Completed" value={data.hire_usage?.candidates_completed} />
              <SummaryCard icon="🚪" label="Did Not Complete" value={data.hire_usage?.candidates_abandoned} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {[
                { title: 'This Month', d: data.hire_usage?.this_month },
                { title: 'All Time', d: data.hire_usage?.all_time },
              ].map(({ title, d }) => (
                <div key={title} style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 14, padding: '16px 18px' }}>
                  <p style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 12px' }}>{title}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>AI calls (Claude Sonnet 5)</span><span style={{ fontWeight: 700, color: '#0f172a' }}>{d?.ai_calls ?? 0}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Input tokens</span><span style={{ fontWeight: 700, color: '#0f172a' }}>{(d?.input_tokens ?? 0).toLocaleString()}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Output tokens</span><span style={{ fontWeight: 700, color: '#0f172a' }}>{(d?.output_tokens ?? 0).toLocaleString()}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #e2e8f0' }}><span style={{ color: '#0f172a', fontWeight: 700 }}>Estimated cost</span><span style={{ fontWeight: 900, color: C, fontSize: 15 }}>${(d?.estimated_cost_usd ?? 0).toFixed(2)}</span></div>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '14px 0 0' }}>Estimate only, based on Claude Sonnet 5 standard rates ($3/1M input · $15/1M output tokens). Anthropic's own invoice is the authoritative cost.</p>
          </Card>

          {/* Enrollment Trend */}
          <Card title="Enrollment Trend (Last 6 Months)">
            {!data.enrollments_by_month?.length ? (
              <p style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center', margin: '20px 0' }}>No enrollment data yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.enrollments_by_month.map(m => {
                  const pct = Math.round((m.count / maxEnrollment) * 100)
                  return (
                    <div key={m.month} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#475569', width: 80, flexShrink: 0 }}>{m.month}</span>
                      <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 6, height: 28, overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg,#059669,#10b981)',
                          borderRadius: 6,
                          transition: 'width 0.6s ease',
                          minWidth: m.count > 0 ? 8 : 0,
                        }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', width: 28, textAlign: 'right', flexShrink: 0 }}>{m.count}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Program Completion Rates */}
          <Card title="Program Completion Rates">
            {!data.programs?.length ? (
              <p style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center', margin: '20px 0' }}>No program data yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {data.programs.map(p => (
                  <div key={p.title}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 12 }}>
                      <span style={{
                        fontSize: 13, fontWeight: 700, color: '#1e293b',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        flex: 1, minWidth: 0,
                      }}>
                        {p.title}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: C }}>{p.completion_rate}%</span>
                        <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {p.completed} completed / {p.enrolled} enrolled
                        </span>
                      </div>
                    </div>
                    <div style={{ background: '#f1f5f9', borderRadius: 50, height: 10, overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(p.completion_rate, 100)}%`,
                        height: '100%',
                        background: C,
                        borderRadius: 50,
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Mentor Leaderboard */}
          <Card title="Mentor Performance">
            {!sortedMentors.length ? (
              <p style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center', margin: '20px 0' }}>No mentor data yet</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Rank', 'Mentor Name', 'Sessions', 'Mentees', 'Avg Rating'].map(h => (
                        <th key={h} style={{
                          textAlign: 'left', padding: '10px 18px',
                          fontSize: 11, fontWeight: 700, color: '#64748b',
                          letterSpacing: '0.07em', textTransform: 'uppercase',
                          borderBottom: '1px solid #f1f5f9',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedMentors.map((m, i) => (
                      <tr
                        key={m.name}
                        style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f8fafc' }}
                      >
                        <td style={{ padding: '14px 18px', fontSize: 18 }}>
                          {medals[i] ?? <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>#{i + 1}</span>}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: `linear-gradient(135deg,${C},#10b981)`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0,
                            }}>
                              {m.name[0]}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{m.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{
                            fontSize: 13, fontWeight: 700, color: '#fff',
                            background: 'linear-gradient(135deg,#1d4ed8,#4f46e5)',
                            padding: '4px 12px', borderRadius: 50,
                          }}>
                            {m.sessions}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{m.mentees}</td>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 15 }}>⭐</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>
                              {m.avg_rating != null ? Number(m.avg_rating).toFixed(1) : '—'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

    </AdminLayout>
  )
}
