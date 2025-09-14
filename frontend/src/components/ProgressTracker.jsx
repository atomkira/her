import React, { useMemo, useState } from 'react'

export default function ProgressTracker({ blocks = [] }) {
  const [dates, setDates] = useState(new Set()) // days studied (yyyy-mm-dd)

  const todayKey = new Date().toISOString().slice(0, 10)

  const addToday = () => setDates((prev) => new Set(prev).add(todayKey))

  const streak = useMemo(() => {
    let count = 0
    const d = new Date()
    for (;;) {
      const key = d.toISOString().slice(0, 10)
      if (!dates.has(key)) break
      count++
      d.setDate(d.getDate() - 1)
    }
    return count
  }, [dates])

  // Compute weekly totals from scheduled blocks
  const weekly = useMemo(() => {
    // Determine current ISO week range (Mon-Sun)
    const now = new Date()
    const day = (now.getDay() + 6) % 7 // Mon=0..Sun=6
    const monday = new Date(now)
    monday.setDate(now.getDate() - day)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 7)

    const totals = new Map() // key: subject lower, value: {subject,label, minutes}
    for (const b of blocks) {
      if (!b.date || !b.start || !b.end || !b.subject) continue
      const d = new Date(b.date + 'T00:00:00')
      if (!(d >= monday && d < sunday)) continue
      const subKey = b.subject.trim().toLowerCase()
      if (!subKey) continue
      const [sh, sm] = b.start.split(':').map(Number)
      const [eh, em] = b.end.split(':').map(Number)
      let minutes = (eh * 60 + em) - (sh * 60 + sm)
      if (!Number.isFinite(minutes) || minutes <= 0) continue
      const prev = totals.get(subKey) || { subject: b.subject.trim(), minutes: 0 }
      prev.minutes += minutes
      totals.set(subKey, prev)
    }
    const items = Array.from(totals.values()).map((t) => ({
      subject: t.subject,
      weekly: +(t.minutes / 60).toFixed(2),
    }))
    return items
  }, [blocks])

  const max = Math.max(1, ...weekly.map((h) => h.weekly))

  return (
    <div className="rounded-2xl bg-white/80 dark:bg-slate-800/60 border border-white/60 dark:border-slate-700 p-5">
      <h3 className="font-bold">Weekly Hours per Subject</h3>
      <div className="mt-3 grid sm:grid-cols-2 gap-4">
        {weekly.length === 0 && (
          <p className="text-sm opacity-75">No scheduled study blocks this week yet. Add some in Schedule to see progress here.</p>
        )}
        {weekly.map((h) => (
          <div key={h.subject} className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-24 text-sm">{h.subject}</div>
              <div className="text-sm font-semibold">{h.weekly} h</div>
            </div>
            <div className="h-3 rounded-full bg-slate-300 dark:bg-slate-700/80 overflow-hidden">
              <div
                className="h-full bg-rose-500 dark:bg-rose-400 transition-all"
                style={{ width: `${(h.weekly / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button onClick={addToday} className="rounded-md bg-emerald-500 text-white px-3 py-1.5 shadow hover:bg-emerald-600">
          Mark today studied
        </button>
        <div className="text-sm">Streak: You've studied {streak} day(s) in a row! 🔥</div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <span className="px-2 py-1 rounded-full bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800">
          Focused Queen 👑
        </span>
        <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800">
          Consistency Champ 🏆
        </span>
      </div>
    </div>
  )
}
