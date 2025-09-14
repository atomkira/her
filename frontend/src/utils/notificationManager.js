import pushNotificationManager from './pushNotificationManager.js'

// Advanced Notification Manager with Push Notification Support
class NotificationManager {
  constructor() {
    this.settings = this.loadSettings()
    this.serviceWorkerRegistration = null
    this.pushManager = pushNotificationManager
    this.init()
  }

  async init() {
    // Register service worker
    if ('serviceWorker' in navigator) {
      try {
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js')
        console.log('Service Worker registered successfully')
        
        // Listen for settings changes
        window.addEventListener('notification-settings-changed', (event) => {
          this.settings = event.detail
          this.saveSettings()
          
          // Subscribe/unsubscribe from push notifications based on settings
          if (this.settings.enabled) {
            this.pushManager.subscribe()
          } else {
            this.pushManager.unsubscribe()
          }
        })
        
        // Listen for notification task clicks
        window.addEventListener('notification-task-clicked', (event) => {
          const { taskId } = event.detail
          // Dispatch event to focus on specific task
          window.dispatchEvent(new CustomEvent('focus-task', { detail: { taskId } }))
        })
      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }
  }

  loadSettings() {
    const defaultSettings = {
      enabled: false,
      dailyReminders: true,
      taskReminders: true,
      completionNotifications: true,
      reminderMinutes: 5
    }
    
    try {
      const stored = localStorage.getItem('notification-settings')
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings
    } catch (error) {
      console.error('Error loading notification settings:', error)
      return defaultSettings
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('notification-settings', JSON.stringify(this.settings))
    } catch (error) {
      console.error('Error saving notification settings:', error)
    }
  }

  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications')
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission === 'denied') {
      console.warn('Notifications are blocked by the user')
      return false
    }

    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  async showNotification(title, options = {}) {
    if (!this.settings.enabled || Notification.permission !== 'granted') {
      return null
    }

    const defaultOptions = {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [100, 50, 100],
      requireInteraction: false,
      ...options
    }

    try {
      // Use service worker notification if available (for persistence)
      if (this.serviceWorkerRegistration && 'showNotification' in this.serviceWorkerRegistration) {
        return await this.serviceWorkerRegistration.showNotification(title, defaultOptions)
      } else {
        // Fallback to regular notification
        return new Notification(title, defaultOptions)
      }
    } catch (error) {
      console.error('Error showing notification:', error)
      return null
    }
  }

  async scheduleTaskReminder(task) {
    if (!this.settings.enabled || !this.settings.taskReminders || !task.time || task.completed) {
      return
    }

    const now = new Date()
    const taskDate = new Date(task.date)
    const [hours, minutes] = task.time.split(':').map(Number)
    
    // Create task datetime
    const taskDateTime = new Date(taskDate)
    taskDateTime.setHours(hours, minutes, 0, 0)
    
    // Create reminder datetime (X minutes before task)
    const reminderDateTime = new Date(taskDateTime.getTime() - (this.settings.reminderMinutes * 60 * 1000))
    
    const timeUntilReminder = reminderDateTime.getTime() - now.getTime()
    const timeUntilTask = taskDateTime.getTime() - now.getTime()

    // Schedule push notification for reminder (works even when app is closed)
    if (timeUntilReminder > 0 && timeUntilReminder <= 24 * 60 * 60 * 1000) {
      if (await this.pushManager.isSubscribed()) {
        // Schedule via backend for reliable delivery
        setTimeout(async () => {
          await this.pushManager.sendTaskReminder(task.id, task.title, this.settings.reminderMinutes)
        }, timeUntilReminder)
      }
      
      // Store reminder in service worker as backup
      if (this.serviceWorkerRegistration && this.serviceWorkerRegistration.active) {
        this.serviceWorkerRegistration.active.postMessage({
          type: 'SCHEDULE_REMINDER',
          task: task,
          reminderTime: reminderDateTime.getTime(),
          reminderMinutes: this.settings.reminderMinutes
        })
      }
      
      // Also set immediate timeout as backup for local notifications
      setTimeout(() => {
        this.showNotification(`💖 Task Reminder`, {
          body: `${task.title} starts in ${this.settings.reminderMinutes} minutes! 💕`,
          tag: `reminder-${task.id}`,
          requireInteraction: true,
          icon: '/manifest-icon-192.png',
          actions: [
            { action: 'view', title: '💖 View Task' },
            { action: 'dismiss', title: '💤 Dismiss' }
          ]
        })
      }, timeUntilReminder)
    }

    // Schedule task start notification
    if (timeUntilTask > 0 && timeUntilTask <= 24 * 60 * 60 * 1000) {
      // Store task start in service worker
      if (this.serviceWorkerRegistration && this.serviceWorkerRegistration.active) {
        this.serviceWorkerRegistration.active.postMessage({
          type: 'SCHEDULE_TASK_START',
          task: task,
          taskTime: taskDateTime.getTime()
        })
      }
      
      // Also set immediate timeout as backup
      setTimeout(() => {
        this.showNotification(`💕 Task Time!`, {
          body: `Time for: ${task.title} 💖`,
          tag: `task-${task.id}`,
          requireInteraction: true,
          icon: '/manifest-icon-192.png',
          actions: [
            { action: 'start', title: '💖 Start Task' },
            { action: 'snooze', title: '💤 Snooze 5min' }
          ]
        })
      }, timeUntilTask)
    }
  }

