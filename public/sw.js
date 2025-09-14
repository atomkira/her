// Service Worker for persistent notifications
const CACHE_NAME = 'study-tracker-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Enhanced background sync for notifications
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(checkAndSendNotifications());
  }
});

// Set up periodic notification checks
setInterval(() => {
  checkAndSendNotifications();
}, 60000); // Check every minute

// Enhanced push event for notifications
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'Study Tracker 💖',
    body: 'You have a new notification!',
    icon: '/manifest-icon-192.png',
    badge: '/manifest-icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    tag: 'study-tracker-notification'
  };

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        ...notificationData,
        title: pushData.title || notificationData.title,
        body: pushData.body || notificationData.body,
        icon: pushData.icon || notificationData.icon,
        tag: pushData.tag || notificationData.tag,
        data: pushData.data || {},
        actions: pushData.actions || [
          { action: 'view', title: '💖 View', icon: '/manifest-icon-192.png' },
          { action: 'dismiss', title: '💤 Dismiss', icon: '/manifest-icon-192.png' }
        ]
      };
    } catch (error) {
      console.error('Error parsing push data:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      vibrate: notificationData.vibrate,
      requireInteraction: notificationData.requireInteraction,
      tag: notificationData.tag,
      data: notificationData.data,
      actions: notificationData.actions
    })
  );
});

// Enhanced notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  if (action === 'view' || !action) {
    // Open the app or focus existing window
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          // If app is already open, focus it
          for (let client of clientList) {
            if (client.url.includes(self.location.origin)) {
              return client.focus();
            }
          }
          // Otherwise open new window
          return clients.openWindow('/');
        })
    );
  } else if (action === 'dismiss') {
    // Just close the notification (already done above)
    console.log('Notification dismissed');
  }

  // Handle specific notification types
  if (data.type === 'task-reminder' && data.taskId) {
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then(clientList => {
          clientList.forEach(client => {
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              action: 'view-task',
              taskId: data.taskId
            });
          });
        })
    );
  }
});

// Handle notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('Notification was closed:', event.notification.tag);
});

// Enhanced notification checking with better timing
async function checkAndSendNotifications() {
  try {
    const tasks = await getStoredTasks();
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const today = now.toISOString().split('T')[0];

    tasks.forEach(task => {
      if (task.time && !task.completed && task.date === today) {
        const [hours, minutes] = task.time.split(':').map(Number);
        const taskTime = hours * 60 + minutes;
        const reminderTime = taskTime - 5;

        // Send reminder 5 minutes before (with 2-minute window for reliability)
        if (currentTime >= reminderTime && currentTime < reminderTime + 2 && !task.reminderSent) {
          self.registration.showNotification('💖 Task Reminder', {
            body: `${task.title} starts in 5 minutes! 💕`,
            icon: '/favicon.ico',
            tag: `reminder-${task.id}`,
            requireInteraction: true,
            vibrate: [100, 50, 100],
            actions: [
              { action: 'view', title: '💖 View Task' },
              { action: 'dismiss', title: '💤 Dismiss' }
            ]
          });
          
          // Mark reminder as sent
          task.reminderSent = true;
          updateStoredTasks(tasks);
        }

        // Send notification at task time (with 2-minute window)
        if (currentTime >= taskTime && currentTime < taskTime + 2 && !task.startNotificationSent) {
          self.registration.showNotification('💕 Task Time!', {
            body: `Time for: ${task.title} 💖`,
            icon: '/favicon.ico',
            tag: `task-${task.id}`,
            requireInteraction: true,
            vibrate: [200, 100, 200],
            actions: [
              { action: 'start', title: '💖 Start Task' },
              { action: 'snooze', title: '💤 Snooze 5min' }
            ]
          });
          
          // Mark start notification as sent
          task.startNotificationSent = true;
          updateStoredTasks(tasks);
        }
      }
    });
  } catch (error) {
    console.error('Error checking notifications:', error);
  }
}

// Update stored tasks using IndexedDB
function updateStoredTasks(tasks) {
  try {
    self.studyTrackerTasks = tasks;
    storeTasksInIndexedDB(tasks);
  } catch (error) {
    console.error('Error updating stored tasks:', error);
  }
}

// Store tasks in IndexedDB with proper error handling
function storeTasksInIndexedDB(tasks) {
  const request = indexedDB.open('StudyTrackerDB', 2); // Increment version to force upgrade
  
  request.onupgradeneeded = function(event) {
    const db = event.target.result;
    
    // Delete existing object store if it exists
    if (db.objectStoreNames.contains('tasks')) {
      db.deleteObjectStore('tasks');
    }
    
    // Create new object store
    db.createObjectStore('tasks', { keyPath: 'id' });
    console.log('IndexedDB object store created/recreated');
  };
  
  request.onsuccess = function(event) {
    const db = event.target.result;
    
    try {
      const transaction = db.transaction(['tasks'], 'readwrite');
      const store = transaction.objectStore('tasks');
      
      // Clear existing tasks and add new ones
      store.clear();
      tasks.forEach(task => {
        try {
          store.add(task);
        } catch (error) {
          console.warn('Failed to add task to IndexedDB:', error);
        }
      });
      
      transaction.oncomplete = function() {
        console.log('Tasks stored in IndexedDB successfully');
      };
      
      transaction.onerror = function(error) {
        console.error('Transaction error:', error);
      };
    } catch (error) {
      console.error('Failed to create transaction:', error);
      // Fallback: just store in memory
      self.studyTrackerTasks = tasks;
    }
  };
  
  request.onerror = function(event) {
    console.error('IndexedDB error:', event.target.error);
    // Fallback: store in service worker memory
    self.studyTrackerTasks = tasks;
  };
  
  request.onblocked = function(event) {
    console.warn('IndexedDB upgrade blocked');
  };
}

