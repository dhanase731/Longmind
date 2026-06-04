import React, { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { ThemeProvider, useTheme } from './ThemeContext'
import Chat from './pages/Chat'
import Login from './pages/Login'
import Memories from './pages/Memories'
import Settings from './pages/Settings'
import Sidebar from './components/Sidebar'

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      title={`Switch to ${theme.name === 'dark' ? 'light' : 'dark'} mode`}
      className="fixed bottom-5 right-5 z-50 w-9 h-9 rounded-xl flex items-center justify-center transition shadow-lg"
      style={{
        background: theme.name === 'dark' ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.9)',
        border: `1px solid ${theme.border}`,
        color: theme.accentBlue,
        boxShadow: theme.name === 'dark' ? '0 0 20px rgba(59,130,246,0.15)' : '0 4px 12px rgba(0,0,0,0.1)'
      }}
    >
      {theme.name === 'dark' ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  )
}

function AppShell({ token, onLogout }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { theme } = useTheme()
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
    <div className="flex h-screen overflow-hidden" style={{background: theme.bgBase, color: theme.text}}>
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

      {/* Collapsed sidebar toggle */}
      {sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="absolute left-3 top-3 z-10 p-2 rounded-lg transition"
          style={{color: theme.textFaint}}
          title="Open sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
        </button>
      )}
      <ThemeToggle />

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
            <div className="flex-1 overflow-y-auto px-8 py-8 max-w-3xl mx-auto w-full">
              <Memories token={token} />
            </div>
          } />
          <Route path="/settings" element={
            <div className="flex-1 overflow-y-auto px-8 py-8 max-w-2xl mx-auto w-full">
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

  if (!token) return (
    <ThemeProvider>
      <Login onLogin={onLogin} />
    </ThemeProvider>
  )

  return (
    <ThemeProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppShell token={token} onLogout={onLogout} />
      </BrowserRouter>
    </ThemeProvider>
  )
}
