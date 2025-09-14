import React, { useEffect, useState } from 'react'

export default function ThemeCustomizer() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    const saved = localStorage.getItem('theme-dark')
    return saved ? saved === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) root.classList.add('dark')
    else root.classList.remove('dark')
    localStorage.setItem('theme-dark', String(dark))
  }, [dark])

  return (
    <button
      onClick={() => setDark((d) => !d)}
      className="rounded-full bg-white/80 dark:bg-slate-700/60 border border-white/60 dark:border-slate-600 px-3 py-1.5 text-sm shadow hover:shadow-md"
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
    >
      {dark ? 'Light Mode ☀️' : 'Dark Mode 🌙'}
    </button>
  )
}
