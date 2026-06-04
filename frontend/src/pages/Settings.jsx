import React, { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || ''

function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-200 focus:outline-none"
      style={{background: checked ? 'linear-gradient(135deg,#1d4ed8,#7c3aed)' : '#0f1a28'}}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-1'}`}/>
    </button>
  )
}

const GOV_MODES = [
  { key:'FULL',      label:'Full',      desc:'All memory types active',           color:'#3b82f6' },
  { key:'SEMANTIC',  label:'Semantic',  desc:'Semantic knowledge + STM',          color:'#06b6d4' },
  { key:'EPISODIC',  label:'Episodic',  desc:'Event memories + STM',              color:'#8b5cf6' },
  { key:'SESSION',   label:'Session',   desc:'Short-term only, resets each time', color:'#10b981' },
  { key:'INCOGNITO', label:'Incognito', desc:'Runtime only, nothing stored',       color:'#f59e0b' },
  { key:'OFF',       label:'Off',       desc:'Memory completely disabled',         color:'#ef4444' },
]

export default function Settings({ token, historyEnabled, onToggleHistory }) {
  const [historyMode, setHistoryMode] = useState(() => localStorage.getItem('lm_history_mode') || (historyEnabled ? 'enabled' : 'disabled'))
  const [govMode, setGovMode] = useState(() => localStorage.getItem('lm_mode') || 'FULL')
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    localStorage.setItem('lm_history_mode', historyMode)
    const shouldEnable = historyMode === 'enabled' || historyMode === 'custom'
    if (shouldEnable !== historyEnabled) onToggleHistory(shouldEnable)
    if (historyMode === 'disabled') localStorage.removeItem('lm_sessions')
  }, [historyMode])

  async function saveGovMode() {
    setSaving(true)
    setStatus('')
    try {
      const r = await fetch(`${API}/governance/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mode: govMode })
      })
      const d = await r.json()
      localStorage.setItem('lm_mode', govMode)
      setStatus(d.ok ? `Mode set to ${govMode}` : 'Failed to save')
    } catch (e) {
      setStatus('Network error')
    } finally {
      setSaving(false)
    }
  }

  async function clearAllMemories() {
    if (!confirm('Permanently delete all stored memories?')) return
    try {
      const r = await fetch(`${API}/memories?limit=500`, { headers: { Authorization: `Bearer ${token}` } })
      const d = await r.json()
      const ids = (d.memories || []).map(m => m.id)
      await Promise.all(ids.map(id => fetch(`${API}/memories/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })))
      setStatus(`Deleted ${ids.length} memories`)
    } catch (e) { setStatus('Failed to delete memories') }
  }

  const section = (title, subtitle) => (
    <div className="mb-5">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {subtitle && <p className="text-xs mt-0.5" style={{color:'#334155'}}>{subtitle}</p>}
    </div>
  )

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-lg font-semibold text-white">Settings</h1>
        <p className="text-xs mt-1" style={{color:'#334155'}}>Manage memory, history, and governance preferences.</p>
      </div>

      {/* Chat History */}
      <section>
        {section('Chat History', 'Control how LongMind handles conversation history.')}
        <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-3"
          style={{background:'rgba(59,130,246,0.04)', border:'1px solid rgba(59,130,246,0.08)'}}>
          <div>
            <p className="text-sm font-medium text-white">History Enabled</p>
            <p className="text-xs mt-0.5" style={{color:'#334155'}}>Conversations saved in sidebar and used for context</p>
          </div>
          <Toggle checked={historyEnabled} onChange={v => setHistoryMode(v ? 'enabled' : 'disabled')}/>
        </div>
      </section>

      <div style={{height:'1px', background:'rgba(59,130,246,0.06)'}}/>

      {/* Memory Governance */}
      <section>
        {section('Memory Governance', 'Control which memory types are active. Users maintain full control over retrieval and storage.')}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {GOV_MODES.map(({ key, label, desc, color }) => (
            <button key={key} onClick={() => setGovMode(key)}
              className="text-left p-3 rounded-xl transition"
              style={govMode === key
                ? {background:`rgba(${color === '#3b82f6' ? '59,130,246' : color === '#06b6d4' ? '6,182,212' : color === '#8b5cf6' ? '139,92,246' : color === '#10b981' ? '16,185,129' : color === '#f59e0b' ? '245,158,11' : '239,68,68'},0.08)`, border:`1px solid ${color}30`}
                : {background:'rgba(59,130,246,0.02)', border:'1px solid rgba(59,130,246,0.06)'}}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{background: govMode === key ? color : '#1e3a5f'}}/>
                <span className="text-xs font-semibold" style={{color: govMode === key ? color : '#475569'}}>{label}</span>
              </div>
              <p className="text-[10px] leading-relaxed" style={{color:'#1e3a5f'}}>{desc}</p>
            </button>
          ))}
        </div>
        <button onClick={saveGovMode} disabled={saving}
          className="px-5 py-2 rounded-xl text-xs font-semibold text-white transition disabled:opacity-50"
          style={{background:'linear-gradient(135deg,#1d4ed8,#7c3aed)'}}>
          {saving ? 'Saving…' : 'Save Governance Mode'}
        </button>
      </section>

      <div style={{height:'1px', background:'rgba(59,130,246,0.06)'}}/>

      {/* Danger Zone */}
      <section>
        {section('Data & Privacy', 'Permanently remove stored memories and session data.')}
        <div className="rounded-xl p-4 space-y-4"
          style={{background:'rgba(239,68,68,0.03)', border:'1px solid rgba(239,68,68,0.12)'}}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium" style={{color:'#fca5a5'}}>Delete all memories</p>
              <p className="text-xs mt-0.5" style={{color:'#334155'}}>Permanently removes everything LongMind has learned about you.</p>
            </div>
            <button onClick={clearAllMemories}
              className="shrink-0 text-xs px-4 py-1.5 rounded-lg transition font-medium"
              style={{background:'rgba(239,68,68,0.08)', color:'#f87171', border:'1px solid rgba(239,68,68,0.2)'}}>
              Delete all
            </button>
          </div>
        </div>
      </section>

      {/* Toast */}
      {status && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in flex items-center gap-3 px-5 py-2.5 rounded-xl text-sm"
          style={{background:'rgba(13,17,23,0.95)', border:'1px solid rgba(59,130,246,0.15)', color:'#94a3b8', boxShadow:'0 0 30px rgba(59,130,246,0.1)'}}>
          {status}
          <button onClick={() => setStatus('')} style={{color:'#334155'}} className="hover:text-white">×</button>
        </div>
      )}
    </div>
  )
}
