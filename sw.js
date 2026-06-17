/* EngFlow Service Worker — Cache-First for static assets & lesson data */
const CACHE_VERSION = 'engflow-v12';
const OFFLINE_URL = './offline.html';

// Everything needed to run 100% offline after first load.
const PRECACHE_URLS = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './src/css/styles.css',
  './src/js/app.js',
  './src/js/router.js',
  './src/js/store.js',
  './src/js/i18n.js',
  './src/js/speech.js',
  './src/js/data.js',
  './src/js/quiz.js',
  './src/js/gamification.js',
  './src/js/views.js',
  './src/js/path.js',
  './src/js/stories.js',
  './src/js/dictionary.js',
  './src/js/dailyLesson.js',
  './src/js/pronunciation.js',
  './src/js/exam.js',
  './src/js/net.js',
  './src/js/cloud.js',
  './src/js/firebase-config.js',
  './src/games/index.js',
  './src/games/review.js',
  './src/games/wordMatch.js',
  './src/games/fillBlank.js',
  './src/games/listeningEcho.js',
  './src/games/flashcard.js',
  './src/games/sentenceBuilder.js',
  './src/games/storyCloze.js',
  './src/games/speakingMirror.js',
  './src/data/a1.json',
  './src/data/a2.json',
  './src/data/b1.json',
  './src/data/b2.json',
  './src/data/c1.json',
  './src/data/stories.json',
  './src/data/pronunciation.json',
  './src/data/quiz.json',
  './src/assets/icons/icon-192.png',
  './src/assets/icons/icon-512.png',
  './src/assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // Use individual adds so one failure doesn't abort the whole install.
      Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)))
    )
    // Note: we do NOT skipWaiting() here. The page shows an "update" banner and
    // the user taps it to activate the new version (see SKIP_WAITING handler).
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Navigation requests: network-first, fall back to cached shell, then offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() =>
          caches.match('./index.html').then((r) => r || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // Static assets & data: cache-first.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(OFFLINE_URL));
    })
  );
});

// Allow the page to trigger an immediate update.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
