import React, { useState, useEffect } from 'react'
import NotificationSettings from './NotificationSettings'
import notificationManager from '../utils/notificationManager'

const taskCategories = {
  study: { 
    label: 'Study 📚💖', 
    color: 'bg-gradient-to-br from-pink-100 to-rose-100 text-pink-800 border-pink-200 dark:from-pink-900/30 dark:to-rose-900/30 dark:text-pink-200 dark:border-pink-800',
    emoji: '📚💖',
    priority: 'high'
  },
  food: { 
    label: 'Food 🍽️💕', 
    color: 'bg-gradient-to-br from-orange-100 to-pink-100 text-orange-800 border-orange-200 dark:from-orange-900/30 dark:to-pink-900/30 dark:text-orange-200 dark:border-orange-800',
    emoji: '🍽️💕',
    priority: 'medium'
  },
  chores: { 
    label: 'Chores 🧹💖', 
    color: 'bg-gradient-to-br from-green-100 to-pink-100 text-green-800 border-green-200 dark:from-green-900/30 dark:to-pink-900/30 dark:text-green-200 dark:border-green-800',
    emoji: '🧹💖',
    priority: 'low'
  },
  exercise: { 
    label: 'Exercise 💪💕', 
    color: 'bg-gradient-to-br from-purple-100 to-pink-100 text-purple-800 border-purple-200 dark:from-purple-900/30 dark:to-pink-900/30 dark:text-purple-200 dark:border-purple-800',
    emoji: '💪💕',
    priority: 'high'
  },
  other: { 
    label: 'Other ✨💖', 
    color: 'bg-gradient-to-br from-gray-100 to-pink-100 text-gray-800 border-gray-200 dark:from-gray-900/30 dark:to-pink-900/30 dark:text-gray-200 dark:border-gray-800',
    emoji: '✨💖',
    priority: 'low'
  }
}

const priorityIndicators = {
  high: { emoji: '💖⭐', color: 'text-pink-500' },
  medium: { emoji: '💕💫', color: 'text-rose-500' },
  low: { emoji: '💗🌙', color: 'text-purple-500' }
}

const cuteMessages = [
  "Amazing work! You're absolutely crushing it! 🌟",
  "Fantastic! You're doing incredible! ✨",
  "Outstanding! Keep up the amazing work! 🎉",
  "Brilliant! You're unstoppable! 💪",
  "Incredible! You're on fire! 🔥",
  "Spectacular! You're a superstar! ⭐",
  "Wonderful! You're doing great! 🌈",
  "Magnificent! You're awesome! 🚀"
]

