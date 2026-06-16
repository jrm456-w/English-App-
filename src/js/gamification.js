/* XP, streaks and badge logic. */
import { getState, update } from './store.js';
import { t } from './i18n.js';

export const BADGES = [
  { id: 'first_word', icon: '🌱', name_es: 'Primera Palabra', name_en: 'First Word' },
  { id: 'first_game', icon: '🎮', name_es: 'Primer Juego', name_en: 'First Game' },
  { id: 'streak_3', icon: '🔥', name_es: 'Racha de 3', name_en: '3-Day Streak' },
  { id: 'streak_7', icon: '⚡', name_es: 'Racha de 7', name_en: '7-Day Streak' },
  { id: 'xp_100', icon: '💯', name_es: '100 XP', name_en: '100 XP' },
  { id: 'xp_500', icon: '🚀', name_es: '500 XP', name_en: '500 XP' },
  { id: 'perfect', icon: '🎯', name_es: 'Puntaje Perfecto', name_en: 'Perfect Score' },
  { id: 'a2_grad', icon: '🥉', name_es: 'Graduado A2', name_en: 'A2 Graduate' },
  { id: 'b1_grad', icon: '🥈', name_es: 'Graduado B1', name_en: 'B1 Graduate' },
  { id: 'b2_grad', icon: '🥇', name_es: 'Graduado B2', name_en: 'B2 Graduate' }
];

export function badgeName(b) { return getState().lang === 'en' ? b.name_en : b.name_es; }

function today() { return new Date().toISOString().slice(0, 10); }
function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

let pendingBadgeCb = null;
export function onBadge(cb) { pendingBadgeCb = cb; }

function award(id) {
  const s = getState();
  if (s.badges.includes(id)) return;
  update((st) => st.badges.push(id));
  const badge = BADGES.find((b) => b.id === id);
  if (badge && pendingBadgeCb) pendingBadgeCb(badge);
}

/* Call once per app open / activity to maintain the daily streak. */
export function touchStreak() {
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

export function addXp(amount) {
  update((st) => { st.xp += amount; });
  const xp = getState().xp;
  if (xp >= 100) award('xp_100');
  if (xp >= 500) award('xp_500');
}

/* Record a finished game; returns XP earned. */
export function recordGame({ level, unitId, gameType, attempts, correct, total, timeMs }) {
  const key = `${level}:${unitId}:${gameType}`;
  update((st) => {
    const prev = st.completedGames[key] || { attempts: 0, correct: 0, bestTimeMs: null };
    st.completedGames[key] = {
      attempts: prev.attempts + attempts,
      correct: prev.correct + correct,
      bestTimeMs: prev.bestTimeMs == null ? timeMs : Math.min(prev.bestTimeMs, timeMs)
    };
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

export function markGraduate(level) {
  const map = { A2: 'a2_grad', B1: 'b1_grad', B2: 'b2_grad' };
  if (map[level]) award(map[level]);
  addXp(25); // level milestone
}

/* % completion of a level (units studied + games played). */
export function levelProgress(levelData) {
  const s = getState();
  const level = levelData.level;
  let totalSlots = 0, done = 0;
  for (const u of levelData.units) {
    totalSlots += 1; // unit studied
    if (s.completedUnits[`${level}:${u.id}`]) done += 1;
    for (const g of u.games) {
      totalSlots += 1;
      if (s.completedGames[`${level}:${u.id}:${g}`]) done += 1;
    }
  }
  return totalSlots === 0 ? 0 : Math.round((done / totalSlots) * 100);
}

export function recentBadges(n = 4) {
  const ids = getState().badges.slice(-n).reverse();
  return ids.map((id) => BADGES.find((b) => b.id === id)).filter(Boolean);
}
