/* global self, caches */
/**
 * Mobazha Service Worker
 * Provides offline support and caching strategies
 */

// 版本号：每次部署更新时递增此版本号
const CACHE_VERSION = '3';
const CACHE_NAME = `mobazha-v${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Assets to cache on install
const PRECACHE_ASSETS = ['/manifest.json', '/offline.html'];

// Cache strategies
const CACHE_STRATEGIES = {
  // Network first, fallback to cache (for API calls and pages)
  // 页面总是优先从网络获取，确保显示最新内容
  networkFirst: [
    'api.',
    '/ob/',
    'search.',
    '/',
    '/search',
    '/profile',
    '/settings',
    '/wallet',
    '/chat',
    '/orders',
    '/marketplace',
    '/product',
    '/store',
    '/listing',
    '/moderator',
  ],
  // Cache first, fallback to network (for static assets only)
  cacheFirst: ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.woff', '.woff2'],
  // Stale while revalidate - 仅用于非关键资源
  staleWhileRevalidate: [],
};

// Install event - precache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(PRECACHE_ASSETS.filter(url => !url.includes('icon'))); // Icons may not exist yet
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => {
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - handle requests with appropriate strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // Determine cache strategy
  const strategy = getCacheStrategy(url);

  switch (strategy) {
    case 'networkFirst':
      event.respondWith(networkFirst(request));
      break;
    case 'cacheFirst':
      event.respondWith(cacheFirst(request));
      break;
    case 'staleWhileRevalidate':
      event.respondWith(staleWhileRevalidate(request));
      break;
    default:
      event.respondWith(networkFirst(request));
  }
});

// Determine which cache strategy to use
function getCacheStrategy(url) {
  const pathname = url.pathname;
  const href = url.href;

  // 静态资源使用 cache first（优先缓存）
  if (CACHE_STRATEGIES.cacheFirst.some(pattern => pathname.endsWith(pattern))) {
    return 'cacheFirst';
  }

  // HTML 页面和 API 使用 network first（优先网络）
  // 这确保用户总是看到最新的页面内容
  if (
    CACHE_STRATEGIES.networkFirst.some(pattern => {
      // API 和外部服务：检查 href
      if (pattern.includes('.') || pattern.startsWith('api')) {
        return href.includes(pattern);
      }
      // 页面路径：检查 pathname
      return pathname === pattern || pathname.startsWith(pattern + '/');
    })
  ) {
    return 'networkFirst';
  }

  // 默认使用 network first，确保页面总是最新的
  return 'networkFirst';
}

// Network first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_URL);
    }
    throw error;
  }
}

// Cache first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request)
    .then(networkResponse => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

// Push notification event
self.addEventListener('push', event => {
  let data = { title: 'Mobazha', body: 'You have a new notification' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      url: data.url || '/',
    },
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click event
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // If there's already an open window, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Background sync event (for offline message sending)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  // TODO: Implement message sync from IndexedDB
}
