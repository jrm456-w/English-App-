/* Hoy — EngFlow 2.0 calm, distraction-free daily studio.
   One clear 15-minute 3-step session + 1 current lesson card. Zero noise. */
import { el, clear, escapeHtml } from './ui.js';
import { t } from './i18n.js';
import { getState } from './store.js';
import { loadLevel, loadStories } from './data.js';
import { navigate } from './router.js';
import {
  unitCompleted, levelProgress, levelReadyToAdvance,
  nextLevel, getDaily, mistakeList
} from './gamification.js';
import { dueCount } from '../games/review.js';
import { materialStatus } from './classMaterial.js';

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return t('greet.morning');
  if (h < 19) return t('greet.afternoon');
  return t('greet.evening');
}

export async function homeToday(_p, view) {
  const s = getState();
  clear(view);

  const data = await loadLevel(s.level);
  const units = data.units;
  const stories = (await loadStories()).filter((st) => st.level === s.level);
  const prog = levelProgress(data);
  const read = s.storiesRead || {};

  // Find current CEFR stop (first uncompleted unit or interleaved reading).
  const stops = [];
  let sp = 0;
  units.forEach((u, idx) => {
    stops.push({ type: 'unit', id: u.id, title: u.title, unit: u, lessonNo: idx + 1 });
    if ((idx + 1) % 3 === 0 && sp < stories.length) {
      const st = stories[sp++];
      stops.push({ type: 'reading', id: st.id, title: st.title, emoji: st.emoji, story: st });
    }
  });
  const stopDone = (st) => st.type === 'unit' ? unitCompleted(s.level, st.unit) : !!read[st.id];
  const currentStop = stops.find((st) => !stopDone(st)) || null;
  const doneCount = units.filter((u) => unitCompleted(s.level, u)).length;

  /* ---- 1. Top Status Bar ---- */
  const topbar = el(`
    <header class="topbar">
      <div>
        <h1 class="topbar__title">${escapeHtml(timeGreeting())}</h1>
        <div class="topbar__sub" id="lvl-link" role="button" tabindex="0" style="cursor:pointer">
          ${t('path.level')} ${escapeHtml(s.level)} · ${prog}% ${t('today.completed')}
        </div>
      </div>
      <div class="topbar__pills">
        <span class="stat-pill stat-pill--fire" title="${t('home.streak')}">🔥 ${s.streak}</span>
        <span class="stat-pill stat-pill--xp" title="${t('home.xp')}">⚡ ${s.xp}</span>
      </div>
    </header>`);
  topbar.querySelector('#lvl-link').onclick = () => navigate('/profile');
  view.appendChild(topbar);

  /* ---- 2. Fresh Academy Material Banner (only when active) ---- */
  const mat = await materialStatus();
  if (mat) {
    const matCard = el(`
      <div class="card card--tap" style="padding:14px 16px;border-color:var(--c-accent)">
        <div class="row" style="justify-content:space-between">
          <span><strong>📄 ${t('cm.forClass')}:</strong> ${escapeHtml(mat.material.title)}</span>
          <span class="badge pill">⏳ ${mat.daysLeft}d</span>
        </div>
      </div>`);
    matCard.onclick = () => navigate('/material');
    view.appendChild(matCard);
  }

  /* ---- 3. Main Studio Card: Today's 15-min Session ---- */
  const d = getDaily();
  const due = await dueCount(s.level);
  const mistakes = mistakeList();

  const step1 = mistakes.length > 0
    ? {
        time: '3 min',
        label: t('focus.step1Mistakes'),
        sub: `${mistakes.length} ${t('focus.realMistakes')}`,
        done: !!(d.mistakes || d.reviewed),
        run: () => navigate('/reflex/mistakes')
      }
    : {
        time: '3 min',
        label: t('focus.step1Review'),
        sub: due ? `${due} ${t('path.due')}` : t('plan.allReviewed'),
        done: due === 0 || !!d.reviewed,
        run: () => navigate('/review')
      };

  const step2 = {
    time: '5 min',
    label: t('focus.step2Reflex'),
    sub: t('focus.step2Sub'),
    done: !!d.reflex,
    run: () => navigate('/reflex')
  };

  const step3 = {
    time: '7 min',
    label: t('focus.step3EarVoice'),
    sub: d.ear ? t('focus.step3VoiceSub') : t('focus.step3EarSub'),
    done: !!(d.ear || d.spoke),
    run: () => navigate(d.ear ? '/room/session' : '/ear')
  };

  const steps = [step1, step2, step3];
  const nextStep = steps.find((st) => !st.done) || null;
  const nextIdx = nextStep ? steps.indexOf(nextStep) + 1 : 3;
  const doneSteps = steps.filter((st) => st.done).length;
  const ringPct = Math.round((doneSteps / steps.length) * 100);

  const studio = el(`<section class="studio-card studio-card--primary"></section>`);
  studio.appendChild(el(`
    <div class="row" style="justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:var(--fs-xs);font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--c-primary)">${t('today.eyebrow')}</div>
        <h2 class="h2" style="margin:2px 0 0">${t('focus.routineTitle')}</h2>
      </div>
      <div class="ring" style="--pct:${ringPct}%" aria-label="${doneSteps} / 3">
        <div class="ring__inner">${doneSteps}/3</div>
      </div>
    </div>`));

  const timeline = el(`<div class="timeline"></div>`);
  steps.forEach((st, idx) => {
    const isActive = st === nextStep;
    const node = el(`
      <div class="t-step ${isActive ? 'is-active' : ''} ${st.done ? 'is-done' : ''}" role="button" tabindex="0">
        <div class="t-step__num">${st.done ? '✓' : idx + 1}</div>
        <div class="t-step__body">
          <div class="t-step__title">${escapeHtml(st.label)}</div>
          <div class="t-step__sub">${escapeHtml(st.sub)}</div>
        </div>
        <span class="t-step__time">${st.time}</span>
      </div>`);
    node.onclick = st.run;
    node.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); st.run(); } };
    timeline.appendChild(node);
  });
  studio.appendChild(timeline);

  const cta = el(`
    <button class="btn btn--block">
      ${nextStep ? `▶ ${t('today.startStep')} ${nextIdx}` : `🎉 ${t('today.allDoneBtn')}`}
    </button>`);
  cta.onclick = nextStep ? nextStep.run : () => navigate('/practice');
  studio.appendChild(cta);
  view.appendChild(studio);

  /* ---- 4. Graduation Exam Banner (if level ready) ---- */
  if (levelReadyToAdvance(data) && nextLevel(s.level)) {
    const adv = el(`
      <div class="studio-card center" style="border:2px solid var(--c-success)">
        <div style="font-size:2rem">🎓</div>
        <strong>${t('advance.ready')}</strong>
        <button class="btn btn--success btn--block" id="adv-btn" style="margin-top:10px">📝 ${t('exam.take')} ${nextLevel(s.level)} →</button>
      </div>`);
    adv.querySelector('#adv-btn').onclick = () => navigate(`/exam/${s.level}`);
    view.appendChild(adv);
  }

  /* ---- 5. Current CEFR Lesson Card ---- */
  const lessonCard = el(`<section class="studio-card"></section>`);
  if (currentStop) {
    const isReading = currentStop.type === 'reading';
    const label = isReading
      ? `${currentStop.emoji || '📖'} ${t('path.story')}: ${currentStop.title}`
      : `${t('path.lesson')} ${currentStop.lessonNo}: ${currentStop.title}`;
    lessonCard.appendChild(el(`
      <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:var(--fs-xs);font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--c-text-muted)">${t('today.nextLesson')}</span>
        <span class="badge">${doneCount}/${units.length}</span>
      </div>
      <div style="font-weight:800;font-size:1.08rem;margin-bottom:10px">${escapeHtml(label)}</div>
      <div class="progress" style="margin-bottom:12px"><div class="progress__fill" style="width:${prog}%"></div></div>
      <div class="row" style="justify-content:space-between;gap:8px">
        <button class="btn btn--ghost btn--small" id="all-units">${t('today.allUnits')}</button>
        <button class="btn btn--small" id="go-lesson">${t('path.continue')} →</button>
      </div>`));
    lessonCard.querySelector('#go-lesson').onclick = () =>
      isReading ? navigate(`/lesson/${currentStop.id}`) : navigate(`/unit/${s.level}/${currentStop.id}`);
    lessonCard.querySelector('#all-units').onclick = () => navigate('/learn');
  } else {
    lessonCard.appendChild(el(`
      <div class="center">
        <div style="font-size:2rem">🏆</div>
        <strong>${t('path.levelComplete')}</strong>
        <div style="margin-top:10px"><button class="btn btn--ghost btn--small" id="all-units">${t('today.allUnits')}</button></div>
      </div>`));
    lessonCard.querySelector('#all-units').onclick = () => navigate('/learn');
  }
  view.appendChild(lessonCard);
}
