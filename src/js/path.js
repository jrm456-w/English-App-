/* Learning Path — the single, clear, guided journey.
   Lessons (units) unlock one after another; stories are interleaved for variety.
   One "Continue" button always tells the user exactly what to do next. */
import { el, clear, celebrate, escapeHtml } from './ui.js';
import { t } from './i18n.js';
import { getState } from './store.js';
import { loadLevel, loadStories } from './data.js';
import { navigate } from './router.js';
import {
  unitCompleted, unitPassedCount, levelProgress, levelReadyToAdvance,
  nextLevel, advanceLevel, getDaily
} from './gamification.js';
import { dueCount } from '../games/review.js';
import { newWordsToday } from './dailyLesson.js';
import { pickLessonStory } from './storyLesson.js';
import { toast } from './ui.js';

export async function learningPath(_p, view) {
  const s = getState();
  clear(view);
  const data = await loadLevel(s.level);
  const units = data.units;
  const stories = (await loadStories()).filter((st) => st.level === s.level);
  const prog = levelProgress(data);
  const read = getState().storiesRead;

  // The current lesson = first not-yet-completed unit.
  let currentIdx = units.findIndex((u) => !unitCompleted(s.level, u));
  const allDone = currentIdx === -1;
  if (allDone) currentIdx = units.length;
  const doneCount = units.filter((u) => unitCompleted(s.level, u)).length;

  /* ---- Hero with the single clear next action ---- */
  const hero = el(`
    <div class="hero">
      <div class="row" style="justify-content:space-between;align-items:center">
        <div>
          <div style="opacity:.85;font-size:.9rem">${t('path.level')} ${s.level}</div>
          <h1 class="h1" style="margin:2px 0">${t('path.title')}</h1>
        </div>
        <div class="badge" style="background:rgba(255,255,255,.2);border:0;color:#fff">🔥 ${s.streak}</div>
      </div>
      <div class="progress" style="margin-top:12px;background:rgba(255,255,255,.25)">
        <div class="progress__fill" style="width:${prog}%;background:#fff"></div>
      </div>
      <div style="opacity:.9;font-size:.85rem;margin-top:6px">${doneCount}/${units.length} ${t('path.lessons')} · ${prog}%</div>
      <button class="btn" id="continue" style="margin-top:14px;background:#fff;color:var(--c-primary);width:100%">
        ${allDone ? '🎓 ' + t('path.levelDone') : '▶ ' + t('path.continue')}
      </button>
    </div>`);
  view.appendChild(hero);
  hero.querySelector('#continue').onclick = () => {
    if (allDone) { navigate('/progress'); return; }
    navigate(`/unit/${s.level}/${units[currentIdx].id}`);
  };

  /* ---- THE main action: one cohesive story-based lesson ---- */
  const lessonStory = await pickLessonStory(s.level);
  if (lessonStory) {
    const card = el(`
      <div class="card card--tap" style="margin-top:14px;border:2px solid var(--c-primary)">
        <div class="row" style="justify-content:space-between">
          <strong>${lessonStory.emoji} ${t('sl.cta')}</strong>
          <span class="badge pill">▶</span>
        </div>
        <div style="margin-top:4px">${escapeHtml(lessonStory.title)}</div>
        <small class="muted">${t('sl.flow')}</small>
      </div>`);
    card.onclick = () => navigate(`/lesson/${lessonStory.id}`);
    view.appendChild(card);
  }

  /* ---- Daily lesson shortcut (small, optional) ---- */
  const dailyDone = getDaily().lessonDone;
  const newCount = (await newWordsToday(s.level)).length;
  const due = await dueCount(s.level);
  const quick = el(`<div class="grid grid--2" style="margin-bottom:8px"></div>`);
  const dailyBtn = el(`<div class="card card--tap center" style="padding:14px"><div style="font-size:1.5rem">📅</div><strong>${t('daily.lesson')}</strong><div class="muted" style="font-size:.78rem">${dailyDone ? '✅' : newCount + ' ' + t('daily.newWords')}</div></div>`);
  dailyBtn.onclick = () => navigate('/daily');
  const reviewBtn = el(`<div class="card card--tap center" style="padding:14px"><div style="font-size:1.5rem">🔁</div><strong>${t('review.title')}</strong><div class="muted" style="font-size:.78rem">${due} ${t('path.due')}</div></div>`);
  reviewBtn.onclick = () => navigate('/review');
  const pronBtn = el(`<div class="card card--tap center" style="padding:14px"><div style="font-size:1.5rem">🗣️</div><strong>${t('pron.title')}</strong><div class="muted" style="font-size:.78rem">${t('pron.short')}</div></div>`);
  pronBtn.onclick = () => navigate('/pronunciation');
  const dictBtn = el(`<div class="card card--tap center" style="padding:14px"><div style="font-size:1.5rem">🔤</div><strong>${t('dict.title')}</strong><div class="muted" style="font-size:.78rem">${t('dict.words')}</div></div>`);
  dictBtn.onclick = () => navigate('/dictionary');
  quick.appendChild(dailyBtn); quick.appendChild(reviewBtn);
  quick.appendChild(pronBtn); quick.appendChild(dictBtn);
  view.appendChild(quick);

  view.appendChild(el(`<h2 class="h2">${t('path.yourPath')}</h2>`));

  /* ---- The path itself ---- */
  let storyPtr = 0;
  units.forEach((u, idx) => {
    const done = unitCompleted(s.level, u);
    const isCurrent = idx === currentIdx;
    const locked = idx > currentIdx;
    const passed = unitPassedCount(s.level, u);
    const totalGames = (u.games || []).length;

    const icon = done ? '✅' : isCurrent ? '🎯' : '🔒';
    const cls = 'lesson-node' + (isCurrent ? ' is-current' : '') + (locked ? ' is-locked' : '') + (done ? ' is-done' : '');
    const node = el(`
      <div class="${cls}">
        <div class="lesson-node__icon">${icon}</div>
        <div class="lesson-node__body">
          <div class="lesson-node__title">${t('path.lesson')} ${idx + 1}: ${u.title}</div>
          <div class="lesson-node__sub">${locked ? t('path.locked') : (done ? t('learn.completed') : passed + '/' + Math.min(2, totalGames) + ' ' + t('learn.passed'))}</div>
        </div>
        ${isCurrent ? `<span class="lesson-node__cta">${t('common.start')} →</span>` : ''}
      </div>`);
    if (!locked) node.onclick = () => navigate(`/unit/${s.level}/${u.id}`);
    else node.onclick = () => toast('🔒 ' + t('path.lockedMsg'));
    view.appendChild(node);

    // Interleave a story every 3 lessons for variety.
    if ((idx + 1) % 3 === 0 && storyPtr < stories.length) {
      const st = stories[storyPtr++];
      const sNode = el(`
        <div class="lesson-node lesson-node--story">
          <div class="lesson-node__icon">${st.emoji || '📖'}</div>
          <div class="lesson-node__body">
            <div class="lesson-node__title">${t('path.story')}: ${st.title}</div>
            <div class="lesson-node__sub">${read[st.id] ? t('stories.read') : t('path.storyNew')}</div>
          </div>
        </div>`);
      sNode.onclick = () => navigate(`/story/${st.id}`);
      view.appendChild(sNode);
    }
  });

  /* ---- End of level ---- */
  if (allDone) {
    const next = nextLevel(s.level);
    const end = el(`
      <div class="card center" style="border:2px solid var(--c-success);margin-top:8px">
        <div style="font-size:2.5rem">🎓</div>
        <h2 class="h2">${t('path.levelComplete')}</h2>
        ${next ? `<button class="btn btn--success btn--block" id="adv">📝 ${t('exam.take')} ${next} →</button>` : `<p class="muted">${t('path.topLevel')}</p>`}
      </div>`);
    view.appendChild(end);
    if (next) end.querySelector('#adv').onclick = () => navigate(`/exam/${s.level}`);
  } else if (levelReadyToAdvance(data) && nextLevel(s.level)) {
    const adv = el(`<div class="card center" style="border:2px solid var(--c-success)"><strong>🎓 ${t('advance.ready')}</strong><button class="btn btn--success btn--block" id="adv2" style="margin-top:8px">📝 ${t('exam.take')} →</button></div>`);
    view.appendChild(adv);
    adv.querySelector('#adv2').onclick = () => navigate(`/exam/${s.level}`);
  }
}
