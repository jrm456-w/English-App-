/* Network status utility. The app is offline-first, but some content can be
   flagged as requiring a connection (e.g. streamed video/audio). */
const cbs = new Set();

export function isOnline() { return navigator.onLine !== false; }

export function onNetChange(cb) {
  cbs.add(cb);
  return () => cbs.delete(cb);
}

window.addEventListener('online', () => cbs.forEach((c) => c(true)));
window.addEventListener('offline', () => cbs.forEach((c) => c(false)));
