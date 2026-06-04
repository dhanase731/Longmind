import React, { useState, useEffect } from 'react'
import { useTheme } from '../ThemeContext'

const API = import.meta.env.VITE_API_URL || ''

const GOV_MODES = [
  { key:'FULL',      label:'Full',      desc:'All memory types active',           color:'#3b82f6' },
  { key:'SEMANTIC',  label:'Semantic',  desc:'Semantic knowledge + STM',          color:'#06b6d4' },
  { key:'EPISODIC',  label:'Episodic',  desc:'Event memories + STM',              color:'#8b5cf6' },
  { key:'SESSION',   label:'Session',   desc:'Short-term only, resets each time', color:'#10b981' },
  { key:'INCOGNITO', label:'Incognito', desc:'Runtime only, nothing stored',       color:'#f59e0b' },
  { key:'OFF',       label:'Off',       desc:'Memory completely disabled',         color:'#ef4444' },
]

export default function Settings({ token, historyEnabled, onToggleHistory }) {
  const { theme } = useTheme()
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
    setSaving(true); setStatus('')
    try {
      const r = await fetch(`${API}/governance/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mode: govMode })
      })
      const d = await r.json()
      localStorage.setItem('lm_mode', govMode)
      setStatus(d.ok ? `Mode set to ${govMode}` : 'Failed to save')
    } catch (e) { setStatus('Network error') } finally { setSaving(false) }
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

  const SectionHead = ({ title, subtitle }) => (
    <div className="mb-5">
      <h2 className="text-sm font-semibold" style={{color: theme.text}}>{title}</h2>
      {subtitle && <p className="text-xs mt-0.5" style={{color: theme.textDim}}>{subtitle}</p>}
    </div>
  )

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-lg font-semibold" style={{color: theme.text}}>Settings</h1>
        <p className="text-xs mt-1" style={{color: theme.textDim}}>Manage memory, history, and governance preferences.</p>
      </div>

      {/* Chat History */}
      <section>
        <SectionHead title="Chat History" subtitle="Control how LongMind handles conversation history."/>
        <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-3"
          style={{background:`${theme.accentBlue}08`, border:`1px solid ${theme.border}`}}>
          <div>
            <p className="text-sm font-medium" style={{color: theme.text}}>History Enabled</p>
            <p className="text-xs mt-0.5" style={{color: theme.textDim}}>Conversations saved in sidebar and used for context</p>
          </div>
          <button onClick={() => setHistoryMode(historyEnabled ? 'disabled' : 'enabled')}
            className="relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-200"
            style={{background: historyEnabled ? theme.gradient : theme.toggleOff}}>
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${historyEnabled ? 'translate-x-4' : 'translate-x-1'}`}/>
          </button>
        </div>
      </section>

      <div style={{height:'1px', background: theme.border}}/>

      {/* Memory Governance */}
      <section>
        <SectionHead title="Memory Governance" subtitle="Control which memory types are active. Users maintain full control over retrieval and storage."/>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {GOV_MODES.map(({ key, label, desc, color }) => (
            <button key={key} onClick={() => setGovMode(key)}
              className="text-left p-3 rounded-xl transition"
              style={govMode === key
                ? {background:`${color}14`, border:`1px solid ${color}40`}
                : {background:`${theme.accentBlue}05`, border:`1px solid ${theme.border}`}}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{background: govMode === key ? color : theme.textGhost}}/>
                <span className="text-xs font-semibold" style={{color: govMode === key ? color : theme.textFaint}}>{label}</span>
              </div>
              <p className="text-[10px] leading-relaxed" style={{color: theme.textGhost}}>{desc}</p>
            </button>
          ))}
        </div>
        <button onClick={saveGovMode} disabled={saving}
          className="px-5 py-2 rounded-xl text-xs font-semibold text-white transition disabled:opacity-50"
          style={{background: theme.gradient}}>
          {saving ? 'Saving…' : 'Save Governance Mode'}
        </button>
      </section>

      <div style={{height:'1px', background: theme.border}}/>

      {/* Danger Zone */}
      <section>
        <SectionHead title="Data & Privacy" subtitle="Permanently remove stored memories and session data."/>
        <div className="rounded-xl p-4" style={{background:'rgba(239,68,68,0.04)', border:'1px solid rgba(239,68,68,0.15)'}}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium" style={{color:'#fca5a5'}}>Delete all memories</p>
              <p className="text-xs mt-0.5" style={{color: theme.textDim}}>Permanently removes everything LongMind has learned about you.</p>
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
          style={{background: theme.bgElevated, border:`1px solid ${theme.border}`, color: theme.textMuted, boxShadow:'0 0 30px rgba(59,130,246,0.1)'}}>
          {status}
          <button onClick={() => setStatus('')} style={{color: theme.textGhost}} className="hover:text-white">×</button>
        </div>
      )}
    </div>
  )
}
