import React, { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || ''

function Toggle({ checked, onChange, size = 'md' }) {
  const h = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11'
  const dot = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4.5 w-4.5'
  const on = size === 'sm' ? 'translate-x-4' : 'translate-x-6'
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex ${h} items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10a37f] ${checked ? 'bg-[#10a37f]' : 'bg-[#3a3a3a]'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${checked ? on : 'translate-x-1'}`} />
    </button>
  )
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold text-gray-100">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  )
}

function HistoryCard({ id, active, icon, title, description, badge, onSelect, children }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-150 ${
        active
          ? 'border-[#10a37f] bg-[#10a37f]/8'
          : 'border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-lg ${active ? 'bg-[#10a37f]/20' : 'bg-white/8'}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-gray-100">{title}</span>
            {badge && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide ${
                badge === 'Default' ? 'bg-[#10a37f]/20 text-[#10a37f]' :
                badge === 'Private' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-indigo-500/20 text-indigo-400'
              }`}>{badge}</span>
            )}
            {active && (
              <span className="ml-auto w-4 h-4 rounded-full bg-[#10a37f] flex items-center justify-center shrink-0">
                <svg width="9" height="9" viewBox="0 0 12 12" fill="white">
                  <polyline points="2,6 5,9 10,3" strokeWidth="1.5" stroke="white" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </button>
  )
}

function Divider() {
  return <div className="border-t border-white/5 my-6" />
}

