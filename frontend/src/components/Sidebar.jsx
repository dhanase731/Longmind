import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || ''

const NAV = [
  { path: '/chat', label: 'Chat', icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )},
  { path: '/memories', label: 'Memories', icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>
  )},
  { path: '/settings', label: 'Settings', icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )},
]

function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-200 focus:outline-none"
      style={{background: checked ? 'linear-gradient(135deg,#1d4ed8,#7c3aed)' : '#1e2d40'}}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-1'}`}/>
    </button>
  )
}

export default function Sidebar({ token, collapsed, onToggleCollapse, activeChatId, onSelectChat, onNewChat, historyEnabled, onToggleHistory, onLogout }) {
  const [sessions, setSessions] = useState([])
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!historyEnabled || !token) { setSessions([]); return }
    const sync = () => setSessions(JSON.parse(localStorage.getItem('lm_sessions') || '[]'))
    sync()
    window.addEventListener('lm_sessions_updated', sync)
    return () => window.removeEventListener('lm_sessions_updated', sync)
  }, [historyEnabled, token])

  function deleteSession(id, e) {
    e.stopPropagation()
    const updated = sessions.filter(s => s.id !== id)
    setSessions(updated)
    localStorage.setItem('lm_sessions', JSON.stringify(updated))
    if (activeChatId === id) onNewChat()
  }

  function groupByDate(sessions) {
    const today = new Date(); today.setHours(0,0,0,0)
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate()-1)
    const week = new Date(today); week.setDate(week.getDate()-7)
    const groups = { Today: [], Yesterday: [], 'Previous 7 Days': [], Older: [] }
    sessions.forEach(s => {
      const d = new Date(s.createdAt)
      if (d >= today) groups['Today'].push(s)
      else if (d >= yesterday) groups['Yesterday'].push(s)
      else if (d >= week) groups['Previous 7 Days'].push(s)
      else groups['Older'].push(s)
    })
    return groups
  }

  const groups = groupByDate(sessions)

  return (
    <div className={`flex flex-col h-full transition-all duration-300 shrink-0 ${collapsed ? 'w-0 overflow-hidden' : 'w-64'}`}
      style={{background:'#0a0e17', borderRight:'1px solid rgba(59,130,246,0.08)'}}>

      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-4 pb-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{background:'linear-gradient(135deg,#1e3a5f,#1e1040)', border:'1px solid rgba(59,130,246,0.2)'}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <ellipse cx="12" cy="5" rx="9" ry="3" stroke="#3b82f6" strokeWidth="1.5"/>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" stroke="#3b82f6" strokeWidth="1.5"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" stroke="#8b5cf6" strokeWidth="1.5"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-white">LongMind</span>
        </div>
        <button onClick={onToggleCollapse}
          className="p-1.5 rounded-lg transition hover:bg-white/5"
          style={{color:'#334155'}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
        </button>
      </div>

      {/* Nav */}
      <div className="px-2 pb-2 shrink-0">
        {NAV.map(n => (
          <button key={n.path} onClick={() => navigate(n.path)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition mb-0.5"
            style={location.pathname === n.path
              ? {background:'rgba(59,130,246,0.1)', color:'#93c5fd', border:'1px solid rgba(59,130,246,0.15)'}
              : {color:'#475569', border:'1px solid transparent'}}
          >
            {n.icon}
            {n.label}
          </button>
        ))}
      </div>

      <div className="mx-3 mb-3 shrink-0" style={{height:'1px', background:'rgba(59,130,246,0.06)'}}/>

      {/* History toggle */}
      <div className="px-3 pb-2 shrink-0">
        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
          style={{background:'rgba(59,130,246,0.05)', border:'1px solid rgba(59,130,246,0.08)'}}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{background: historyEnabled ? '#3b82f6' : '#1e3a5f'}}/>
            <span className="text-xs font-medium" style={{color:'#94a3b8'}}>Chat History</span>
          </div>
          <Toggle checked={historyEnabled} onChange={onToggleHistory}/>
        </div>
      </div>

      {/* New chat */}
      <div className="px-2 pb-2 shrink-0">
        <button onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition"
          style={{color:'#3b82f6', border:'1px solid rgba(59,130,246,0.15)', background:'rgba(59,130,246,0.05)'}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Chat
        </button>
      </div>

      {/* Sessions */}
      <div className="flex-1 overflow-y-auto px-2 space-y-3 pb-2">
        {!historyEnabled ? (
          <div className="px-3 py-8 text-center">
            <p className="text-xs" style={{color:'#1e3a5f'}}>History off.<br/>Enable to save conversations.</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-xs" style={{color:'#1e3a5f'}}>No conversations yet.</p>
          </div>
        ) : (
          Object.entries(groups).map(([label, items]) => items.length === 0 ? null : (
            <div key={label}>
              <p className="text-[10px] font-semibold px-2 py-1 uppercase tracking-wider" style={{color:'#1e3a5f'}}>{label}</p>
              <div className="space-y-0.5">
                {items.map(s => (
                  <button key={s.id} onClick={() => onSelectChat(s.id)}
                    className="group w-full flex items-center justify-between gap-2 px-2 py-2 rounded-lg text-left text-xs transition"
                    style={activeChatId === s.id
                      ? {background:'rgba(59,130,246,0.08)', color:'#93c5fd'}
                      : {color:'#334155'}}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      <span className="truncate">{s.title || 'New chat'}</span>
                    </div>
                    <button onClick={e => deleteSession(s.id, e)}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition p-0.5 hover:text-red-400">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6"/>
                      </svg>
                    </button>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-2 pb-3 pt-2" style={{borderTop:'1px solid rgba(59,130,246,0.06)'}}>
        <button onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition"
          style={{color:'#334155'}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Log out
        </button>
      </div>
    </div>
  )
}
