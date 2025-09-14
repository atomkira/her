import React, { useMemo, useState, useEffect } from 'react'
import { getJSON, postJSON, putJSON, del } from '../lib/api'

const priorities = ['High', 'Medium', 'Low']

export default function TaskChecklist() {
  const [tasks, setTasks] = useState([])
  const [text, setText] = useState('')
  const [priority, setPriority] = useState('Medium')

  // Load tasks from backend on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await getJSON('/api/tasks')
        setTasks(data)
      } catch (e) {
        console.error('Failed to load tasks', e)
      }
    })()
  }, [])

  const addTask = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    try {
      const created = await postJSON('/api/tasks', { text: text.trim(), priority })
      setTasks((t) => [...t, created])
      setText('')
      setPriority('Medium')
    } catch (e) {
      console.error('Failed to create task', e)
    }
  }

  const toggle = async (id) => {
    const t = tasks.find((x) => x._id === id)
    if (!t) return
    try {
      const updated = await putJSON(`/api/tasks/${id}`, { done: !t.done })
      setTasks((arr) => arr.map((x) => (x._id === id ? updated : x)))
    } catch (e) {
      console.error('Failed to toggle task', e)
    }
  }
  const remove = async (id) => {
    try {
      await del(`/api/tasks/${id}`)
      setTasks((t) => t.filter((x) => x._id !== id))
    } catch (e) {
      console.error('Failed to delete task', e)
    }
  }

  const edit = async (id, newText) => {
    try {
      const updated = await putJSON(`/api/tasks/${id}`, { text: newText })
      setTasks((t) => t.map((x) => (x._id === id ? updated : x)))
    } catch (e) {
      console.error('Failed to edit task', e)
    }
  }

  return (
    <div className="rounded-2xl bg-white/80 dark:bg-slate-800/60 border border-white/60 dark:border-slate-700 p-5">
      <form onSubmit={addTask} className="flex flex-col sm:flex-row gap-2">
        <input
          className="flex-1 rounded-md border border-slate-200 dark:border-slate-600 bg-white/90 dark:bg-slate-700/60 px-3 py-2"
          placeholder="Add a study task…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <select
          className="rounded-md border border-slate-200 dark:border-slate-600 bg-white/90 dark:bg-slate-700/60 px-3 py-2"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          {priorities.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <button className="rounded-md bg-rose-500 text-white px-4 py-2 shadow hover:bg-rose-600">
          Add
        </button>
      </form>

      <ul className="mt-4 space-y-2">
        {tasks.map((t) => (
          <li
            key={t._id || t.id}
            className={`group flex items-center gap-3 rounded-md border px-3 py-2 transition ${
              t.done
                ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800'
                : 'bg-white/70 border-slate-200 dark:bg-slate-700/50 dark:border-slate-600'
            }`}
          >
            <input
              type="checkbox"
              checked={t.done}
              onChange={() => toggle(t._id)}
              className="h-5 w-5 accent-rose-500"
            />
            <span className={`flex-1 ${t.done ? 'line-through opacity-60' : ''}`}>
              <EditableText text={t.text} onChange={(v) => edit(t._id, v)} />
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${
                t.priority === 'High'
                  ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800'
                  : t.priority === 'Medium'
                  ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800'
                  : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800'
              }`}
            >
              {t.priority}
            </span>
            <button
              onClick={() => remove(t._id)}
              className="opacity-60 hover:opacity-100 text-sm"
              title="Delete"
            >
              ✖
            </button>
          </li>
        ))}
      </ul>
      {/* simple celebration */}
      {tasks.some((t) => t.done) && (
        <p className="mt-3 text-center text-sm text-emerald-700 dark:text-emerald-300">
          Great job! Keep going ✨
        </p>
      )}
    </div>
  )
}

function EditableText({ text, onChange }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(text)

  return editing ? (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        onChange(value.trim() || text)
        setEditing(false)
      }}
      className="w-full bg-transparent outline-none border-b border-dashed border-slate-300 dark:border-slate-500"
    />
  ) : (
    <button className="text-left w-full" onClick={() => setEditing(true)}>
      {text}
    </button>
  )
}
