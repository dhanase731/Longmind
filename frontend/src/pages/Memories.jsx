import React, { useEffect, useState } from 'react'

const API = import.meta.env.VITE_API_URL || ''

const TYPES = ['', 'stm', 'episodic', 'semantic', 'ltm']
const TYPE_STYLE = {
  stm:      { dot: 'bg-yellow-400', badge: 'bg-yellow-400/10 text-yellow-300', label: 'STM' },
  episodic: { dot: 'bg-blue-400',   badge: 'bg-blue-400/10 text-blue-300',   label: 'Episodic' },
  semantic: { dot: 'bg-emerald-400',badge: 'bg-emerald-400/10 text-emerald-300', label: 'Semantic' },
  ltm:      { dot: 'bg-purple-400', badge: 'bg-purple-400/10 text-purple-300', label: 'LTM' }
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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Memory Store</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} memor{items.length === 1 ? 'y' : 'ies'} stored</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/8 transition" title="Refresh">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 bg-white/4 rounded-xl p-1 w-fit">
        {TYPES.map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${filter === t ? 'bg-[#10a37f] text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}>
            {t ? (TYPE_STYLE[t]?.label || t) : 'All'}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-8">
          <div className="w-4 h-4 border-2 border-[#10a37f] border-t-transparent rounded-full animate-spin" />
          Loading memories…
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🧠</div>
          <p className="text-gray-500 text-sm">No memories found{filter ? ` of type "${filter}"` : ''}.</p>
          <p className="text-gray-600 text-xs mt-1">Start a conversation to build memory.</p>
        </div>
      )}

      <div className="space-y-2">
        {items.map(m => {
          const style = TYPE_STYLE[m.memory_type] || { dot: 'bg-gray-500', badge: 'bg-gray-500/10 text-gray-400', label: m.memory_type }
          return (
            <div key={m.id} className="group bg-[#1e1e1e] border border-white/6 rounded-xl px-4 py-3.5 flex items-start justify-between gap-3 hover:border-white/12 transition">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-100 leading-relaxed break-words">{m.content}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${style.badge}`}>{style.label}</span>
                    <span className="text-[11px] text-gray-600">imp: {(m.importance || 0).toFixed(2)}</span>
                    <span className="text-[11px] text-gray-600">{new Date(m.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    {m.tags?.filter(Boolean).map(t => (
                      <span key={t} className="text-[11px] text-indigo-400">#{t}</span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => del(m.id)}
                className="shrink-0 text-gray-700 hover:text-red-400 transition opacity-0 group-hover:opacity-100 p-1"
                title="Delete memory"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6"/><path d="M10,11v6"/><path d="M14,11v6"/>
                </svg>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
