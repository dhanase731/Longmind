import React, { useState, useRef, useEffect, useCallback } from 'react'
import MemoryInspector from '../components/MemoryInspector'

const API = import.meta.env.VITE_API_URL || ''

function SendIcon({ disabled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}

export default function Chat({ token, chatId, historyEnabled, onSaveSession, onNewChat, sidebarCollapsed }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [context, setContext] = useState(null)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [mode, setMode] = useState(() => localStorage.getItem('lm_mode') || 'FULL')
  const abortRef = useRef(null)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const sessionIdRef = useRef(null)

  // When chatId changes, load that chat or reset
  useEffect(() => {
    if (!chatId) { setMessages([]); setContext(null); return }
    if (historyEnabled) {
      const stored = JSON.parse(localStorage.getItem('lm_sessions') || '[]')
      const session = stored.find(s => s.id === chatId)
      if (session) {
        setMessages(session.messages || [])
        sessionIdRef.current = session.sessionId
      } else {
        setMessages([])
        sessionIdRef.current = null
      }
    } else {
      setMessages([])
      sessionIdRef.current = null
    }
    setContext(null)
  }, [chatId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }, [input])

  function getSessionId() {
    if (!sessionIdRef.current) {
      sessionIdRef.current = crypto.randomUUID()
    }
    return sessionIdRef.current
  }

  function saveToHistory(updatedMessages, title) {
    if (!historyEnabled || !chatId) return
    onSaveSession({
      id: chatId,
      sessionId: sessionIdRef.current,
      title: title || (updatedMessages[0]?.text?.slice(0, 40) + '…') || 'New chat',
      messages: updatedMessages,
      createdAt: new Date().toISOString()
    })
  }

  // The effective mode sent to the backend:
  // - history OFF  → always 'OFF'  (no retrieval, no storage, clean Gemini prompt)
  // - history ON   → user's chosen governance mode (FULL, SEMANTIC, etc.)
  const effectiveMode = historyEnabled ? mode : 'OFF'

  // Always read token fresh from localStorage at request time — prop can go stale
  function getToken() {
    return token || localStorage.getItem('token') || ''
  }

  async function send() {
    const msg = input.trim()
    if (!msg || streaming) return
    setInput('')
    setContext(null)

    const userMsg = { role: 'user', text: msg, id: crypto.randomUUID() }
    const assistantMsg = { role: 'assistant', text: '', streaming: true, id: crypto.randomUUID() }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setStreaming(true)

    const ac = new AbortController()
    abortRef.current = ac

    let finalText = ''

    try {
      const resp = await fetch(`${API}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ message: msg, sessionId: getSessionId(), mode: effectiveMode }),
        signal: ac.signal
      })

      if (!resp.ok && resp.status === 401) {
        // Token expired or invalid — clear it so user is redirected to login
        localStorage.removeItem('token')
        window.location.reload()
        return
      }

      if (!resp.body) throw new Error('no stream')

      const reader = resp.body.getReader()
      const dec = new TextDecoder()
      let buf = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += dec.decode(value)
        let idx
        while ((idx = buf.indexOf('\n\n')) !== -1) {
          const block = buf.slice(0, idx)
          buf = buf.slice(idx + 2)
          let ev = null, data = ''
          for (const line of block.split(/\r?\n/)) {
            if (line.startsWith('event:')) ev = line.slice(6).trim()
            else if (line.startsWith('data:')) data += line.slice(5).trim()
          }
          if (ev === 'chunk') {
            try {
              const chunk = JSON.parse(data).text
              finalText += chunk
              setMessages(prev => {
                const copy = [...prev]
                const last = { ...copy[copy.length - 1], text: copy[copy.length - 1].text + chunk }
                copy[copy.length - 1] = last
                return copy
              })
            } catch (e) {}
          } else if (ev === 'context') {
            try { setContext(JSON.parse(data)) } catch (e) {}
          }
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        finalText = 'Something went wrong. Please try again.'
        setMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { ...copy[copy.length - 1], text: finalText }
          return copy
        })
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
      setMessages(prev => {
        const copy = [...prev]
        const last = copy[copy.length - 1]
        if (last?.streaming) copy[copy.length - 1] = { ...last, streaming: false }
        // save to history
        saveToHistory(copy, copy[0]?.text?.slice(0, 40))
        return copy
      })
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const SUGGESTIONS = [
    'What can you help me with?',
    'I prefer TypeScript over JavaScript',
    "I'm building a SaaS product",
    'My goal is to ship an MVP this month'
  ]

  return (
    <div className="flex flex-1 h-full min-w-0">
      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0 h-full">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            {sidebarCollapsed && <div className="w-8" />}
            {/* Mode selector — disabled and shows OFF when history is turned off */}
            {historyEnabled ? (
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                {['FULL','SEMANTIC','EPISODIC','SESSION','INCOGNITO','OFF'].map(m => (
                  <button key={m}
                    onClick={() => { setMode(m); localStorage.setItem('lm_mode', m) }}
                    className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition ${mode === m ? 'bg-[#10a37f] text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
                <span className="text-[11px] text-yellow-500 font-medium">History OFF — mode locked to OFF</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Memory Inspector toggle */}
            <button
              onClick={() => setInspectorOpen(v => !v)}
              title="Memory Inspector"
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition ${inspectorOpen ? 'border-[#10a37f] text-[#10a37f] bg-[#10a37f]/10' : 'border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20'}`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
              </svg>
              Memory
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4">
              <div className="mb-8 text-center">
                <div className="w-12 h-12 rounded-full bg-[#10a37f]/20 flex items-center justify-center mx-auto mb-4">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10a37f" strokeWidth="2">
                    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-200 mb-1">LongMind</h2>
                {historyEnabled
                  ? <p className="text-sm text-gray-500">AI memory that persists, explains, and adapts</p>
                  : <div className="flex items-center justify-center gap-1.5 mt-1">
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                      <p className="text-sm text-yellow-500 font-medium">History off — fresh session, no past memory</p>
                    </div>
                }
              </div>
              <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(s); textareaRef.current?.focus() }}
                    className="text-left text-sm text-gray-400 bg-white/5 hover:bg-white/10 border border-white/8 rounded-xl px-4 py-3 transition leading-snug"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg, i) => (
                <div key={msg.id || i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-[#10a37f] flex items-center justify-center shrink-0 mt-0.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                        <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                      </svg>
                    </div>
                  )}
                  <div className={`max-w-[78%] ${msg.role === 'user' ? 'bg-[#2f2f2f] rounded-2xl px-4 py-3' : 'py-1'}`}>
                    <p className="text-sm text-gray-100 whitespace-pre-wrap leading-relaxed">
                      {msg.text}
                      {msg.streaming && !msg.text && (
                        <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-0.5 rounded-sm" />
                      )}
                    </p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold">
                      U
                    </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="px-4 py-4 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2 bg-[#2f2f2f] border border-white/10 rounded-2xl px-4 py-3 focus-within:border-white/20 transition">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message LongMind…"
                rows={1}
                className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-500 resize-none focus:outline-none leading-relaxed"
                style={{ maxHeight: '200px' }}
              />
              <button
                onClick={streaming ? () => abortRef.current?.abort() : send}
                disabled={!streaming && !input.trim()}
                className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition ${
                  streaming ? 'bg-white text-[#212121] hover:bg-gray-200' :
                  input.trim() ? 'bg-white text-[#212121] hover:bg-gray-200' :
                  'bg-white/10 text-gray-600 cursor-not-allowed'
                }`}
              >
                {streaming ? <StopIcon /> : <SendIcon />}
              </button>
            </div>
            <p className="text-center text-[11px] text-gray-600 mt-2">
              LongMind remembers across sessions · Mode: <span className="text-[#10a37f]">{effectiveMode}</span>
              {!historyEnabled && <span className="text-yellow-500 ml-2">· Memory OFF — Gemini has no past context</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Memory Inspector panel */}
      {inspectorOpen && (
        <div className="w-80 shrink-0 border-l border-white/5 overflow-y-auto bg-[#1a1a1a]" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-300">Memory Inspector</h3>
              <button onClick={() => setInspectorOpen(false)} className="text-gray-600 hover:text-gray-300 text-lg leading-none">×</button>
            </div>
            <MemoryInspector context={context} />
          </div>
        </div>
      )}
    </div>
  )
}