// Get stored tasks from IndexedDB or service worker global variable
async function getStoredTasks() {
  try {
    // First try to get from service worker global variable
    if (self.studyTrackerTasks) {
      return self.studyTrackerTasks;
    }
    
    // Try to get from IndexedDB
    return new Promise((resolve) => {
      const request = indexedDB.open('StudyTrackerDB', 2);
      
      request.onsuccess = function(event) {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('tasks')) {
          resolve([]);
          return;
        }
        
        try {
          const transaction = db.transaction(['tasks'], 'readonly');
          const store = transaction.objectStore('tasks');
          const getAllRequest = store.getAll();
          
          getAllRequest.onsuccess = function() {
            resolve(getAllRequest.result || []);
          };
          
          getAllRequest.onerror = function() {
            resolve([]);
          };
        } catch (error) {
          console.error('Error reading from IndexedDB:', error);
          resolve([]);
        }
      };
      
      request.onerror = function() {
        resolve([]);
      };
    });
  } catch (error) {
    console.error('Error getting stored tasks:', error);
    return [];
  }
}

// Enhanced message handling for better notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'UPDATE_TASKS') {
    // Store tasks in service worker context using IndexedDB instead of localStorage
    try {
      const tasks = event.data.tasks;
      // Store tasks in service worker global variable and IndexedDB
      self.studyTrackerTasks = tasks;
      
      // Store in IndexedDB for persistence
      storeTasksInIndexedDB(tasks);
      
      // Schedule notifications for all active tasks
      tasks.forEach(task => {
        if (!task.completed && task.time && task.date) {
          scheduleTaskNotifications(task);
        }
      });
    } catch (error) {
      console.error('Error updating tasks in service worker:', error);
    }
  }
  
  if (event.data && event.data.type === 'SCHEDULE_REMINDER') {
    const { task, reminderTime, reminderMinutes } = event.data;
    scheduleReminderNotification(task, reminderTime, reminderMinutes);
  }
  
  if (event.data && event.data.type === 'SCHEDULE_TASK_START') {
    const { task, taskTime } = event.data;
    scheduleTaskStartNotification(task, taskTime);
  }
});

// Schedule reminder notification
function scheduleReminderNotification(task, reminderTime, reminderMinutes) {
  const now = Date.now();
  const delay = reminderTime - now;
  
  if (delay > 0 && delay <= 24 * 60 * 60 * 1000) {
    setTimeout(() => {
      self.registration.showNotification('💖 Task Reminder', {
        body: `${task.title} starts in ${reminderMinutes} minutes! 💕`,
        icon: '/favicon.ico',
        tag: `reminder-${task.id}`,
        requireInteraction: true,
        vibrate: [100, 50, 100],
        actions: [
          { action: 'view', title: '💖 View Task' },
          { action: 'dismiss', title: '💤 Dismiss' }
        ]
      });
    }, delay);
  }
}

// Schedule task start notification
function scheduleTaskStartNotification(task, taskTime) {
  const now = Date.now();
  const delay = taskTime - now;
  
  if (delay > 0 && delay <= 24 * 60 * 60 * 1000) {
    setTimeout(() => {
      self.registration.showNotification('💕 Task Time!', {
        body: `Time for: ${task.title} 💖`,
        icon: '/favicon.ico',
        tag: `task-${task.id}`,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        actions: [
          { action: 'start', title: '💖 Start Task' },
          { action: 'snooze', title: '💤 Snooze 5min' }
        ]
      });
    }, delay);
  }
}

// Schedule all notifications for a task
function scheduleTaskNotifications(task) {
  const now = new Date();
  const taskDate = new Date(task.date);
  const [hours, minutes] = task.time.split(':').map(Number);
  
  const taskDateTime = new Date(taskDate);
  taskDateTime.setHours(hours, minutes, 0, 0);
  
  // Default to 5 minutes reminder
  const reminderMinutes = 5;
  const reminderDateTime = new Date(taskDateTime.getTime() - (reminderMinutes * 60 * 1000));
  
  // Schedule reminder and task start notifications
  scheduleReminderNotification(task, reminderDateTime.getTime(), reminderMinutes);
  scheduleTaskStartNotification(task, taskDateTime.getTime());
}
