import { useState, useEffect, useRef } from 'react'
import MenteeLayout from '../../components/layouts/MenteeLayout'
import api from '../../api/client'
import { toast } from '../../utils/toast'

const KICKOFF_MESSAGE = "Hi, I'm ready to start my mock interview."
const SENTINEL = '[[INTERVIEW_COMPLETE]]'

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
  const [creditsRemaining, setCreditsRemaining] = useState(null)
  const transcriptRef = useRef(null)

  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768)
  const [speechSupported] = useState(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition))
  const [listening, setListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [micError, setMicError] = useState(null)
  const [interviewComplete, setInterviewComplete] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [gettingReport, setGettingReport] = useState(false)
  const [voiceOn, setVoiceOn] = useState(true)
  const recognitionRef = useRef(null)
  const silenceTimerRef = useRef(null)

  useEffect(() => {
    api.get('/api/mentee/ai-interview/access')
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
      const res = await api.post('/api/mentee/ai-interview/message', { messages: nextMessages })
      const raw = res.data.reply
      const isComplete = raw.includes(SENTINEL)
      const displayReply = raw.split(SENTINEL).join('').trim()
      setMessages([...nextMessages, { role: 'assistant', content: displayReply }])
      speak(displayReply)
      if (isComplete) setInterviewComplete(true)
      if (typeof res.data.credits_remaining === 'number') setCreditsRemaining(res.data.credits_remaining)
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
    recognitionRef.current?.stop()
    window.speechSynthesis?.cancel()
    setStarted(false)
    setMessages([])
    setInput('')
    setInterviewComplete(false)
    setAnalysis(null)
    setMicError(null)
  }

  const sendMessage = () => {
    const text = input.trim()
    if (!text || loading) return
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    sendToApi(next)
  }

  const endInterviewAndGetReport = () => {
    if (loading || interviewComplete) return
    const next = [...messages, { role: 'user', content: 'Please end the interview now and give me your closing summary.' }]
    setMessages(next)
    setInterviewComplete(true) // manual end — trust the click, don't wait on the AI's sentinel
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

  const getReport = async () => {
    if (gettingReport) return
    setGettingReport(true)
    try {
      let currentAnalysis = analysis
      if (!currentAnalysis) {
        const res = await api.post('/api/mentee/ai-interview/analyze', { messages })
        currentAnalysis = res.data
        setAnalysis(currentAnalysis)
      }
      const reportRes = await api.post('/api/mentee/ai-interview/report', { analysis: currentAnalysis }, { responseType: 'blob' })
      const blob = new Blob([reportRes.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'ai-interview-report.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      let message = 'Could not generate your report. Please try again.'
      if (e.response?.data instanceof Blob) {
        try {
          const parsed = JSON.parse(await e.response.data.text())
          if (parsed.detail) message = parsed.detail
        } catch { /* keep default message */ }
      } else if (e.response?.data?.detail) {
        message = e.response.data.detail
      }
      toast(message)
    } finally {
      setGettingReport(false)
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
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
              {creditsRemaining === 0 ? "You're out of AI Interview credits" : 'AI Interview is a paid add-on'}
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', maxWidth: 440, margin: '0 auto 24px' }}>
              {creditsRemaining === 0
                ? "You've used all your AI Interview credits. Contact us to get more."
                : 'This feature requires a separate one-time payment. Contact us to unlock AI-powered mock interviews.'}
            </p>
            <a href="https://wa.me/919071215571?text=Hi%2C%20I%27d%20like%20to%20unlock%20the%20AI%20Interview%20feature."
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
              The AI Interview's voice-guided experience needs a desktop browser like Chrome or Edge. Please switch devices to continue.
            </p>
          </div>
        ) : !started ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🎤</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Ready when you are</h2>
            <p style={{ fontSize: 14, color: '#64748b', maxWidth: 440, margin: '0 auto 24px' }}>
              The interviewer will ask which role you'd like to practice for (Project Manager, Scrum Master, Program Manager, Product Owner, or Business Analyst), then walk you through a set of real interview questions with a summary at the end. Speak your answers using the microphone, or type if you prefer.
            </p>
            <button onClick={startInterview}
              style={{ background: '#7c3aed', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, padding: '12px 28px', borderRadius: 10, cursor: 'pointer' }}>
              Start Interview
            </button>
            {typeof creditsRemaining === 'number' && (
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 14 }}>
                {creditsRemaining} interview{creditsRemaining === 1 ? '' : 's'} remaining
              </p>
            )}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
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

            {interviewComplete ? (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <p style={{ fontSize: 14, color: '#64748b', marginBottom: 14 }}>Interview complete! Get your personalized STAR-analysis report.</p>
                <button onClick={getReport} disabled={gettingReport}
                  style={{ background: gettingReport ? '#c4b5fd' : '#7c3aed', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, padding: '12px 28px', borderRadius: 10, cursor: gettingReport ? 'not-allowed' : 'pointer' }}>
                  {gettingReport ? 'Preparing your report…' : 'Get My Report (PDF)'}
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
                <div style={{ textAlign: 'center', marginTop: 14, display: 'flex', justifyContent: 'center', gap: 20 }}>
                  <button onClick={restart} style={{ background: 'none', border: 'none', fontSize: 12.5, fontWeight: 600, color: '#94a3b8', cursor: 'pointer' }}>
                    Start Over
                  </button>
                  <button onClick={endInterviewAndGetReport} disabled={loading} style={{ background: 'none', border: 'none', fontSize: 12.5, fontWeight: 600, color: '#7c3aed', cursor: loading ? 'not-allowed' : 'pointer' }}>
                    End Interview & Get Report
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
