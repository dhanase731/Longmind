import React, { useState } from 'react'

const API = import.meta.env.VITE_API_URL || ''

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
        // auto-login after register
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
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-indigo-400 mb-1">LongMind</h1>
        <p className="text-gray-500 text-sm mb-6">Universal AI Memory Infrastructure</p>
        <div className="flex gap-1 mb-5 bg-gray-800 rounded-lg p-1">
          {['login', 'register'].map(t => (
            <button key={t} onClick={() => { setTab(t); setError('') }}
              className={`flex-1 text-sm py-1.5 rounded-md transition font-medium ${tab === t ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-100'}`}>
              {t === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500"
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required
          />
          <input
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500"
            type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} required
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-semibold transition disabled:opacity-50"
            disabled={loading}
          >
            {loading ? '...' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        {tab === 'login' && (
          <p className="text-xs text-gray-600 text-center mt-4">Demo: demo@longmind.dev / password123</p>
        )}
      </div>
    </div>
  )
}
