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

  // Unified journey: units with readings interleaved, in one ordered sequence.
  const stops = [];
  let sp = 0;
  units.forEach((u, idx) => {
    stops.push({ type: 'unit', id: u.id, title: u.title, unit: u });
    if ((idx + 1) % 3 === 0 && sp < stories.length) {
      const st = stories[sp++];
      stops.push({ type: 'reading', id: st.id, title: st.title, emoji: st.emoji, story: st });
    }
  });
  const stopDone = (st) => st.type === 'unit' ? unitCompleted(s.level, st.unit) : !!read[st.id];
  const currentStop = stops.find((st) => !stopDone(st)) || null;
  const curIndex = currentStop ? stops.indexOf(currentStop) : stops.length;

  /* ---- Hero (status only) ---- */
  view.appendChild(el(`
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
    </div>`));

  /* ---- PLAN DE HOY: one guided sequence, always shows what to do next ---- */
  const d = getDaily();
  const due = await dueCount(s.level);
  const goStop = () => {
    if (!currentStop) return;
    currentStop.type === 'reading' ? navigate(`/lesson/${currentStop.id}`) : navigate(`/unit/${s.level}/${currentStop.id}`);
  };
  const steps = [
    { icon: currentStop && currentStop.type === 'reading' ? (currentStop.emoji || '📖') : '📖',
      label: t('plan.lesson'),
      sub: currentStop ? escapeHtml(currentStop.title) : t('plan.journeyDone'),
      done: !currentStop || !!d.storyLesson || d.games > 0,
      ok: !!currentStop, run: goStop },
    { icon: '🔁', label: t('plan.review'), sub: due ? (due + ' ' + t('path.due')) : t('plan.allReviewed'), done: due === 0 || !!d.reviewed, ok: true, run: () => navigate('/review') },
    { icon: '🗣️', label: t('plan.speak'), sub: t('speak2.short'), done: !!d.spoke, ok: true, run: () => navigate('/speak') }
  ];
  const next = steps.find((st) => !st.done && st.ok);
  const doneSteps = steps.filter((st) => st.done).length;

  const plan = el(`<div class="card" style="border:2px solid var(--c-primary)"></div>`);
  plan.appendChild(el(`<div class="row" style="justify-content:space-between"><strong>🎯 ${t('plan.title')}</strong><small class="muted">${doneSteps}/${steps.length}</small></div>`));
  steps.forEach((st) => {
    const mark = st.done ? '✅' : (st === next ? '▶️' : '⬜');
    const row = el(`<div class="setting-row"><span>${mark} ${st.icon} <strong>${st.label}</strong>${st.sub ? ` <span class="muted" style="font-size:.8rem">· ${st.sub}</span>` : ''}</span></div>`);
    if (st.ok) { row.style.cursor = 'pointer'; row.onclick = st.run; }
    plan.appendChild(row);
  });
  const cta = el(`<button class="btn btn--block" style="margin-top:12px">${next ? '▶ ' + t('plan.start') : '🎉 ' + t('plan.done')}</button>`);
  if (next) cta.onclick = next.run; else cta.disabled = true;
  plan.appendChild(cta);
  view.appendChild(plan);

  view.appendChild(el(`<h2 class="h2">${t('path.yourPath')}</h2>`));
  view.appendChild(el(`<p class="muted" style="margin-top:-8px;font-size:.85rem">${t('path.mapHint')}</p>`));

  /* ---- The journey map (units + readings as one sequence) ---- */
  let lessonNo = 0;
  stops.forEach((st, idx) => {
    if (st.type === 'unit') lessonNo++;
    const done = stopDone(st);
    const isCurrent = idx === curIndex;
    const locked = idx > curIndex;
    const isReading = st.type === 'reading';

    const icon = done ? '✅' : isCurrent ? '🎯' : locked ? '🔒' : (isReading ? (st.emoji || '📖') : '•');
    const cls = 'lesson-node' + (isCurrent ? ' is-current' : '') + (locked ? ' is-locked' : '') + (done ? ' is-done' : '') + (isReading ? ' lesson-node--story' : '');
    const title = isReading ? `${t('path.story')}: ${st.title}` : `${t('path.lesson')} ${lessonNo}: ${st.title}`;
    let sub;
    if (locked) sub = t('path.locked');
    else if (done) sub = isReading ? t('stories.read') : t('learn.completed');
    else if (isReading) sub = t('path.storyNew');
    else sub = unitPassedCount(s.level, st.unit) + '/' + Math.min(2, (st.unit.games || []).length) + ' ' + t('learn.passed');

    const node = el(`
      <div class="${cls}">
        <div class="lesson-node__icon">${icon}</div>
        <div class="lesson-node__body">
          <div class="lesson-node__title">${isCurrent ? '▶️ ' : ''}${title}</div>
          <div class="lesson-node__sub">${isCurrent ? t('path.todayHere') + ' · ' : ''}${sub}</div>
        </div>
        ${isCurrent ? `<span class="lesson-node__cta">${t('common.start')} →</span>` : ''}
      </div>`);
    if (locked) node.onclick = () => toast('🔒 ' + t('path.lockedMsg'));
    else node.onclick = () => isReading ? navigate(`/lesson/${st.id}`) : navigate(`/unit/${s.level}/${st.id}`);
    view.appendChild(node);
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

  // Small footer tools (secondary, not cluttering the main flow).
  const tools = el(`<div class="row" style="justify-content:center;margin-top:16px;gap:14px;flex-wrap:wrap">
    <button class="btn btn--ghost btn--small" id="t-convo">💬 ${t('convo.title')}</button>
    <button class="btn btn--ghost btn--small" id="t-pron">🗣️ ${t('pron.title')}</button>
    <button class="btn btn--ghost btn--small" id="t-dict">🔤 ${t('dict.title')}</button>
    <button class="btn btn--ghost btn--small" id="t-daily">📅 ${t('daily.lesson')}</button>
  </div>`);
  tools.querySelector('#t-convo').onclick = () => navigate('/convo');
  tools.querySelector('#t-pron').onclick = () => navigate('/pronunciation');
  tools.querySelector('#t-dict').onclick = () => navigate('/dictionary');
  tools.querySelector('#t-daily').onclick = () => navigate('/daily');
  view.appendChild(tools);
}
