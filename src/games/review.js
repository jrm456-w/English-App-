/* Smart Review — spaced repetition (Leitner system).
   This is the core "learn it for good, fast" engine: words you know move to
   longer intervals; words you miss come back tomorrow. */
import { el, clear } from '../js/ui.js';
import { t } from '../js/i18n.js';
import { getState, update } from '../js/store.js';
import { vocabPool } from '../js/data.js';
import { speak } from '../js/speech.js';
import { addXp, markDailyTask } from '../js/gamification.js';
import { navigate, goBack } from '../js/router.js';

// Days until the next review for each Leitner box (1 = new/failed, 5 = mastered).
const BOX_DAYS = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 };
const SESSION_MAX = 12;

function today() { return new Date().toISOString().slice(0, 10); }
function addDays(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function keyFor(level, en) { return `${level}:${en}`; }

/* How many words are due for review right now (used on Home). */
export async function dueCount(level) {
  const pool = await vocabPool(level);
  const srs = getState().srs || {};
  const td = today();
  return pool.filter((v) => {
    const e = srs[keyFor(level, v.en)];
    return !e || e.due <= td;
  }).length;
}

export async function review(_p, view) {
  const s = getState();
  clear(view);
  const pool = await vocabPool(s.level);
  const srs = s.srs || {};
  const td = today();

  // Build the due queue: never-seen words first, then those scheduled for today.
  const queue = pool
    .filter((v) => { const e = srs[keyFor(s.level, v.en)]; return !e || e.due <= td; })
    .slice(0, SESSION_MAX);

  view.appendChild(el(`<button class="btn btn--ghost btn--small" id="back">← ${t('common.back')}</button>`));
  view.querySelector('#back').onclick = () => goBack('/home');
  view.appendChild(el(`<h1 class="h1">🔁 ${t('review.title')}</h1>`));

  if (!queue.length) {
    view.appendChild(el(`<div class="card center"><div style="font-size:3rem">🎉</div><p>${t('review.none')}</p><button class="btn" id="home">${t('nav.home')}</button></div>`));
    view.querySelector('#home').onclick = () => navigate('/home');
    return;
  }

  const stage = el(`<div></div>`);
  view.appendChild(stage);
  let i = 0, correct = 0;
  const total = queue.length;

  function render() {
    const v = queue[i];
    clear(stage);
    const reps = (srs[keyFor(s.level, v.en)] || {}).box || 1;
    const wrap = el(`
      <div class="card">
        <div class="row" style="justify-content:space-between">
          <span class="muted">${i + 1} / ${total}</span>
          <span class="badge">${'⭐'.repeat(Math.min(reps, 5)) || '☆'}</span>
        </div>
        <div class="flashcard" id="fc" tabindex="0" role="button" aria-label="${t('common.flip')}">
          <div class="flashcard__inner">
            <div class="flashcard__face"><div><div>${v.es}</div><small class="muted">${t('common.flip')}</small></div></div>
            <div class="flashcard__face flashcard__face--back"><div>${v.en} <span aria-hidden="true">🔊</span></div></div>
          </div>
        </div>
        <div class="row" style="margin-top:16px;justify-content:space-between">
          <button class="btn btn--ghost" id="again">${t('common.dontKnow')}</button>
          <button class="btn btn--success" id="know">${t('common.know')}</button>
        </div>
      </div>`);
    stage.appendChild(wrap);
    const fc = wrap.querySelector('#fc');
    const flip = () => { fc.classList.toggle('is-flipped'); if (fc.classList.contains('is-flipped')) speak(v.en); };
    fc.onclick = flip;
    fc.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } };
    wrap.querySelector('#know').onclick = () => grade(v, true);
    wrap.querySelector('#again').onclick = () => grade(v, false);
  }

  function grade(v, known) {
    if (known) correct++;
    update((st) => {
      st.srs = st.srs || {};
      const prev = st.srs[keyFor(s.level, v.en)] || { box: 1 };
      const box = known ? Math.min(5, (prev.box || 1) + 1) : 1;
      st.srs[keyFor(s.level, v.en)] = { box, due: addDays(BOX_DAYS[box]), en: v.en, es: v.es };
    });
    i++;
    i < total ? render() : finish();
  }

  function finish() {
    const xp = 10;
    addXp(xp);
    markDailyTask('reviewed');
    clear(stage);
    const mastered = queue.filter((v) => (getState().srs[keyFor(s.level, v.en)] || {}).box >= 4).length;
    const card = el(`
      <div class="card center">
        <div style="font-size:3rem">🧠</div>
        <h2 class="h2">${t('common.complete')}</h2>
        <p>${t('review.recalled')}: <strong>${correct}/${total}</strong></p>
        <div class="badge pill" style="margin:8px 0">+${xp} XP</div>
        <p class="muted">${t('review.scheduled')}</p>
        <button class="btn btn--block" id="home">${t('nav.home')}</button>
      </div>`);
    stage.appendChild(card);
    card.querySelector('#home').onclick = () => navigate('/home');
  }

  render();
}
