import React, { createContext, useContext, useState } from 'react'

const ThemeContext = createContext()

export const THEMES = {
  dark: {
    name: 'dark',
    bgBase:     '#080b11',
    bgSurface:  '#0a0e17',
    bgElevated: '#0d1117',
    bgHover:    '#111827',
    bgCard:     'rgba(13,17,23,0.8)',
    bgInput:    'rgba(13,17,23,0.9)',
    bgInspector:'#090c14',
    border:     'rgba(59,130,246,0.08)',
    borderHover:'rgba(59,130,246,0.18)',
    borderFocus:'rgba(59,130,246,0.3)',
    text:       '#e2e8f0',
    textMuted:  '#94a3b8',
    textFaint:  '#475569',
    textDim:    '#334155',
    textGhost:  '#1e3a5f',
    textGhost2: '#1e2d40',
    userBubble: 'rgba(59,130,246,0.08)',
    userBubbleBorder: 'rgba(59,130,246,0.12)',
    suggestionBg: 'rgba(59,130,246,0.03)',
    accentBlue:  '#3b82f6',
    accentPurple:'#8b5cf6',
    accentCyan:  '#06b6d4',
    gradient:    'linear-gradient(135deg,#1d4ed8,#7c3aed)',
    logoBg:      'linear-gradient(135deg,#1e3a5f,#1e1040)',
    logoBorder:  'rgba(59,130,246,0.2)',
    toggleOff:   '#0f1a28',
    scrollbar:   '#1e2d40',
  },
  light: {
    name: 'light',
    bgBase:     '#f8fafc',
    bgSurface:  '#f1f5f9',
    bgElevated: '#ffffff',
    bgHover:    '#e2e8f0',
    bgCard:     'rgba(255,255,255,0.9)',
    bgInput:    'rgba(255,255,255,0.95)',
    bgInspector:'#f8fafc',
    border:     'rgba(59,130,246,0.12)',
    borderHover:'rgba(59,130,246,0.25)',
    borderFocus:'rgba(59,130,246,0.4)',
    text:       '#0f172a',
    textMuted:  '#475569',
    textFaint:  '#64748b',
    textDim:    '#94a3b8',
    textGhost:  '#cbd5e1',
    textGhost2: '#e2e8f0',
    userBubble: 'rgba(59,130,246,0.06)',
    userBubbleBorder: 'rgba(59,130,246,0.15)',
    suggestionBg: 'rgba(59,130,246,0.04)',
    accentBlue:  '#2563eb',
    accentPurple:'#7c3aed',
    accentCyan:  '#0891b2',
    gradient:    'linear-gradient(135deg,#1d4ed8,#7c3aed)',
    logoBg:      'linear-gradient(135deg,#dbeafe,#ede9fe)',
    logoBorder:  'rgba(59,130,246,0.25)',
    toggleOff:   '#e2e8f0',
    scrollbar:   '#cbd5e1',
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('lm_theme')
    return THEMES[saved] || THEMES.dark
  })

  function toggleTheme() {
    const next = theme.name === 'dark' ? THEMES.light : THEMES.dark
    setTheme(next)
    localStorage.setItem('lm_theme', next.name)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
