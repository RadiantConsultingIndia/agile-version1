import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../../api/client'

const ROLES = ['Mentee', 'Mentor']

const LEFT_CONTENT = {
  Mentee: {
    badge: 'Start Your Journey',
    headline: 'Learn Agile from the\nbest in the industry.',
    sub: 'Join thousands of learners who have accelerated their careers with expert mentorship.',
    cards: [
      { emoji: '🎯', label: 'Personalized Mentorship', sub: 'Matched to your goals and experience' },
      { emoji: '📅', label: 'Live Weekly Sessions', sub: 'Join real Agile sprints and retrospectives' },
      { emoji: '🏆', label: 'Earn Certificates', sub: 'Recognized by top product companies' },
    ],
  },
  Mentor: {
    badge: 'Become a Mentor',
    headline: 'Share your expertise,\ngrow your impact.',
    sub: 'Guide the next generation of Agile professionals and build your personal brand.',
    cards: [
      { emoji: '💼', label: 'Invite-Only Platform', sub: 'Curated community of top professionals' },
      { emoji: '🤝', label: 'Flexible Scheduling', sub: 'Mentor on your own terms' },
      { emoji: '⭐', label: 'Build Your Profile', sub: 'Get reviews and recognition' },
    ],
  },
}

function LeftPanel({ role }) {
  const c = LEFT_CONTENT[role] || LEFT_CONTENT.Mentee
  return (
    <div className="am-auth-left" style={{ width: '45%', background: 'linear-gradient(160deg, var(--brand-navy-deep) 0%, var(--brand-navy) 60%, var(--brand-navy-deep) 100%)', padding: '64px 52px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(59,130,246,0.18),transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -60, left: '20%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.12),transparent 70%)', pointerEvents: 'none' }} />

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 52, position: 'relative' }}>
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

      {/* Badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 50, padding: '7px 16px', marginBottom: 28, alignSelf: 'flex-start' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
        <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{c.badge}</span>
      </div>

      <h1 style={{ fontSize: 36, fontWeight: 900, color: '#fff', lineHeight: 1.18, margin: '0 0 16px', letterSpacing: '-0.5px', whiteSpace: 'pre-line' }}>
        {c.headline.split('\n')[0]}{'\n'}
        <span style={{ color: '#60a5fa' }}>{c.headline.split('\n')[1]}</span>
      </h1>

      <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.7, margin: '0 0 40px', maxWidth: 340 }}>
        {c.sub}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {c.cards.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '16px 20px' }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(135deg,var(--brand-navy),var(--brand-navy-deep))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, boxShadow: '0 4px 12px rgba(29,78,216,0.4)' }}>
              {s.emoji}
            </div>
            <div>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: '0 0 2px' }}>{s.label}</p>
              <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>{s.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Signup() {
  const { role: paramRole } = useParams()
  const initRole = ROLES.find(r => r.toLowerCase() === paramRole) || 'Mentee'
  const [role, setRole] = useState(initRole)
  const [form, setForm] = useState({ full_name: '', email: '', password: '', invite_code: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (!/^[A-Z]/.test(form.password)) { setError('Password must start with a capital letter.'); return }
    setLoading(true)
    try {
      const payload = { full_name: form.full_name, email: form.email, password: form.password }
      if (role === 'Mentor') payload.invite_code = form.invite_code
      await api.post(`/api/auth/signup/${role.toLowerCase()}`, payload)
      navigate(`/login/${role.toLowerCase()}?pending=1`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = { width: '100%', padding: '13px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#0f172a', outline: 'none', boxSizing: 'border-box', background: '#fafafa', fontFamily: 'inherit' }

  return (
    <div className="am-auth-page" style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <LeftPanel role={role} />

      <div className="am-auth-right" style={{ flex: 1, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 40px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 460 }}>

          {/* Role tabs */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 14, padding: 5, marginBottom: 32 }}>
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

          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            Create your account
          </h2>
          <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 28px' }}>
            Signing up as a <span style={{ color: 'var(--brand-teal-deep)', fontWeight: 700 }}>{role}</span>
            {' '}— an OTP will be sent to verify your email.
          </p>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
              <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>⚠ {error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Full name */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 7 }}>Full Name</label>
              <input type="text" name="name" autoComplete="name" required value={form.full_name} onChange={e => set('full_name', e.target.value)}
                placeholder="Jane Smith" style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--brand-teal)'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 7 }}>Email Address</label>
              <input type="email" name="email" autoComplete="username" required value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="you@gmail.com" style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--brand-teal)'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: role === 'Mentor' ? 16 : 10 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 7 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} name="new-password" autoComplete="new-password" required value={form.password} onChange={e => set('password', e.target.value)}
                  placeholder="Min 6 chars, starts with capital" style={{ ...inputStyle, paddingRight: 46 }}
                  onFocus={e => e.target.style.borderColor = 'var(--brand-teal)'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18 }}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '6px 0 0' }}>Must start with a capital letter, min 6 characters.</p>
            </div>

            {/* Invite code (mentor only) */}
            {role === 'Mentor' && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 7 }}>Invite Code</label>
                <input type="text" required value={form.invite_code} onChange={e => set('invite_code', e.target.value)}
                  placeholder="XXXXXXXX (provided by admin)" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--brand-teal)'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '6px 0 0' }}>You need an invite code from the admin to join as a mentor.</p>
              </div>
            )}

            {/* OTP notice */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', margin: '20px 0 24px' }}>
              <span style={{ fontSize: 18 }}>📧</span>
              <p style={{ fontSize: 13, color: 'var(--brand-teal-deep)', margin: 0 }}>
                A <strong>6-digit OTP</strong> will be sent to your email address to verify your account.
              </p>
            </div>

            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '15px', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? '#93c5fd' : 'linear-gradient(135deg,var(--brand-navy),var(--brand-navy-deep))',
                color: '#fff', fontSize: 15, fontWeight: 700,
                boxShadow: loading ? 'none' : '0 6px 20px rgba(37,99,235,0.4)',
              }}>
              {loading ? 'Creating account…' : 'Create Account & Get OTP →'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '22px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            <span style={{ color: '#94a3b8', fontSize: 13 }}>or</span>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          </div>

          <p style={{ textAlign: 'center', fontSize: 14, color: '#64748b' }}>
            Already have an account?{' '}
            <Link to={`/login/${role.toLowerCase()}`} style={{ color: 'var(--brand-teal-deep)', fontWeight: 700, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
