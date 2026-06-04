import React from 'react'

const TYPE_CONFIG = {
  stm:      { label: 'STM',      color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  episodic: { label: 'Episodic', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
  semantic: { label: 'Semantic', color: '#06b6d4', bg: 'rgba(6,182,212,0.08)' },
  ltm:      { label: 'LTM',      color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
}

const SCORE_CONFIG = [
  { key: 'semantic',   label: 'Semantic',   barClass: 'score-bar' },
  { key: 'recency',    label: 'Recency',    barClass: 'score-bar-orange' },
  { key: 'importance', label: 'Importance', barClass: 'score-bar-purple' },
  { key: 'final',      label: 'Final',      barClass: 'score-bar-green' },
]

function ScoreBar({ label, value, barClass }) {
  const pct = Math.round(Math.min(1, Math.max(0, value || 0)) * 100)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium" style={{color:'#475569'}}>{label}</span>
        <span className="text-[10px] font-semibold tabular-nums" style={{color:'#94a3b8'}}>{(value || 0).toFixed(2)}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.05)'}}>
        <div className={`h-full rounded-full transition-all duration-500 ${barClass}`} style={{width:`${pct}%`}}/>
      </div>
    </div>
  )
}

export default function MemoryInspector({ context }) {
  if (!context) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
          style={{background:'rgba(59,130,246,0.05)', border:'1px solid rgba(59,130,246,0.1)'}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <ellipse cx="12" cy="5" rx="9" ry="3" stroke="#1e3a5f" strokeWidth="1.5"/>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" stroke="#1e3a5f" strokeWidth="1.5"/>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" stroke="#1e3a5f" strokeWidth="1.5"/>
          </svg>
        </div>
        <p className="text-xs leading-relaxed" style={{color:'#1e3a5f'}}>
          No retrieval data yet.<br/>Send a message to see<br/>memory scores here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Summary bar */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl"
        style={{background:'rgba(59,130,246,0.05)', border:'1px solid rgba(59,130,246,0.1)'}}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{background:'#3b82f6'}}/>
          <span className="text-xs" style={{color:'#64748b'}}>{context.memoriesUsed} retrieved</span>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{background:'rgba(59,130,246,0.12)', color:'#93c5fd'}}>
          {context.mode}
        </span>
      </div>

      {context.memoriesUsed === 0 && (
        <p className="text-xs text-center py-4" style={{color:'#1e3a5f'}}>
          No relevant memories found for this query.
        </p>
      )}

      {(context.sources || []).map((s, i) => {
        const typeConf = TYPE_CONFIG[s.memory?.memory_type] || { label: s.memory?.memory_type, color: '#475569', bg: 'rgba(255,255,255,0.03)' }
        return (
          <div key={i} className="rounded-xl p-3 space-y-3"
            style={{background:'rgba(13,17,23,0.8)', border:'1px solid rgba(59,130,246,0.08)'}}>

            {/* Memory content */}
            <p className="text-xs leading-relaxed" style={{color:'#cbd5e1'}}>
              {s.memory?.content}
            </p>

            {/* Score bars */}
            <div className="space-y-2">
              {SCORE_CONFIG.map(sc => (
                <ScoreBar key={sc.key} label={sc.label} value={s.scores?.[sc.key]} barClass={sc.barClass}/>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-1" style={{borderTop:'1px solid rgba(59,130,246,0.06)'}}>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                style={{color: typeConf.color, background: typeConf.bg}}>
                {typeConf.label}
              </span>
              {s.memory?.created_at && (
                <span className="text-[10px]" style={{color:'#1e3a5f'}}>
                  {new Date(s.memory.created_at).toLocaleDateString()}
                </span>
              )}
            </div>

            {s.retrievalReason && (
              <p className="text-[10px] italic truncate" style={{color:'#334155'}}>{s.retrievalReason}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
