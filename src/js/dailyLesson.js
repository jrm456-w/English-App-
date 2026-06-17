/* Daily Lesson — a fresh guided session every day:
   Learn new words -> Practice them -> Review due words.
   It walks sequentially through the level's vocabulary (a real curriculum),
   so each day brings something new and each level leads into the next. */
import { el, clear, shuffle, sample, celebrate } from './ui.js';
import { t } from './i18n.js';
import { getState } from './store.js';
import { vocabPool } from './data.js';
import { speak } from './speech.js';
import { addXp, markDailyLessonDone, scheduleWord, levelReadyToAdvance, nextLevel } from './gamification.js';
import { loadLevel } from './data.js';
import { navigate } from './router.js';

const NEW_PER_DAY = 5;
const REVIEW_PER_DAY = 6;

function today() { return new Date().toISOString().slice(0, 10); }

export async function newWordsToday(level) {
  const pool = await vocabPool(level);
  const srs = getState().srs || {};
  return pool.filter((v) => !srs[`${level}:${v.en}`]).slice(0, NEW_PER_DAY);
}

export async function dailyLesson(_p, view) {
  const s = getState();
  clear(view);
  const pool = await vocabPool(s.level);
  const srs = getState().srs || {};
  const td = today();

  // New words = next unseen in curriculum order. Reviews = words due today.
  const newWords = pool.filter((v) => !srs[`${s.level}:${v.en}`]).slice(0, NEW_PER_DAY);
  const dueWords = pool.filter((v) => { const e = srs[`${s.level}:${v.en}`]; return e && e.due <= td; }).slice(0, REVIEW_PER_DAY);

  // Header
  view.appendChild(el(`<button class="btn btn--ghost btn--small" id="back">← ${t('common.back')}</button>`));
  view.querySelector('#back').onclick = () => navigate('/home');
  view.appendChild(el(`<h1 class="h1">📅 ${t('daily.lesson')}</h1>`));
  const stage = el(`<div></div>`);
  view.appendChild(stage);

  const quizResults = {}; // en -> known boolean (from practice)

  // Build the step pipeline depending on what's available.
  const steps = [];
  if (newWords.length) { steps.push(() => phaseLearn(newWords)); steps.push(() => phasePractice(newWords)); }
  if (dueWords.length) steps.push(() => phaseReview(dueWords));
  if (!steps.length) { return phaseAllDone(); }
  let stepIndex = 0;
  function next() { stepIndex < steps.length ? steps[stepIndex++]() : finish(); }

  /* ---- Phase 1: Learn ---- */
  function phaseLearn(words) {
    let i = 0;
    function render() {
      const w = words[i];
      clear(stage);
      const card = el(`
        <div class="card center">
          <p class="muted">${t('daily.phaseLearn')} · ${i + 1}/${words.length}</p>
          <div style="font-size:1.8rem;font-weight:800;margin:10px 0">${w.en}</div>
          <button class="btn btn--ghost btn--small" id="say">🔊</button>
          <div style="font-size:1.2rem;margin:14px 0;color:var(--c-text-muted)">${w.es}</div>
          <button class="btn btn--block" id="next">${i + 1 < words.length ? t('common.next') : t('daily.toPractice')}</button>
        </div>`);
      stage.appendChild(card);
      setTimeout(() => speak(w.en), 250);
      card.querySelector('#say').onclick = () => speak(w.en);
      card.querySelector('#next').onclick = () => { i++; i < words.length ? render() : next(); };
    }
    render();
  }

  /* ---- Phase 2: Practice (ES -> EN multiple choice) ---- */
  function phasePractice(words) {
    let i = 0;
    function render() {
      const w = words[i];
      const distractors = sample(pool.filter((p) => p.en !== w.en), 3).map((p) => p.en);
      const options = shuffle([w.en, ...distractors]);
      clear(stage);
      const card = el(`
        <div class="card">
          <p class="muted">${t('daily.phasePractice')} · ${i + 1}/${words.length}</p>
          <h2 class="h2">${w.es}</h2>
          <div id="opts"></div>
        </div>`);
      stage.appendChild(card);
      const opts = card.querySelector('#opts');
      options.forEach((opt) => {
        const b = el(`<button class="option">${opt}</button>`);
        b.onclick = () => {
          card.querySelectorAll('.option').forEach((o) => o.disabled = true);
          const ok = opt === w.en;
          quizResults[w.en] = ok;
          if (ok) { b.classList.add('is-correct'); speak(w.en); }
          else {
            b.classList.add('is-wrong');
            card.querySelectorAll('.option').forEach((o) => { if (o.textContent === w.en) o.classList.add('is-correct'); });
          }
          const nx = el(`<button class="btn btn--block" style="margin-top:12px">${i + 1 < words.length ? t('common.next') : t('common.next')}</button>`);
          nx.onclick = () => { i++; i < words.length ? render() : next(); };
          card.appendChild(nx);
        };
        opts.appendChild(b);
      });
    }
    render();
  }

  /* ---- Phase 3: Review (flashcard know/again) ---- */
  function phaseReview(words) {
    let i = 0;
    function render() {
      const w = words[i];
      clear(stage);
      const wrap = el(`
        <div class="card">
          <p class="muted">${t('daily.phaseReview')} · ${i + 1}/${words.length}</p>
          <div class="flashcard" id="fc" tabindex="0" role="button" aria-label="${t('common.flip')}">
            <div class="flashcard__inner">
              <div class="flashcard__face"><div><div>${w.es}</div><small class="muted">${t('common.flip')}</small></div></div>
              <div class="flashcard__face flashcard__face--back"><div>${w.en} 🔊</div></div>
            </div>
          </div>
          <div class="row" style="margin-top:16px;justify-content:space-between">
            <button class="btn btn--ghost" id="again">${t('common.dontKnow')}</button>
            <button class="btn btn--success" id="know">${t('common.know')}</button>
          </div>
        </div>`);
      stage.appendChild(wrap);
      const fc = wrap.querySelector('#fc');
      const flip = () => { fc.classList.toggle('is-flipped'); if (fc.classList.contains('is-flipped')) speak(w.en); };
      fc.onclick = flip;
      fc.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } };
      wrap.querySelector('#know').onclick = () => { scheduleWord(s.level, w.en, w.es, true); i++; i < words.length ? render() : next(); };
      wrap.querySelector('#again').onclick = () => { scheduleWord(s.level, w.en, w.es, false); i++; i < words.length ? render() : next(); };
    }
    render();
  }

  /* ---- No new words left in this level ---- */
  async function phaseAllDone() {
    clear(stage);
    const data = await loadLevel(s.level);
    const ready = levelReadyToAdvance(data) && nextLevel(s.level);
    const card = el(`
      <div class="card center">
        <div style="font-size:3rem">🌟</div>
        <h2 class="h2">${t('daily.allLearned')}</h2>
        <p class="muted">${t('daily.allLearnedDesc')}</p>
        <button class="btn btn--block" id="go">${ready ? t('progress.title') : t('nav.games')}</button>
      </div>`);
    stage.appendChild(card);
    card.querySelector('#go').onclick = () => navigate(ready ? '/progress' : '/games');
  }

  /* ---- Finish ---- */
  function finish() {
    // Schedule the new words based on how the practice went.
    newWords.forEach((w) => scheduleWord(s.level, w.en, w.es, quizResults[w.en] === true));
    markDailyLessonDone();
    const xp = 20;
    addXp(xp);
    celebrate();
    clear(stage);
    const card = el(`
      <div class="card center pop-in">
        <div style="font-size:3rem">🎉</div>
        <h2 class="h2">${t('daily.done')}</h2>
        <p>${newWords.length} ${t('daily.newWords')} · ${dueWords.length} ${t('daily.reviewed')}</p>
        <div class="badge pill" style="margin:8px 0">+${xp} XP</div>
        <button class="btn btn--block" id="home">${t('nav.home')}</button>
      </div>`);
    stage.appendChild(card);
    card.querySelector('#home').onclick = () => navigate('/home');
  }

  next();
}
