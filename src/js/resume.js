/* Resume support — remembers where the learner was inside a multi-step activity
   (vocabulary trainer, story lesson) so leaving mid-way never restarts from zero. */
const KEY = 'engflow.resume.v1';

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function writeAll(o) {
  try { localStorage.setItem(KEY, JSON.stringify(o)); } catch {}
}

export function saveResume(id, data) {
  const all = readAll();
  all[id] = { ...data, at: Date.now() };
  writeAll(all);
}

export function getResume(id, maxAgeMs = 24 * 60 * 60 * 1000) {
  const all = readAll();
  const r = all[id];
  if (!r) return null;
  if (Date.now() - (r.at || 0) > maxAgeMs) { clearResume(id); return null; } // stale after a day
  return r;
}

export function clearResume(id) {
  const all = readAll();
  delete all[id];
  writeAll(all);
}
