import React, { useEffect, useState } from 'react'

const API = import.meta.env.VITE_API_URL || ''

const TYPES = ['', 'stm', 'episodic', 'semantic', 'ltm']
const TYPE_CONFIG = {
  stm:      { label: 'STM',      color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  dot: '#f59e0b' },
  episodic: { label: 'Episodic', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  dot: '#3b82f6' },
  semantic: { label: 'Semantic', color: '#06b6d4', bg: 'rgba(6,182,212,0.08)',   dot: '#06b6d4' },
  ltm:      { label: 'LTM',      color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', dot: '#8b5cf6' },
}

export default function Memories({ token }) {
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const auth = { Authorization: `Bearer ${token}` }

  async function load() {
    setLoading(true)
    try {
      const qs = filter ? `?type=${filter}` : ''
      const r = await fetch(`${API}/memories${qs}`, { headers: auth })
      const d = await r.json()
      setItems(d.memories || [])
    } catch (e) {
      console.warn('memories load failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  async function del(id) {
    try {
      await fetch(`${API}/memories/${id}`, { method: 'DELETE', headers: auth })
      setItems(prev => prev.filter(m => m.id !== id))
    } catch (e) {}
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-white">Memory Store</h1>
          <p className="text-xs mt-0.5" style={{color:'#334155'}}>
            {items.length} memor{items.length === 1 ? 'y' : 'ies'} stored
          </p>
        </div>
        <button onClick={load}
          className="p-2 rounded-xl transition"
          style={{color:'#334155', border:'1px solid rgba(59,130,246,0.08)'}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit"
        style={{background:'rgba(59,130,246,0.04)', border:'1px solid rgba(59,130,246,0.08)'}}>
        {TYPES.map(t => {
          const conf = TYPE_CONFIG[t]
          return (
            <button key={t} onClick={() => setFilter(t)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition"
              style={filter === t
                ? {background:'linear-gradient(135deg,#1d4ed8,#7c3aed)', color:'white'}
                : {color:'#334155'}}>
              {t ? (conf?.label || t) : 'All'}
            </button>
          )
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-xs py-8" style={{color:'#334155'}}>
          <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
            style={{borderColor:'rgba(59,130,246,0.3)', borderTopColor:'#3b82f6'}}/>
          Loading memories…
        </div>
      )}

      {/* Empty */}
      {!loading && items.length === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{background:'rgba(59,130,246,0.05)', border:'1px solid rgba(59,130,246,0.08)'}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <ellipse cx="12" cy="5" rx="9" ry="3" stroke="#1e3a5f" strokeWidth="1.5"/>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" stroke="#1e3a5f" strokeWidth="1.5"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" stroke="#1e3a5f" strokeWidth="1.5"/>
            </svg>
          </div>
          <p className="text-sm" style={{color:'#334155'}}>No memories found{filter ? ` of type "${filter}"` : ''}.</p>
          <p className="text-xs mt-1" style={{color:'#1e2d40'}}>Start a conversation to build memory.</p>
        </div>
      )}

      {/* Memory cards */}
      <div className="space-y-2">
        {items.map(m => {
          const conf = TYPE_CONFIG[m.memory_type] || { label: m.memory_type, color: '#475569', bg: 'rgba(255,255,255,0.03)', dot: '#475569' }
          const imp = m.importance || 0
          return (
            <div key={m.id}
              className="group rounded-xl px-4 py-3.5 flex items-start justify-between gap-3 transition"
              style={{background:'rgba(13,17,23,0.8)', border:'1px solid rgba(59,130,246,0.06)'}}>
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{background: conf.dot}}/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-relaxed break-words" style={{color:'#cbd5e1'}}>{m.content}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                      style={{color: conf.color, background: conf.bg}}>{conf.label}</span>
                    <div className="flex items-center gap-1">
                      <div className="w-12 h-0.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.05)'}}>
                        <div className="h-full rounded-full score-bar" style={{width:`${imp*100}%`}}/>
                      </div>
                      <span className="text-[10px] tabular-nums" style={{color:'#334155'}}>{imp.toFixed(2)}</span>
                    </div>
                    <span className="text-[10px]" style={{color:'#1e3a5f'}}>
                      {new Date(m.created_at).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' })}
                    </span>
                    {m.tags?.filter(Boolean).map(t => (
                      <span key={t} className="text-[10px]" style={{color:'#334155'}}>#{t}</span>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={() => del(m.id)}
                className="shrink-0 transition opacity-0 group-hover:opacity-100 p-1"
                style={{color:'#1e3a5f'}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6"/>
                  <path d="M10,11v6"/><path d="M14,11v6"/>
                </svg>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
