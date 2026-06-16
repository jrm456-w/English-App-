/* App bootstrap: theme, i18n, routing, install prompt, service worker. */
import { getState } from './store.js';
import { applyTranslations, t } from './i18n.js';
import { route, setNotFound, startRouter, navigate } from './router.js';
import { home, learn, unit, games, progress, settings } from './views.js';
import { renderQuiz } from './quiz.js';
import { storiesList, storyReader } from './stories.js';
import { launchGame } from '../games/index.js';
import { touchStreak, onBadge, badgeName, onDailyComplete } from './gamification.js';
import { cloudEnabled, waitForAuth, wasAuthorized, signIn, onUser, onAccessDenied, autoStart } from './cloud.js';
import { requireLogin } from './firebase-config.js';
import { el, toast } from './ui.js';

/* ---- Theme ---- */
function applyTheme() {
  document.getElementById('app').dataset.theme = getState().theme;
  document.querySelector('meta[name="theme-color"]').setAttribute('content', getState().theme === 'dark' ? '#0f172a' : '#2563eb');
}

/* ---- Routes ---- */
route('/home', (_p, v) => requireOnboard(() => home(_p, v)));
route('/learn', (_p, v) => requireOnboard(() => learn(_p, v)));
route('/unit/:level/:id', (p, v) => requireOnboard(() => unit(p, v)));
route('/games', (_p, v) => requireOnboard(() => games(_p, v)));
route('/stories', (_p, v) => requireOnboard(() => storiesList(_p, v)));
route('/story/:id', (p, v) => requireOnboard(() => storyReader(p, v)));
route('/game/:type/:level/:id', (p, v) => requireOnboard(() => launchGame(p, v)));
route('/progress', (_p, v) => requireOnboard(() => progress(_p, v)));
route('/settings', (_p, v) => settings(_p, v));
route('/quiz', (_p, v) => renderQuiz(v));
setNotFound((v) => home({}, v));

function requireOnboard(fn) {
  if (!getState().onboarded) { navigate('/quiz'); return; }
  fn();
}

/* ---- Badge & daily-goal notifications ---- */
onBadge((badge) => toast(`🏅 ${t('badge.unlocked')} ${badge.icon} ${badgeName(badge)}`, 3000));
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

/* ---- Service worker ---- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {/* offline-first still works on next load */});
  });
}
