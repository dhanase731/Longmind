import React, { useState, useRef, useEffect } from 'react'
import MemoryInspector from '../components/MemoryInspector'

const API = import.meta.env.VITE_API_URL || ''

const MODES = ['FULL','SEMANTIC','EPISODIC','SESSION','INCOGNITO','OFF']
const MODE_DESC = {
  FULL: 'All memory types active',
  SEMANTIC: 'Semantic + STM only',
  EPISODIC: 'Episodic + STM only',
  SESSION: 'Session-only memory',
  INCOGNITO: 'No storage or retrieval',
  OFF: 'Memory disabled',
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

  useEffect(() => {
    if (!chatId) { setMessages([]); setContext(null); return }
    if (historyEnabled) {
      const stored = JSON.parse(localStorage.getItem('lm_sessions') || '[]')
      const session = stored.find(s => s.id === chatId)
      if (session) {
        setMessages((session.messages || []).filter(m => m && m.role && typeof m.text === 'string'))
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

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }, [input])

  function getSessionId() {
    if (!sessionIdRef.current) sessionIdRef.current = crypto.randomUUID()
    return sessionIdRef.current
  }

  function saveToHistory(updatedMessages, title) {
    if (!historyEnabled) return
    const id = chatId || sessionIdRef.current
    if (!id) return
    const firstUserMsg = updatedMessages?.find(m => m?.role === 'user')?.text || 'New chat'
    onSaveSession({ id, sessionId: sessionIdRef.current, title: (title || firstUserMsg).slice(0, 40), messages: updatedMessages.filter(Boolean), createdAt: new Date().toISOString() })
  }

  const effectiveMode = historyEnabled ? mode : 'OFF'

  function getToken() { return token || localStorage.getItem('token') || '' }

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
        body: JSON.stringify({
          message: msg, sessionId: getSessionId(), mode: effectiveMode,
          history: historyEnabled ? messages.filter(m => m?.role && m?.text && !m.streaming).map(m => ({ role: m.role, text: m.text })) : []
        }),
        signal: ac.signal
      })

      if (!resp.ok && resp.status === 401) { localStorage.removeItem('token'); window.location.reload(); return }
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
              if (!chunk) return
              finalText += chunk
              setMessages(prev => {
                if (!prev.length) return prev
                const copy = [...prev]
                const last = copy[copy.length - 1]
                if (!last) return prev
                copy[copy.length - 1] = { ...last, text: (last.text || '') + chunk }
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
        setMessages(prev => { const copy = [...prev]; copy[copy.length - 1] = { ...copy[copy.length - 1], text: 'Something went wrong. Please try again.' }; return copy })
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
      setMessages(prev => {
        const copy = [...prev]
        const last = copy[copy.length - 1]
        if (last?.streaming) copy[copy.length - 1] = { ...last, streaming: false }
        const firstUserMsg = copy.find(m => m?.role === 'user')?.text || 'New chat'
        saveToHistory(copy, firstUserMsg.slice(0, 40))
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
      <div className="flex flex-col flex-1 min-w-0 h-full">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2.5 shrink-0"
          style={{borderBottom:'1px solid rgba(59,130,246,0.06)', background:'rgba(8,11,17,0.8)', backdropFilter:'blur(8px)'}}>
          <div className="flex items-center gap-2">
            {historyEnabled ? (
              <div className="flex items-center gap-0.5 p-0.5 rounded-xl"
                style={{background:'rgba(59,130,246,0.05)', border:'1px solid rgba(59,130,246,0.08)'}}>
                {MODES.map(m => (
                  <button key={m} onClick={() => { setMode(m); localStorage.setItem('lm_mode', m) }}
                    title={MODE_DESC[m]}
                    className="text-[10px] px-2.5 py-1 rounded-lg font-medium transition"
                    style={mode === m
                      ? {background:'linear-gradient(135deg,#1d4ed8,#7c3aed)', color:'white'}
                      : {color:'#334155'}}
                  >{m}</button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{background:'rgba(234,179,8,0.05)', border:'1px solid rgba(234,179,8,0.1)'}}>
                <span className="w-1.5 h-1.5 rounded-full" style={{background:'#eab308'}}/>
                <span className="text-[10px] font-medium" style={{color:'#eab308'}}>History OFF — mode locked to OFF</span>
              </div>
            )}
          </div>
          <button onClick={() => setInspectorOpen(v => !v)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl transition font-medium"
            style={inspectorOpen
              ? {background:'rgba(59,130,246,0.1)', color:'#93c5fd', border:'1px solid rgba(59,130,246,0.2)'}
              : {color:'#334155', border:'1px solid rgba(59,130,246,0.08)'}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            </svg>
            Memory Inspector
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4">
              <div className="mb-8 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 animate-pulse-glow"
                  style={{background:'linear-gradient(135deg,#0f2040,#1a0a3a)', border:'1px solid rgba(59,130,246,0.2)'}}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <ellipse cx="12" cy="5" rx="9" ry="3" stroke="#3b82f6" strokeWidth="1.5"/>
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" stroke="#3b82f6" strokeWidth="1.5"/>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" stroke="#8b5cf6" strokeWidth="1.5"/>
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white mb-1">LongMind</h2>
                <p className="text-sm" style={{color:'#334155'}}>Persistent Memory · Governed Recall · Explainable Retrieval</p>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => { setInput(s); textareaRef.current?.focus() }}
                    className="text-left text-xs rounded-xl px-4 py-3 transition leading-relaxed"
                    style={{color:'#475569', background:'rgba(59,130,246,0.03)', border:'1px solid rgba(59,130,246,0.08)'}}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg, i) => (
                <div key={msg.id || i} className={`flex gap-3 animate-fade-in ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{background:'linear-gradient(135deg,#1d4ed8,#7c3aed)', border:'1px solid rgba(139,92,246,0.3)'}}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <ellipse cx="12" cy="5" rx="9" ry="3" stroke="white" strokeWidth="1.5"/>
                        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" stroke="white" strokeWidth="1.5"/>
                        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5"/>
                      </svg>
                    </div>
                  )}
                  <div className={`max-w-[78%] ${msg.role === 'user' ? 'rounded-2xl px-4 py-3' : 'py-1'}`}
                    style={msg.role === 'user' ? {background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.12)'} : {}}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{color:'#cbd5e1'}}>
                      {msg.text}
                      {msg.streaming && !msg.text && (
                        <span className="flex gap-1 items-center h-5">
                          {[0,150,300].map(d => (
                            <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce"
                              style={{background:'#1e3a5f', animationDelay:`${d}ms`}}/>
                          ))}
                        </span>
                      )}
                    </p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold"
                      style={{background:'rgba(139,92,246,0.15)', color:'#a78bfa', border:'1px solid rgba(139,92,246,0.2)'}}>
                      U
                    </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef}/>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-4 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2 rounded-2xl px-4 py-3 transition"
              style={{background:'rgba(13,17,23,0.9)', border:'1px solid rgba(59,130,246,0.12)'}}>
              <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown} placeholder="Message LongMind…" rows={1}
                className="flex-1 bg-transparent text-sm resize-none focus:outline-none leading-relaxed"
                style={{color:'#cbd5e1', maxHeight:'200px'}}
                onFocus={e => e.target.closest('div').style.borderColor='rgba(59,130,246,0.3)'}
                onBlur={e => e.target.closest('div').style.borderColor='rgba(59,130,246,0.12)'}
              />
              <button
                onClick={streaming ? () => abortRef.current?.abort() : send}
                disabled={!streaming && !input.trim()}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition disabled:opacity-30"
                style={streaming || input.trim()
                  ? {background:'linear-gradient(135deg,#1d4ed8,#7c3aed)', color:'white'}
                  : {background:'rgba(59,130,246,0.05)', color:'#1e3a5f'}}>
                {streaming ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                )}
              </button>
            </div>
            <p className="text-center text-[10px] mt-2" style={{color:'#1e2d40'}}>
              LongMind remembers across sessions · Mode: <span style={{color:'#3b82f6'}}>{effectiveMode}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Memory Inspector */}
      {inspectorOpen && (
        <div className="w-72 shrink-0 overflow-y-auto"
          style={{borderLeft:'1px solid rgba(59,130,246,0.08)', background:'#090c14'}}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded flex items-center justify-center"
                  style={{background:'rgba(59,130,246,0.1)'}}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                  </svg>
                </div>
                <h3 className="text-xs font-semibold" style={{color:'#94a3b8'}}>Memory Inspector</h3>
              </div>
              <button onClick={() => setInspectorOpen(false)}
                className="text-lg leading-none transition hover:text-white"
                style={{color:'#1e3a5f'}}>×</button>
            </div>
            <MemoryInspector context={context}/>
          </div>
        </div>
      )}
    </div>
  )
}
