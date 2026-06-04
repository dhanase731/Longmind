import React, { useState } from 'react'

const API = import.meta.env.VITE_API_URL || ''

function NeuralBg() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g1" cx="30%" cy="40%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>
        <radialGradient id="g2" cx="70%" cy="60%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g1)"/>
      <rect width="100%" height="100%" fill="url(#g2)"/>
      {[...Array(12)].map((_, i) => (
        <circle key={i} cx={`${10 + i * 8}%`} cy={`${20 + (i % 4) * 20}%`}
          r="1.5" fill="#3b82f6" opacity="0.4"/>
      ))}
      {[...Array(8)].map((_, i) => (
        <line key={i}
          x1={`${10 + i * 11}%`} y1={`${20 + (i % 4) * 20}%`}
          x2={`${18 + i * 11}%`} y2={`${40 + (i % 3) * 15}%`}
          stroke="#3b82f6" strokeOpacity="0.15" strokeWidth="0.5"/>
      ))}
    </svg>
  )
}

export default function Login({ onLogin }) {
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('demo@longmind.dev')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const url = tab === 'login' ? `${API}/auth/login` : `${API}/auth/register`
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || (tab === 'login' ? 'Login failed' : 'Registration failed'))
      if (tab === 'register') {
        const lr = await fetch(`${API}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        })
        const ld = await lr.json()
        if (!lr.ok) throw new Error(ld.error || 'Login after register failed')
        onLogin(ld.token)
      } else {
        onLogin(d.token)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{background:'#080b11'}}>
      <NeuralBg />

      <div className="relative z-10 w-full max-w-sm px-4 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 animate-pulse-glow"
            style={{background:'linear-gradient(135deg,#1e3a5f,#1e1040)', border:'1px solid rgba(59,130,246,0.3)'}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <ellipse cx="12" cy="5" rx="9" ry="3" stroke="#3b82f6" strokeWidth="1.5"/>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" stroke="#3b82f6" strokeWidth="1.5"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" stroke="#8b5cf6" strokeWidth="1.5"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">LongMind</h1>
          <p className="text-sm mt-1" style={{color:'#64748b'}}>Universal Memory Infrastructure for AI</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6" style={{
          background:'rgba(13,17,23,0.9)',
          border:'1px solid rgba(59,130,246,0.12)',
          boxShadow:'0 0 40px rgba(59,130,246,0.08)'
        }}>
          {/* Tabs */}
          <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{background:'rgba(255,255,255,0.04)'}}>
            {['login','register'].map(t => (
              <button key={t} onClick={() => { setTab(t); setError('') }}
                className="flex-1 text-sm py-1.5 rounded-lg transition font-medium"
                style={tab === t
                  ? {background:'linear-gradient(135deg,#1d4ed8,#7c3aed)', color:'white'}
                  : {color:'#64748b'}}
              >
                {t === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <input
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition"
                style={{
                  background:'rgba(255,255,255,0.04)',
                  border:'1px solid rgba(59,130,246,0.12)',
                }}
                onFocus={e => e.target.style.borderColor='rgba(59,130,246,0.4)'}
                onBlur={e => e.target.style.borderColor='rgba(59,130,246,0.12)'}
                type="email" placeholder="Email" value={email}
                onChange={e => setEmail(e.target.value)} required
              />
            </div>
            <div>
              <input
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition"
                style={{
                  background:'rgba(255,255,255,0.04)',
                  border:'1px solid rgba(59,130,246,0.12)',
                }}
                onFocus={e => e.target.style.borderColor='rgba(59,130,246,0.4)'}
                onBlur={e => e.target.style.borderColor='rgba(59,130,246,0.12)'}
                type="password" placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)} required
              />
            </div>
            {error && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{color:'#f87171',background:'rgba(239,68,68,0.08)'}}>
                {error}
              </p>
            )}
            <button
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50"
              style={{background:'linear-gradient(135deg,#1d4ed8,#7c3aed)'}}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  {tab === 'login' ? 'Signing in…' : 'Creating…'}
                </span>
              ) : tab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {tab === 'login' && (
            <p className="text-xs text-center mt-4" style={{color:'#334155'}}>
              Demo: demo@longmind.dev / password123
            </p>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{color:'#1e2d40'}}>
          Persistent Memory · Governed Recall · Explainable Retrieval
        </p>
      </div>
    </div>
  )
}
