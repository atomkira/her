import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getJSON, putJSON } from '../lib/api'

const baseMessages = [
  "I'm proud of you 💕",
  "You're doing amazing 🌟",
  'One page at a time. You can do this! 📚',
  'Tiny steps add up. Keep going ✨',
  'You are magic and brains ✨🧠',
  'Drink water, pretty human 💧',
  'Deep breaths, soft shoulders 🌿',
  'Trust your pace — slow is smooth, smooth is fast 🐢💗',
  'Even 5 mins count. You showed up! 🎀',
]

export default function EncouragementNotes() {
  const [messages, setMessages] = useState(baseMessages)
  const [msg, setMsg] = useState(baseMessages[0])
  const [auto, setAuto] = useState(false)
  const [minutes, setMinutes] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const clientIdRef = useRef(null)
  const intervalRef = useRef(null)
  const [cid, setCid] = useState(null)
  const [loaded, setLoaded] = useState(false)

  // helper
  const randomize = () => setMsg(messages[Math.floor(Math.random() * messages.length)])

  // Ensure stable clientId
  useEffect(() => {
    try {
      let cid = localStorage.getItem('notes_client_id')
      if (!cid) {
        cid = crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
        localStorage.setItem('notes_client_id', cid)
      }
      clientIdRef.current = cid
      setCid(cid)
    } catch {}
  }, [])

  // Load state from backend (if exists)
  useEffect(() => {
    const load = async () => {
      if (!cid) return
      try {
        const data = await getJSON(`/api/note-timer/${cid}`)
        const { auto: a = false, minutes: m = 0, lastTickTs } = data || {}
        if (typeof a === 'boolean') setAuto(a)
        if (Number.isFinite(m)) setMinutes(m)
        if (a && Number.isFinite(lastTickTs)) {
          const now = Date.now()
          const diff = Math.max(0, now - lastTickTs)
          const addMin = Math.floor(diff / 60000)
          const sec = Math.floor((diff % 60000) / 1000)
          if (addMin > 0) {
            setMinutes((v) => v + addMin)
            randomize()
          }
          setSeconds(sec)
        }
      } catch (e) {
        // ignore network errors
      } finally {
        // mark that initial load finished to allow persistence
        setLoaded(true)
      }
    }
    load()
  }, [cid])

  // Handle ticking when auto is enabled
  useEffect(() => {
    if (!auto) {
      intervalRef.current && clearInterval(intervalRef.current)
      return
    }
    intervalRef.current && clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s >= 59) {
          setMinutes((m) => m + 1)
          randomize()
          persist(true)
          return 0
        }
        return s + 1
      })
    }, 1000)
    return () => intervalRef.current && clearInterval(intervalRef.current)
  }, [auto])

  // Persist helper
  const persist = async (minuteTick = false) => {
    const cid = clientIdRef.current
    // avoid persisting until initial load completes, to not overwrite server state
    if (!cid || !loaded) return
    try {
      await putJSON(`/api/note-timer/${cid}`, {
        auto,
        minutes,
        lastTickTs: Date.now(),
      })
    } catch {}
  }

  // When toggling auto or changing minutes manually, persist
  useEffect(() => {
    // Persist on auto toggle
    persist(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto])
  useEffect(() => {
    // Persist when minutes change (debounced via tick or user action)
    persist(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minutes])

  return (
    <div className="rounded-2xl border p-5 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-rose-900/20 dark:to-pink-900/10 border-rose-200/60 dark:border-rose-800/60">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🎀</span>
        <h3 className="text-lg font-bold">Little Love Notes</h3>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full border border-pink-200 bg-pink-100 text-pink-700 dark:border-rose-800 dark:bg-rose-900/40 dark:text-rose-200">soft mode</span>
      </div>

      <div className="mt-3 text-base sm:text-lg font-semibold text-rose-900 dark:text-rose-100">
        {msg}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={randomize}
          className="rounded-md bg-rose-500 text-white px-3 py-1.5 shadow hover:bg-rose-600"
        >
          Randomize
        </button>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          Auto every minute
        </label>

        <div className="ml-auto flex items-center gap-3">
          {/* cute circular progress for the current minute */}
          <MinuteCircle seconds={seconds} />
        </div>
      </div>
    </div>
  )
}

function MinuteCircle({ seconds }) {
  const radius = 14
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(59, Math.max(0, seconds)) / 60
  const dash = circumference * progress
  return (
    <div className="relative" title={`${seconds}s`}> 
      <svg width="40" height="40">
        <circle cx="20" cy="20" r={radius} strokeWidth="4" className="fill-none stroke-rose-200 dark:stroke-rose-800" />
        <circle
          cx="20" cy="20" r={radius} strokeWidth="4" strokeLinecap="round"
          className="fill-none stroke-rose-500"
          style={{ strokeDasharray: `${dash} ${circumference}`, transition: 'stroke-dasharray 0.4s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">{seconds}</div>
    </div>
  )
}
