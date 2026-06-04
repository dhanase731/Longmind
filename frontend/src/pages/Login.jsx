import React, { useState } from 'react'
import { useTheme } from '../ThemeContext'

const API = import.meta.env.VITE_API_URL || ''

export default function Login({ onLogin }) {
  const { theme } = useTheme()
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('demo@longmind.dev')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const url = tab === 'login' ? `${API}/auth/login` : `${API}/auth/register`
      const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password}) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || (tab === 'login' ? 'Login failed' : 'Registration failed'))
      if (tab === 'register') {
        const lr = await fetch(`${API}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password}) })
        const ld = await lr.json()
        if (!lr.ok) throw new Error(ld.error || 'Login after register failed')
        onLogin(ld.token)
      } else { onLogin(d.token) }
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  const inputStyle = {
    background: theme.name === 'dark' ? 'rgba(255,255,255,0.04)' : theme.bgElevated,
    border: `1px solid ${theme.border}`,
    color: theme.text,
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{background: theme.bgBase}}>
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{background: theme.accentBlue, top:'20%', left:'20%'}}/>
        <div className="absolute w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{background: theme.accentPurple, bottom:'20%', right:'20%'}}/>
      </div>

      <div className="relative z-10 w-full max-w-sm px-4 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 animate-pulse-glow"
            style={{background: theme.logoBg, border:`1px solid ${theme.logoBorder}`}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <ellipse cx="12" cy="5" rx="9" ry="3" stroke={theme.accentBlue} strokeWidth="1.5"/>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" stroke={theme.accentBlue} strokeWidth="1.5"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" stroke={theme.accentPurple} strokeWidth="1.5"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{color: theme.text}}>LongMind</h1>
          <p className="text-sm mt-1" style={{color: theme.textFaint}}>Universal Memory Infrastructure for AI</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6" style={{
          background: theme.bgCard,
          border: `1px solid ${theme.border}`,
          boxShadow: `0 0 40px ${theme.accentBlue}12`
        }}>
          {/* Tabs */}
          <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{background:`${theme.accentBlue}08`}}>
            {['login','register'].map(t => (
              <button key={t} onClick={() => { setTab(t); setError('') }}
                className="flex-1 text-sm py-1.5 rounded-lg transition font-medium"
                style={tab === t ? {background: theme.gradient, color:'white'} : {color: theme.textFaint}}>
                {t === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            <input
              className="w-full rounded-xl px-4 py-2.5 text-sm placeholder-slate-400 focus:outline-none transition"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor=`${theme.accentBlue}66`}
              onBlur={e => e.target.style.borderColor=theme.border}
              type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} required
            />
            <input
              className="w-full rounded-xl px-4 py-2.5 text-sm placeholder-slate-400 focus:outline-none transition"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor=`${theme.accentBlue}66`}
              onBlur={e => e.target.style.borderColor=theme.border}
              type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)} required
            />
            {error && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{color:'#f87171', background:'rgba(239,68,68,0.08)'}}>
                {error}
              </p>
            )}
            <button className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50"
              style={{background: theme.gradient}} disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  {tab === 'login' ? 'Signing in…' : 'Creating…'}
                </span>
              ) : tab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {tab === 'login' && (
            <p className="text-xs text-center mt-4" style={{color: theme.textGhost}}>
              Demo: demo@longmind.dev / password123
            </p>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{color: theme.textGhost}}>
          Persistent Memory · Governed Recall · Explainable Retrieval
        </p>
      </div>
    </div>
  )
}
