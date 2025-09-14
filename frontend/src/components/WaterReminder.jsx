import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getJSON, putJSON } from '../lib/api'
import pushNotificationManager from '../utils/pushNotificationManager.js'

export default function WaterReminder() {
  const [intervalMin, setIntervalMin] = useState(30)
  const [nextAt, setNextAt] = useState(Date.now() + 30 * 60000)
  const [total, setTotal] = useState(0)
  const [now, setNow] = useState(Date.now())
  const [notified, setNotified] = useState(false)
  const [toast, setToast] = useState('')
  const clientIdRef = useRef(null)
  const tickRef = useRef(null)

  // stable client id
  useEffect(() => {
    try {
      let cid = localStorage.getItem('water_client_id')
      if (!cid) {
        cid = crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
        localStorage.setItem('water_client_id', cid)
      }
      clientIdRef.current = cid
    } catch {}
  }, [])

  // Hydrate initial state from localStorage (fallback when backend is unavailable)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('water_state')
      if (raw) {
        const s = JSON.parse(raw)
        if (Number.isFinite(s?.intervalMin)) setIntervalMin(s.intervalMin)
        if (Number.isFinite(s?.nextAt)) setNextAt(s.nextAt)
        if (Number.isFinite(s?.totalReminders)) setTotal(s.totalReminders)
        setNow(Date.now())
      }
    } catch {}
  }, [])

  // load from backend
  useEffect(() => {
    const load = async () => {
      const cid = clientIdRef.current
      if (!cid) return
      try {
        const data = await getJSON(`/api/water/${cid}`)
        const { intervalMin: im = 30, nextAt: na = Date.now() + im * 60000, totalReminders: tr = 0 } = data || {}
        setIntervalMin(Number.isFinite(im) ? im : 30)
        setNextAt(Number.isFinite(na) ? na : Date.now() + (Number.isFinite(im) ? im : 30) * 60000)
        setTotal(Number.isFinite(tr) ? tr : 0)
        setNow(Date.now())
        // Persist the loaded server state to localStorage as a backup
        try {
          localStorage.setItem('water_state', JSON.stringify({ intervalMin: im, nextAt: na, totalReminders: tr }))
        } catch {}
      } catch (e) {
        // ignore network errors
      }
    }
    load()
  }, [])

  // tick per second always
  useEffect(() => {
    tickRef.current && clearInterval(tickRef.current)
    tickRef.current = setInterval(() => setNow(Date.now()), 1000)
    return () => tickRef.current && clearInterval(tickRef.current)
  }, [])

  // derived remaining seconds
  const remaining = Math.max(0, Math.ceil((nextAt - now) / 1000))
  const mmss = useMemo(() => {
    const m = Math.floor(remaining / 60)
    const s = remaining % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }, [remaining])

  const progress = useMemo(() => {
    const totalSec = Math.max(1, intervalMin * 60)
    const elapsed = totalSec - remaining
    return Math.max(0, Math.min(1, elapsed / totalSec))
  }, [intervalMin, remaining])

  // notifications
  const ensureNotifPermission = async () => {
    try {
      if (!('Notification' in window)) return false
      if (Notification.permission === 'granted') return true
      if (Notification.permission !== 'denied') {
        const p = await Notification.requestPermission()
        return p === 'granted'
      }
      return false
    } catch {
      return false
    }
  }

  const sendNotification = async () => {
    const granted = await ensureNotifPermission()
    const title = '💧 Time to drink water!'
    const body = `It has been ${intervalMin} minute${intervalMin === 1 ? '' : 's'}. Tap "Drank now" when you hydrate! 💕`
    
    // Send push notification (works even when app is closed)
    if (await pushNotificationManager.isSubscribed()) {
      await pushNotificationManager.sendWaterReminder()
    }
    
    // Also send local notification for immediate feedback
    if (granted) {
      try {
        new Notification(title, { 
          body, 
          silent: false,
          icon: '/manifest-icon-192.png',
          tag: 'water-reminder'
        })
      } catch {}
    }
    
    // fallback UI toast
    setToast('💧 Time to drink water!')
    setTimeout(() => setToast(''), 3000)
  }

  // persist helper
  const persist = async (partial = {}) => {
    const cid = clientIdRef.current
    if (!cid) return
    const payload = {
      intervalMin,
      nextAt,
      totalReminders: total,
      ...partial,
    }
    try {
      const saved = await putJSON(`/api/water/${cid}`, payload)
      // trust server values if it returned them
      if (saved) {
        if (Number.isFinite(saved.intervalMin)) setIntervalMin(saved.intervalMin)
        if (Number.isFinite(saved.nextAt)) setNextAt(saved.nextAt)
        if (Number.isFinite(saved.totalReminders)) setTotal(saved.totalReminders)
      }
    } catch {}
    // Always store to localStorage as well (best-effort)
    try {
      const toStore = { ...payload }
      if (Number.isFinite(toStore.intervalMin) && Number.isFinite(toStore.nextAt) && Number.isFinite(toStore.totalReminders)) {
        localStorage.setItem('water_state', JSON.stringify({
          intervalMin: toStore.intervalMin,
          nextAt: toStore.nextAt,
          totalReminders: toStore.totalReminders,
        }))
      }
    } catch {}
  }

  // when time elapses, notify once and keep timer at 0 until user confirms
  useEffect(() => {
    if (remaining === 0 && !notified) {
      setNotified(true)
      try { navigator.vibrate && navigator.vibrate(120) } catch {}
      sendNotification()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining])

  const applyInterval = () => {
    const mins = Math.max(1, Math.floor(Number(intervalMin) || 0))
    setIntervalMin(mins)
    const newNext = Date.now() + mins * 60000
    setNextAt(newNext)
    setNotified(false)
    persist({ intervalMin: mins, nextAt: newNext })
  }

  const drinkNow = () => {
    const mins = Math.max(1, Math.floor(Number(intervalMin) || 0))
    const newNext = Date.now() + mins * 60000
    setNextAt(newNext)
    const newTotal = total + 1
    setTotal(newTotal)
    setNotified(false)
    // cute confirmation with heart theme
    setToast('Yay! You hydrated 💧💖✨')
    setTimeout(() => setToast(''), 2000)
    persist({ nextAt: newNext, totalReminders: newTotal })
  }

  return (
    <div className="rounded-2xl border p-5 bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-900/20 dark:to-cyan-900/10 border-sky-200/60 dark:border-sky-800/60">
      <div className="flex items-center gap-2">
        <span className="text-2xl animate-bounce">💧</span>
        <h3 className="text-lg font-bold">Water Reminder</h3>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full border border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-800 dark:bg-sky-900/40 dark:text-sky-200">stay hydrated 💖</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="px-2 py-0.5 rounded-full border bg-white/80 border-sky-200 text-sky-700 dark:bg-sky-900/30 dark:border-sky-800 dark:text-sky-200">Interval (min)</span>
          <input
            type="number"
            min={1}
            value={intervalMin}
            onChange={(e) => setIntervalMin(e.target.value)}
            className="w-20 rounded-md border border-sky-200 dark:border-sky-700 bg-white/90 dark:bg-sky-800/50 px-2 py-1"
          />
          <button onClick={applyInterval} className="rounded-md bg-sky-500 text-white px-3 py-1.5 shadow hover:bg-sky-600">Set</button>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <MinuteRing label={mmss} progress={progress} alert={remaining === 0} />
          <div className="text-sm">
            <div className="opacity-70">Total drinks</div>
            <div className="text-lg font-bold">{total}</div>
          </div>
          <button onClick={drinkNow} className="rounded-md bg-emerald-500 text-white px-3 py-1.5 shadow hover:bg-emerald-600">Drank now ✔</button>
        </div>
      </div>

      {toast && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white/80 dark:border-sky-800 dark:bg-sky-900/30 px-3 py-1.5 text-sky-700 dark:text-sky-100 shadow-sm">
          <span>✨</span>
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}
    </div>
  )
}

function MinuteRing({ label, progress, alert }) {
  const radius = 20
  const circumference = 2 * Math.PI * radius
  const dash = circumference * Math.max(0, Math.min(1, progress))
  return (
    <div className="relative" title="Time until next water">
      <svg width="56" height="56" className="drop-shadow">
        <circle cx="28" cy="28" r={radius} strokeWidth="6" className={`fill-none ${alert ? 'stroke-rose-200 dark:stroke-rose-800' : 'stroke-sky-200 dark:stroke-sky-800'}`} />
        <circle
          cx="28" cy="28" r={radius} strokeWidth="6" strokeLinecap="round"
          className={alert ? 'fill-none stroke-rose-500 animate-pulse' : 'fill-none stroke-sky-500'}
          style={{ strokeDasharray: `${dash} ${circumference}`, transition: 'stroke-dasharray 0.4s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">{label}</div>
    </div>
  )
}
