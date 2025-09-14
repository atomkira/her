import React, { useState, useEffect } from 'react'
import pushNotificationManager from '../utils/pushNotificationManager.js'

export default function NotificationSettings({ isOpen, onClose }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [dailyReminders, setDailyReminders] = useState(true)
  const [taskReminders, setTaskReminders] = useState(true)
  const [completionNotifications, setCompletionNotifications] = useState(true)
  const [reminderMinutes, setReminderMinutes] = useState(5)
  const [permission, setPermission] = useState('default')
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushSupported, setPushSupported] = useState(false)

  useEffect(() => {
    // Load settings from localStorage
    const settings = JSON.parse(localStorage.getItem('notification-settings') || '{}')
    setNotificationsEnabled(settings.enabled || false)
    setDailyReminders(settings.dailyReminders !== false)
    setTaskReminders(settings.taskReminders !== false)
    setCompletionNotifications(settings.completionNotifications !== false)
    setReminderMinutes(settings.reminderMinutes || 5)

    // Check current permission
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }

    // Check push notification support and status
    setPushSupported(pushNotificationManager.isSupported)
    if (pushNotificationManager.isSupported) {
      pushNotificationManager.isSubscribed().then(setPushEnabled)
    }
  }, [])

  const saveSettings = () => {
    const settings = {
      enabled: notificationsEnabled,
      dailyReminders,
      taskReminders,
      completionNotifications,
      reminderMinutes
    }
    localStorage.setItem('notification-settings', JSON.stringify(settings))
    
    // Dispatch event to update other components
    window.dispatchEvent(new CustomEvent('notification-settings-changed', { detail: settings }))
  }

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission()
      setPermission(result)
      
      if (result === 'granted') {
        setNotificationsEnabled(true)
        
        // Register service worker
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.register('/sw.js')
            console.log('Service Worker registered:', registration)
            
            // Request persistent notification permission
            if ('showNotification' in registration) {
              registration.showNotification('Study Tracker', {
                body: 'Notifications are now enabled! 🎉',
                icon: '/favicon.ico',
                tag: 'welcome'
              })
            }
          } catch (error) {
            console.error('Service Worker registration failed:', error)
          }
        }
      }
    }
  }

  const handleToggleNotifications = async () => {
    if (!notificationsEnabled && permission !== 'granted') {
      await requestPermission()
    } else {
      setNotificationsEnabled(!notificationsEnabled)
    }
  }

  const handleTogglePushNotifications = async () => {
    if (!pushEnabled) {
      const success = await pushNotificationManager.subscribe()
      setPushEnabled(success)
      if (success) {
        // Show success notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('💖 Push Notifications Enabled!', {
            body: 'You\'ll now receive notifications even when the app is closed! 💕',
            icon: '/manifest-icon-192.png'
          })
        }
      }
    } else {
      const success = await pushNotificationManager.unsubscribe()
      setPushEnabled(!success)
    }
  }

  useEffect(() => {
    saveSettings()
  }, [notificationsEnabled, dailyReminders, taskReminders, completionNotifications, reminderMinutes])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in-up"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-3xl border border-white/60 dark:border-slate-700 p-6 shadow-2xl animate-bounce-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            🔔 Notification Settings
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 text-slate-500 dark:text-slate-400 text-xl font-bold"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Permission Status */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">
                {permission === 'granted' ? '✅' : permission === 'denied' ? '❌' : '⏳'}
              </span>
              <div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  Permission Status
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {permission === 'granted' ? 'Notifications allowed' : 
                   permission === 'denied' ? 'Notifications blocked' : 'Permission not requested'}
                </div>
              </div>
            </div>
            {permission !== 'granted' && (
              <button
                onClick={requestPermission}
                className="w-full mt-2 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-semibold"
              >
                Enable Notifications
              </button>
            )}
          </div>

          {/* Main Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 border border-rose-200 dark:border-rose-800">
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                Enable Notifications
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Master toggle for all notifications
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={handleToggleNotifications}
                className="sr-only peer"
                disabled={permission === 'denied'}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-rose-300 dark:peer-focus:ring-rose-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-rose-500"></div>
            </label>
          </div>

          {/* Individual Settings */}
          {notificationsEnabled && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    📅 Daily Task Reminders
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Get notified about today's tasks
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dailyReminders}
                    onChange={(e) => setDailyReminders(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    ⏰ Task Reminders
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Get reminded before tasks start
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taskReminders}
                    onChange={(e) => setTaskReminders(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-500"></div>
                </label>
              </div>

              {taskReminders && (
                <div className="ml-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Reminder time (minutes before task)
                  </label>
                  <select
                    value={reminderMinutes}
                    onChange={(e) => setReminderMinutes(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  >
                    <option value={1}>1 minute</option>
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    🎉 Completion Notifications
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Celebrate when you complete tasks
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={completionNotifications}
                    onChange={(e) => setCompletionNotifications(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-500"></div>
                </label>
              </div>

              {/* Push Notifications */}
              {pushSupported && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200 dark:border-violet-800">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        💖 Push Notifications
                        <span className="text-xs bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 px-2 py-1 rounded-full font-medium">
                          Advanced
                        </span>
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        Get notifications even when the app is closed
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pushEnabled}
                        onChange={handleTogglePushNotifications}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-violet-500"></div>
                    </label>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <span className={pushEnabled ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}>
                      {pushEnabled ? '✅ Active' : '⏳ Inactive'}
                    </span>
                    • Works when app is closed
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Test Notifications */}
          {notificationsEnabled && (
            <div className="space-y-3">
              <button
                onClick={() => {
                  if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('🧪 Local Test Notification', {
                      body: 'Your local notifications are working perfectly! ✨',
                      icon: '/manifest-icon-192.png'
                    })
                  }
                }}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                🧪 Test Local Notification
              </button>
              
              {pushEnabled && (
                <button
                  onClick={async () => {
                    const success = await pushNotificationManager.sendCustomNotification(
                      '💖 Push Test Notification',
                      'Your push notifications are working perfectly! This works even when the app is closed! 💕✨',
                      {
                        tag: 'test-push',
                        icon: '/manifest-icon-192.png'
                      }
                    )
                    if (!success) {
                      alert('Failed to send push notification. Please try again.')
                    }
                  }}
                  className="w-full py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-2xl font-semibold hover:from-violet-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  💖 Test Push Notification
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Footer Info */}
        <div className="mt-6 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2 mb-1">
            <span>💡</span>
            <span className="font-semibold">Tips:</span>
          </div>
          <ul className="space-y-1 ml-4">
            <li>• Push notifications work even when the app is closed</li>
            <li>• Local notifications only work when the app is open</li>
            <li>• You can disable notifications anytime in your browser settings</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
