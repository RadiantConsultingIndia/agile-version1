import { useEffect, useState, useRef, useCallback } from 'react'
import MenteeLayout from '../../components/layouts/MenteeLayout'
import api from '../../api/client'

// ─── URL helpers ─────────────────────────────────────────────────────────────
const isYouTube = url => /youtube\.com|youtu\.be/.test(url || '')

const toYTEmbed = url => {
  const m = (url || '').match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return m ? `https://www.youtube.com/embed/${m[1]}?enablejsapi=1&origin=${window.location.origin}` : null
}

// ─── Video Modal ──────────────────────────────────────────────────────────────
function VideoModal({ session, initialProgress, onClose, onProgressUpdate }) {
  const videoRef       = useRef(null)
  const ytRef          = useRef(null)
  const segStart       = useRef(null)
  const flushTimer     = useRef(null)
  const localTimer     = useRef(null)
  const videoDurRef    = useRef(0)
  const localSecsRef   = useRef(0)

  // displayPct updates every second via local timer — no server roundtrip needed
  const [displayPct,  setDisplayPct]  = useState(initialProgress?.percent ?? 0)
  const [isComplete,  setIsComplete]  = useState(initialProgress?.is_complete ?? false)
  const serverTotal = useRef(initialProgress?.total_watched ?? 0)

  const isYT     = isYouTube(session.video_url)
  const embedUrl = isYT ? toYTEmbed(session.video_url) : null

  // Recompute display percent using local seconds + server total_watched
  const refreshDisplay = useCallback(() => {
    const dur = videoDurRef.current
    if (dur > 0) {
      const pct = Math.min(100, ((serverTotal.current + localSecsRef.current) / dur) * 100)
      setDisplayPct(pct)
    }
  }, [])

  const startLocalTimer = useCallback(() => {
    clearInterval(localTimer.current)
    localTimer.current = setInterval(() => {
      localSecsRef.current += 1
      refreshDisplay()
    }, 1000)
  }, [refreshDisplay])

  const stopLocalTimer = useCallback(() => {
    clearInterval(localTimer.current)
  }, [])

  const sendSegment = useCallback(async (start, end) => {
    if (end == null || start == null || end <= start + 0.5) return
    try {
      const r = await api.post('/api/video/progress', {
        session_id: session.session_id,
        start: Math.round(start),
        end:   Math.round(end),
        video_duration_seconds: videoDurRef.current
      })
      serverTotal.current = r.data.total_watched ?? serverTotal.current
      localSecsRef.current = 0   // reset local counter — server now knows the real total
      if (r.data.is_complete) setIsComplete(true)
      // Update the card's progress bar via parent state
      onProgressUpdate(session.session_id, r.data)
      refreshDisplay()
    } catch (err) {
      console.error('Video progress save failed:', err?.response?.data ?? err.message)
    }
  }, [session.session_id, onProgressUpdate, refreshDisplay])

  // ── HTML5 video handlers ─────────────────────────────────────────────────
  const onLoadedMetadata = useCallback(() => {
    videoDurRef.current = videoRef.current?.duration ?? 0
    refreshDisplay()
  }, [refreshDisplay])

  const onPlay = useCallback(() => {
    segStart.current = videoRef.current?.currentTime ?? 0
    startLocalTimer()
    // Flush every 10 s while playing
    flushTimer.current = setInterval(() => {
      const cur = videoRef.current?.currentTime ?? 0
      if (segStart.current !== null) {
        sendSegment(segStart.current, cur)
        segStart.current = cur
      }
    }, 10000)
  }, [startLocalTimer, sendSegment])

  const onPauseOrEnd = useCallback(() => {
    stopLocalTimer()
    clearInterval(flushTimer.current)
    const cur = videoRef.current?.currentTime ?? 0
    if (segStart.current !== null) { sendSegment(segStart.current, cur); segStart.current = null }
  }, [stopLocalTimer, sendSegment])

  // ── YouTube IFrame API ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isYT) return

    const setupPlayer = () => {
      ytRef.current = new window.YT.Player('yt-embed', {
        events: {
          onReady: () => {
            videoDurRef.current = ytRef.current.getDuration() || 0
            refreshDisplay()
          },
          onStateChange: e => {
            const S = window.YT.PlayerState
            if (e.data === S.PLAYING) {
              if (!videoDurRef.current) {
                videoDurRef.current = ytRef.current.getDuration() || 0
                refreshDisplay()
              }
              segStart.current = ytRef.current.getCurrentTime()
              startLocalTimer()
              flushTimer.current = setInterval(() => {
                const cur = ytRef.current?.getCurrentTime?.() ?? 0
                if (segStart.current !== null) {
                  sendSegment(segStart.current, cur)
                  segStart.current = cur
                }
              }, 10000)
            } else if (e.data === S.PAUSED || e.data === S.ENDED) {
              clearInterval(flushTimer.current)
              stopLocalTimer()
              const cur = ytRef.current?.getCurrentTime?.() ?? 0
              if (segStart.current !== null) { sendSegment(segStart.current, cur); segStart.current = null }
            }
          }
        }
      })
    }

    if (window.YT?.Player) {
      setupPlayer()
    } else {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); setupPlayer() }
      if (!document.getElementById('yt-api-script')) {
        const s = document.createElement('script')
        s.id  = 'yt-api-script'
        s.src = 'https://www.youtube.com/iframe_api'
        document.body.appendChild(s)
      }
    }

    return () => {
      clearInterval(flushTimer.current)
      clearInterval(localTimer.current)
      const cur = ytRef.current?.getCurrentTime?.() ?? 0
      if (segStart.current !== null && cur > segStart.current) sendSegment(segStart.current, cur)
    }
  }, [isYT, sendSegment, startLocalTimer, stopLocalTimer, refreshDisplay])

  // Cleanup for direct video on modal close
  useEffect(() => {
    if (isYT) return
    return () => {
      clearInterval(flushTimer.current)
      clearInterval(localTimer.current)
      const cur = videoRef.current?.currentTime ?? 0
      if (segStart.current !== null && cur > segStart.current) sendSegment(segStart.current, cur)
    }
  }, [isYT, sendSegment])

  const pctDisplay = displayPct >= 1 ? Math.round(displayPct) : displayPct > 0 ? displayPct.toFixed(1) : 0

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 1000,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 820,
                    boxShadow: '0 24px 72px rgba(0,0,0,0.5)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{session.title}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>{session.program_title}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isComplete && (
              <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d',
                             background: '#f0fdf4', padding: '4px 12px', borderRadius: 50 }}>
                ✓ Completed
              </span>
            )}
            <button onClick={onClose}
              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0',
                       background: '#f8fafc', cursor: 'pointer', fontSize: 16,
                       display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ✕
            </button>
          </div>
        </div>

        {/* Player */}
        <div style={{ aspectRatio: '16/9', background: '#000' }}>
          {isYT && embedUrl ? (
            <iframe id="yt-embed" src={embedUrl}
              style={{ width: '100%', height: '100%', border: 'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen />
          ) : session.video_url ? (
            <video ref={videoRef} src={session.video_url} controls
              style={{ width: '100%', height: '100%' }}
              onLoadedMetadata={onLoadedMetadata}
              onPlay={onPlay} onPause={onPauseOrEnd} onEnded={onPauseOrEnd} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                          height: '100%', color: '#94a3b8', fontSize: 14 }}>
              No video URL set for this session.
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Watch progress</span>
            <span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 700 }}>{pctDisplay}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99,
                          width: `${Math.max(displayPct > 0 ? 1.5 : 0, displayPct)}%`,
                          background: isComplete ? '#16a34a' : 'linear-gradient(90deg,#7c3aed,#a855f7)',
                          transition: 'width 1s linear' }} />
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 11, color: '#94a3b8' }}>
            {isComplete
              ? 'You\'ve completed this recording. Certificate check is automatic.'
              : 'Watch at least 95% to mark this session complete.'}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MenteeSessions() {
  const [sessions,   setSessions]   = useState([])
  const [joining,    setJoining]    = useState(null)
  const [progress,   setProgress]   = useState({})   // session_id → {percent, is_complete}
  const [watchModal, setWatchModal] = useState(null)  // session object

  useEffect(() => {
    api.get('/api/mentee/sessions').then(r => {
      const data = r.data
      setSessions(data)
      const recorded = data.filter(s => s.session_type === 'recorded' && !s.access_locked)
      Promise.all(
        recorded.map(s =>
          api.get(`/api/video/progress/${s.session_id}`)
            .then(pr => [s.session_id, pr.data])
            .catch(() => null)
        )
      ).then(results => {
        const map = {}
        results.filter(Boolean).forEach(([id, d]) => { map[id] = d })
        setProgress(map)
      })
    })
  }, [])

  const handleJoin = async id => {
    setJoining(id)
    try {
      await api.post(`/api/session/${id}/join`)
      setSessions(s => s.map(x => x.session_id === id ? { ...x, joined: true } : x))
    } finally { setJoining(null) }
  }

  const handleProgressUpdate = useCallback((sessionId, data) => {
    setProgress(prev => ({ ...prev, [sessionId]: data }))
  }, [])

  const now      = new Date()
  const live     = sessions.filter(s => s.status === 'live')
  const upcoming = sessions.filter(s => s.scheduled_at && new Date(s.scheduled_at) > now && s.session_type === 'live' && s.status !== 'live')
  const recorded = sessions.filter(s => s.session_type === 'recorded')
  const past     = sessions.filter(s => s.session_type === 'live' && s.scheduled_at && new Date(s.scheduled_at) <= now && s.status !== 'live')

  const Card = ({ s }) => {
    const isLive    = s.status === 'live'
    const isRec     = s.session_type === 'recorded'
    const isLocked  = !!s.access_locked
    const prog      = isRec ? (progress[s.session_id] ?? null) : null
    const pct       = prog?.percent ?? 0
    const isDone    = prog?.is_complete ?? s.is_completed ?? false

    return (
      <div style={{ background: '#fff', borderRadius: 14,
                    border: isLive ? '2px solid #a78bfa' : '1px solid #f1f5f9',
                    boxShadow: isLive ? '0 4px 16px rgba(124,58,237,0.12)' : '0 1px 6px rgba(0,0,0,0.05)',
                    padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12,
                    opacity: isLocked ? 0.85 : 1 }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                        background: isLocked ? '#f1f5f9' : isLive ? '#ede9fe' : isRec ? '#f5f3ff' : '#eff6ff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            {isLocked ? '🔒' : isDone ? '✅' : isLive ? '🔴' : isRec ? '📹' : '🎥'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: isLocked ? '#94a3b8' : '#1e293b',
                        margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.title}
            </p>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{s.program_title}</p>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 50, flexShrink: 0,
            background: isLocked ? '#fffbeb' : isDone ? '#f0fdf4' : isLive ? '#ede9fe' : isRec ? '#f5f3ff' : '#eff6ff',
            color:      isLocked ? '#92400e' : isDone ? '#15803d' : isLive ? '#7c3aed' : isRec ? '#6d28d9' : '#1d4ed8' }}>
            {isLocked ? '⏳ Pending' : isDone ? '✓ Done' : isLive ? '🔴 Live' : isRec ? 'Recorded' : 'Upcoming'}
          </span>
        </div>

        {s.scheduled_at && (
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
            📅 {new Date(s.scheduled_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        )}

        {/* Watch progress bar for recorded sessions */}
        {isRec && !isLocked && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: '#64748b' }}>Watch progress</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: isDone ? '#15803d' : '#7c3aed' }}>
                {pct.toFixed(0)}%
              </span>
            </div>
            <div style={{ height: 5, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`,
                            background: isDone ? '#16a34a' : 'linear-gradient(90deg,#7c3aed,#a855f7)',
                            transition: 'width 0.4s ease' }} />
            </div>
          </div>
        )}

        {isLocked ? (
          <div style={{ padding: '10px 14px', borderRadius: 9, background: '#fffbeb',
                        border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>🔒</span>
            <span style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>Access unlocks after admin approval</span>
          </div>
        ) : (
          <>
            {s.session_type === 'live' && s.meeting_link && (
              <div style={{ display: 'flex', gap: 10 }}>
                <a href={s.meeting_link} target="_blank" rel="noreferrer"
                  style={{ flex: 1, textDecoration: 'none', textAlign: 'center', padding: '9px 0',
                           borderRadius: 9, fontSize: 12, fontWeight: 700, color: '#fff',
                           background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                           boxShadow: '0 3px 10px rgba(124,58,237,0.35)' }}>
                  Join Meeting →
                </a>
                {!s.joined && (
                  <button onClick={() => handleJoin(s.session_id)} disabled={joining === s.session_id}
                    style={{ padding: '9px 16px', borderRadius: 9, border: '1.5px solid #a78bfa',
                             fontSize: 12, fontWeight: 600, color: '#7c3aed', background: '#fff',
                             cursor: joining === s.session_id ? 'not-allowed' : 'pointer' }}>
                    {joining === s.session_id ? '…' : 'Mark Joined'}
                  </button>
                )}
                {s.joined && (
                  <span style={{ padding: '9px 16px', fontSize: 12, fontWeight: 700, color: '#15803d' }}>
                    ✓ Joined
                  </span>
                )}
              </div>
            )}
            {isRec && s.video_url && (
              <button onClick={() => setWatchModal(s)}
                style={{ width: '100%', padding: '9px 0', borderRadius: 9, border: 'none',
                         fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer',
                         background: isDone
                           ? 'linear-gradient(135deg,#15803d,#16a34a)'
                           : 'linear-gradient(135deg,#6d28d9,#7c3aed)' }}>
                {isDone ? '▶ Rewatch' : pct > 0 ? `▶ Continue (${pct.toFixed(0)}%)` : '▶ Watch Now'}
              </button>
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
        <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', color: '#475569',
                     margin: 0, textTransform: 'uppercase' }}>{title}</h2>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff',
                       padding: '2px 10px', borderRadius: 50 }}>{items.length}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
        {items.map(s => <Card key={s.session_id} s={s} />)}
      </div>
    </div>
  )

  return (
    <MenteeLayout>
      {watchModal && (
        <VideoModal
          session={watchModal}
          initialProgress={progress[watchModal.session_id] ?? null}
          onClose={() => setWatchModal(null)}
          onProgressUpdate={handleProgressUpdate}
        />
      )}

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
          My <span style={{ color: '#7c3aed' }}>Sessions</span>
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
          Join live sessions, watch recordings, and track your learning.
        </p>
      </div>

      {sessions.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9',
                      boxShadow: '0 1px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', padding: '80px 40px', textAlign: 'center' }}>
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
