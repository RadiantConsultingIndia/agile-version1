import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

/* ── Data ───────────────────────────────────────────────── */
const PROGRAMS = [
  {
    id: 1, tag: 'POPULAR', tagColor: '#22c55e',
    title: 'Agile & Scrum Mastery',
    desc: 'Master sprint planning, retrospectives, and team facilitation. Go from Agile basics to leading high-performing Scrum teams.',
    topics: ['Sprint Planning', 'User Stories', 'Retrospectives'],
    weeks: 8, enrolled: 240, rating: 4.9,
    headerColors: ['var(--brand-navy-deep)', '#4f46e5'],
    emoji: '⚡',
  },
  {
    id: 2, tag: 'LIVE SESSIONS', tagColor: '#0ea5e9',
    title: 'Product Management Fundamentals',
    desc: 'Learn to define product vision, prioritize backlogs, and ship features users love. Includes live case studies from real PMs.',
    topics: ['Roadmaps', 'OKRs', 'Stakeholder Mgmt'],
    weeks: 6, enrolled: 180, rating: 4.8,
    headerColors: ['#0d9488', '#0891b2'],
    emoji: '🎯',
  },
  {
    id: 3, tag: 'NEW', tagColor: '#f97316',
    title: 'DevOps for Agile Teams',
    desc: 'Bridge development and operations with CI/CD pipelines, containerization, and automated deployments in Agile environments.',
    topics: ['CI/CD', 'Docker', 'Kubernetes'],
    weeks: 10, enrolled: 95, rating: 4.9,
    headerColors: ['#7c3aed', '#a855f7'],
    emoji: '🚀',
  },
]

const MENTORS = [
  { name: 'Rahul Verma', role: 'Scrum Master', company: 'TCS', bio: 'Certified CSM & SAFe Agilist. Led Agile transformations for 50+ enterprise teams across banking and telecom.', exp: '12+ yrs', rating: 4.9, reviews: 128, mentees: 340, sessions: 52, tags: ['Scrum', 'SAFe', 'Jira'], border: '#fb923c', grad: 'linear-gradient(135deg,#f97316,#ef4444)', initials: 'RV' },
  { name: 'Priya Sharma', role: 'Product Manager', company: 'Infosys', bio: 'Former PM at a Series B startup. Specialises in product roadmaps, stakeholder alignment, and OKR frameworks.', exp: '9+ yrs', rating: 4.8, reviews: 96, mentees: 215, sessions: 38, tags: ['Product', 'Roadmaps', 'OKRs'], border: '#facc15', grad: 'linear-gradient(135deg,#f59e0b,#d97706)', initials: 'PS' },
  { name: 'Arjun Mehta', role: 'DevOps Engineer', company: 'Wipro', bio: 'Built CI/CD pipelines for Fortune 500 clients. Passionate about bridging DevOps practices with Agile delivery.', exp: '7+ yrs', rating: 4.9, reviews: 74, mentees: 180, sessions: 41, tags: ['CI/CD', 'Docker', 'Agile'], border: '#4ade80', grad: 'linear-gradient(135deg,#16a34a,#059669)', initials: 'AM' },
  { name: 'Neha Kulkarni', role: 'Agile Coach', company: 'Accenture', bio: 'Enterprise Agile coach who has trained 200+ professionals. Expert in Kanban, Lean, and team coaching at scale.', exp: '15+ yrs', rating: 5.0, reviews: 112, mentees: 420, sessions: 67, tags: ['Coaching', 'Kanban', 'Lean'], border: '#f472b6', grad: 'linear-gradient(135deg,#ec4899,#a855f7)', initials: 'NK' },
]

/* ── Reusable atoms ─────────────────────────────────────── */
function StarRating({ rating, reviews }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <svg width="15" height="15" viewBox="0 0 20 20" style={{ fill: '#f59e0b', flexShrink: 0 }}>
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
      </svg>
      <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>{rating}</span>
      <span style={{ color: '#94a3b8', fontSize: 13 }}>({reviews} reviews)</span>
    </div>
  )
}