export default function Settings({ token, historyEnabled, onToggleHistory }) {
  // 'enabled' | 'disabled' | 'custom'
  const [historyMode, setHistoryMode] = useState(() => {
    const saved = localStorage.getItem('lm_history_mode')
    return saved || (historyEnabled ? 'enabled' : 'disabled')
  })

  const [govMode, setGovMode] = useState(() => localStorage.getItem('lm_mode') || 'FULL')
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)

  // custom sub-options
  const [customRetrieval, setCustomRetrieval] = useState(() =>
    localStorage.getItem('lm_custom_retrieval') !== 'false'
  )
  const [customStorage, setCustomStorage] = useState(() =>
    localStorage.getItem('lm_custom_storage') !== 'false'
  )
  const [customShowInspector, setCustomShowInspector] = useState(() =>
    localStorage.getItem('lm_custom_inspector') !== 'false'
  )

  // Sync historyMode → historyEnabled toggle in parent
  useEffect(() => {
    localStorage.setItem('lm_history_mode', historyMode)
    const shouldEnable = historyMode === 'enabled' || historyMode === 'custom'
    if (shouldEnable !== historyEnabled) onToggleHistory(shouldEnable)
    if (historyMode === 'disabled') localStorage.removeItem('lm_sessions')
  }, [historyMode])

  function saveCustom(key, val, setter) {
    setter(val)
    localStorage.setItem(key, String(val))
  }

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
      setStatus(d.ok ? `Memory mode set to ${govMode}` : 'Failed')
    } catch (e) {
      setStatus('Network error')
    } finally {
      setSaving(false)
    }
  }

  async function clearSession() {
    const sessionId = localStorage.getItem('sessionId')
    if (!sessionId) return setStatus('No active session to clear')
    try {
      await fetch(`${API}/memories/session/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      localStorage.removeItem('sessionId')
      setStatus('Current session cleared')
    } catch (e) { setStatus('Failed to clear session') }
  }

  async function clearAllMemories() {
    if (!confirm('This will permanently delete all your stored memories. Continue?')) return
    try {
      const r = await fetch(`${API}/memories?limit=500`, { headers: { Authorization: `Bearer ${token}` } })
      const d = await r.json()
      const ids = (d.memories || []).map(m => m.id)
      await Promise.all(ids.map(id =>
        fetch(`${API}/memories/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      ))
      setStatus(`Deleted ${ids.length} memories`)
    } catch (e) { setStatus('Failed to delete memories') }
  }

  const GOV_MODES = [
    { key: 'FULL',      label: 'Full',      desc: 'All memory: stm, episodic, semantic, ltm' },
    { key: 'SEMANTIC',  label: 'Semantic',  desc: 'Semantic knowledge + short-term memory' },
    { key: 'EPISODIC',  label: 'Episodic',  desc: 'Event memories + short-term memory' },
    { key: 'SESSION',   label: 'Session',   desc: 'Short-term only — resets each session' },
    { key: 'INCOGNITO', label: 'Incognito', desc: 'Runtime only — nothing stored or retrieved' },
    { key: 'OFF',       label: 'Off',       desc: 'Memory completely disabled' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your memory, history, and governance preferences.</p>
      </div>

      {/* ── CHAT HISTORY ── */}
      <section>
        <SectionHeader
          title="Chat History"
          subtitle="Choose how LongMind handles your conversation history."
        />

        <div className="space-y-3">
          {/* Card 1 — Enabled */}
          <HistoryCard
            id="enabled"
            active={historyMode === 'enabled'}
            icon="🗂️"
            title="History Enabled"
            badge="Default"
            description="All conversations are saved in the sidebar. LongMind remembers across sessions and uses past context to improve responses."
            onSelect={() => setHistoryMode('enabled')}
          />

          {/* Card 2 — Disabled */}
          <HistoryCard
            id="disabled"
            active={historyMode === 'disabled'}
            icon="🚫"
            title="History Off — Fresh Start"
            badge="Private"
            description="Conversations are not saved. Each chat starts fresh with no memory of prior sessions. Great for private or one-off tasks."
            onSelect={() => setHistoryMode('disabled')}
          />

          {/* Card 3 — Customizable */}
          <HistoryCard
            id="custom"
            active={historyMode === 'custom'}
            icon="⚙️"
            title="Customizable"
            badge="Advanced"
            description="Fine-grained control over what gets saved and retrieved. Toggle individual memory behaviors below."
            onSelect={() => setHistoryMode('custom')}
          >
            {historyMode === 'custom' && (
              <div className="space-y-3 pt-1" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-300">Memory Retrieval</p>
                    <p className="text-[11px] text-gray-600">Use stored memories to inform responses</p>
                  </div>
                  <Toggle
                    checked={customRetrieval}
                    onChange={v => saveCustom('lm_custom_retrieval', v, setCustomRetrieval)}
                    size="sm"
                  />
                </div>
                <div className="border-t border-white/5" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-300">Memory Storage</p>
                    <p className="text-[11px] text-gray-600">Extract and save new memories from conversations</p>
                  </div>
                  <Toggle
                    checked={customStorage}
                    onChange={v => saveCustom('lm_custom_storage', v, setCustomStorage)}
                    size="sm"
                  />
                </div>
                <div className="border-t border-white/5" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-300">Show Memory Inspector</p>
                    <p className="text-[11px] text-gray-600">Display retrieval scores in the sidebar</p>
                  </div>
                  <Toggle
                    checked={customShowInspector}
                    onChange={v => saveCustom('lm_custom_inspector', v, setCustomShowInspector)}
                    size="sm"
                  />
                </div>
              </div>
            )}
          </HistoryCard>
        </div>

        {/* Global history toggle shortcut */}
        <div className="mt-4 flex items-center justify-between bg-white/3 border border-white/8 rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-200">History Enabled</p>
            <p className="text-xs text-gray-500">Quick toggle — mirrors the setting above</p>
          </div>
          <Toggle checked={historyEnabled} onChange={(v) => {
            setHistoryMode(v ? 'enabled' : 'disabled')
          }} />
        </div>
      </section>

      <Divider />

      {/* ── MEMORY GOVERNANCE ── */}
      <section>
        <SectionHeader
          title="Memory Governance"
          subtitle="Control which types of memories are active during your sessions."
        />
        <div className="grid grid-cols-2 gap-2 mb-4">
          {GOV_MODES.map(({ key, label, desc }) => (
            <button
              key={key}
              onClick={() => setGovMode(key)}
              className={`text-left p-3 rounded-xl border transition ${
                govMode === key
                  ? 'border-[#10a37f] bg-[#10a37f]/8'
                  : 'border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-gray-100">{label}</span>
                {govMode === key && (
                  <span className="ml-auto w-3.5 h-3.5 rounded-full bg-[#10a37f] flex items-center justify-center">
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                      <polyline points="2,6 5,9 10,3" strokeWidth="1.5" stroke="white" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">{desc}</p>
            </button>
          ))}
        </div>
        <button
          onClick={saveGovMode}
          disabled={saving}
          className="px-5 py-2 bg-[#10a37f] hover:bg-[#0d8f6f] text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Governance Mode'}
        </button>
      </section>

      <Divider />

      {/* ── DANGER ZONE ── */}
      <section>
        <SectionHeader
          title="Data & Privacy"
          subtitle="Permanently remove stored memories and session data."
        />
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-200">Clear current session</p>
              <p className="text-xs text-gray-500 mt-0.5">Removes memories from your active session only.</p>
            </div>
            <button
              onClick={clearSession}
              className="shrink-0 text-sm px-4 py-1.5 bg-white/8 hover:bg-white/12 text-gray-300 rounded-lg border border-white/10 transition"
            >
              Clear session
            </button>
          </div>
          <div className="border-t border-white/5" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-red-300">Delete all memories</p>
              <p className="text-xs text-gray-500 mt-0.5">Permanently removes everything LongMind has learned about you.</p>
            </div>
            <button
              onClick={clearAllMemories}
              className="shrink-0 text-sm px-4 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg border border-red-500/30 transition"
            >
              Delete all
            </button>
          </div>
        </div>
      </section>

      {/* Status toast */}
      {status && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#2f2f2f] border border-white/10 text-gray-200 text-sm px-5 py-2.5 rounded-xl shadow-xl z-50 animate-fade-in">
          {status}
          <button onClick={() => setStatus('')} className="ml-3 text-gray-500 hover:text-gray-300">×</button>
        </div>
      )}
    </div>
  )
}
