/* App bootstrap: theme, i18n, routing, install prompt, service worker. */
import { getState } from './store.js';
import { applyTranslations, t } from './i18n.js';
import { route, setNotFound, startRouter, navigate } from './router.js';
import { home, learn, unit, games, progress, settings } from './views.js';
import { renderQuiz } from './quiz.js';
import { launchGame } from '../games/index.js';
import { touchStreak, onBadge, badgeName } from './gamification.js';
import { toast } from './ui.js';

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
route('/game/:type/:level/:id', (p, v) => requireOnboard(() => launchGame(p, v)));
route('/progress', (_p, v) => requireOnboard(() => progress(_p, v)));
route('/settings', (_p, v) => settings(_p, v));
route('/quiz', (_p, v) => renderQuiz(v));
setNotFound((v) => home({}, v));

function requireOnboard(fn) {
  if (!getState().onboarded) { navigate('/quiz'); return; }
  fn();
}

/* ---- Badge notifications ---- */
onBadge((badge) => toast(`🏅 ${t('badge.unlocked')} ${badge.icon} ${badgeName(badge)}`, 3000));

/* ---- Install prompt (Add to Home Screen) ---- */
let deferredPrompt = null;
const banner = document.getElementById('install-banner');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (!sessionStorage.getItem('installDismissed')) banner.hidden = false;
});
document.getElementById('install-btn').onclick = async () => {
  banner.hidden = true;
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
};
document.getElementById('install-dismiss').onclick = () => { banner.hidden = true; sessionStorage.setItem('installDismissed', '1'); };
window.addEventListener('appinstalled', () => { banner.hidden = true; toast('✅ EngFlow'); });

/* ---- Boot ---- */
function boot() {
  applyTheme();
  applyTranslations();
  touchStreak();
  startRouter();
  if (!getState().onboarded && !location.hash) navigate('/quiz');
}
boot();

/* ---- Service worker ---- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {/* offline-first still works on next load */});
  });
}
