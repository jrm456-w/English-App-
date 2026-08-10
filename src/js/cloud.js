/* Optional Google (Firebase) auth + Firestore progress sync.
   Loads the Firebase SDK from CDN only when configured. Falls back silently
   to local-only mode when offline or not configured, so the app always works. */
import { firebaseConfig, isFirebaseConfigured, isEmailAllowed } from './firebase-config.js';
import { getState, setState, subscribe } from './store.js';
import { LEVELS } from './gamification.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';

let auth = null, db = null, fns = {};
let currentUser = null;
let ready = false;
const authCbs = new Set();
const deniedCbs = new Set();
let pushTimer = null;

/* Resolves once the first auth state is known (signed in or not). */
let firstAuthResolve;
const firstAuth = new Promise((r) => { firstAuthResolve = r; });
function resolveFirstAuth(v) { if (firstAuthResolve) { firstAuthResolve(v); firstAuthResolve = null; } }

const AUTH_FLAG = 'engflow.authorized';

export function cloudEnabled() { return isFirebaseConfigured(); }
export function getUser() { return currentUser; }
export function onUser(cb) { authCbs.add(cb); cb(currentUser); return () => authCbs.delete(cb); }
/* Notified when a sign-in is rejected because the email isn't allowed. */
export function onAccessDenied(cb) { deniedCbs.add(cb); return () => deniedCbs.delete(cb); }

async function ensureInit() {
  if (ready) return true;
  if (!isFirebaseConfigured()) return false;
  try {
    const appMod = await import(`${SDK}/firebase-app.js`);
    const authMod = await import(`${SDK}/firebase-auth.js`);
    const fsMod = await import(`${SDK}/firebase-firestore.js`);
    const app = appMod.initializeApp(firebaseConfig);
    auth = authMod.getAuth(app);
    db = fsMod.getFirestore(app);
    fns = { ...authMod, ...fsMod };
    // Keep cloud copy updated as the user plays (debounced).
    subscribe(() => schedulePush());
    authMod.onAuthStateChanged(auth, async (user) => {
      // Enforce the email allowlist on the client (Firestore rules enforce it on the server).
      if (user && !isEmailAllowed(user.email)) {
        const email = user.email;
        await signOutCloud();
        deniedCbs.forEach((cb) => cb(email));
        return;
      }
      currentUser = user;
      if (user) {
        try { localStorage.setItem(AUTH_FLAG, user.email || '1'); } catch {}
        await pullAndMerge();
      }
      resolveFirstAuth(currentUser);
      authCbs.forEach((cb) => cb(currentUser));
    });
    ready = true;
    return true;
  } catch (e) {
    console.warn('Firebase no disponible (¿sin conexión?):', e.message);
    return false;
  }
}

/* Restore a previous session on boot (no-op if not configured / offline). */
export function autoStart() { ensureInit(); }

/* True if this device has signed in with an allowed account at least once
   (used to grant offline access to the owner after the first online login). */
export function wasAuthorized() {
  try { return !!localStorage.getItem(AUTH_FLAG); } catch { return false; }
}

/* Used by the login gate. Waits for the first auth state, with a timeout for
   the offline case where the Firebase SDK cannot be loaded. */
export async function waitForAuth(timeoutMs = 9000) {
  const ok = await ensureInit();
  if (!ok) return { status: 'offline' };
  const r = await Promise.race([
    firstAuth,
    new Promise((res) => setTimeout(() => res('__timeout__'), timeoutMs))
  ]);
  if (r === '__timeout__') return { status: 'timeout' };
  return { status: 'ok', user: r };
}

export async function signIn() {
  if (!(await ensureInit())) return { ok: false, reason: 'unavailable' };
  try {
    const provider = new fns.GoogleAuthProvider();
    try {
      await fns.signInWithPopup(auth, provider);
    } catch (popupErr) {
      // Popups are often blocked on mobile — fall back to redirect.
      await fns.signInWithRedirect(auth, provider);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.code || e.message };
  }
}

export async function signOutCloud() {
  try { localStorage.removeItem(AUTH_FLAG); } catch {}
  if (!ready || !auth) return;
  try { await fns.signOut(auth); } catch {}
  currentUser = null;
}

function docRef() { return fns.doc(db, 'users', currentUser.uid); }

async function pullAndMerge() {
  try {
    const snap = await fns.getDoc(docRef());
    const remote = snap.exists() ? snap.data() : null;
    setState(mergeStates(getState(), remote));
    await pushCloud();
  } catch (e) { console.warn('cloud pull failed:', e.message); }
}

function schedulePush() {
  if (!ready || !currentUser) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushCloud, 1500);
}

export async function pushCloud() {
  if (!ready || !currentUser) return;
  try {
    const data = { ...getState(), _updatedAt: Date.now(), _email: currentUser.email || null };
    await fns.setDoc(docRef(), data);
  } catch (e) { console.warn('cloud push failed:', e.message); }
}

/* Merge local and remote progress so nothing is lost across devices. */
function mergeStates(local, remote) {
  if (!remote) return local;
  const maxNum = (a, b) => Math.max(a || 0, b || 0);
  const unionTrue = (a = {}, b = {}) => ({ ...a, ...b });
  const maxMap = (a = {}, b = {}) => {
    const o = { ...a };
    for (const k in b) o[k] = Math.max(a[k] || 0, b[k] || 0);
    return o;
  };
  const mergeGames = (a = {}, b = {}) => {
    const o = { ...a };
    for (const k in b) {
      const x = a[k], y = b[k];
      o[k] = !x ? y : {
        attempts: maxNum(x.attempts, y.attempts),
        correct: maxNum(x.correct, y.correct),
        bestTimeMs: x.bestTimeMs == null ? y.bestTimeMs : Math.min(x.bestTimeMs, y.bestTimeMs ?? x.bestTimeMs),
        bestRatio: maxNum(x.bestRatio, y.bestRatio)
      };
    }
    return o;
  };
  const higherLevel = (a, b) => (LEVELS.indexOf(b) > LEVELS.indexOf(a) ? b : a);
  return {
    ...local,
    onboarded: local.onboarded || remote.onboarded,
    xp: maxNum(local.xp, remote.xp),
    streak: maxNum(local.streak, remote.streak),
    lastActiveDate: [local.lastActiveDate, remote.lastActiveDate].filter(Boolean).sort().pop() || null,
    badges: Array.from(new Set([...(local.badges || []), ...(remote.badges || [])])),
    level: higherLevel(local.level, remote.level),
    completedUnits: unionTrue(remote.completedUnits, local.completedUnits),
    storiesRead: unionTrue(remote.storiesRead, local.storiesRead),
    mastered: maxMap(remote.mastered, local.mastered),
    completedGames: mergeGames(local.completedGames, remote.completedGames)
  };
}
