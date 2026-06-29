import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/api/auth/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'inherit',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        padding: '40px 36px',
        width: '100%',
        maxWidth: 420,
        boxSizing: 'border-box',
      }}>

        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
          }}>🔑</div>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', textAlign: 'center', letterSpacing: '-0.4px' }}>
          Forgot Password?
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 28px', textAlign: 'center', lineHeight: 1.5 }}>
          Enter your email and we'll send you a reset link
        </p>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✉️</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Check your inbox!</p>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 28px', lineHeight: 1.6 }}>
              If that email is registered, you'll receive a reset link shortly. Check your spam folder too.
            </p>
            <Link to="/login/mentee" style={{
              display: 'block', textAlign: 'center', padding: '13px 0',
              borderRadius: 12, textDecoration: 'none', fontSize: 14,
              fontWeight: 700, color: '#fff',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
            }}>
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>

            {/* Error message */}
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: '#dc2626', margin: 0, fontWeight: 600 }}>❌ {error}</p>
              </div>
            )}

            {/* Email field */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.02em' }}>
                EMAIL ADDRESS
              </label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: '100%', padding: '13px 14px', borderRadius: 12,
                  border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1e293b',
                  outline: 'none', background: '#fafafa', boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            {/* Submit button */}
            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
                fontSize: 14, fontWeight: 700, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? '#a5b4fc' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
                fontFamily: 'inherit', transition: '0.15s',
              }}
            >
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#94a3b8', margin: '20px 0 0' }}>
              Remember your password?{' '}
              <Link to="/login/mentee" style={{ color: '#6366f1', fontWeight: 700, textDecoration: 'none' }}>
                Back to Login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
