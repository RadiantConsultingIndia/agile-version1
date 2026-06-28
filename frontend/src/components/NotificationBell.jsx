import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

const TYPE_COLORS = {
  enrollment_approved: '#059669',
  enrollment_rejected: '#dc2626',
  cert_ready:          '#d97706',
  new_session:         '#4f46e5',
  default:             '#64748b',
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60)        return 'just now'
  if (diff < 3600)      return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)     return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function NotificationBell({ accentColor }) {
  const [notifications, setNotifications] = useState([])
  const [open, setOpen]                   = useState(false)
  const [loading, setLoading]             = useState(false)
  const wrapperRef                        = useRef(null)
  const navigate                          = useNavigate()

  const unread = notifications.filter(n => !n.is_read).length

  async function fetchNotifications() {
    try {
      const res = await api.get('/api/notifications')
      setNotifications(res.data?.notifications ?? res.data ?? [])
    } catch {
      // silently ignore — bell should never crash the layout
    }
  }

  useEffect(() => {
    fetchNotifications()
    const id = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(id)
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open])

  async function markAllRead() {
    try {
      await api.post('/api/notifications/read-all')
      await fetchNotifications()
    } catch {/* ignore */}
  }

  async function handleNotificationClick(n) {
    try {
      if (!n.is_read) {
        await api.post(`/api/notifications/${n.notification_id}/read`)
        setNotifications(prev =>
          prev.map(x => x.notification_id === n.notification_id ? { ...x, is_read: true } : x)
        )
      }
    } catch {/* ignore */}
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 6px',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = accentColor }}
        onMouseLeave={e => { e.currentTarget.style.color = '#64748b' }}
        aria-label="Notifications"
      >
        {/* Bell SVG */}
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>

        {/* Unread badge */}
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: 1,
            right: 1,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            background: '#ef4444',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
            lineHeight: 1,
            border: '2px solid #fff',
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'fixed',
          top: 60,
          right: 12,
          width: 'min(340px, calc(100vw - 24px))',
          background: '#fff',
          borderRadius: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
          zIndex: 1000,
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid #f1f5f9',
          }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
              Notifications
            </span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  color: accentColor,
                  padding: '3px 8px',
                  borderRadius: 6,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 'min(340px, 60vh)', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {notifications.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                color: '#94a3b8',
                fontSize: 13,
                gap: 8,
              }}>
                <span style={{ fontSize: 28 }}>🔔</span>
                <span>No notifications yet</span>
              </div>
            ) : (
              notifications.map(n => {
                const color = TYPE_COLORS[n.notif_type] ?? TYPE_COLORS.default
                return (
                  <div
                    key={n.notification_id}
                    onClick={() => handleNotificationClick(n)}
                    style={{
                      display: 'flex',
                      gap: 0,
                      cursor: 'pointer',
                      background: n.is_read ? '#fff' : '#f8fafc',
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9' }}
                    onMouseLeave={e => { e.currentTarget.style.background = n.is_read ? '#fff' : '#f8fafc' }}
                  >
                    {/* Colored left border */}
                    <div style={{ width: 4, minWidth: 4, background: color, borderRadius: '0 0 0 0', flexShrink: 0 }} />

                    <div style={{ padding: '10px 14px', flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: n.is_read ? 500 : 700,
                        fontSize: 13,
                        color: '#1e293b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: 2,
                      }}>
                        {n.title}
                      </div>
                      {n.message && (
                        <div style={{
                          fontSize: 12,
                          color: '#64748b',
                          marginBottom: 4,
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>
                          {n.message}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>
                        {timeAgo(n.created_at)}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
