import React, { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Chat from './pages/Chat'
import Login from './pages/Login'
import Memories from './pages/Memories'
import Settings from './pages/Settings'
import Sidebar from './components/Sidebar'

function AppShell({ token, onLogout }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeChatId, setActiveChatId] = useState(null)
  const [historyEnabled, setHistoryEnabled] = useState(
    () => localStorage.getItem('lm_history_enabled') !== 'false'
  )
  const navigate = useNavigate()

  function toggleHistory(val) {
    setHistoryEnabled(val)
    localStorage.setItem('lm_history_enabled', String(val))
  }

  function handleNewChat() {
    const id = crypto.randomUUID()
    setActiveChatId(id)
    navigate('/chat')
  }

  // Auto-init a chat ID if none exists
  React.useEffect(() => {
    if (!activeChatId) {
      const stored = JSON.parse(localStorage.getItem('lm_sessions') || '[]')
      if (stored.length > 0) setActiveChatId(stored[0].id)
      else handleNewChat()
    }
  }, [])

  function handleSelectChat(id) {
    setActiveChatId(id)
    navigate('/chat')
  }

  const handleSaveSession = useCallback((sessionData) => {
    if (!historyEnabled) return
    const stored = JSON.parse(localStorage.getItem('lm_sessions') || '[]')
    const idx = stored.findIndex(s => s.id === sessionData.id)
    if (idx >= 0) stored[idx] = sessionData
    else stored.unshift(sessionData)
    localStorage.setItem('lm_sessions', JSON.stringify(stored.slice(0, 100)))
    window.dispatchEvent(new Event('lm_sessions_updated'))
  }, [historyEnabled])

  return (
    <div className="flex h-screen bg-[#212121] text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        token={token}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(v => !v)}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        historyEnabled={historyEnabled}
        onToggleHistory={toggleHistory}
        onOpenSettings={() => navigate('/settings')}
        onLogout={onLogout}
      />

      {/* Collapsed sidebar toggle button */}
      {sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="absolute left-3 top-3 z-10 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
          title="Open sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
        </button>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Routes>
          <Route
            path="/chat"
            element={
              <Chat
                token={token}
                chatId={activeChatId}
                historyEnabled={historyEnabled}
                onSaveSession={handleSaveSession}
                onNewChat={handleNewChat}
                sidebarCollapsed={sidebarCollapsed}
              />
            }
          />
          <Route path="/memories" element={
            <div className="flex-1 overflow-y-auto p-8 max-w-3xl mx-auto w-full">
              <Memories token={token} />
            </div>
          } />
          <Route path="/settings" element={
            <div className="flex-1 overflow-y-auto p-8 max-w-2xl mx-auto w-full">
              <Settings
                token={token}
                historyEnabled={historyEnabled}
                onToggleHistory={toggleHistory}
              />
            </div>
          } />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))

  function onLogin(t) { localStorage.setItem('token', t); setToken(t) }
  function onLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('sessionId')
    setToken(null)
  }

  if (!token) return <Login onLogin={onLogin} />

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppShell token={token} onLogout={onLogout} />
    </BrowserRouter>
  )
}
