const BASE = import.meta.env.VITE_API_BASE || ''

function withBase(url) {
  if (!BASE) return url
  // Ensure exactly one slash between base and path
  const b = BASE.replace(/\/$/, '')
  const p = url.startsWith('/') ? url : `/${url}`
  return `${b}${p}`
}

export async function getJSON(url) {
  const res = await fetch(withBase(url))
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`)
  return res.json()
}

export async function postJSON(url, body) {
  const res = await fetch(withBase(url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`)
  return res.json()
}

export async function putJSON(url, body) {
  const res = await fetch(withBase(url), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  if (!res.ok) throw new Error(`PUT ${url} failed: ${res.status}`)
  return res.json()
}

export async function del(url) {
  const res = await fetch(withBase(url), { method: 'DELETE' })
  if (!res.ok) throw new Error(`DELETE ${url} failed: ${res.status}`)
  return res.json()
}
