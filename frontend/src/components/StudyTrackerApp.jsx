import React, { useEffect, useMemo, useState } from 'react'
import PomodoroTimer from './PomodoroTimer'
import CalendarSchedule from './CalendarSchedule'
import ThemeCustomizer from './ThemeCustomizer'
import ProgressTracker from './ProgressTracker'
import ExamCountdown from './ExamCountdown'
import EncouragementNotes from './EncouragementNotes'
import WaterReminder from './WaterReminder'

const tabs = [
  { id: 'schedule', label: 'Schedule 🗓️' },
  { id: 'pomodoro', label: 'Pomodoro ⏱️' },
  { id: 'progress', label: 'Progress 📈' },
  { id: 'exams', label: 'Exams 📅' },
  { id: 'notes', label: 'Notes 💌' },
  { id: 'water', label: 'Water 💧' },
]

export default function StudyTrackerApp() {
  const [active, setActive] = useState('schedule')
  const [blocks, setBlocks] = useState([]) // {id, subject, start, end, date}
  const [calendarTasks, setCalendarTasks] = useState([]) // {id, title, category, date, time, completed, description}

  // Load blocks from backend on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/blocks')
        if (!res.ok) throw new Error('Failed to load blocks')
        const data = await res.json()
        // Map backend _id to id for UI
        setBlocks(data.map((b) => ({ id: b._id ?? b.id, subject: b.subject, start: b.start, end: b.end, date: b.date })))
      } catch (e) {
        console.warn('Blocks fetch failed, using empty list:', e?.message)
        setBlocks([])
      }
    }
    load()
  }, [])

  // Load calendar tasks from backend on mount
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const res = await fetch('/api/calendar-tasks')
        if (!res.ok) throw new Error('Failed to load calendar tasks')
        const data = await res.json()
        setCalendarTasks(data.map((t) => ({ 
          id: t._id ?? t.id, 
          title: t.title, 
          category: t.category, 
          date: t.date, 
          time: t.time, 
          endTime: t.endTime || '',
          priority: t.priority || 'medium',
          completed: t.completed,
          description: t.description,
          notificationSent: t.notificationSent
        })))
      } catch (e) {
        console.warn('Calendar tasks fetch failed, using empty list:', e?.message)
        setCalendarTasks([])
      }
    }
    loadTasks()
  }, [])

  // CRUD handlers
  const createBlock = async (payload) => {
    const res = await fetch('/api/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: payload.subject, date: payload.date, start: payload.start, end: payload.end }),
    })
    if (!res.ok) throw new Error('Create failed')
    const saved = await res.json()
    const item = { id: saved._id ?? saved.id, subject: saved.subject, start: saved.start, end: saved.end, date: saved.date }
    setBlocks((arr) => [...arr, item])
    return item
  }

  const updateBlock = async (id, payload) => {
    const res = await fetch(`/api/blocks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: payload.subject, date: payload.date, start: payload.start, end: payload.end }),
    })
    if (!res.ok) throw new Error('Update failed')
    const saved = await res.json()
    const item = { id: saved._id ?? saved.id, subject: saved.subject, start: saved.start, end: saved.end, date: saved.date }
    setBlocks((arr) => arr.map((x) => (x.id === id ? item : x)))
    return item
  }

  const deleteBlock = async (id) => {
    const res = await fetch(`/api/blocks/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Delete failed')
    setBlocks((arr) => arr.filter((x) => x.id !== id))
  }

  // Calendar task CRUD handlers
  const createCalendarTask = async (payload) => {
    const res = await fetch('/api/calendar-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Create task failed')
    const saved = await res.json()
    const item = { 
      id: saved._id ?? saved.id, 
      title: saved.title, 
      category: saved.category, 
      date: saved.date, 
      time: saved.time, 
      endTime: saved.endTime || '',
      priority: saved.priority || 'medium',
      completed: saved.completed,
      description: saved.description,
      notificationSent: saved.notificationSent
    }
    setCalendarTasks((arr) => [...arr, item])
    return item
  }

  const updateCalendarTask = async (id, payload) => {
    const res = await fetch(`/api/calendar-tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Update task failed')
    const saved = await res.json()
    const item = { 
      id: saved._id ?? saved.id, 
      title: saved.title, 
      category: saved.category, 
      date: saved.date, 
      time: saved.time, 
      endTime: saved.endTime || '',
      priority: saved.priority || 'medium',
      completed: saved.completed,
      description: saved.description,
      notificationSent: saved.notificationSent
    }
    setCalendarTasks((arr) => arr.map((x) => (x.id === id ? item : x)))
    return item
  }

  const deleteCalendarTask = async (id) => {
    const res = await fetch(`/api/calendar-tasks/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Delete task failed')
    setCalendarTasks((arr) => arr.filter((x) => x.id !== id))
  }

  return (
    <div className="min-h-screen w-full hearts-bg bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 dark:from-pink-950 dark:via-rose-950 dark:to-pink-900 text-slate-800 dark:text-slate-100">
      <div className="mx-auto max-w-5xl p-4 md:p-6 relative z-10">
        <header className="flex items-center justify-between gap-4 relative">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-pink-600 via-rose-600 to-pink-600 bg-clip-text text-transparent drop-shadow animate-love-pulse">
              💖 Study Tracker 💕
            </h1>
            <div className="animate-heart-beat text-2xl">💖</div>
            <div className="animate-sparkle text-xl">✨</div>
          </div>
          <div className="relative heart-decoration">
            <ThemeCustomizer />
          </div>
        </header>

        <nav className="mt-6 flex flex-wrap gap-3 relative">
          {tabs.map((t, index) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`relative rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg transition-all duration-300 transform hover:scale-105 ${
                active === t.id
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white border-2 border-pink-400 animate-love-pulse shadow-pink-200 dark:shadow-pink-800'
                  : 'bg-gradient-to-r from-white to-pink-50 dark:from-slate-700 dark:to-pink-900/20 text-slate-700 dark:text-slate-100 border-2 border-pink-200 dark:border-pink-800 hover:from-pink-50 hover:to-rose-50 dark:hover:from-pink-900/30 dark:hover:to-rose-900/30 hover:border-pink-300 dark:hover:border-pink-700'
              } ${index % 2 === 0 ? 'heart-decoration' : ''}`}
            >
              {t.label}
              {active === t.id && (
                <div className="absolute -top-1 -right-1 animate-heart-beat text-xs">💖</div>
              )}
            </button>
          ))}
          <div className="absolute -top-2 -right-2 animate-cute-bounce text-lg opacity-60">💕</div>
        </nav>

        <main className="mt-6">
          {active === 'schedule' && (
            <CalendarSchedule
              tasks={calendarTasks}
              setTasks={setCalendarTasks}
              onCreateTask={createCalendarTask}
              onUpdateTask={updateCalendarTask}
              onDeleteTask={deleteCalendarTask}
            />
          )}
          {active === 'pomodoro' && <PomodoroTimer />}
          {active === 'progress' && <ProgressTracker blocks={blocks} />}
          {active === 'exams' && <ExamCountdown />}
          {active === 'notes' && <EncouragementNotes />}
          {active === 'water' && <WaterReminder />}
        </main>
      </div>
    </div>
  )
}
