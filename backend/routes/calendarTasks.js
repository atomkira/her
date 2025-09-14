import { Router } from 'express'
import CalendarTask from '../models/CalendarTask.js'

const router = Router()

// GET all calendar tasks
router.get('/', async (req, res) => {
  try {
    const { date, userId = 'default' } = req.query
    let query = { userId }
    
    if (date) {
      query.date = date
    }
    
    const tasks = await CalendarTask.find(query).sort({ time: 1, createdAt: 1 })
    res.json(tasks)
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch calendar tasks' })
  }
})

// GET tasks for a specific date range
router.get('/range', async (req, res) => {
  try {
    const { startDate, endDate, userId = 'default' } = req.query
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' })
    }
    
    const tasks = await CalendarTask.find({
      userId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1, time: 1 })
    
    res.json(tasks)
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch calendar tasks for date range' })
  }
})

// POST create calendar task
router.post('/', async (req, res) => {
  try {
    const { title, description, category, date, time, endTime, priority, userId = 'default' } = req.body || {}
    
    if (!title || !date || !time) {
      return res.status(400).json({ error: 'title, date, and time are required' })
    }
    
    const created = await CalendarTask.create({
      title,
      description: description || '',
      category: category || 'study',
      date,
      time,
      endTime: endTime || '',
      priority: priority || 'medium',
      userId
    })
    
    res.status(201).json(created)
  } catch (e) {
    res.status(500).json({ error: 'Failed to create calendar task' })
  }
})

// PUT update calendar task
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { title, description, category, date, time, endTime, priority, completed, notificationSent, userId = 'default' } = req.body || {}
    
    const updated = await CalendarTask.findOneAndUpdate(
      { _id: id, userId },
      { 
        title, 
        description, 
        category, 
        date, 
        time, 
        endTime,
        priority,
        completed, 
        notificationSent 
      },
      { new: true, runValidators: true }
    )
    
    if (!updated) {
      return res.status(404).json({ error: 'Calendar task not found' })
    }
    
    res.json(updated)
  } catch (e) {
    res.status(500).json({ error: 'Failed to update calendar task' })
  }
})

// DELETE calendar task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { userId = 'default' } = req.query
    
    const deleted = await CalendarTask.findOneAndDelete({ _id: id, userId })
    
    if (!deleted) {
      return res.status(404).json({ error: 'Calendar task not found' })
    }
    
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete calendar task' })
  }
})

// GET upcoming tasks (for notifications)
router.get('/upcoming', async (req, res) => {
  try {
    const { userId = 'default' } = req.query
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const currentTime = now.getHours() * 60 + now.getMinutes()
    
    const tasks = await CalendarTask.find({
      userId,
      date: today,
      completed: false,
      notificationSent: false
    }).sort({ time: 1 })
    
    // Filter tasks that are due within the next hour
    const upcomingTasks = tasks.filter(task => {
      const [hours, minutes] = task.time.split(':').map(Number)
      const taskTime = hours * 60 + minutes
      return taskTime >= currentTime && taskTime <= currentTime + 60
    })
    
    res.json(upcomingTasks)
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch upcoming tasks' })
  }
})

export default router
