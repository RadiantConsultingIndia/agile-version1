import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../../api/client'

export default function ResetPassword() {
  const [params]  = useSearchParams()
  const token     = params.get('token')
  const navigate  = useNavigate()
  const [form,    setForm]    = useState({ password: '', confirm_password: '' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const f = key => e => setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const res = await api.post('/api/auth/reset-password', { token, ...form })
      navigate(`/login/${res.data.role}?reset=success`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  const inp = {
    width: '100%', padding: '13px 14px', borderRadius: 12,
    border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1e293b',
    outline: 'none', background: '#fafafa', boxSizing: 'border-box',
    fontFamily: 'inherit',
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
          }}>🔒</div>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', textAlign: 'center', letterSpacing: '-0.4px' }}>
          Reset Password
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 28px', textAlign: 'center' }}>
          Enter your new password below
        </p>

        {/* Error */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: '#dc2626', margin: 0, fontWeight: 600 }}>❌ {error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* New password */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.02em' }}>
              NEW PASSWORD
            </label>
            <input
              type="password" required value={form.password}
              onChange={f('password')}
              placeholder="Min 6 chars, start with capital"
              style={inp}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          {/* Confirm password */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.02em' }}>
              CONFIRM PASSWORD
            </label>
            <input
              type="password" required value={form.confirm_password}
              onChange={f('confirm_password')}
              placeholder="Repeat your password"
              style={inp}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

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
            {loading ? 'Resetting…' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
