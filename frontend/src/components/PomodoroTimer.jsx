import React, { useEffect, useMemo, useRef, useState } from 'react'

const WORK_MIN = 25
const BREAK_MIN = 5

export default function PomodoroTimer() {
  // Seed state synchronously from localStorage to avoid visible reset on reload
  const initial = (() => {
    try {
      const raw = localStorage.getItem('pomodoro')
      if (raw) {
        const saved = JSON.parse(raw)
        let { isRunning: r, isBreak: b, secondsLeft: s, referenceTs } = saved || {}
        if (typeof s === 'number') {
          if (r && referenceTs) {
            const now = Date.now()
            s = Math.floor(s - (now - referenceTs) / 1000)
            while (s <= 0) {
              b = !b
              s += (b ? BREAK_MIN : WORK_MIN) * 60
            }
          }
          return { r: !!r, b: !!b, s, ref: referenceTs || Date.now() }
        }
      }
    } catch {}
    return { r: false, b: false, s: WORK_MIN * 60, ref: Date.now() }
  })()

  const [isRunning, setIsRunning] = useState(initial.r)
  const [isBreak, setIsBreak] = useState(initial.b)
  const [secondsLeft, setSecondsLeft] = useState(initial.s)
  const intervalRef = useRef(null)
  const lastTickRef = useRef(null) // ms timestamp of last update
  const clientIdRef = useRef(null)
  const localRefTsRef = useRef(0)
  const initialSnapshotRef = useRef({ r: initial.r, s: initial.s })
  const hadLocalAtMountRef = useRef(() => {
    try { return !!localStorage.getItem('pomodoro') } catch { return false }
  })

  // Restore clientId and set refs on mount
  useEffect(() => {
    // Ensure a stable clientId stored locally for server-side state
    try {
      let cid = localStorage.getItem('pomodoro_client_id')
      if (!cid) {
        // crypto.randomUUID is supported in modern browsers
        cid = crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
        localStorage.setItem('pomodoro_client_id', cid)
      }
      clientIdRef.current = cid
    } catch {}
    lastTickRef.current = Date.now()
    localRefTsRef.current = initial.ref
  }, [])

  // After initial local restore, attempt to load from backend (if available)
  useEffect(() => {
    // If we already had a local snapshot, skip server load to avoid overrides
    const hadLocal = typeof hadLocalAtMountRef.current === 'function' ? hadLocalAtMountRef.current() : !!hadLocalAtMountRef.current
    if (hadLocal) return
    const loadFromServer = async () => {
      const cid = clientIdRef.current
      if (!cid) return
      try {
        const res = await fetch(`/api/pomodoro/${cid}`)
        if (!res.ok) return
        const doc = await res.json()
        // Compute elapsed since server snapshot
        let { isRunning: r, isBreak: b, secondsLeft: s, referenceTs } = doc || {}
        if (typeof s !== 'number') return
        // Prefer server state only if it's newer than the local snapshot
        if (referenceTs && localRefTsRef.current && referenceTs <= localRefTsRef.current) {
          return
        }
        if (r && referenceTs) {
          const now = Date.now()
          s = Math.floor(s - (now - referenceTs) / 1000)
          while (s <= 0) {
            b = !b
            s += (b ? BREAK_MIN : WORK_MIN) * 60
          }
        }
        // If local timer is running, only accept server if it is further progressed (smaller secondsLeft)
        if (initialSnapshotRef.current.r === true && typeof s === 'number') {
          if (s >= initialSnapshotRef.current.s) {
            return
          }
        }
        setIsRunning(!!r)
        setIsBreak(!!b)
        setSecondsLeft(s)
        lastTickRef.current = Date.now()
        localRefTsRef.current = referenceTs || Date.now()
      } catch {
        // ignore fetch errors, stay with local
      }
    }
    loadFromServer()
    // run only once after mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const total = (isBreak ? BREAK_MIN : WORK_MIN) * 60
  const progress = 1 - secondsLeft / total

  useEffect(() => {
    if (!isRunning) return
    intervalRef.current && clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          // switch phase
          const nextBreak = !isBreak
          setIsBreak(nextBreak)
          return (nextBreak ? BREAK_MIN : WORK_MIN) * 60
        }
        return s - 1
      })
      lastTickRef.current = Date.now()
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [isRunning, isBreak])

  // Persist state whenever it changes
  useEffect(() => {
    try {
      const snapshot = {
        isRunning,
        isBreak,
        secondsLeft,
        referenceTs: Date.now(),
      }
      localStorage.setItem('pomodoro', JSON.stringify(snapshot))
    } catch {}
  }, [isRunning, isBreak, secondsLeft])

  // Also sync to backend whenever state changes (best-effort)
  useEffect(() => {
    const save = async () => {
      const cid = clientIdRef.current
      if (!cid) return
      try {
        await fetch(`/api/pomodoro/${cid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isRunning,
            isBreak,
            secondsLeft,
            referenceTs: Date.now(),
          }),
        })
      } catch {
        // ignore network errors
      }
    }
    save()
  }, [isRunning, isBreak, secondsLeft])

  const toggle = () => setIsRunning((r) => !r)
  const reset = () => {
    setIsRunning(false)
    setIsBreak(false)
    setSecondsLeft(WORK_MIN * 60)
  }

  const mmss = useMemo(() => {
    const m = Math.floor(secondsLeft / 60)
    const s = secondsLeft % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }, [secondsLeft])

  const message = isBreak ? 'Stretch time! 🌸' : 'Focus mode. You got this! 💪'

  const radius = 64
  const circumference = 2 * Math.PI * radius
  const dash = circumference * progress

  return (
    <div className="rounded-2xl bg-white/80 dark:bg-slate-800/60 border border-white/60 dark:border-slate-700 p-6 flex flex-col items-center">
      <div className="text-sm opacity-80 mb-3">{message}</div>
      <div className="relative">
        <svg width="160" height="160" className="drop-shadow">
          <circle cx="80" cy="80" r={radius} strokeWidth="10" className="fill-none stroke-slate-200 dark:stroke-slate-600" />
          <circle
            cx="80"
            cy="80"
            r={radius}
            strokeWidth="10"
            strokeLinecap="round"
            className="fill-none stroke-rose-500"
            style={{ strokeDasharray: `${dash} ${circumference}`, transition: 'stroke-dasharray 0.3s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold">
          {mmss}
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={toggle} className="rounded-md bg-rose-500 px-4 py-2 text-white shadow hover:bg-rose-600">
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button onClick={reset} className="rounded-md bg-slate-200 dark:bg-slate-700 px-4 py-2 shadow">
          Reset
        </button>
      </div>
      <p className="mt-3 text-xs opacity-70">
        Work {WORK_MIN}m / Break {BREAK_MIN}m — Breathe and smile 💖
      </p>
    </div>
  )
}
