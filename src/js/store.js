/* Central state persisted in localStorage. */
const KEY = 'engflow.state.v1';

const DEFAULT_STATE = {
  onboarded: false,
  level: 'A1',
  lang: 'es',          // UI language: 'es' | 'en'
  theme: 'light',      // 'light' | 'dark'
  xp: 0,
  streak: 0,
  lastActiveDate: null,    // YYYY-MM-DD
  badges: [],              // array of badge ids
  completedGames: {},      // { "level:unitId:gameType": { attempts, correct, bestTimeMs } }
  completedUnits: {},      // { "level:unitId": true } when grammar viewed
  mastered: {},            // flashcards: { "level:unitId:word": repetitions }
  quizScore: null
};

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    return { ...structuredClone(DEFAULT_STATE), ...JSON.parse(raw) };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { listeners.forEach((fn) => fn(state)); }

export function getState() { return state; }

export function setState(patch) {
  state = { ...state, ...patch };
  persist();
  emit();
}

export function update(mutator) {
  mutator(state);
  persist();
  emit();
}

export function resetState() {
  state = structuredClone(DEFAULT_STATE);
  persist();
  emit();
}
