import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const ROLES = ['Mentee', 'Mentor', 'Admin']

const LEFT_STATS = [
  { emoji: '🚀', label: 'Mentees', sub: 'Already learning on AgileMentor' },
  { emoji: '🎯', label: 'Live Sessions', sub: 'Every month across all programs' },
  { emoji: '🏆', label: 'Satisfaction', sub: 'From our mentee community', suffix: '%' },
]

const S = {
  page: { display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif" },
  row: { display: 'flex', flex: 1 },
  topbar: { display: 'flex', alignItems: 'center', padding: '14px 28px', background: '#fff', borderBottom: '1px solid #eef1f6' },
  left: { width: '45%', background: 'linear-gradient(160deg, #0c1a3d 0%, #0f2356 60%, #0c1a3d 100%)', padding: '64px 52px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  right: { flex: 1, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 40px' },
}


export default function Login() {
  const { role: paramRole } = useParams()
  const initRole = ROLES.find(r => r.toLowerCase() === paramRole) || 'Mentee'
  const [role, setRole] = useState(initRole)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [unverified, setUnverified] = useState(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(role.toLowerCase(), email, password)
      navigate(`/${user.role}/dashboard`)
    } catch (err) {
      const detail = err.response?.data?.detail || 'Invalid credentials. Please try again.'
      if (detail.includes('verify your email')) {
        setUnverified({
          userId: err.response?.headers?.['x-user-id'],
          email: err.response?.headers?.['x-user-email'] || email,
        })
      } else {
        setError(detail)
      }
    } finally {
      setLoading(false)
    }
  }

  if (unverified) {
    return (
      <div className="am-auth-page" style={S.page}>
        <TopBar />
        <div className="am-auth-row" style={S.row}>
          <LeftPanel />
          <div className="am-auth-right" style={S.right}>
            <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
              <div style={{ fontSize: 56, marginBottom: 20 }}>📬</div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Verify your email</h2>
              <p style={{ color: '#64748b', fontSize: 14, marginBottom: 32 }}>
                Your account isn't verified yet. Click below to enter your OTP.
              </p>
              <Link to={`/verify-email?user_id=${unverified.userId}&email=${encodeURIComponent(unverified.email)}`}
                style={{ display: 'inline-block', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', fontWeight: 700, fontSize: 14, padding: '13px 32px', borderRadius: 12, textDecoration: 'none' }}>
                Enter OTP →
              </Link>
              <p style={{ marginTop: 20, fontSize: 14, color: '#64748b' }}>
                <button onClick={() => setUnverified(null)} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>← Back to login</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="am-auth-page" style={S.page}>
      <TopBar />
      <div className="am-auth-row" style={S.row}>
        <LeftPanel />

        <div className="am-auth-right" style={S.right}>
          <div style={{ width: '100%', maxWidth: 460 }}>

          {/* Role tabs */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 14, padding: 5, marginBottom: 36 }}>
            {ROLES.map(r => (
              <button key={r} onClick={() => { setRole(r); setError('') }}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 600, transition: 'all 0.18s',
                  background: role === r ? '#fff' : 'transparent',
                  color: role === r ? '#0f172a' : '#94a3b8',
                  boxShadow: role === r ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                }}>
                {r}
              </button>
            ))}
          </div>

          {/* Heading */}
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            Sign in to AgileMentor
          </h2>
          <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 32px' }}>
            Logging in as <span style={{ color: '#2563eb', fontWeight: 700 }}>{role}</span>
          </p>

          {/* Error */}
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
              <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>⚠ {error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 7 }}>
                Email Address
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@gmail.com"
                style={{ width: '100%', padding: '13px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#0f172a', outline: 'none', boxSizing: 'border-box', background: '#fafafa' }}
                onFocus={e => e.target.style.borderColor = '#2563eb'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 7 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="Enter your password"
                  style={{ width: '100%', padding: '13px 46px 13px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#0f172a', outline: 'none', boxSizing: 'border-box', background: '#fafafa' }}
                  onFocus={e => e.target.style.borderColor = '#2563eb'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18, lineHeight: 1 }}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Forgot */}
            <div style={{ textAlign: 'right', marginBottom: 28 }}>
              <Link to="/forgot-password" style={{ color: '#2563eb', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '15px', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? '#93c5fd' : 'linear-gradient(135deg,#2563eb,#1d4ed8)',
                color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '0.01em',
                boxShadow: loading ? 'none' : '0 6px 20px rgba(37,99,235,0.4)',
              }}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '24px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            <span style={{ color: '#94a3b8', fontSize: 13 }}>or</span>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          </div>

          {role !== 'Admin' ? (
            <p style={{ textAlign: 'center', fontSize: 14, color: '#64748b' }}>
              Don't have an account?{' '}
              <Link to={`/signup/${role.toLowerCase()}`} style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>
                Create one for free
              </Link>
            </p>
          ) : (
            <p style={{ textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
              Admin accounts are created by the platform team.
            </p>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TopBar() {
  return (
    <div style={S.topbar}>
      <Link to="/" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        color: '#475569', fontSize: 13.5, fontWeight: 600, textDecoration: 'none',
        padding: '6px 10px', borderRadius: 8, transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569' }}
      >
        ← Home
      </Link>
    </div>
  )
}

function LeftPanel() {
  return (
    <div className="am-auth-left" style={S.left}>
      {/* bg glow */}
      <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(59,130,246,0.18),transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -60, left: '20%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.12),transparent 70%)', pointerEvents: 'none' }} />

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 52, position: 'relative' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#2563eb,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37,99,235,0.4)' }}>
          <svg viewBox="0 0 32 28" width="20" height="20" fill="none">
            <path d="M2 18 Q6 4 12 14 Q16 20 20 8 Q24 0 30 12" stroke="white" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>
        <span style={{ fontSize: 18, fontWeight: 800 }}>
          <span style={{ color: '#fff' }}>Agile</span>
          <span style={{ color: '#60a5fa' }}>Mentor</span>
        </span>
      </div>

      {/* Badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 50, padding: '7px 16px', marginBottom: 28, alignSelf: 'flex-start' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#60a5fa', display: 'inline-block' }} />
        <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>Welcome Back</span>
      </div>

      <h1 style={{ fontSize: 38, fontWeight: 900, color: '#fff', lineHeight: 1.15, margin: '0 0 16px', letterSpacing: '-0.5px' }}>
        Continue your{' '}
        <span style={{ color: '#60a5fa' }}>Agile</span>
        {' '}journey today.
      </h1>

      <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.7, margin: '0 0 44px', maxWidth: 340 }}>
        Access your programs, sessions, and mentors — all in one place.
      </p>

      {/* Stat cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {LEFT_STATS.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '16px 20px' }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(135deg,#1d4ed8,#4338ca)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, boxShadow: '0 4px 12px rgba(29,78,216,0.4)' }}>
              {s.emoji}
            </div>
            <div>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: '0 0 2px' }}>-- {s.label}</p>
              <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>{s.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
