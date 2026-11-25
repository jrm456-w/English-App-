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
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
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
  // Every route maps cleanly to one of the 4 primary Studio tabs.
  const tabMap = {
    home: 'home', quiz: 'home', material: 'home',
    practice: 'practice', learn: 'practice', unit: 'practice', lesson: 'practice',
    games: 'practice', game: 'practice', stories: 'practice', story: 'practice',
    reflex: 'practice', ear: 'practice', room: 'practice', speak: 'practice',
    pronunciation: 'practice', pron: 'practice', convo: 'practice', chat: 'practice',
    adventure: 'practice', functions: 'practice', prep: 'practice', daily: 'practice',
    review: 'practice', study: 'practice', grammar: 'practice', exam: 'practice',
    explore: 'practice',
    notebook: 'notebook', dictionary: 'notebook',
    profile: 'profile', progress: 'profile', settings: 'profile'
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