/* ── Program Finder quiz ────────────────────────────────── */
const FINDER_TRACKS = [
  { id: 'agile-scrum', label: 'Agile & Scrum Mastery', keywords: ['agile', 'scrum'],
    pitch: 'Master sprint planning, retrospectives, and team facilitation.' },
  { id: 'product', label: 'Product Management', keywords: ['product', 'roadmap', 'okr'],
    pitch: 'Learn to define vision, prioritize backlogs, and ship features users love.' },
  { id: 'mentorship', label: '1:1 Mentorship', keywords: ['mentor'],
    pitch: 'Ongoing guidance from an industry mentor, matched to your goals.' },
  { id: 'interview', label: 'Interview Prep', keywords: ['interview'],
    pitch: 'Practice with mock interviews and structured feedback.' },
]

const FINDER_QUESTION = {
  text: 'What are you looking for right now?',
  options: [
    { label: 'Agile & Scrum fundamentals', trackId: 'agile-scrum' },
    { label: 'Product management skills', trackId: 'product' },
    { label: '1:1 mentor guidance', trackId: 'mentorship' },
    { label: 'Interview practice', trackId: 'interview' },
  ],
}

function bucketTrackId(program) {
  const haystack = `${program.category || ''} ${program.title || ''}`.toLowerCase()
  for (const track of FINDER_TRACKS) {
    if (track.keywords.some(kw => haystack.includes(kw))) return track.id
  }
  return 'agile-scrum'
}

