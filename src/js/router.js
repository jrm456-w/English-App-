/* Tiny hash-based router. Routes: #/home, #/learn, #/games, #/unit/:level/:id,
   #/game/:type/:level/:id, #/progress, #/settings, #/quiz */
const routes = [];
let notFound = null;

export function route(pattern, handler) {
  // pattern like '/game/:type/:level/:id'
  const parts = pattern.split('/').filter(Boolean);
  routes.push({ parts, handler });
}

export function setNotFound(fn) { notFound = fn; }

export function navigate(path) {
  if (location.hash === '#' + path) handle();
  else location.hash = path;
}

/* Simple in-app history stack so "Back" returns to the previous screen
   (not always Home), consistently across every section. */
const histStack = [];
let prevPath = null;
let goingBack = false;

export function goBack(fallback = '/home') {
  if (histStack.length) {
    goingBack = true;
    navigate(histStack.pop());
  } else {
    navigate(fallback);
  }
}

function match(hashPath) {
  const segs = hashPath.split('/').filter(Boolean);
  for (const r of routes) {
    if (r.parts.length !== segs.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < r.parts.length; i++) {
      if (r.parts[i].startsWith(':')) params[r.parts[i].slice(1)] = decodeURIComponent(segs[i]);
      else if (r.parts[i] !== segs[i]) { ok = false; break; }
    }
    if (ok) return { handler: r.handler, params };
  }
  return null;
}

export function handle() {
  const hashPath = location.hash.replace(/^#/, '') || '/home';
  // Maintain the back stack (skip when we're navigating back).
  if (!goingBack && prevPath !== null && prevPath !== hashPath) {
    histStack.push(prevPath);
    if (histStack.length > 50) histStack.shift();
  }
  goingBack = false;
  prevPath = hashPath;
  const m = match(hashPath);
  const view = document.getElementById('view');
  view.scrollTop = 0;
  window.scrollTo(0, 0);
  if (m) m.handler(m.params, view);
  else if (notFound) notFound(view);
  updateActiveNav(hashPath);
}

function updateActiveNav(hashPath) {
  const top = hashPath.split('/').filter(Boolean)[0] || 'home';
  // unit & game screens belong under their parent tab
  const tabMap = {
    unit: 'home', learn: 'home', game: 'games', quiz: 'home', story: 'stories',
    daily: 'home', review: 'home', dictionary: 'home'
  };
  const active = tabMap[top] || top;
  document.querySelectorAll('.nav__item').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.route === active);
  });
}

export function startRouter() {
  window.addEventListener('hashchange', handle);
  handle();
}
