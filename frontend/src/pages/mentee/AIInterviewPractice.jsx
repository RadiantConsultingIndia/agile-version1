import { useState, useEffect, useRef } from 'react'
import MenteeLayout from '../../components/layouts/MenteeLayout'
import api from '../../api/client'
import { toast } from '../../utils/toast'

const KICKOFF_MESSAGE = "Hi, I'm ready to start my practice interview."
const SENTINEL = '[[PRACTICE_COMPLETE]]'
const INTERVIEW_DURATION_SECONDS = 20 * 60

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function renderFormatted(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  )
}

export default function AIInterviewPractice() {
  const [messages, setMessages] = useState([]) // { role: 'user' | 'assistant', content: string }
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const [hasAccess, setHasAccess] = useState(null) // null = checking, true/false = resolved
  const [creditsRemaining, setCreditsRemaining] = useState(null)
  const transcriptRef = useRef(null)

  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768)
  const [speechSupported] = useState(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition))
  const [listening, setListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [micError, setMicError] = useState(null)
  const [practiceComplete, setPracticeComplete] = useState(false)
  const [voiceOn, setVoiceOn] = useState(true)
  const [timeLeft, setTimeLeft] = useState(INTERVIEW_DURATION_SECONDS)
  const [jdText, setJdText] = useState(null)
  const [jdFileName, setJdFileName] = useState(null)
  const [jdUploading, setJdUploading] = useState(false)
  const recognitionRef = useRef(null)
  const silenceTimerRef = useRef(null)

  useEffect(() => {
    api.get('/api/mentee/ai-interview-practice/access')
      .then(res => {
        setHasAccess(res.data.has_access)
        setCreditsRemaining(res.data.credits_remaining)
      })
      .catch(() => setHasAccess(false))
  }, [])

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [messages, loading])

  useEffect(() => {
    if (!started || practiceComplete) return
    const interval = setInterval(() => {
      setTimeLeft(t => (t > 0 ? t - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [started, practiceComplete])

  useEffect(() => {
    if (started && !practiceComplete && timeLeft === 0) {
      toast("Time's up! Wrapping up your practice session.")
      setPracticeComplete(true)
    }
  }, [timeLeft])

  useEffect(() => () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    recognitionRef.current?.stop()
    window.speechSynthesis?.cancel()
  }, [])

  const speak = (text) => {
    if (!voiceOn || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text.replace(/\*\*/g, ''))
    window.speechSynthesis.speak(utterance)
  }

  const toggleVoice = () => {
    setVoiceOn(prev => {
      if (prev) window.speechSynthesis?.cancel()
      return !prev
    })
  }

  const sendToApi = async (nextMessages) => {
    setLoading(true)
    try {
      const res = await api.post('/api/mentee/ai-interview-practice/message', { messages: nextMessages })
      const raw = res.data.reply
      const isComplete = raw.includes(SENTINEL)
      const displayReply = raw.split(SENTINEL).join('').trim()
      setMessages([...nextMessages, { role: 'assistant', content: displayReply }])
      speak(displayReply)
      if (isComplete) setPracticeComplete(true)
      if (typeof res.data.credits_remaining === 'number') setCreditsRemaining(res.data.credits_remaining)
    } catch (e) {
      toast(e.response?.data?.detail || 'The AI interviewer is unavailable right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleJdUpload = async e => {
    const file = e.target.files[0]
    if (!file) return
    setJdUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await api.post('/api/mentee/upload-jd', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setJdText(res.data.jd_text)
      setJdFileName(file.name)
    } catch (err) {
      toast(err.response?.data?.detail || 'Could not read that file. Please try a different PDF or DOCX file.')
    } finally {
      setJdUploading(false)
      e.target.value = ''
    }
  }

  const removeJd = () => {
    setJdText(null)
    setJdFileName(null)
  }

  const startInterview = () => {
    setStarted(true)
    setTimeLeft(INTERVIEW_DURATION_SECONDS)
    const kickoffContent = jdText
      ? `Hi, I'm ready to start my practice interview. Here is the job description I'm preparing for:\n\n${jdText}\n\nPlease tailor your questions to this specific role.`
      : KICKOFF_MESSAGE
    const first = [{ role: 'user', content: kickoffContent }]
    setMessages(first)
    sendToApi(first)
  }

  const restart = () => {
    recognitionRef.current?.stop()
    window.speechSynthesis?.cancel()
    setStarted(false)
    setMessages([])
    setInput('')
    setPracticeComplete(false)
    setMicError(null)
    setTimeLeft(INTERVIEW_DURATION_SECONDS)
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

  const startListening = () => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Ctor || loading) return
    const recognition = new Ctor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    const resetSilenceTimer = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = setTimeout(() => recognition.stop(), 2500)
    }
    recognition.onresult = (e) => {
      let interim = '', final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else interim += t
      }
      if (final) setInput(prev => (prev ? prev + ' ' : '') + final.trim())
      setInterimText(interim)
      resetSilenceTimer()
    }
    recognition.onerror = (e) => {
      setListening(false)
      setInterimText('')
      setMicError(e.error === 'not-allowed' || e.error === 'service-not-allowed'
        ? 'Microphone access was denied. You can still type your answer below.'
        : 'Voice input had a problem. You can still type your answer below.')
    }
    recognition.onend = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      setListening(false)
      setInterimText('')
    }
    recognitionRef.current = recognition
    setMicError(null)
    recognition.start()
    setListening(true)
    resetSilenceTimer()
  }

  const stopListening = () => recognitionRef.current?.stop()

  return (
    <MenteeLayout>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: '0 0 4px' }}>AI Interview Practice</h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>3 quick questions, with feedback after each one.</p>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', padding: 28, maxWidth: 720, margin: '0 auto' }}>
        {hasAccess === null ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 14 }}>Checking access…</div>
        ) : hasAccess === false ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🔒</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
              {creditsRemaining === 0 ? "You're out of Practice credits" : 'AI Interview Practice is a paid add-on'}
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', maxWidth: 440, margin: '0 auto 24px' }}>
              {creditsRemaining === 0
                ? "You've used all your AI Interview Practice credits. Contact us to get more."
                : 'This feature requires a separate one-time payment. Contact us to unlock AI Interview Practice.'}
            </p>
            <a href="https://wa.me/919071215571?text=Hi%2C%20I%27d%20like%20to%20unlock%20the%20AI%20Interview%20Practice%20feature."
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', background: '#7c3aed', color: '#fff', fontSize: 14, fontWeight: 700, padding: '12px 28px', borderRadius: 10, textDecoration: 'none' }}>
              Contact Us to Unlock
            </a>
          </div>
        ) : (!isDesktop || !speechSupported) ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>💻</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Please use a laptop or desktop</h2>
            <p style={{ fontSize: 14, color: '#64748b', maxWidth: 440, margin: '0 auto 24px' }}>
              This voice-guided experience needs a desktop browser like Chrome or Edge. Please switch devices to continue.
            </p>
          </div>
        ) : !started ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🎯</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Ready when you are</h2>
            <p style={{ fontSize: 14, color: '#64748b', maxWidth: 440, margin: '0 auto 24px' }}>
              A quick 3-question practice round for Project Manager, Scrum Master, Program Manager, Product Owner, or Business Analyst roles. You'll get feedback on what went well and what could improve right after each answer. Speak your answers using the microphone, or type if you prefer.
            </p>
            <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 10, padding: '14px 16px', marginBottom: 20, textAlign: 'left' }}>
              {jdFileName ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontSize: 12.5, color: '#15803d' }}>✓ {jdFileName} — questions will be tailored to this role</span>
                  <button type="button" onClick={removeJd} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Remove</button>
                </div>
              ) : (
                <>
                  <label style={{ display: 'inline-block', fontSize: 12.5, fontWeight: 700, color: '#7c3aed', cursor: jdUploading ? 'not-allowed' : 'pointer' }}>
                    {jdUploading ? 'Reading file…' : '📄 Upload a job description (optional)'}
                    <input type="file" accept=".pdf,.docx" onChange={handleJdUpload} disabled={jdUploading} style={{ display: 'none' }} />
                  </label>
                  <p style={{ fontSize: 11.5, color: '#94a3b8', margin: '6px 0 0' }}>Please upload in DOCX or PDF format. Questions will be tailored to that specific role.</p>
                </>
              )}
            </div>
            <button onClick={startInterview}
              style={{ background: '#7c3aed', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, padding: '12px 28px', borderRadius: 10, cursor: 'pointer' }}>
              Start Practice
            </button>
            {typeof creditsRemaining === 'number' && (
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 14 }}>
                {creditsRemaining} session{creditsRemaining === 1 ? '' : 's'} remaining
              </p>
            )}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: timeLeft <= 60 ? '#dc2626' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                ⏱ {formatTime(timeLeft)}
              </span>
              <button type="button" onClick={toggleVoice} title={voiceOn ? 'Mute AI voice' : 'Unmute AI voice'}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: voiceOn ? '#7c3aed' : '#94a3b8' }}>
                {voiceOn ? '🔊' : '🔇'}
              </button>
            </div>
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

            {practiceComplete ? (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <p style={{ fontSize: 14, color: '#64748b', marginBottom: 14 }}>Practice session complete — start a new one anytime!</p>
                <button onClick={restart}
                  style={{ background: '#7c3aed', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, padding: '12px 28px', borderRadius: 10, cursor: 'pointer' }}>
                  Start Over
                </button>
              </div>
            ) : (
              <>
                {interimText && (
                  <p style={{ fontSize: 12.5, color: '#94a3b8', fontStyle: 'italic', margin: '0 0 8px' }}>{interimText}</p>
                )}
                {micError && (
                  <p style={{ fontSize: 12.5, color: '#dc2626', margin: '0 0 8px' }}>{micError}</p>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={listening ? stopListening : startListening} disabled={loading}
                    title={listening ? 'Stop recording' : 'Start recording'}
                    style={{
                      width: 46, height: 46, minWidth: 46, borderRadius: 10, border: 'none', flexShrink: 0,
                      background: listening ? '#ef4444' : '#f1f5f9', color: listening ? '#fff' : '#7c3aed',
                      fontSize: 18, cursor: loading ? 'not-allowed' : 'pointer',
                    }}>
                    {listening ? '⏹' : '🎤'}
                  </button>
                  <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                    placeholder="Type your answer, or use the microphone…" disabled={loading}
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
          </>
        )}
      </div>
    </MenteeLayout>
  )
}