  async showTaskCompletionNotification(taskTitle, taskId = null) {
    if (!this.settings.enabled || !this.settings.completionNotifications) {
      return
    }

    // Send push notification via backend (works even when app is closed)
    if (taskId && await this.pushManager.isSubscribed()) {
      await this.pushManager.sendTaskCompletion(taskId, taskTitle)
    }

    const cuteMessages = [
      "Amazing work! You're absolutely crushing it! 💖✨",
      "Fantastic! You're doing incredible! 💕🌟",
      "Outstanding! Keep up the amazing work! 💖🎉",
      "Brilliant! You're unstoppable! 💕💪",
      "Incredible! You're on fire! 💖🔥",
      "Spectacular! You're a superstar! 💕⭐",
      "Wonderful! You're doing great! 💖🌈",
      "Magnificent! You're awesome! 💕🚀",
      "You're such a star! Keep shining! 💖✨",
      "Absolutely adorable work! 💕🌸",
      "You're doing beautifully! 💖🦋",
      "Sweet success! You're amazing! 💕🍯"
    ]

    const message = cuteMessages[Math.floor(Math.random() * cuteMessages.length)]
    
    // Also show local notification for immediate feedback
    this.showNotification('💖 Task Completed!', {
      body: `${taskTitle} - ${message}`,
      tag: 'completion',
      requireInteraction: false,
      icon: '/manifest-icon-192.png',
      vibrate: [200, 100, 200, 100, 200],
      actions: [
        { action: 'celebrate', title: '💖 Celebrate!' },
        { action: 'next', title: '💕 Next Task' }
      ]
    })
    
    // Also trigger a visual celebration in the UI
    window.dispatchEvent(new CustomEvent('task-completed', { detail: { taskTitle, message } }))
  }

  async scheduleDailyReminders(tasks) {
    if (!this.settings.enabled || !this.settings.dailyReminders) {
      return
    }

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const todayTasks = tasks.filter(task => task.date === today && !task.completed)

    if (todayTasks.length === 0) {
      return
    }

    // Schedule morning reminder (9 AM)
    const morningReminder = new Date()
    morningReminder.setHours(9, 0, 0, 0)
    
    if (morningReminder > now) {
      const timeUntilMorning = morningReminder.getTime() - now.getTime()
      setTimeout(async () => {
        const title = '💖 Good Morning!'
        const body = `You have ${todayTasks.length} tasks scheduled for today. Let's make it a productive day! 💕`
        
        // Send push notification
        if (await this.pushManager.isSubscribed()) {
          await this.pushManager.sendCustomNotification(title, body, {
            tag: 'daily-morning',
            icon: '/manifest-icon-192.png'
          })
        }
        
        // Also show local notification
        this.showNotification(title, {
          body: body,
          tag: 'daily-morning',
          requireInteraction: false,
          icon: '/manifest-icon-192.png'
        })
      }, timeUntilMorning)
    }

    // Schedule evening summary (6 PM)
    const eveningReminder = new Date()
    eveningReminder.setHours(18, 0, 0, 0)
    
    if (eveningReminder > now) {
      const timeUntilEvening = eveningReminder.getTime() - now.getTime()
      setTimeout(async () => {
        const remainingTasks = tasks.filter(task => task.date === today && !task.completed)
        let title, body
        
        if (remainingTasks.length > 0) {
          title = '💕 Evening Check-in'
          body = `You still have ${remainingTasks.length} tasks to complete today. You've got this! 💖`
        } else {
          title = '💖 Great Job!'
          body = `All tasks completed for today! Time to relax and celebrate! 💕🎉`
        }
        
        // Send push notification
        if (await this.pushManager.isSubscribed()) {
          await this.pushManager.sendCustomNotification(title, body, {
            tag: 'daily-evening',
            icon: '/manifest-icon-192.png'
          })
        }
        
        // Also show local notification
        this.showNotification(title, {
          body: body,
          tag: 'daily-evening',
          requireInteraction: false,
          icon: '/manifest-icon-192.png'
        })
      }, timeUntilEvening)
    }
  }

  updateTasksInServiceWorker(tasks) {
    // Send tasks to service worker for background processing
    if (this.serviceWorkerRegistration && this.serviceWorkerRegistration.active) {
      this.serviceWorkerRegistration.active.postMessage({
        type: 'UPDATE_TASKS',
        tasks: tasks
      })
    }
    
    // Also store in localStorage as fallback
    try {
      localStorage.setItem('study-tracker-tasks', JSON.stringify(tasks))
    } catch (error) {
      console.error('Error storing tasks:', error)
    }
  }

  // Schedule all notifications for a task
  async scheduleAllNotifications(task) {
    await this.scheduleTaskReminder(task)
  }
  
  // Enable push notifications
  async enablePushNotifications() {
    return await this.pushManager.subscribe()
  }
  
  // Disable push notifications
  async disablePushNotifications() {
    return await this.pushManager.unsubscribe()
  }
  
  // Check if push notifications are enabled
  async isPushEnabled() {
    return await this.pushManager.isSubscribed()
  }
  
  // Send water reminder
  async sendWaterReminder() {
    if (await this.pushManager.isSubscribed()) {
      return await this.pushManager.sendWaterReminder()
    }
    return false
  }

  // Reschedule all notifications when tasks change
  rescheduleNotifications(tasks) {
    // Clear existing timeouts (in a real app, you'd want to track these)
    // For now, we'll rely on the service worker for persistence
    
    // Update service worker with new tasks
    this.updateTasksInServiceWorker(tasks)
    
    // Schedule daily reminders
    this.scheduleDailyReminders(tasks)
    
    // Schedule individual task notifications
    tasks.forEach(task => {
      if (!task.completed) {
        this.scheduleAllNotifications(task)
      }
    })
  }
}

// Create singleton instance
const notificationManager = new NotificationManager()

export default notificationManager
