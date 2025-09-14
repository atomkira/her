import React, { useEffect, useMemo, useRef, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const HEALTH_URL = (API_BASE?.replace(/\/$/, '') || '') + '/api/health'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function pingHealthWithBackoff({ maxWaitMs = 90_000, signal }) {
  const start = Date.now()
  let attempt = 0
  let delay = 500 // start with 0.5s

  while (Date.now() - start < maxWaitMs) {
    attempt += 1
    try {
      const res = await fetch(HEALTH_URL, { signal, cache: 'no-store' })
      if (res.ok) return { ok: true }
    } catch (e) {
      // ignore; likely cold start / network while waking
    }
    // backoff with cap
    delay = Math.min(delay * 1.7, 5000)
    await sleep(delay)
  }
  return { ok: false }
}

export default function ServerWakeGate({ children }) {
  const [ready, setReady] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [failed, setFailed] = useState(false)
  const abortRef = useRef(null)

  const maxWaitMs = useMemo(() => 90_000, []) // 90s window

  useEffect(() => {
    let t
    const started = Date.now()
    const tick = () => setElapsed(Math.floor((Date.now() - started) / 1000))
    t = setInterval(tick, 500)

    const controller = new AbortController()
    abortRef.current = controller

    ;(async () => {
      const result = await pingHealthWithBackoff({ maxWaitMs, signal: controller.signal })
      if (result.ok) {
        setReady(true)
      } else {
        setFailed(true)
      }
      clearInterval(t)
    })()

    return () => {
      controller.abort()
      clearInterval(t)
    }
  }, [maxWaitMs])

  const retry = () => {
    setFailed(false)
    setElapsed(0)
    // rerun effect by updating key
    setReady(false)
  }

  if (ready) return children

  return (
    <div className="min-h-screen flex items-center justify-center bg-pink-50 text-pink-900 p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-4xl">💤</div>
        <h1 className="text-2xl font-semibold">Waking up the server…</h1>
        <p className="opacity-80">
          This app is hosted on a free plan. After inactivity the server naps to save resources. We're gently waking it up for you.
        </p>
        <p className="text-sm opacity-70">Elapsed: {elapsed}s</p>
        {failed ? (
          <div className="space-y-3">
            <p className="text-sm">
              It's taking longer than usual. You can wait a bit more and press retry.
            </p>
            <button
              className="px-4 py-2 rounded bg-pink-600 text-white hover:bg-pink-700"
              onClick={retry}
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="w-full bg-pink-200 h-2 rounded overflow-hidden">
            <div
              className="bg-pink-600 h-2 animate-pulse"
              style={{ width: '66%' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
