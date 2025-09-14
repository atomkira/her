// Push Notification Manager for VAPID-based notifications
class PushNotificationManager {
  constructor() {
    this.registration = null
    this.subscription = null
    this.vapidPublicKey = null
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window
    this.init()
  }

  async init() {
    if (!this.isSupported) {
      console.warn('Push notifications are not supported in this browser')
      return
    }

    try {
      // Get VAPID public key from backend
      const response = await fetch('/api/push/status')
      const data = await response.json()
      this.vapidPublicKey = data.vapidPublicKey

      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered for push notifications')

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this))
    } catch (error) {
      console.error('Failed to initialize push notifications:', error)
    }
  }

  handleServiceWorkerMessage(event) {
    const { type, action, taskId } = event.data

    if (type === 'NOTIFICATION_CLICKED') {
      if (action === 'view-task' && taskId) {
        // Dispatch custom event to notify the app
        window.dispatchEvent(new CustomEvent('notification-task-clicked', {
          detail: { taskId }
        }))
      }
    }
  }

  async requestPermission() {
    if (!this.isSupported) {
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission === 'denied') {
      console.warn('Push notifications are blocked by the user')
      return false
    }

    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  async subscribe() {
    if (!this.isSupported || !this.registration || !this.vapidPublicKey) {
      console.error('Cannot subscribe: missing requirements')
      return false
    }

    try {
      const hasPermission = await this.requestPermission()
      if (!hasPermission) {
        return false
      }

      // Check if already subscribed
      const existingSubscription = await this.registration.pushManager.getSubscription()
      if (existingSubscription) {
        this.subscription = existingSubscription
        console.log('Already subscribed to push notifications')
        return true
      }

      // Subscribe to push notifications
      const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey)
      
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      })

      // Send subscription to backend
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: this.subscription.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(this.subscription.getKey('p256dh')))),
            auth: btoa(String.fromCharCode(...new Uint8Array(this.subscription.getKey('auth'))))
          },
          userId: 'anonymous' // You can implement user identification later
        })
      })

      if (response.ok) {
        console.log('Successfully subscribed to push notifications')
        return true
      } else {
        console.error('Failed to save subscription to backend')
        return false
      }
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
      return false
    }
  }

  async unsubscribe() {
    if (!this.subscription) {
      return true
    }

    try {
      // Unsubscribe from browser
      await this.subscription.unsubscribe()

      // Notify backend
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: this.subscription.endpoint
        })
      })

      this.subscription = null
      console.log('Successfully unsubscribed from push notifications')
      return true
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error)
      return false
    }
  }

  async isSubscribed() {
    if (!this.isSupported || !this.registration) {
      return false
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription()
      this.subscription = subscription
      return !!subscription
    } catch (error) {
      console.error('Failed to check subscription status:', error)
      return false
    }
  }

  // Send task reminder notification via backend
  async sendTaskReminder(taskId, taskTitle, reminderMinutes = 5) {
    try {
      const response = await fetch('/api/push/notify/task-reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskId,
          taskTitle,
          reminderMinutes
        })
      })

      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Failed to send task reminder:', error)
      return false
    }
  }

  // Send task completion notification via backend
  async sendTaskCompletion(taskId, taskTitle) {
    try {
      const response = await fetch('/api/push/notify/task-completed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskId,
          taskTitle
        })
      })

      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Failed to send task completion notification:', error)
      return false
    }
  }

  // Send water reminder notification via backend
  async sendWaterReminder() {
    try {
      const response = await fetch('/api/push/notify/water-reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Failed to send water reminder:', error)
      return false
    }
  }

  // Send custom notification via backend
  async sendCustomNotification(title, body, options = {}) {
    try {
      const response = await fetch('/api/push/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          body,
          icon: options.icon || '/manifest-icon-192.png',
          tag: options.tag || 'custom-notification',
          data: options.data || {},
          actions: options.actions || [
            { action: 'view', title: '💖 View' },
            { action: 'dismiss', title: '💤 Dismiss' }
          ]
        })
      })

      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Failed to send custom notification:', error)
      return false
    }
  }
}

// Create singleton instance
const pushNotificationManager = new PushNotificationManager()

export default pushNotificationManager
