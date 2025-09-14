import express from 'express'
import webpush from 'web-push'
import PushSubscription from '../models/PushSubscription.js'

const router = express.Router()

// Configure web-push with VAPID keys - check if keys exist first
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

if (!vapidPublicKey || !vapidPrivateKey) {
  console.error('VAPID keys not found in environment variables')
  console.error('VAPID_PUBLIC_KEY:', vapidPublicKey ? 'Set' : 'Missing')
  console.error('VAPID_PRIVATE_KEY:', vapidPrivateKey ? 'Set' : 'Missing')
} else {
  webpush.setVapidDetails(
    'mailto:your-email@example.com',
    vapidPublicKey,
    vapidPrivateKey
  )
  console.log('VAPID keys configured successfully')
}

// Subscribe to push notifications
router.post('/subscribe', async (req, res) => {
  try {
    const { endpoint, keys, userId = 'anonymous' } = req.body

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'Invalid subscription data' })
    }

    // Check if subscription already exists
    let subscription = await PushSubscription.findOne({ endpoint })
    
    if (subscription) {
      // Update existing subscription
      subscription.keys = keys
      subscription.lastUsed = new Date()
      subscription.isActive = true
      await subscription.save()
    } else {
      // Create new subscription
      subscription = new PushSubscription({
        endpoint,
        keys,
        userId
      })
      await subscription.save()
    }

    res.status(201).json({ 
      success: true, 
      message: 'Subscription saved successfully',
      subscriptionId: subscription._id
    })
  } catch (error) {
    console.error('Error saving subscription:', error)
    res.status(500).json({ error: 'Failed to save subscription' })
  }
})

// Unsubscribe from push notifications
router.post('/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' })
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { isActive: false },
      { new: true }
    )

    res.json({ success: true, message: 'Unsubscribed successfully' })
  } catch (error) {
    console.error('Error unsubscribing:', error)
    res.status(500).json({ error: 'Failed to unsubscribe' })
  }
})

// Send notification to all active subscriptions
router.post('/notify', async (req, res) => {
  try {
    const { title, body, icon, tag, data, actions } = req.body

    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' })
    }

    const subscriptions = await PushSubscription.find({ isActive: true })

    if (subscriptions.length === 0) {
      return res.json({ success: true, message: 'No active subscriptions found' })
    }

    const payload = JSON.stringify({
      title: title,
      body: body,
      icon: icon || '/manifest-icon-192.png',
      tag: tag || 'study-tracker-notification',
      data: data || {},
      actions: actions || [
        { action: 'view', title: '💖 View' },
        { action: 'dismiss', title: '💤 Dismiss' }
      ]
    })

    const notificationPromises = subscriptions.map(async (subscription) => {
      try {
        const options = {
          vapidDetails: {
            subject: 'mailto:your-email@example.com',
            publicKey: process.env.VAPID_PUBLIC_KEY,
            privateKey: process.env.VAPID_PRIVATE_KEY
          },
          headers: {
            'Content-Type': 'application/json'
          }
        };

        if (subscription.endpoint.includes('fcm.googleapis.com')) {
          options.headers.Authorization = `key=${process.env.VAPID_PRIVATE_KEY}`;
        }

        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys
          },
          payload,
          options
        );
        
        // Update last used timestamp
        subscription.lastUsed = new Date()
        await subscription.save()
        
        return { success: true, endpoint: subscription.endpoint }
      } catch (error) {
        console.error('Failed to send notification:', error)
        
        // If subscription is invalid, mark as inactive
        if (error.statusCode === 410 || error.statusCode === 404) {
          subscription.isActive = false
          await subscription.save()
        }
        
        return { success: false, endpoint: subscription.endpoint, error: error.message }
      }
    })

    const results = await Promise.all(notificationPromises)
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    res.json({
      success: true,
      message: `Notifications sent: ${successful} successful, ${failed} failed`,
      results: results
    })
  } catch (error) {
    console.error('Error sending notifications:', error)
    res.status(500).json({ error: 'Failed to send notifications' })
  }
})

// Send task reminder notification
router.post('/notify/task-reminder', async (req, res) => {
  try {
    const { taskId, taskTitle, reminderMinutes = 5 } = req.body

    if (!taskId || !taskTitle) {
      return res.status(400).json({ error: 'Task ID and title are required' })
    }

    const payload = {
      title: `💖 Task Reminder`,
      body: `${taskTitle} starts in ${reminderMinutes} minutes! 💕`,
      icon: '/manifest-icon-192.png',
      tag: `task-reminder-${taskId}`,
      data: {
        type: 'task-reminder',
        taskId: taskId,
        reminderMinutes: reminderMinutes
      },
      actions: [
        { action: 'view', title: '💖 View Task' },
        { action: 'dismiss', title: '💤 Snooze' }
      ]
    }

    // Use the existing notify endpoint
    const response = await fetch(`${req.protocol}://${req.get('host')}/api/push/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const result = await response.json()
    res.json(result)
  } catch (error) {
    console.error('Error sending task reminder:', error)
    res.status(500).json({ error: 'Failed to send task reminder' })
  }
})

// Send task completion notification
router.post('/notify/task-completed', async (req, res) => {
  try {
    const { taskId, taskTitle } = req.body

    if (!taskId || !taskTitle) {
      return res.status(400).json({ error: 'Task ID and title are required' })
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

    const payload = {
      title: `💖 Task Completed!`,
      body: `${taskTitle} - ${message}`,
      icon: '/manifest-icon-192.png',
      tag: `task-completed-${taskId}`,
      data: {
        type: 'task-completed',
        taskId: taskId
      },
      actions: [
        { action: 'view', title: '💖 Celebrate!' },
        { action: 'dismiss', title: '💕 Next Task' }
      ]
    }

    // Use the existing notify endpoint
    const response = await fetch(`${req.protocol}://${req.get('host')}/api/push/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const result = await response.json()
    res.json(result)
  } catch (error) {
    console.error('Error sending task completion notification:', error)
    res.status(500).json({ error: 'Failed to send task completion notification' })
  }
})

// Send water reminder notification
router.post('/notify/water-reminder', async (req, res) => {
  try {
    const payload = {
      title: `💧 Water Reminder 💖`,
      body: `Time to hydrate! Your body needs some love 💕`,
      icon: '/manifest-icon-192.png',
      tag: 'water-reminder',
      data: {
        type: 'water-reminder'
      },
      actions: [
        { action: 'view', title: '💖 Drink Water' },
        { action: 'dismiss', title: '💤 Later' }
      ]
    }

    // Use the existing notify endpoint
    const response = await fetch(`${req.protocol}://${req.get('host')}/api/push/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const result = await response.json()
    res.json(result)
  } catch (error) {
    console.error('Error sending water reminder:', error)
    res.status(500).json({ error: 'Failed to send water reminder' })
  }
})

// Get subscription status
router.get('/status', async (req, res) => {
  try {
    const activeSubscriptions = await PushSubscription.countDocuments({ isActive: true })
    const totalSubscriptions = await PushSubscription.countDocuments()

    res.json({
      success: true,
      activeSubscriptions,
      totalSubscriptions,
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY
    })
  } catch (error) {
    console.error('Error getting subscription status:', error)
    res.status(500).json({ error: 'Failed to get subscription status' })
  }
})

export default router
