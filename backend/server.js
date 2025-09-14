import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import blocksRouter from './routes/blocks.js'
import pomodoroRouter from './routes/pomodoro.js'
import examsRouter from './routes/exams.js'
import tasksRouter from './routes/tasks.js'
import calendarTasksRouter from './routes/calendarTasks.js'
import noteTimerRouter from './routes/noteTimer.js'
import waterRouter from './routes/water.js'
import pushNotificationsRouter from './routes/pushNotifications.js'

// Ensure .env is loaded from this backend directory regardless of CWD
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envPath = path.join(__dirname, '.env')
const envLoad = dotenv.config({ path: envPath })
if (envLoad.error) {
  console.warn(`[backend] Failed to load .env from ${envPath}:`, envLoad.error.message)
} else {
  console.log(`[backend] .env loaded from ${envPath}`)
}

const app = express()
app.use(cors())
app.use(express.json())

// Friendly root route for Render and manual checks
app.get('/', (_req, res) => {
  res.type('text/plain').send('Study Tracker API is running. Try GET /api/health')
})

const PORT = process.env.PORT || 5001
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/studytracker'
const DB_NAME = process.env.MONGODB_DB || undefined

if (!process.env.MONGODB_URI) {
  console.warn('[backend] MONGODB_URI not found in environment. Using local mongodb://127.0.0.1:27017/studytracker')
  console.warn('[backend] If you are using MongoDB Atlas without a path db name, also set MONGODB_DB in backend/.env')
} else {
  console.log('[backend] MONGODB_URI detected')
}

mongoose
  .connect(MONGODB_URI, { dbName: DB_NAME })
  .then(() => {
    console.log('MongoDB connected')
    app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`))
  })
  .catch((e) => {
    console.error('Mongo connection error:', e.message)
    process.exit(1)
  })

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/blocks', blocksRouter)
app.use('/api/pomodoro', pomodoroRouter)
app.use('/api/exams', examsRouter)
app.use('/api/tasks', tasksRouter)
app.use('/api/calendar-tasks', calendarTasksRouter)
app.use('/api/note-timer', noteTimerRouter)
app.use('/api/water', waterRouter)
app.use('/api/push', pushNotificationsRouter)

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../frontend/dist')))

// Catch-all handler: send back React's index.html file for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'))
})
