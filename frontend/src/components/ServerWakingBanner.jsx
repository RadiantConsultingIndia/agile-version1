import { useEffect, useState } from 'react'
import api from '../api/client'

const SLOW_THRESHOLD_MS = 4000

export default function ServerWakingBanner() {
  const [state, setState] = useState('idle') // idle | waking | online

  useEffect(() => {
    const timer = setTimeout(() => setState('waking'), SLOW_THRESHOLD_MS)

    api.get('/health')
      .then(() => {
        clearTimeout(timer)
        if (state === 'waking') {
          setState('online')
          setTimeout(() => setState('idle'), 2500)
        } else {
          setState('idle')
        }
      })
      .catch(() => {
        clearTimeout(timer)
        setState('idle')
      })

    return () => clearTimeout(timer)
  }, [])

  if (state === 'idle') return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 99999,
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      fontSize: 13,
      fontWeight: 600,
      fontFamily: 'inherit',
      background: state === 'online' ? '#f0fdf4' : '#fffbeb',
      borderBottom: `1px solid ${state === 'online' ? '#bbf7d0' : '#fde68a'}`,
      color: state === 'online' ? '#15803d' : '#92400e',
      transition: 'background 0.3s, color 0.3s',
    }}>
      {state === 'waking' ? (
        <>
          <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: 16 }}>⏳</span>
          Server is warming up, please wait a moment…
        </>
      ) : (
        <>✅ Server is ready!</>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
