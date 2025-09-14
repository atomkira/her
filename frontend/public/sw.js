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
    title: 'Study Tracker ',
    body: 'You have a new notification!',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
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
          { action: 'view', title: ' View', icon: '/favicon.ico' },
          { action: 'dismiss', title: ' Dismiss', icon: '/favicon.ico' }
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
          self.registration.showNotification(' Task Reminder', {
            body: `${task.title} starts in 5 minutes! `,
            icon: '/favicon.ico',
            tag: `reminder-${task.id}`,
            requireInteraction: true,
            vibrate: [100, 50, 100],
            actions: [
              { action: 'view', title: ' View Task' },
              { action: 'dismiss', title: ' Dismiss' }
            ]
          });
          
          // Mark reminder as sent
          task.reminderSent = true;
          updateStoredTasks(tasks);
        }

        // Send notification at task time (with 2-minute window)
        if (currentTime >= taskTime && currentTime < taskTime + 2 && !task.startNotificationSent) {
          self.registration.showNotification(' Task Time!', {
            body: `Time for: ${task.title} `,
            icon: '/favicon.ico',
            tag: `task-${task.id}`,
            requireInteraction: true,
            vibrate: [200, 100, 200],
            actions: [
              { action: 'start', title: ' Start Task' },
              { action: 'snooze', title: ' Snooze 5min' }
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

// --- Refactored IndexedDB Logic ---
const DB_NAME = 'StudyTrackerDB';
const DB_VERSION = 2;
const TASK_STORE_NAME = 'tasks';

let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(TASK_STORE_NAME)) {
          db.createObjectStore(TASK_STORE_NAME, { keyPath: 'id' });
        } else {
          // Handle potential schema upgrades if needed
          console.log('Object store already exists, no changes needed for version 2');
        }
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
  return dbPromise;
}

async function storeTasksInIndexedDB(tasks) {
  try {
    const db = await getDb();
    const transaction = db.transaction(TASK_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(TASK_STORE_NAME);
    store.clear();
    tasks.forEach(task => store.put(task));
    await new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    console.log('Tasks stored in IndexedDB successfully');
  } catch (error) {
    console.error('Failed to store tasks in IndexedDB:', error);
    // Fallback to in-memory store
    self.studyTrackerTasks = tasks;
  }
}

async function getStoredTasks() {
  try {
    if (self.studyTrackerTasks) {
        return self.studyTrackerTasks;
    }
    const db = await getDb();
    const transaction = db.transaction(TASK_STORE_NAME, 'readonly');
    const store = transaction.objectStore(TASK_STORE_NAME);
    const tasks = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    self.studyTrackerTasks = tasks;
    return tasks;
  } catch (error) {
    console.error('Failed to get tasks from IndexedDB:', error);
    return [];
  }
}

function updateStoredTasks(tasks) {
  self.studyTrackerTasks = tasks;
  storeTasksInIndexedDB(tasks);
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
      self.registration.showNotification(' Task Reminder', {
        body: `${task.title} starts in ${reminderMinutes} minutes! `,
        icon: '/favicon.ico',
        tag: `reminder-${task.id}`,
        requireInteraction: true,
        vibrate: [100, 50, 100],
        actions: [
          { action: 'view', title: ' View Task' },
          { action: 'dismiss', title: ' Dismiss' }
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
      self.registration.showNotification(' Task Time!', {
        body: `Time for: ${task.title} `,
        icon: '/favicon.ico',
        tag: `task-${task.id}`,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        actions: [
          { action: 'start', title: ' Start Task' },
          { action: 'snooze', title: ' Snooze 5min' }
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
