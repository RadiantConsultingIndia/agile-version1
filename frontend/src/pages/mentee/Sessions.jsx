import { useEffect, useState } from 'react'
import MenteeLayout from '../../components/layouts/MenteeLayout'
import api from '../../api/client'

export default function MenteeSessions() {
  const [sessions, setSessions] = useState([])
  const [joining, setJoining] = useState(null)

  useEffect(() => { api.get('/api/mentee/sessions').then(r => setSessions(r.data)) }, [])

  const handleJoin = async id => {
    setJoining(id)
    try {
      await api.post(`/api/session/${id}/join`)
      setSessions(s => s.map(x => x.session_id === id ? { ...x, joined: true } : x))
    } finally { setJoining(null) }
  }

  const now = new Date()
  const live     = sessions.filter(s => s.status === 'live')
  const upcoming = sessions.filter(s => s.scheduled_at && new Date(s.scheduled_at) > now && s.session_type === 'live' && s.status !== 'live')
  const recorded = sessions.filter(s => s.session_type === 'recorded')
  const past     = sessions.filter(s => s.session_type === 'live' && s.scheduled_at && new Date(s.scheduled_at) <= now && s.status !== 'live')

  const Card = ({ s }) => {
    const isLive   = s.status === 'live'
    const isRec    = s.session_type === 'recorded'
    const isLocked = !!s.access_locked
    return (
      <div style={{ background: '#fff', borderRadius: 14, border: isLive ? '2px solid #a78bfa' : '1px solid #f1f5f9', boxShadow: isLive ? '0 4px 16px rgba(124,58,237,0.12)' : '0 1px 6px rgba(0,0,0,0.05)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, opacity: isLocked ? 0.85 : 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: isLocked ? '#f1f5f9' : isLive ? '#ede9fe' : isRec ? '#f5f3ff' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
            {isLocked ? '🔒' : isLive ? '🔴' : isRec ? '📹' : '🎥'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: isLocked ? '#94a3b8' : '#1e293b', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</p>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{s.program_title}</p>
          </div>
          {isLocked ? (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 50, flexShrink: 0, background: '#fffbeb', color: '#92400e' }}>
              ⏳ Pending
            </span>
          ) : (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 50, flexShrink: 0,
              background: isLive ? '#ede9fe' : isRec ? '#f5f3ff' : '#eff6ff',
              color:      isLive ? '#7c3aed' : isRec ? '#6d28d9' : '#1d4ed8' }}>
              {isLive ? '🔴 Live' : isRec ? 'Recorded' : 'Upcoming'}
            </span>
          )}
        </div>
        {s.scheduled_at && (
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
            📅 {new Date(s.scheduled_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        )}
        {isLocked ? (
          <div style={{ padding: '10px 14px', borderRadius: 9, background: '#fffbeb', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>🔒</span>
            <span style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>Access unlocks after admin approval</span>
          </div>
        ) : (
          <>
            {s.session_type === 'live' && s.meeting_link && (
              <div style={{ display: 'flex', gap: 10 }}>
                <a href={s.meeting_link} target="_blank" rel="noreferrer"
                  style={{ flex: 1, textDecoration: 'none', textAlign: 'center', padding: '9px 0', borderRadius: 9, fontSize: 12, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 3px 10px rgba(124,58,237,0.35)' }}>
                  Join Meeting →
                </a>
                {!s.joined && (
                  <button onClick={() => handleJoin(s.session_id)} disabled={joining === s.session_id}
                    style={{ padding: '9px 16px', borderRadius: 9, border: '1.5px solid #a78bfa', fontSize: 12, fontWeight: 600, color: '#7c3aed', background: '#fff', cursor: joining === s.session_id ? 'not-allowed' : 'pointer' }}>
                    {joining === s.session_id ? '…' : 'Mark Joined'}
                  </button>
                )}
                {s.joined && (
                  <span style={{ padding: '9px 16px', fontSize: 12, fontWeight: 700, color: '#15803d' }}>✓ Joined</span>
                )}
              </div>
            )}
            {isRec && s.video_url && (
              <a href={s.video_url} target="_blank" rel="noreferrer"
                style={{ textDecoration: 'none', textAlign: 'center', padding: '9px 0', borderRadius: 9, fontSize: 12, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#6d28d9,#7c3aed)' }}>
                Watch Recording →
              </a>
            )}
          </>
        )}
      </div>
    )
  }

  const Section = ({ title, icon, items }) => items.length === 0 ? null : (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', color: '#475569', margin: 0, textTransform: 'uppercase' }}>{title}</h2>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', padding: '2px 10px', borderRadius: 50 }}>{items.length}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
        {items.map(s => <Card key={s.session_id} s={s} />)}
      </div>
    </div>
  )

  return (
    <MenteeLayout>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
          My <span style={{ color: '#7c3aed' }}>Sessions</span>
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Join live sessions, watch recordings, and track your learning.</p>
      </div>

      {sessions.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', boxShadow: '0 1px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 16, lineHeight: 1 }}>🎬</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 6px' }}>No sessions yet</p>
          <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>Enroll in a program to see sessions here.</p>
        </div>
      ) : (
        <>
          <Section title="Live Now"        icon="🔴" items={live} />
          <Section title="Upcoming"        icon="📅" items={upcoming} />
          <Section title="Recorded Videos" icon="📹" items={recorded} />
          <Section title="Past Sessions"   icon="🕐" items={past} />
        </>
      )}
    </MenteeLayout>
  )
}