export default function CalendarSchedule({ tasks, setTasks, onCreateTask, onUpdateTask, onDeleteTask }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [newTask, setNewTask] = useState({
    title: '',
    category: 'study',
    time: '',
    endTime: '',
    description: '',
    date: '',
    priority: 'medium'
  })
  const [hoveredDate, setHoveredDate] = useState(null)
  const [showSidePanel, setShowSidePanel] = useState(false)
  const [showNotificationSettings, setShowNotificationSettings] = useState(false)
  const [showMonthTasks, setShowMonthTasks] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(null)

  // Initialize notification manager and schedule notifications
  useEffect(() => {
    if (notificationManager) {
      notificationManager.rescheduleNotifications(tasks)
    }
  }, [tasks])

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days = []
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const getTasksForDate = (date) => {
    if (!date) return []
    const dateString = date.toISOString().split('T')[0]
    return tasks.filter(task => task.date === dateString)
  }

  const isToday = (date) => {
    if (!date) return false
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date) => {
    if (!date) return false
    return date.toDateString() === selectedDate.toDateString()
  }

  const handleDateClick = (date) => {
    if (!date) return
    setSelectedDate(date)
    setNewTask(prev => ({ ...prev, date: date.toISOString().split('T')[0] }))
    setShowSidePanel(true)
  }

  const handleTaskClick = (task) => {
    setEditingTask(task)
    setNewTask({
      title: task.title,
      category: task.category,
      time: task.time,
      endTime: task.endTime || '',
      description: task.description || '',
      date: task.date,
      priority: task.priority || 'medium'
    })
    setShowTaskModal(true)
  }

  const handleSaveTask = async () => {
    if (!newTask.title || !newTask.time || !newTask.date) return

    try {
      let savedTask
      if (editingTask) {
        savedTask = await onUpdateTask(editingTask.id, newTask)
      } else {
        savedTask = await onCreateTask(newTask)
      }
      
      // Schedule notifications for the new/updated task
      if (notificationManager) {
        await notificationManager.scheduleAllNotifications(newTask)
      }
      
      setShowTaskModal(false)
      setEditingTask(null)
      setNewTask({
        title: '',
        category: 'study',
        time: '',
        endTime: '',
        description: '',
        date: '',
        priority: 'medium'
      })
    } catch (error) {
      console.error('Failed to save task:', error)
    }
  }

  const handleDeleteTask = async (taskId) => {
    try {
      await onDeleteTask(taskId)
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const handleCompleteTask = async (task) => {
    try {
      const updatedTask = await onUpdateTask(task.id, { ...task, completed: !task.completed })
      // Show completion notification when task is marked as completed
      if (!task.completed && updatedTask.completed) {
        // Force notification regardless of settings for completion celebration
        if (notificationManager) {
          notificationManager.showTaskCompletionNotification(task.title, task.id)
        }
      }
    } catch (error) {
      console.error('Failed to complete task:', error)
    }
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + direction)
      return newDate
    })
  }

  const handleMonthClick = () => {
    setSelectedMonth(currentDate)
    setShowMonthTasks(true)
  }

  const getTasksForMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return tasks.filter(task => {
      const taskDate = new Date(task.date)
      return taskDate.getFullYear() === year && taskDate.getMonth() === month
    })
  }

  const days = getDaysInMonth(currentDate)
  const selectedDateTasks = getTasksForDate(selectedDate)

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in-up">
      {/* Calendar Header */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-4">
          <h2 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
            💖 Calendar Schedule 💕
          </h2>
          <div className="hidden sm:block animate-float text-2xl">💖</div>
          <div className="hidden sm:block animate-float text-2xl" style={{animationDelay: '0.5s'}}>💕</div>
          <div className="hidden sm:block animate-float text-2xl" style={{animationDelay: '1s'}}>✨</div>
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <button
            onClick={() => setShowNotificationSettings(true)}
            className="group flex-1 sm:flex-initial text-xs sm:text-base relative rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white px-3 py-2 sm:px-4 sm:py-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 heart-decoration animate-love-pulse"
          >
            <span className="flex items-center gap-2 font-semibold">
              <span className="text-lg sm:text-xl group-hover:animate-wiggle">💖</span>
              Notifications
            </span>
          </button>
          <button
            onClick={() => setShowTaskModal(true)}
            className="group flex-1 sm:flex-initial text-xs sm:text-base relative rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white px-3 py-2 sm:px-6 sm:py-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-love-pulse"
          >
            <span className="flex items-center gap-2 font-semibold">
              <span className="text-lg sm:text-xl group-hover:animate-wiggle">💕</span>
              Add Task
            </span>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-rose-400 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-sm"></div>
            <div className="hidden sm:block absolute -top-1 -right-1 animate-heart-beat text-xs">💖</div>
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-gradient-to-br from-white/95 to-pink-50/95 dark:from-slate-800/95 dark:to-pink-950/95 backdrop-blur-sm rounded-3xl border-2 border-pink-200/60 dark:border-pink-700/60 p-2 sm:p-8 shadow-2xl hearts-bg relative overflow-hidden">
        <div className="hidden sm:block absolute top-4 right-4 animate-heart-beat text-2xl opacity-20">💖</div>
        <div className="hidden sm:block absolute bottom-4 left-4 animate-sparkle text-xl opacity-20">💕</div>
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-2 sm:mb-8">
          <button
            onClick={() => navigateMonth(-1)}
            className="group p-2 sm:p-3 rounded-full hover:bg-gradient-to-r hover:from-rose-100 hover:to-pink-100 dark:hover:from-rose-900/30 dark:hover:to-pink-900/30 transition-all duration-300 transform hover:scale-110"
          >
            <span className="text-lg sm:text-2xl group-hover:animate-wiggle">←</span>
          </button>
          <button
            onClick={handleMonthClick}
            className="text-base sm:text-2xl font-bold text-slate-800 dark:text-slate-200 font-quicksand hover:text-rose-600 dark:hover:text-rose-400 transition-colors duration-300 cursor-pointer group"
          >
            <span className="group-hover:animate-pulse">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <span className="hidden sm:inline ml-2 text-sm opacity-60 group-hover:opacity-100 transition-opacity">
              📅 Click to view all tasks
            </span>
          </button>
          <button
            onClick={() => navigateMonth(1)}
            className="group p-2 sm:p-3 rounded-full hover:bg-gradient-to-r hover:from-rose-100 hover:to-pink-100 dark:hover:from-rose-900/30 dark:hover:to-pink-900/30 transition-all duration-300 transform hover:scale-110"
          >
            <span className="text-lg sm:text-2xl group-hover:animate-wiggle">→</span>
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-2 sm:mb-4">
          {dayNames.map(day => (
            <div key={day} className="p-1 sm:p-3 text-center text-[9px] sm:text-sm font-bold text-slate-600 dark:text-slate-400 font-quicksand">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const dayTasks = getTasksForDate(day)
            const isCurrentDay = isToday(day)
            const isSelectedDay = isSelected(day)
            const isHovered = hoveredDate === day
            
            return (
              <div
                key={index}
                onClick={() => handleDateClick(day)}
                onMouseEnter={() => setHoveredDate(day)}
                onMouseLeave={() => setHoveredDate(null)}
                className={`
                  min-h-[56px] sm:min-h-[100px] p-1 sm:p-3 rounded-lg sm:rounded-2xl cursor-pointer transition-all duration-300 border-2 relative group
                  ${day ? 'hover:scale-105 hover:shadow-lg' : ''}
                  ${isCurrentDay ? 'bg-gradient-to-br from-pink-200 to-rose-200 dark:from-pink-800 dark:to-rose-800 border-pink-400 dark:border-pink-600 shadow-lg animate-love-pulse' : ''}
                  ${isSelectedDay ? 'bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/40 dark:to-rose-900/40 border-pink-300 dark:border-pink-600 shadow-md' : ''}
                  ${!day ? 'invisible' : ''}
                  ${!isCurrentDay && !isSelectedDay ? 'border-transparent hover:border-pink-200 dark:hover:border-pink-700 hover:bg-gradient-to-br hover:from-pink-50 hover:to-rose-50 dark:hover:from-pink-900/20 dark:hover:to-rose-900/20' : ''}
                  ${isHovered ? 'animate-glow' : ''}
                  ${dayTasks.length > 0 && !isCurrentDay && !isSelectedDay ? 'heart-decoration' : ''}
                `}
              >
                {day && (
                  <>
                    <div className={`text-sm sm:text-lg font-bold mb-1 flex items-center justify-center sm:justify-between ${isCurrentDay ? 'text-pink-800 dark:text-pink-200' : 'text-slate-700 dark:text-slate-300'}`}>
                      <span>{day.getDate()}</span>
                      {isCurrentDay && <span className="hidden sm:inline animate-heart-beat text-sm">💖</span>}
                    </div>
                    <div className="hidden sm:block space-y-0.5 sm:space-y-1">
                      {dayTasks.slice(0, 2).map(task => (
                        <div
                          key={task.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleTaskClick(task)
                          }}
                          className={`text-[10px] sm:text-xs px-2 py-0.5 sm:py-1 rounded-full truncate cursor-pointer transition-all duration-200 hover:scale-105 ${taskCategories[task.category].color} ${
                            task.completed ? 'opacity-60 line-through' : ''
                          }`}
                        >
                          <span className="mr-1">{taskCategories[task.category].emoji}</span>
                          {task.title}
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-semibold text-center">
                          +{dayTasks.length - 2} more
                        </div>
                      )}
                    </div>
                    {dayTasks.length > 0 && (
                      <div className="hidden sm:flex absolute top-1 right-1 items-center gap-1">
                        <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse"></div>
                        <span className="text-xs animate-heart-beat">💕</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Side Panel for Selected Date Tasks */}
      {showSidePanel && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-end p-4 z-50 animate-fade-in-up">
          <div className="w-full max-w-md bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-3xl border border-white/60 dark:border-slate-700 p-6 shadow-2xl animate-bounce-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
              <button
                onClick={() => setShowSidePanel(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedDateTasks.length > 0 ? (
                selectedDateTasks.map(task => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-4 rounded-2xl border transition-all duration-200 hover:scale-105 ${
                      task.completed 
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800' 
                        : 'bg-gradient-to-r from-white to-slate-50 dark:from-slate-700 dark:to-slate-600 border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleCompleteTask(task)}
                      className="h-5 w-5 accent-rose-500 rounded"
                    />
                    <div className="flex-1">
                      <div className={`font-semibold ${task.completed ? 'line-through opacity-60' : ''}`}>
                        {task.title}
                      </div>
                      {task.time && (
                        <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
                          <span>⏰</span>
                          {task.time} {task.endTime && `- ${task.endTime}`}
                        </div>
                      )}
                      {task.description && (
                        <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {task.description}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`px-2 py-1 rounded-full text-xs border ${taskCategories[task.category].color}`}>
                        {taskCategories[task.category].emoji}
                      </div>
                      <div className={`text-lg ${priorityIndicators[task.priority || 'medium'].color}`}>
                        {priorityIndicators[task.priority || 'medium'].emoji}
                      </div>
                      <button
                        onClick={() => handleTaskClick(task)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <div className="text-4xl mb-2">📅</div>
                  <p>No tasks for this date</p>
                  <p className="text-sm">Click the + button to add one!</p>
                </div>
              )}
            </div>
            
            <button
              onClick={() => {
                setShowTaskModal(true)
                setShowSidePanel(false)
              }}
              className="w-full mt-4 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-semibold hover:from-rose-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              + Add Task for This Date
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in-up">
          <div className="w-full max-w-lg bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-3xl border border-white/60 dark:border-slate-700 p-8 shadow-2xl animate-bounce-in">
            <h3 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-200 text-center">
              {editingTask ? '✏️ Edit Task' : '✨ Add New Task'}
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Task Title
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter task title..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Category
                  </label>
                  <select
                    value={newTask.category}
                    onChange={(e) => setNewTask(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-200"
                  >
                    {Object.entries(taskCategories).map(([key, category]) => (
                      <option key={key} value={key}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Priority
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="high">⭐ High Priority</option>
                    <option value="medium">💫 Medium Priority</option>
                    <option value="low">🌙 Low Priority</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newTask.date}
                    onChange={(e) => setNewTask(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={newTask.time}
                    onChange={(e) => setNewTask(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={newTask.endTime}
                    onChange={(e) => setNewTask(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-200"
                  rows="3"
                  placeholder="Add a description..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-8">
              <button
                onClick={() => {
                  setShowTaskModal(false)
                  setEditingTask(null)
                  setNewTask({
                    title: '',
                    category: 'study',
                    time: '',
                    endTime: '',
                    description: '',
                    date: '',
                    priority: 'medium'
                  })
                }}
                className="px-6 py-3 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all duration-300 transform hover:scale-105 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTask}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-lg font-semibold"
              >
                {editingTask ? '✨ Update Task' : '🎉 Add Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Month Tasks Modal */}
      {showMonthTasks && selectedMonth && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in-up">
          <div className="w-full max-w-4xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-3xl border border-white/60 dark:border-slate-700 p-8 shadow-2xl animate-bounce-in max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                📅 Tasks for {monthNames[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
              </h3>
              <button
                onClick={() => setShowMonthTasks(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="grid gap-4">
              {getTasksForMonth(selectedMonth).length > 0 ? (
                getTasksForMonth(selectedMonth)
                  .sort((a, b) => new Date(a.date + ' ' + (a.time || '00:00')) - new Date(b.date + ' ' + (b.time || '00:00')))
                  .map(task => {
                    const taskDate = new Date(task.date)
                    return (
                      <div
                        key={task.id}
                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 hover:scale-105 ${
                          task.completed 
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800' 
                            : 'bg-gradient-to-r from-white to-slate-50 dark:from-slate-700 dark:to-slate-600 border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => handleCompleteTask(task)}
                          className="h-5 w-5 accent-rose-500 rounded"
                        />
                        <div className="flex-1">
                          <div className={`font-semibold ${task.completed ? 'line-through opacity-60' : ''}`}>
                            {task.title}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              📅 {taskDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                            {task.time && (
                              <span className="flex items-center gap-1">
                                ⏰ {task.time} {task.endTime && `- ${task.endTime}`}
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                              {task.description}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`px-3 py-1 rounded-full text-xs border ${taskCategories[task.category].color}`}>
                            {taskCategories[task.category].emoji} {taskCategories[task.category].label.split(' ')[0]}
                          </div>
                          <div className={`text-lg ${priorityIndicators[task.priority || 'medium'].color}`}>
                            {priorityIndicators[task.priority || 'medium'].emoji}
                          </div>
                          <button
                            onClick={() => handleTaskClick(task)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    )
                  })
              ) : (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <div className="text-6xl mb-4">📅</div>
                  <p className="text-xl mb-2">No tasks for this month</p>
                  <p className="text-sm">Click the + button to add your first task!</p>
                </div>
              )}
            </div>
            
            <button
              onClick={() => {
                setShowTaskModal(true)
                setShowMonthTasks(false)
              }}
              className="w-full mt-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-semibold hover:from-rose-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              + Add Task for This Month
            </button>
          </div>
        </div>
      )}

      {/* Notification Settings Modal */}
      <NotificationSettings 
        isOpen={showNotificationSettings} 
        onClose={() => setShowNotificationSettings(false)} 
      />
    </div>
  )
}