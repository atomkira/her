import React, { useMemo, useState, useEffect } from 'react'
import { getJSON, postJSON, putJSON, del } from '../lib/api'

export default function ExamCountdown() {
  const [exams, setExams] = useState([])
  const [modal, setModal] = useState(null) // {id?, title, date, items: []}

  // Load exams from backend
  useEffect(() => {
    (async () => {
      try {
        const data = await getJSON('/api/exams')
        setExams(data)
      } catch (e) {
        console.error('Failed to load exams', e)
      }
    })()
  }, [])

  const openAdd = () => setModal({ title: '', date: '', items: [] })
  const openEdit = (e) => setModal({ ...e })
  const close = () => setModal(null)

  const save = async () => {
    if (!modal.title || !modal.date) return
    try {
      if (modal._id) {
        const updated = await putJSON(`/api/exams/${modal._id}`, {
          title: modal.title,
          date: modal.date,
          items: modal.items || [],
        })
        setExams((arr) => arr.map((x) => (x._id === updated._id ? updated : x)))
      } else {
        const created = await postJSON('/api/exams', {
          title: modal.title,
          date: modal.date,
          items: modal.items || [],
        })
        setExams((arr) => [...arr, created])
      }
      close()
    } catch (e) {
      console.error('Failed to save exam', e)
    }
  }

  const remove = async (id) => {
    try {
      await del(`/api/exams/${id}`)
      setExams((arr) => arr.filter((x) => x._id !== id))
    } catch (e) {
      console.error('Failed to delete exam', e)
    }
  }

  const daysLeft = (dateStr) => {
    const now = new Date()
    const d = new Date(dateStr)
    const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24))
    return diff
  }

  const toggleItem = async (examId, idx) => {
    const ex = exams.find((e) => e._id === examId)
    if (!ex) return
    const items = (ex.items || []).map((it, i) => (i === idx ? { ...it, done: !it.done } : it))
    try {
      const updated = await putJSON(`/api/exams/${examId}`, { title: ex.title, date: ex.date, items })
      setExams((arr) => arr.map((e) => (e._id === examId ? updated : e)))
    } catch (e) {
      console.error('Failed to toggle item', e)
    }
  }

  const addItem = async (examId) => {
    const text = prompt('Add revision task')
    if (!text) return
    const ex = exams.find((e) => e._id === examId)
    if (!ex) return
    const items = [...(ex.items || []), { text: text.trim(), done: false }]
    try {
      const updated = await putJSON(`/api/exams/${examId}`, { title: ex.title, date: ex.date, items })
      setExams((arr) => arr.map((e) => (e._id === examId ? updated : e)))
    } catch (e) {
      console.error('Failed to add revision item', e)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Exam Countdown</h2>
        <button onClick={openAdd} className="rounded-md bg-rose-500 text-white px-3 py-1.5 shadow hover:bg-rose-600">
          Add exam
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {exams.map((e) => (
          <div key={e._id || e.id} className="rounded-xl border bg-white/80 dark:bg-slate-800/60 border-white/60 dark:border-slate-700 p-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{e.title}</div>
              <div className="text-sm opacity-80">{e.date}</div>
            </div>
            <div className="mt-1 text-sm">
              {(() => {
                const d = daysLeft(e.date)
                return d >= 0 ? `${d} day(s) left` : `Happened ${Math.abs(d)} day(s) ago`
              })()}
            </div>
            <div className="mt-2 flex gap-2 text-sm">
              <button onClick={() => openEdit(e)} className="underline">Edit</button>
              <button onClick={() => remove(e._id)} className="underline">Delete</button>
              <button onClick={() => addItem(e._id)} className="underline">+ Revision</button>
            </div>
            {!!e.items.length && (
              <ul className="mt-2 space-y-1">
                {e.items.map((it, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={it.done} onChange={() => toggleItem(e._id, idx)} />
                    <span className={it.done ? 'line-through opacity-60' : ''}>{it.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 border border-white/60 dark:border-slate-700 p-4">
            <h3 className="font-bold mb-3">{modal.id ? 'Edit' : 'Add'} Exam</h3>
            <div className="space-y-2">
              <label className="block text-sm">Title</label>
              <input
                value={modal.title}
                onChange={(e) => setModal((m) => ({ ...m, title: e.target.value }))}
                className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white/90 dark:bg-slate-700/60 px-2 py-1.5 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-300"
              />
              <label className="block text-sm">Date</label>
              <input
                type="date"
                value={modal.date}
                onChange={(e) => setModal((m) => ({ ...m, date: e.target.value }))}
                className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white/90 dark:bg-slate-700/60 px-2 py-1.5 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-300"
              />
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={close} className="px-3 py-1.5 rounded-md bg-slate-200 dark:bg-slate-700">Cancel</button>
                <button onClick={save} className="px-3 py-1.5 rounded-md bg-rose-500 text-white">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
