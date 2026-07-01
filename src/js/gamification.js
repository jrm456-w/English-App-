/* XP, streaks, daily missions, level progression and badge logic. */
import { getState, update } from './store.js';

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

/* A game counts toward progress only if the user reached this accuracy. */
export const PASS_RATIO = 0.6;
/* A level is "ready to advance" at this completion. */
export const ADVANCE_THRESHOLD = 80;
/* Daily goals the user can see and complete each day. */
export const DAILY = { games: 2, stories: 1, xp: 30 };
export const DAILY_BONUS_XP = 25;

export const BADGES = [
  { id: 'first_word', icon: '🌱', name_es: 'Primera Palabra', name_en: 'First Word' },
  { id: 'first_game', icon: '🎮', name_es: 'Primer Juego', name_en: 'First Game' },
  { id: 'streak_3', icon: '🔥', name_es: 'Racha de 3', name_en: '3-Day Streak' },
  { id: 'streak_7', icon: '⚡', name_es: 'Racha de 7', name_en: '7-Day Streak' },
  { id: 'daily_goal', icon: '✅', name_es: 'Meta Diaria', name_en: 'Daily Goal' },
  { id: 'xp_100', icon: '💯', name_es: '100 XP', name_en: '100 XP' },
  { id: 'xp_500', icon: '🚀', name_es: '500 XP', name_en: '500 XP' },
  { id: 'perfect', icon: '🎯', name_es: 'Puntaje Perfecto', name_en: 'Perfect Score' },
  { id: 'first_story', icon: '📖', name_es: 'Primera Historia', name_en: 'First Story' },
  { id: 'bookworm', icon: '📚', name_es: 'Ratón de Biblioteca', name_en: 'Bookworm' },
  { id: 'a2_grad', icon: '🥉', name_es: 'Graduado A2', name_en: 'A2 Graduate' },
  { id: 'b1_grad', icon: '🥈', name_es: 'Graduado B1', name_en: 'B1 Graduate' },
  { id: 'b2_grad', icon: '🥇', name_es: 'Graduado B2', name_en: 'B2 Graduate' },
  { id: 'c1_grad', icon: '🏆', name_es: 'Graduado C1', name_en: 'C1 Graduate' }
];

export function badgeName(b) { return getState().lang === 'en' ? b.name_en : b.name_es; }

function today() { return new Date().toISOString().slice(0, 10); }
function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }

let pendingBadgeCb = null;
export function onBadge(cb) { pendingBadgeCb = cb; }

function award(id) {
  const s = getState();
  if (s.badges.includes(id)) return;
  update((st) => st.badges.push(id));
  const badge = BADGES.find((b) => b.id === id);
  if (badge && pendingBadgeCb) pendingBadgeCb(badge);
}

/* ---------------- Daily missions ---------------- */
export function ensureDaily() {
  const s = getState();
  const td = today();
  if (!s.daily || s.daily.date !== td) {
    update((st) => { st.daily = { date: td, games: 0, stories: 0, xp: 0, lessonDone: false, claimed: false }; });
  }
  return getState().daily;
}

/* Mark today's guided lesson as completed (drives the 365-day habit). */
export function markDailyLessonDone() {
  ensureDaily();
  update((st) => { st.daily.lessonDone = true; });
}

/* Mark a step of the daily plan done (storyLesson / reviewed / spoke). */
export function markDailyTask(key) {
  ensureDaily();
  update((st) => { st.daily[key] = true; });
}

/* Track grammar mastery: a wrong answer raises the rule's "weak" score, a correct one
   lowers it. Weak rules surface so the user is pushed to reinforce exactly what they fail. */
export function recordGrammarResult(rule, ok) {
  if (!rule) return;
  update((st) => {
    st.weakGrammar = st.weakGrammar || {};
    const cur = st.weakGrammar[rule] || 0;
    const next = cur + (ok ? -1 : 2); // misses weigh more than hits
    if (next <= 0) delete st.weakGrammar[rule];
    else st.weakGrammar[rule] = next;
  });
}

export function weakGrammarList(n = 5) {
  const w = getState().weakGrammar || {};
  return Object.entries(w).sort((a, b) => b[1] - a[1]).slice(0, n).map(([rule]) => rule);
}

/* Schedule a vocabulary word in the spaced-repetition system. */
export function scheduleWord(level, en, es, known) {
  const BOX_DAYS = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 };
  const k = `${level}:${en}`;
  update((st) => {
    st.srs = st.srs || {};
    const prev = st.srs[k] || { box: 1 };
    const box = known ? Math.min(5, (prev.box || 1) + 1) : 1;
    const d = new Date(); d.setDate(d.getDate() + BOX_DAYS[box]);
    st.srs[k] = { box, due: d.toISOString().slice(0, 10), en, es };
  });
}

export function getDaily() {
  const d = ensureDaily();
  return {
    ...d,
    targets: DAILY,
    done: d.games >= DAILY.games && d.stories >= DAILY.stories && d.xp >= DAILY.xp
  };
}

let dailyDoneCb = null;
export function onDailyComplete(cb) { dailyDoneCb = cb; }