function ProgramFinder() {
  const [trackId, setTrackId] = useState(null)
  const [liveByTrack, setLiveByTrack] = useState({})

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    fetch('https://agile-mentorship-backend.onrender.com/api/public/programs', { signal: controller.signal })
      .then(res => { if (!res.ok) throw new Error('bad status'); return res.json() })
      .then(programs => {
        const byTrack = {}
        programs.forEach(p => {
          const id = bucketTrackId(p)
          byTrack[id] = byTrack[id] || []
          byTrack[id].push(p)
        })
        setLiveByTrack(byTrack)
      })
      .catch(() => {}) // live data optional — static recommendation still works without it
      .finally(() => clearTimeout(timeout))
    return () => { clearTimeout(timeout); controller.abort() }
  }, [])

  const track = FINDER_TRACKS.find(t => t.id === trackId)
  const liveList = (trackId && liveByTrack[trackId]) ? liveByTrack[trackId].slice(0, 3) : []

  return (
    <section style={{ background: '#f8fafc', padding: '80px 32px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-teal-deep)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Not Sure Where to Start?</span>
        <h2 style={{ fontSize: 30, fontWeight: 800, color: '#0f172a', margin: '10px 0 32px' }}>Find the right program for you.</h2>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', padding: '36px 40px' }}>
          {!track ? (
            <>
              <p style={{ fontSize: 17, fontWeight: 600, color: '#0f172a', marginBottom: 20, textAlign: 'center' }}>{FINDER_QUESTION.text}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {FINDER_QUESTION.options.map(opt => (
                  <button key={opt.trackId} onClick={() => setTrackId(opt.trackId)}
                    style={{ textAlign: 'left', fontSize: 14.5, fontWeight: 600, color: '#0f172a', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '16px 18px', cursor: 'pointer' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--brand-teal-deep)', background: 'rgba(20,184,166,0.12)', padding: '5px 14px', borderRadius: 999, marginBottom: 14 }}>Recommended for you</span>
              <h3 style={{ fontSize: 21, marginBottom: 10 }}>{track.label}</h3>
              <p style={{ color: '#64748b', fontSize: 14.5, marginBottom: 22 }}>{track.pitch}</p>

              {liveList.length > 0 && (
                <ul style={{ listStyle: 'none', textAlign: 'left', margin: '0 0 24px', padding: 0 }}>
                  {liveList.map(p => (
                    <li key={p.title} style={{ fontSize: 13.5, color: '#1f2937', background: '#f8fafc', borderRadius: 10, padding: '10px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      {p.title}
                      {p.duration_weeks ? <span style={{ color: '#64748b', fontSize: 12.5 }}>{p.duration_weeks} wks</span> : null}
                    </li>
                  ))}
                </ul>
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="/signup/mentee" style={{ background: 'var(--brand-navy)', color: '#fff', fontSize: 14, fontWeight: 700, padding: '12px 24px', borderRadius: 10, textDecoration: 'none' }}>Get Started</a>
                <button onClick={() => setTrackId(null)} style={{ background: 'none', border: 'none', fontSize: 13.5, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>Start over</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* ── Page ───────────────────────────────────────────────── */
export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)

  // Close menu on resize to desktop
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 768) setMenuOpen(false) }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const NAV_LINKS = ['Home', 'Programs', 'Mentors', 'Live Sessions', 'About']

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: '#fff' }}>

      {/* ════ NAVBAR ════ */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: '#fff', borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div className="am-nav-inner" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px', height: 68, display: 'flex', alignItems: 'center', gap: 40 }}>

          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,var(--brand-navy),#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(37,99,235,0.35)' }}>
              <svg viewBox="0 0 32 28" width="22" height="22" fill="none">
                <path d="M2 18 Q6 4 12 14 Q16 20 20 8 Q24 0 30 12" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
              </svg>
            </div>
            <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>
              <span style={{ color: '#0f172a' }}>Agile</span>
              <span style={{ color: 'var(--brand-teal-deep)' }}>Mentor</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="am-nav-links" style={{ display: 'flex', gap: 32, flex: 1 }}>
            {NAV_LINKS.map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(' ', '-')}`}
                style={{ fontSize: 14, fontWeight: 500, color: '#475569', textDecoration: 'none' }}>
                {l}
              </a>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="am-nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 'auto' }}>
            <Link to="/login/mentee" style={{ fontSize: 14, fontWeight: 600, color: '#374151', textDecoration: 'none' }}>Login</Link>
            <Link to="/signup/mentee" style={{ fontSize: 14, fontWeight: 700, color: '#fff', textDecoration: 'none', background: 'linear-gradient(135deg,var(--brand-navy),var(--brand-navy-deep))', padding: '9px 22px', borderRadius: 50, boxShadow: '0 4px 14px rgba(37,99,235,0.4)' }}>
              Get Started
            </Link>
          </div>

          {/* Hamburger — mobile only */}
          <button className="am-nav-hamburger" onClick={() => setMenuOpen(o => !o)}
            style={{ marginLeft: 'auto' }}>
            <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>}
            </svg>
          </button>
        </div>

        {/* Mobile dropdown menu */}
        <div className={`am-mobile-menu${menuOpen ? ' open' : ''}`}>
          {NAV_LINKS.map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(' ', '-')}`} onClick={() => setMenuOpen(false)}
              style={{ fontSize: 15, fontWeight: 500, color: '#374151', textDecoration: 'none', padding: '10px 12px', borderRadius: 10, display: 'block' }}>
              {l}
            </a>
          ))}
          <div className="am-mob-divider" />
          <Link to="/login/mentee" onClick={() => setMenuOpen(false)}
            style={{ fontSize: 15, fontWeight: 600, color: '#374151', textDecoration: 'none', padding: '10px 12px', display: 'block' }}>
            Login
          </Link>
          <Link to="/signup/mentee" onClick={() => setMenuOpen(false)} className="am-mob-cta"
            style={{ fontSize: 15, fontWeight: 700, color: '#fff', textDecoration: 'none', padding: '12px', display: 'block', background: 'linear-gradient(135deg,var(--brand-navy),var(--brand-navy-deep))', borderRadius: 10, textAlign: 'center', marginTop: 4 }}>
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* ════ HERO ════ */}
      <section id="home" style={{ background: 'linear-gradient(160deg, var(--brand-navy-deep) 0%, var(--brand-navy) 60%, var(--brand-navy-deep) 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -100, right: -100, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.15), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, left: '30%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.1), transparent 70%)', pointerEvents: 'none' }} />

        <div className="am-hero-grid" style={{ maxWidth: 1200, margin: '0 auto', padding: '110px 32px 100px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center', position: 'relative', zIndex: 1 }}>

          {/* Left */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', color: '#93c5fd', borderRadius: 50, padding: '7px 16px', fontSize: 12, fontWeight: 600, marginBottom: 28 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#60a5fa', display: 'inline-block' }} />
              India's #1 Agile Mentorship Platform
            </div>

            <h1 style={{ fontSize: 58, fontWeight: 900, color: '#fff', lineHeight: 1.06, letterSpacing: '-1.5px', margin: '0 0 22px' }}>
              Grow Faster with<br />
              <span style={{ color: '#60a5fa' }}>Expert Mentors</span><br />
              Who've Been There.
            </h1>

            <p style={{ fontSize: 17, color: '#94a3b8', lineHeight: 1.7, margin: '0 0 36px', maxWidth: 420 }}>
              Get matched with industry mentors, attend live Agile sessions, and build the skills that actually get you hired.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href="#programs" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,var(--brand-navy),var(--brand-navy-deep))', color: '#fff', fontSize: 14, fontWeight: 700, padding: '13px 28px', borderRadius: 10, textDecoration: 'none', boxShadow: '0 6px 20px rgba(37,99,235,0.45)' }}>
                Explore Programs →
              </a>
              <Link to="/signup/mentor" style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 14, fontWeight: 600, padding: '13px 28px', borderRadius: 10, textDecoration: 'none' }}>
                Become a Mentor
              </Link>
            </div>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[['✅','Verified Industry Mentors'],['🎯','Hands-On Project Learning'],['🏆','Certificate on Completion']].map(([icon,l]) => (
                <div key={l} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '18px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 26 }}>{icon}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6, lineHeight: 1.4 }}>{l}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '22px 24px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#64748b', textTransform: 'uppercase', marginBottom: 18 }}>HOW IT WORKS</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  ['🔍','Get Matched','with an Agile mentor from top companies'],
                  ['🎯','Attend Live Sessions','and get hands-on with real sprints'],
                  ['🏆','Earn Certificates','and land roles at top product companies'],
                ].map(([emoji, bold, rest]) => (
                  <div key={bold} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>{emoji}</span>
                    <p style={{ fontSize: 14, color: '#cbd5e1', margin: 0 }}>
                      <strong style={{ color: '#fff', fontWeight: 600 }}>{bold}</strong> {rest}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <svg width="20" height="20" fill="none" stroke="#60a5fa" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
                Trusted by learners from <strong style={{ color: '#fff', fontWeight: 600 }}>TCS, Infosys, Wipro, Accenture, HCL</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      <ProgramFinder />

      {/* ════ PROGRAMS ════ */}
      <section id="programs" className="am-section-pad" style={{ background: '#fff', padding: '96px 0' }}>
        <div className="am-section-inner" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
          <div className="am-section-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 52 }}>
            <div>
              <h2 style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
                Explore Top <span style={{ color: 'var(--brand-teal-deep)' }}>Programs</span>
              </h2>
              <p style={{ fontSize: 16, color: '#64748b', margin: 0 }}>Structured learning paths built by practitioners — from fundamentals to job-ready skills</p>
            </div>
            <Link to="/signup/mentee" style={{ fontSize: 14, fontWeight: 600, color: 'var(--brand-teal-deep)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              View all programs →
            </Link>
          </div>

          <div className="am-programs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 28 }}>
            {PROGRAMS.map(p => (
              <div key={p.id} style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.14)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.08)' }}>

                <div style={{ height: 200, position: 'relative', background: `linear-gradient(135deg, ${p.headerColors[0]} 0%, ${p.headerColors[1]} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                  <div style={{ position: 'absolute', bottom: -20, left: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                  <span style={{ fontSize: 64, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))', position: 'relative', zIndex: 1 }}>{p.emoji}</span>
                  <span style={{ position: 'absolute', top: 16, left: 16, background: p.tagColor, color: '#fff', fontSize: 11, fontWeight: 800, padding: '5px 12px', borderRadius: 6, letterSpacing: '0.04em' }}>{p.tag}</span>
                </div>

                <div style={{ padding: '24px 24px 28px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 10px', lineHeight: 1.3 }}>{p.title}</h3>
                  <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.65, margin: '0 0 16px', flex: 1 }}>{p.desc}</p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                    <svg width="16" height="16" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                    </svg>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>Certificate on completion</span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                    {p.topics.map(t => (
                      <span key={t} style={{ fontSize: 12, fontWeight: 500, background: '#f1f5f9', color: '#475569', padding: '4px 12px', borderRadius: 50 }}>{t}</span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 20, fontSize: 12, color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: 16, marginBottom: 20 }}>
                    <span>📅 {p.weeks} Weeks</span>
                    <span>👥 {p.enrolled} enrolled</span>
                    <span>⭐ {p.rating}</span>
                  </div>

                  <Link to="/signup/mentee" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', background: 'linear-gradient(135deg,var(--brand-navy),var(--brand-navy-deep))', color: '#fff', fontSize: 14, fontWeight: 700, padding: '13px', borderRadius: 12, boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}>
                    Enroll Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ MENTORS ════ */}
      <section id="mentors" className="am-section-pad" style={{ background: '#f8fafc', padding: '96px 0' }}>
        <div className="am-section-inner" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
          <div className="am-section-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 52 }}>
            <div>
              <h2 style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
                Meet Our <span style={{ color: 'var(--brand-teal-deep)' }}>Mentors</span>
              </h2>
              <p style={{ fontSize: 16, color: '#64748b', margin: 0 }}>Hand-picked professionals from top companies — real experience, real results</p>
            </div>
            <Link to="/signup/mentee" style={{ fontSize: 14, fontWeight: 600, color: 'var(--brand-teal-deep)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              View all mentors →
            </Link>
          </div>

          <div className="am-mentors-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 22 }}>
            {MENTORS.map(m => (
              <div key={m.name} style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9', borderTop: `4px solid ${m.border}`, display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(0,0,0,0.12)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,0,0,0.07)' }}>

                <div style={{ padding: '28px 22px 24px', display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center', textAlign: 'center' }}>
                  <div style={{ position: 'relative', marginBottom: 16 }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: m.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 26, fontWeight: 800, boxShadow: '0 6px 20px rgba(0,0,0,0.2)' }}>
                      {m.initials}
                    </div>
                    <div style={{ position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 50, whiteSpace: 'nowrap' }}>
                      {m.exp}
                    </div>
                  </div>

                  <StarRating rating={m.rating} reviews={m.reviews} />

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 50, padding: '5px 12px', marginTop: 10, marginBottom: 14 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>Available this week</span>
                  </div>

                  <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>{m.name}</p>
                  <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 12px' }}>
                    {m.role} · <span style={{ color: 'var(--brand-teal-deep)', fontWeight: 600 }}>{m.company}</span>
                  </p>

                  <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: '0 0 18px', flex: 1 }}>{m.bio}</p>

                  <div style={{ display: 'flex', gap: 0, width: '100%', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '14px 0', marginBottom: 14 }}>
                    {[['Mentees', m.mentees],['Sessions', m.sessions]].map(([label, val], i) => (
                      <div key={label} style={{ flex: 1, textAlign: 'center', borderLeft: i ? '1px solid #f1f5f9' : 'none' }}>
                        <p style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 2px' }}>{val}</p>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>{label}</p>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: 18 }}>
                    {m.tags.map(t => (
                      <span key={t} style={{ fontSize: 12, fontWeight: 500, background: '#eff6ff', color: 'var(--brand-teal-deep)', padding: '4px 10px', borderRadius: 50 }}>{t}</span>
                    ))}
                  </div>

                  <Link to="/signup/mentee" style={{ display: 'block', width: '100%', textAlign: 'center', textDecoration: 'none', border: '1.5px solid #bfdbfe', color: 'var(--brand-navy)', background: 'transparent', fontSize: 13, fontWeight: 600, padding: '10px', borderRadius: 12, transition: 'background 0.15s, color 0.15s', boxSizing: 'border-box' }}
                    onMouseEnter={e => { e.target.style.background = 'var(--brand-teal)'; e.target.style.color = '#fff' }}
                    onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--brand-navy)' }}>
                    Book Session
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ CTA ════ */}
      <section className="am-cta-section" style={{ padding: '60px 32px' }}>
        <div className="am-cta-inner" style={{ maxWidth: 1000, margin: '0 auto', borderRadius: 24, background: 'linear-gradient(135deg, #0f1f48 0%, #1e3a7a 100%)', padding: '52px 60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40, boxShadow: '0 24px 60px rgba(15,31,72,0.35)' }}>
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>Ready to accelerate your Agile career?</h2>
            <p style={{ fontSize: 15, color: '#93c5fd', margin: 0 }}>India's leading platform connecting Agile professionals with the next generation of practitioners.</p>
          </div>
          <div className="am-cta-buttons" style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
            <Link to="/signup/mentee" style={{ background: 'var(--brand-navy)', color: '#fff', fontSize: 14, fontWeight: 700, padding: '13px 26px', borderRadius: 10, textDecoration: 'none', boxShadow: '0 4px 14px rgba(37,99,235,0.4)' }}>
              Start Learning Free
            </Link>
            <Link to="/signup/mentor" style={{ border: '1.5px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: 14, fontWeight: 600, padding: '13px 26px', borderRadius: 10, textDecoration: 'none', background: 'rgba(255,255,255,0.05)' }}>
              Apply as Mentor
            </Link>
          </div>
        </div>
      </section>

      {/* ════ FOOTER ════ */}
      <footer style={{ background: '#060f26', paddingTop: 64, paddingBottom: 32 }}>
        <div className="am-footer-inner" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
          <div className="am-footer-grid" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 48, marginBottom: 52 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,var(--brand-navy),#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 32 28" width="20" height="20" fill="none">
                    <path d="M2 18 Q6 4 12 14 Q16 20 20 8 Q24 0 30 12" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
                  </svg>
                </div>
                <span style={{ fontSize: 18, fontWeight: 800 }}>
                  <span style={{ color: '#fff' }}>Agile</span>
                  <span style={{ color: '#60a5fa' }}>Mentor</span>
                </span>
              </div>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, maxWidth: 240, margin: 0 }}>
                India's leading platform connecting Agile professionals with the next generation of practitioners.
              </p>
            </div>
            {[
              { title: 'Platform', links: ['Programs', 'Live Sessions', 'Mentors', 'Certificates'] },
              { title: 'Company', links: ['About Us', 'Careers', 'Blog', 'Contact'] },
              { title: 'Support', links: ['Help Center', 'Privacy Policy', 'Terms of Use'] },
            ].map(col => (
              <div key={col.title}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 18px' }}>{col.title}</p>
                {col.links.map(l => (
                  <a key={l} href="#" style={{ display: 'block', fontSize: 14, color: '#64748b', textDecoration: 'none', marginBottom: 12 }}>{l}</a>
                ))}
              </div>
            ))}
          </div>
          <div className="am-footer-bottom" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>© 2026 AgileMentor. All rights reserved.</p>
            <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>Made with ❤️ in India</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
