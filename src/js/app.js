/* App bootstrap: theme, i18n, routing, install prompt, service worker. */
import { getState } from './store.js';
import { applyTranslations, t } from './i18n.js';
import { route, setNotFound, startRouter, navigate } from './router.js';
import { home, learn, unit, games, progress, settings } from './views.js';
import { learningPath } from './path.js';
import { renderQuiz } from './quiz.js';
import { storiesList, storyReader } from './stories.js';
import { launchGame } from '../games/index.js';
import { review } from '../games/review.js';
import { dictionary } from './dictionary.js';
import { dailyLesson } from './dailyLesson.js';
import { pronunciation, pronunciationSet } from './pronunciation.js';
import { exam } from './exam.js';
import { isOnline, onNetChange } from './net.js';
import { touchStreak, onBadge, badgeName, onDailyComplete } from './gamification.js';
import { cloudEnabled, waitForAuth, wasAuthorized, signIn, onUser, onAccessDenied, autoStart } from './cloud.js';
import { requireLogin } from './firebase-config.js';
import { el, toast, celebrate } from './ui.js';

/* ---- Theme ---- */
function applyTheme() {
  // Set on <html> so <body>'s color/background variables resolve correctly.
  document.documentElement.dataset.theme = getState().theme;
  document.getElementById('app').dataset.theme = getState().theme;
  document.querySelector('meta[name="theme-color"]').setAttribute('content', getState().theme === 'dark' ? '#0f172a' : '#2563eb');
}

/* ---- Routes ---- */
route('/home', (_p, v) => requireOnboard(() => learningPath(_p, v)));
route('/learn', (_p, v) => requireOnboard(() => learningPath(_p, v)));
route('/unit/:level/:id', (p, v) => requireOnboard(() => unit(p, v)));
route('/games', (_p, v) => requireOnboard(() => games(_p, v)));
route('/stories', (_p, v) => requireOnboard(() => storiesList(_p, v)));
route('/story/:id', (p, v) => requireOnboard(() => storyReader(p, v)));
route('/game/:type/:level/:id', (p, v) => requireOnboard(() => launchGame(p, v)));
route('/review', (_p, v) => requireOnboard(() => review(_p, v)));
route('/dictionary', (_p, v) => requireOnboard(() => dictionary(_p, v)));
route('/daily', (_p, v) => requireOnboard(() => dailyLesson(_p, v)));
route('/pronunciation', (_p, v) => requireOnboard(() => pronunciation(_p, v)));
route('/pron/:id', (p, v) => requireOnboard(() => pronunciationSet(p, v)));
route('/exam/:level', (p, v) => requireOnboard(() => exam(p, v)));
route('/progress', (_p, v) => requireOnboard(() => progress(_p, v)));
route('/settings', (_p, v) => settings(_p, v));
route('/quiz', (_p, v) => renderQuiz(v));
setNotFound((v) => home({}, v));

function requireOnboard(fn) {
  if (!getState().onboarded) { navigate('/quiz'); return; }
  fn();
}

/* ---- Network status indicator ---- */
const netStatus = document.getElementById('net-status');
function refreshNet(online) { netStatus.hidden = online; }
refreshNet(isOnline());
onNetChange(refreshNet);

/* ---- Badge & daily-goal notifications ---- */
onBadge((badge) => { celebrate(); toast(`🏅 ${t('badge.unlocked')} ${badge.icon} ${badgeName(badge)}`, 3000); });
onDailyComplete((bonus) => toast(`${t('daily.allDone')} +${bonus} XP`, 3500));
onAccessDenied((email) => toast(`${t('auth.denied')}${email ? ' (' + email + ')' : ''}`, 4000));

/* ---- Install prompt (Add to Home Screen) ---- */
let deferredPrompt = null;
const banner = document.getElementById('install-banner');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (!localStorage.getItem('installDismissed')) banner.hidden = false;
});
document.getElementById('install-btn').onclick = async () => {
  banner.hidden = true;
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
};
document.getElementById('install-dismiss').onclick = () => {
  banner.hidden = true;
  localStorage.setItem('installDismissed', '1'); // don't nag again
};
window.addEventListener('appinstalled', () => { banner.hidden = true; toast('✅ EngFlow'); });