function checkDaily() {
  const d = ensureDaily();
  if (!d.claimed && d.games >= DAILY.games && d.stories >= DAILY.stories && d.xp >= DAILY.xp) {
    update((st) => { st.daily.claimed = true; });
    award('daily_goal');
    addXp(DAILY_BONUS_XP, true); // bonus; don't recurse into checkDaily
    if (dailyDoneCb) dailyDoneCb(DAILY_BONUS_XP);
  }
}

/* ---------------- Streak ---------------- */
export function touchStreak() {
  ensureDaily();
  const s = getState();
  const td = today();
  if (s.lastActiveDate === td) return;
  let streak = s.streak;
  if (!s.lastActiveDate) streak = 1;
  else {
    const gap = daysBetween(s.lastActiveDate, td);
    streak = gap === 1 ? streak + 1 : 1;
  }
  update((st) => { st.streak = streak; st.lastActiveDate = td; });
  if (streak >= 3) award('streak_3');
  if (streak >= 7) award('streak_7');
}

/* ---------------- XP ---------------- */
export function addXp(amount, isBonus = false) {
  ensureDaily();
  const td = today();
  update((st) => {
    st.xp += amount; st.daily.xp += amount;
    // Keep a rolling daily-activity history (last ~60 days) for the progress charts.
    st.xpLog = st.xpLog || {};
    st.xpLog[td] = (st.xpLog[td] || 0) + amount;
    const keys = Object.keys(st.xpLog).sort();
    while (keys.length > 60) delete st.xpLog[keys.shift()];
  });
  const xp = getState().xp;
  if (xp >= 100) award('xp_100');
  if (xp >= 500) award('xp_500');
  if (!isBonus) checkDaily();
}

/* ---------------- Games ---------------- */
export function recordGame({ level, unitId, gameType, attempts, correct, total, timeMs }) {
  ensureDaily();
  const key = `${level}:${unitId}:${gameType}`;
  const ratio = total > 0 ? correct / total : 0;
  update((st) => {
    const prev = st.completedGames[key] || { attempts: 0, correct: 0, bestTimeMs: null, bestRatio: 0 };
    st.completedGames[key] = {
      attempts: prev.attempts + attempts,
      correct: prev.correct + correct,
      bestTimeMs: prev.bestTimeMs == null ? timeMs : Math.min(prev.bestTimeMs, timeMs),
      bestRatio: Math.max(prev.bestRatio || 0, ratio)
    };
    st.daily.games += 1;
  });
  award('first_game');
  if (total > 0 && correct === total) award('perfect');
  const xp = 10;
  addXp(xp);
  return xp;
}

export function markUnitStudied(level, unitId) {
  update((st) => { st.completedUnits[`${level}:${unitId}`] = true; });
  award('first_word');
}

export function markStoryRead(storyId) {
  ensureDaily();
  const already = !!getState().storiesRead[storyId];
  update((st) => { st.storiesRead[storyId] = true; if (!already) st.daily.stories += 1; });
  award('first_story');
  if (Object.keys(getState().storiesRead).length >= 3) award('bookworm');
  if (already) return 0;
  const xp = 15;
  addXp(xp);
  return xp;
}

/* ---------------- Level progression ---------------- */
export function gamePassed(level, unitId, gameType) {
  const rec = getState().completedGames[`${level}:${unitId}:${gameType}`];
  return !!rec && (rec.bestRatio || 0) >= PASS_RATIO;
}

/* A unit is complete when the user passes at least 2 of its games (or all if fewer). */
export function unitCompleted(level, unit) {
  const games = unit.games || [];
  const need = Math.min(2, games.length);
  if (need === 0) return false;
  const passed = games.filter((g) => gamePassed(level, unit.id, g)).length;
  return passed >= need;
}

export function unitPassedCount(level, unit) {
  return (unit.games || []).filter((g) => gamePassed(level, unit.id, g)).length;
}

/* % of the level completed = completed units / total units. */
export function levelProgress(levelData) {
  const level = levelData.level;
  const total = levelData.units.length;
  if (!total) return 0;
  const done = levelData.units.filter((u) => unitCompleted(level, u)).length;
  return Math.round((done / total) * 100);
}

export function levelReadyToAdvance(levelData) {
  return levelProgress(levelData) >= ADVANCE_THRESHOLD;
}

export function nextLevel(level) {
  const idx = LEVELS.indexOf(level);
  return idx >= 0 && idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
}

function gradBadgeFor(level) {
  return { A1: null, A2: 'a2_grad', B1: 'b1_grad', B2: 'b2_grad', C1: 'c1_grad' }[level];
}

export function markGraduate(level) {
  const id = gradBadgeFor(level);
  if (id) award(id);
  addXp(25);
}

/* Promote the user to the next level (awards graduation badge + XP). */
export function advanceLevel() {
  const s = getState();
  const next = nextLevel(s.level);
  if (!next) return null;
  markGraduate(s.level);
  update((st) => { st.level = next; });
  return next;
}

export function recentBadges(n = 4) {
  const ids = getState().badges.slice(-n).reverse();
  return ids.map((id) => BADGES.find((b) => b.id === id)).filter(Boolean);
}
