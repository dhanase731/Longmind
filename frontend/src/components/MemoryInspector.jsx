import React from 'react'

const TYPE_COLORS = {
  stm:      'text-yellow-400 bg-yellow-400/10',
  episodic: 'text-blue-400 bg-blue-400/10',
  semantic: 'text-emerald-400 bg-emerald-400/10',
  ltm:      'text-purple-400 bg-purple-400/10'
}

function ScoreBar({ label, value, color = 'bg-[#10a37f]' }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-gray-500 w-16 shrink-0">{label}</span>
      <div className="flex-1 bg-white/8 rounded-full h-1">
        <div className={`${color} h-1 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-gray-400 w-7 text-right tabular-nums">{value.toFixed(2)}</span>
    </div>
  )
}

export default function MemoryInspector({ context }) {
  if (!context) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
            <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
          </svg>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">No retrieval data yet.<br />Send a message to see<br />memory scores here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between bg-white/4 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{context.memoriesUsed} retrieved</span>
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#10a37f]/15 text-[#10a37f]">
          {context.mode}
        </span>
      </div>

      {context.memoriesUsed === 0 && (
        <p className="text-xs text-gray-600 text-center py-4">No relevant memories found for this query.</p>
      )}

      {(context.sources || []).map((s, i) => (
        <div key={i} className="bg-white/3 border border-white/6 rounded-xl p-3 space-y-2.5">
          {/* content */}
          <p className="text-xs text-gray-200 leading-relaxed line-clamp-3">{s.memory?.content}</p>

          {/* scores */}
          <div className="space-y-1.5">
            <ScoreBar label="Semantic" value={s.scores.semantic} color="bg-blue-500" />
            <ScoreBar label="Recency" value={s.scores.recency} color="bg-orange-500" />
            <ScoreBar label="Importance" value={s.scores.importance} color="bg-purple-500" />
            <ScoreBar label="Final" value={s.scores.final} color="bg-[#10a37f]" />
          </div>

          {/* meta */}
          <div className="flex items-center justify-between pt-0.5">
            {s.memory?.memory_type && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${TYPE_COLORS[s.memory.memory_type] || 'text-gray-500 bg-white/5'}`}>
                {s.memory.memory_type}
              </span>
            )}
            {s.memory?.created_at && (
              <span className="text-[10px] text-gray-600">{new Date(s.memory.created_at).toLocaleDateString()}</span>
            )}
          </div>
          {s.retrievalReason && (
            <p className="text-[10px] text-gray-600 italic truncate">{s.retrievalReason}</p>
          )}
        </div>
      ))}
    </div>
  )
}