/* ---- Login gate ---- */
const appEl = document.getElementById('app');
let appStarted = false;

function startApp() {
  if (appStarted) return;
  appStarted = true;
  appEl.classList.remove('app--gated');
  touchStreak();
  startRouter();
  if (!getState().onboarded && !location.hash) navigate('/quiz');
}

function renderLogin(mode) {
  appEl.classList.add('app--gated');
  const view = document.getElementById('view');
  const loading = mode === 'loading';
  view.innerHTML = '';
  const card = el(`
    <div class="login-screen">
      <div class="card center" style="max-width:380px;width:100%">
        <div class="brand__logo" style="margin:0 auto 16px;width:64px;height:64px;font-size:2rem">E</div>
        <h1 class="h1">EngFlow</h1>
        ${loading
          ? `<p class="muted">${t('gate.loading')}</p>`
          : `<p>${t('gate.title')}</p><p class="muted">${t('gate.subtitle')}</p>
             ${mode === 'offline' ? `<p class="feedback feedback--no">${t('gate.offlineFirst')}</p>` : ''}
             <button class="btn btn--block" id="gate-signin" style="margin-top:12px">${t('auth.signIn')}</button>
             ${mode === 'offline' ? `<button class="btn btn--ghost btn--block" id="gate-retry" style="margin-top:8px">${t('gate.retry')}</button>` : ''}`}
      </div>
    </div>`);
  view.appendChild(card);
  const signinBtn = card.querySelector('#gate-signin');
  if (signinBtn) signinBtn.onclick = async () => {
    signinBtn.disabled = true;
    renderLogin('loading');
    const r = await signIn();
    if (!r.ok) { toast(t('auth.error')); renderLogin('login'); }
    // On success, onUser fires and startApp() runs.
  };
  const retryBtn = card.querySelector('#gate-retry');
  if (retryBtn) retryBtn.onclick = () => location.reload();
}

async function passGate() {
  // No Firebase or login not required -> open app (optional sync still works).
  if (!cloudEnabled() || !requireLogin) { autoStart(); return true; }

  renderLogin('loading');
  // Let an allowed login (now or later) open the app.
  onUser((user) => { if (user) startApp(); });

  const res = await waitForAuth();
  if (res.status === 'ok' && res.user) return true;               // already signed in
  if ((res.status === 'offline' || res.status === 'timeout') && wasAuthorized()) return true; // offline grace
  renderLogin(res.status === 'offline' ? 'offline' : 'login');     // require sign-in
  return false;
}

/* ---- Boot ---- */
async function boot() {
  applyTheme();
  applyTranslations();
  if (await passGate()) startApp();
}
boot();

/* ---- Service worker + auto-update ----
   When we publish new content, the new SW installs in the background. We detect it
   and show a small banner so the user can refresh and get the latest words/lessons. */
function showUpdateBanner() {
  if (document.getElementById('update-banner')) return;
  const bar = el(`
    <div id="update-banner" class="install-banner">
      <span>${t('update.available')}</span>
      <button class="btn btn--small" id="update-btn">${t('update.button')}</button>
    </div>`);
  document.body.appendChild(bar);
  bar.querySelector('#update-btn').onclick = () => {
    userTriggeredUpdate = true;
    if (waitingWorker) waitingWorker.postMessage('SKIP_WAITING');
    else location.reload();
  };
}

let waitingWorker = null;
let userTriggeredUpdate = false;
if ('serviceWorker' in navigator) {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Only reload when the user asked to update (avoids a reload on first install).
    if (!userTriggeredUpdate || reloading) return;
    reloading = true; location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      // An update is already waiting.
      if (reg.waiting && navigator.serviceWorker.controller) {
        waitingWorker = reg.waiting; showUpdateBanner();
      }
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          // New version installed while an old one is running => genuine update.
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            waitingWorker = nw; showUpdateBanner();
          }
        });
      });
      // Check for updates periodically and on focus.
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      window.addEventListener('focus', () => reg.update().catch(() => {}));
    }).catch(() => {/* offline-first still works on next load */});
  });
}
