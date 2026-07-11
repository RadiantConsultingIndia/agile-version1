import { useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../../api/client'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const userId = params.get('user_id')
  const email = decodeURIComponent(params.get('email') || '')
  const navigate = useNavigate()

  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const inputs = useRef([])

  const otp = digits.join('')

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...digits]
    next[i] = val
    setDigits(next)
    if (val && i < 5) inputs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus()
    }
  }

  const handlePaste = e => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const next = [...digits]
    for (let i = 0; i < 6; i++) next[i] = text[i] || ''
    setDigits(next)
    inputs.current[Math.min(text.length, 5)]?.focus()
  }

  const handleVerify = async e => {
    e.preventDefault()
    if (otp.length < 6) { setError('Please enter the full 6-digit OTP.'); return }
    setError(''); setLoading(true)
    try {
      const res = await api.post('/api/auth/verify-email', { user_id: userId, otp_code: otp })
      navigate(`/login/${res.data.role}?verified=1`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP. Please try again.')
      setDigits(['', '', '', '', '', ''])
      inputs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError(''); setSuccess(''); setResending(true)
    try {
      await api.post('/api/auth/resend-otp', { user_id: userId })
      setSuccess('A new OTP has been sent to your email.')
      setDigits(['', '', '', '', '', ''])
      inputs.current[0]?.focus()
    } catch {
      setError('Failed to resend OTP. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @media (max-width: 768px) {
          .verify-left { display: none !important; }
          .verify-right { padding: 32px 20px !important; }
        }
      `}</style>

      {/* Left decorative panel */}
      <div className="verify-left" style={{ width: '45%', background: 'linear-gradient(160deg, var(--brand-navy-deep) 0%, var(--brand-navy) 60%, var(--brand-navy-deep) 100%)', padding: '64px 52px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(59,130,246,0.18),transparent 70%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 56, position: 'relative' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,var(--brand-navy),#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37,99,235,0.4)' }}>
            <svg viewBox="0 0 32 28" width="20" height="20" fill="none">
              <path d="M2 18 Q6 4 12 14 Q16 20 20 8 Q24 0 30 12" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontSize: 18, fontWeight: 800 }}>
            <span style={{ color: '#fff' }}>Agile</span>
            <span style={{ color: '#60a5fa' }}>Mentor</span>
          </span>
        </div>

        {/* Big mail icon */}
        <div style={{ fontSize: 80, marginBottom: 32, lineHeight: 1 }}>📬</div>

        <h1 style={{ fontSize: 36, fontWeight: 900, color: '#fff', lineHeight: 1.15, margin: '0 0 16px', letterSpacing: '-0.5px' }}>
          One last step to{' '}
          <span style={{ color: '#60a5fa' }}>get started.</span>
        </h1>

        <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.7, margin: '0 0 40px', maxWidth: 340 }}>
          We sent a 6-digit verification code to your email address. Enter it on the right to activate your account.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { emoji: '🔐', label: 'Secure Verification', sub: 'OTP expires in 10 minutes' },
            { emoji: '📧', label: 'Check your inbox', sub: `Sent to ${email || 'your email'}` },
            { emoji: '🔄', label: 'Didn\'t get it?', sub: 'Use the resend button on the right' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '14px 18px' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,var(--brand-navy),var(--brand-navy-deep))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                {s.emoji}
              </div>
              <div>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: '0 0 2px' }}>{s.label}</p>
                <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — OTP form */}
      <div className="verify-right" style={{ flex: 1, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 40px' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>

          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
            Verify Your Email
          </h2>
          <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 8px' }}>
            Enter the 6-digit code sent to:
          </p>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--brand-teal-deep)', margin: '0 0 36px', wordBreak: 'break-all' }}>
            {email || 'your email address'}
          </p>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 24 }}>
              <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>⚠ {error}</p>
            </div>
          )}
          {success && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', marginBottom: 24 }}>
              <p style={{ color: '#16a34a', fontSize: 13, margin: 0 }}>✓ {success}</p>
            </div>
          )}

          <form onSubmit={handleVerify}>
            {/* 6 individual digit boxes */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 32, justifyContent: 'center' }} onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input key={i} ref={el => inputs.current[i] = el}
                  type="text" inputMode="numeric" maxLength={1}
                  value={d}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  style={{
                    width: 'clamp(40px, 13vw, 58px)', height: 'clamp(48px, 15vw, 66px)',
                    textAlign: 'center', fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: 800,
                    borderRadius: 12, outline: 'none', boxSizing: 'border-box',
                    border: d ? '2px solid var(--brand-teal)' : '2px solid #e2e8f0',
                    background: d ? '#eff6ff' : '#fafafa',
                    color: '#0f172a', fontFamily: "'Courier New', monospace",
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                />
              ))}
            </div>

            <button type="submit" disabled={loading || otp.length < 6}
              style={{
                width: '100%', padding: '15px', borderRadius: 12, border: 'none',
                cursor: (loading || otp.length < 6) ? 'not-allowed' : 'pointer',
                background: (loading || otp.length < 6) ? '#93c5fd' : 'linear-gradient(135deg,var(--brand-navy),var(--brand-navy-deep))',
                color: '#fff', fontSize: 15, fontWeight: 700,
                boxShadow: (loading || otp.length < 6) ? 'none' : '0 6px 20px rgba(37,99,235,0.4)',
              }}>
              {loading ? 'Verifying…' : 'Verify & Activate Account →'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 12px' }}>Didn't receive the code?</p>
            <button onClick={handleResend} disabled={resending}
              style={{ background: 'none', border: '1.5px solid #bfdbfe', color: 'var(--brand-teal-deep)', fontSize: 14, fontWeight: 600, padding: '10px 24px', borderRadius: 10, cursor: resending ? 'not-allowed' : 'pointer', opacity: resending ? 0.6 : 1 }}>
              {resending ? 'Resending…' : '↺ Resend OTP'}
            </button>
          </div>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#94a3b8', marginTop: 24 }}>
            Wrong email?{' '}
            <a href="/signup/mentee" style={{ color: 'var(--brand-teal-deep)', fontWeight: 600, textDecoration: 'none' }}>
              Start over
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
