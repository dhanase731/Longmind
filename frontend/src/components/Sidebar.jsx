import React, { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || ''

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6"/><path d="M10,11v6"/><path d="M14,11v6"/><path d="M9,6V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1v2"/>
    </svg>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${checked ? 'bg-green-500' : 'bg-gray-600'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-1'}`} />
    </button>
  )
}

export default function Sidebar({
  token, collapsed, onToggleCollapse,
  activeChatId, onSelectChat, onNewChat,
  historyEnabled, onToggleHistory,
  onOpenSettings, onLogout
}) {
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    if (!historyEnabled || !token) { setSessions([]); return }
    const stored = JSON.parse(localStorage.getItem('lm_sessions') || '[]')
    setSessions(stored)
  }, [historyEnabled, token, activeChatId])

  function deleteSession(id, e) {
    e.stopPropagation()
    const updated = sessions.filter(s => s.id !== id)
    setSessions(updated)
    localStorage.setItem('lm_sessions', JSON.stringify(updated))
    if (activeChatId === id) onNewChat()
  }

  // Group sessions by date
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
    <div className={`flex flex-col h-full bg-[#171717] transition-all duration-300 ${collapsed ? 'w-0 overflow-hidden' : 'w-64'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 shrink-0">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
          title="Close sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
        </button>
        <button
          onClick={onNewChat}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
          title="New chat"
        >
          <PencilIcon />
        </button>
      </div>

      {/* History Toggle */}
      <div className="px-3 py-2 shrink-0">
        <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${historyEnabled ? 'bg-green-400' : 'bg-gray-500'}`} />
            <span className="text-xs text-gray-300 font-medium">Chat History</span>
          </div>
          <Toggle checked={historyEnabled} onChange={onToggleHistory} />
        </div>
        {!historyEnabled && (
          <p className="text-[10px] text-gray-600 mt-1.5 px-1">History disabled — chats won't be saved</p>
        )}
      </div>

      {/* New Chat button */}
      <div className="px-3 pb-2 shrink-0">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 hover:text-white transition"
        >
          <span className="text-gray-500">+</span>
          New chat
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto px-2 space-y-4 pb-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
        {!historyEnabled ? (
          <div className="px-3 py-8 text-center">
            <div className="text-2xl mb-2">🔒</div>
            <p className="text-xs text-gray-600 leading-relaxed">Chat history is off.<br/>Enable it to save your conversations.</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-xs text-gray-600">No conversations yet.<br/>Start a new chat.</p>
          </div>
        ) : (
          Object.entries(groups).map(([label, items]) => items.length === 0 ? null : (
            <div key={label}>
              <p className="text-[11px] text-gray-500 font-semibold px-2 py-1 uppercase tracking-wider">{label}</p>
              <div className="space-y-0.5">
                {items.map(s => (
                  <button
                    key={s.id}
                    onClick={() => onSelectChat(s.id)}
                    className={`group w-full flex items-center justify-between gap-2 px-2 py-2 rounded-lg text-left text-sm transition ${activeChatId === s.id ? 'bg-white/15 text-white' : 'text-gray-400 hover:bg-white/8 hover:text-gray-200'}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ChatIcon />
                      <span className="truncate text-xs">{s.title || 'New chat'}</span>
                    </div>
                    <button
                      onClick={(e) => deleteSession(s.id, e)}
                      className="shrink-0 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition p-0.5"
                    >
                      <TrashIcon />
                    </button>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-2 pb-3 pt-1 border-t border-white/5 space-y-0.5">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/10 hover:text-white transition"
        >
          <SettingsIcon />
          Settings
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-white/10 hover:text-red-400 transition"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Log out
        </button>
      </div>
    </div>
  )
}
