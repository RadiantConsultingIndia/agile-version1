import { useState, useEffect, useRef } from 'react'
import MenteeLayout from '../../components/layouts/MenteeLayout'
import api from '../../api/client'
import { toast } from '../../utils/toast'

const KICKOFF_MESSAGE = "Hi, I'm ready to start my mock interview."

function renderFormatted(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  )
}

export default function AIInterview() {
  const [messages, setMessages] = useState([]) // { role: 'user' | 'assistant', content: string }
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const [hasAccess, setHasAccess] = useState(null) // null = checking, true/false = resolved
  const transcriptRef = useRef(null)

  useEffect(() => {
    api.get('/api/mentee/ai-interview/access')
      .then(res => setHasAccess(res.data.has_access))
      .catch(() => setHasAccess(false))
  }, [])

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [messages, loading])

  const sendToApi = async (nextMessages) => {
    setLoading(true)
    try {
      const res = await api.post('/api/mentee/ai-interview/message', { messages: nextMessages })
      setMessages([...nextMessages, { role: 'assistant', content: res.data.reply }])
    } catch (e) {
      toast(e.response?.data?.detail || 'The AI interviewer is unavailable right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const startInterview = () => {
    setStarted(true)
    const first = [{ role: 'user', content: KICKOFF_MESSAGE }]
    setMessages(first)
    sendToApi(first)
  }

  const restart = () => {
    setStarted(false)
    setMessages([])
    setInput('')
  }

  const sendMessage = () => {
    const text = input.trim()
    if (!text || loading) return
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    sendToApi(next)
  }

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <MenteeLayout>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: '0 0 4px' }}>AI Interview</h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Practice a live, adaptive mock interview with an AI interviewer.</p>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', padding: 28, maxWidth: 720, margin: '0 auto' }}>
        {hasAccess === null ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 14 }}>Checking access…</div>
        ) : hasAccess === false ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🔒</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>AI Interview is a paid add-on</h2>
            <p style={{ fontSize: 14, color: '#64748b', maxWidth: 440, margin: '0 auto 24px' }}>
              This feature requires a separate one-time payment. Contact us to unlock unlimited AI-powered mock interviews.
            </p>
            <a href="https://wa.me/919071215571?text=Hi%2C%20I%27d%20like%20to%20unlock%20the%20AI%20Interview%20feature."
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', background: '#7c3aed', color: '#fff', fontSize: 14, fontWeight: 700, padding: '12px 28px', borderRadius: 10, textDecoration: 'none' }}>
              Contact Us to Unlock
            </a>
          </div>
        ) : !started ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🎤</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Ready when you are</h2>
            <p style={{ fontSize: 14, color: '#64748b', maxWidth: 440, margin: '0 auto 24px' }}>
              The interviewer will ask which role you'd like to practice for (SDE, Analyst, or Sales), then walk you through a set of real interview questions with a summary at the end.
            </p>
            <button onClick={startInterview}
              style={{ background: '#7c3aed', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, padding: '12px 28px', borderRadius: 10, cursor: 'pointer' }}>
              Start Interview
            </button>
          </div>
        ) : (
          <>
            <div ref={transcriptRef} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 440, overflowY: 'auto', marginBottom: 18, paddingRight: 4 }}>
              {messages.map((m, i) => (
                <div key={i} style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '82%', padding: '12px 16px', borderRadius: 12, fontSize: 14, lineHeight: 1.55,
                  background: m.role === 'user' ? '#7c3aed' : '#f1f5f9',
                  color: m.role === 'user' ? '#fff' : '#1e293b',
                  borderBottomRightRadius: m.role === 'user' ? 4 : 12,
                  borderBottomLeftRadius: m.role === 'user' ? 12 : 4,
                  whiteSpace: 'pre-wrap',
                }}>
                  {renderFormatted(m.content)}
                </div>
              ))}
              {loading && (
                <div style={{ alignSelf: 'flex-start', padding: '12px 16px', borderRadius: 12, background: '#f1f5f9', color: '#94a3b8', fontSize: 13 }}>
                  Thinking…
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Type your answer…" disabled={loading}
                style={{ flex: 1, minHeight: 46, maxHeight: 120, resize: 'vertical', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontFamily: 'inherit', fontSize: 14, outline: 'none' }} />
              <button onClick={sendMessage} disabled={loading || !input.trim()}
                style={{ background: loading || !input.trim() ? '#c4b5fd' : '#7c3aed', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, padding: '0 20px', borderRadius: 10, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer' }}>
                Send
              </button>
            </div>
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button onClick={restart} style={{ background: 'none', border: 'none', fontSize: 12.5, fontWeight: 600, color: '#94a3b8', cursor: 'pointer' }}>
                Start Over
              </button>
            </div>
          </>
        )}
      </div>
    </MenteeLayout>
  )
}
