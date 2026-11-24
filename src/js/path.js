/* Learning Path — "Modo Enfoque" (15 min/day active fluency routine)
   plus collapsible CEFR unit journey map so learners don't get lost in 18 modes. */
import { el, clear, escapeHtml, toast } from './ui.js';
import { t } from './i18n.js';
import { getState } from './store.js';
import { loadLevel, loadStories } from './data.js';
import { navigate } from './router.js';
import {
  unitCompleted, unitPassedCount, levelProgress, levelReadyToAdvance,
  nextLevel, getDaily, mistakeList
} from './gamification.js';
import { dueCount } from '../games/review.js';
import { materialStatus } from './classMaterial.js';

export async function learningPath(_p, view) {
  const s = getState();
  clear(view);
  const data = await loadLevel(s.level);
  const units = data.units;
  const stories = (await loadStories()).filter((st) => st.level === s.level);
  const prog = levelProgress(data);
  const read = s.storiesRead || {};

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

  /* ---- Compact Hero (Level, Streak, XP, Progress) ---- */
  view.appendChild(el(`
    <div class="hero">
      <div class="row" style="justify-content:space-between;align-items:center">
        <div>
          <div style="opacity:.85;font-size:.9rem">${t('path.level')} ${s.level} · ⚡ ${s.xp} XP</div>
          <h1 class="h1" style="margin:2px 0">${t('focus.title')}</h1>
        </div>
        <div class="badge" style="background:rgba(255,255,255,.2);border:0;color:#fff">🔥 ${s.streak}</div>
      </div>
      <div class="progress" style="margin-top:12px;background:rgba(255,255,255,.25)">
        <div class="progress__fill" style="width:${prog}%;background:#fff"></div>
      </div>
      <div style="opacity:.9;font-size:.85rem;margin-top:6px">${doneCount}/${units.length} ${t('path.lessons')} · ${prog}%</div>
    </div>`));

  /* ---- Class material (from your academy) — shows only while fresh ---- */
  const mat = await materialStatus();
  if (mat) {
    const card = el(`
      <div class="card card--tap" style="border:2px solid var(--c-accent)">
        <div class="row" style="justify-content:space-between">
          <strong>📄 ${t('cm.forClass')}: ${escapeHtml(mat.material.title)}</strong>
          <span class="badge ${mat.daysLeft <= 2 ? 'pill' : ''}">⏳ ${mat.daysLeft}d</span>
        </div>
        <small class="muted">${t('cm.forClassHint')}</small>
      </div>`);
    card.onclick = () => navigate('/material');
    view.appendChild(card);
  }

  /* ---- 🎯 TU RUTINA DE HOY (15 min — Focus Mode) ---- */
  const d = getDaily();
  const due = await dueCount(s.level);
  const mistakes = mistakeList();
  const phrasesCount = (s.myPhrases || []).length;

  const step1 = mistakes.length > 0
    ? {
        icon: '🔥',
        time: '3 min',
        label: t('focus.step1Mistakes'),
        sub: `${mistakes.length} ${t('focus.realMistakes')}`,
        done: !!(d.mistakes || d.reviewed),
        ok: true,
        run: () => navigate('/reflex/mistakes')
      }
    : {
        icon: '🔁',
        time: '3 min',
        label: t('focus.step1Review'),
        sub: due ? `${due} ${t('path.due')}` : t('plan.allReviewed'),
        done: due === 0 || !!d.reviewed,
        ok: true,
        run: () => navigate('/review')
      };

  const step2 = {
    icon: '⚡',
    time: '5 min',
    label: t('focus.step2Reflex'),
    sub: t('focus.step2Sub'),
    done: !!d.reflex,
    ok: true,
    run: () => navigate('/reflex')
  };

  const step3 = {
    icon: '🎧',
    time: '7 min',
    label: t('focus.step3EarVoice'),
    sub: d.ear ? t('focus.step3VoiceSub') : t('focus.step3EarSub'),
    done: !!(d.ear || d.spoke),
    ok: true,
    run: () => navigate(d.ear ? '/room/session' : '/ear')
  };

  const steps = [step1, step2, step3];
  const nextStep = steps.find((st) => !st.done && st.ok);
  const doneSteps = steps.filter((st) => st.done).length;

  const routine = el(`<div class="card" style="border:2px solid var(--c-primary)"></div>`);
  routine.appendChild(el(`
    <div class="row" style="justify-content:space-between;margin-bottom:4px">
      <strong>🎯 ${t('focus.routineTitle')}</strong>
      <span class="badge pill">${doneSteps}/${steps.length}</span>
    </div>
    <p class="muted" style="margin:0 0 8px;font-size:.86rem">${t('focus.routineDesc')}</p>`));

  steps.forEach((st) => {
    const mark = st.done ? '✅' : (st === nextStep ? '▶️' : '⬜');
    const row = el(`
      <div class="focus-step ${st === nextStep ? 'is-next' : ''} ${st.done ? 'is-done' : ''}">
        <span class="focus-step__mark">${mark}</span>
        <div class="focus-step__body">
          <div class="row" style="justify-content:space-between;gap:6px">
            <strong>${st.icon} ${escapeHtml(st.label)}</strong>
            <small class="muted">${st.time}</small>
          </div>
          <small class="muted">${escapeHtml(st.sub)}</small>
        </div>
      </div>`);
    row.onclick = st.run;
    routine.appendChild(row);
  });

  const cta = el(`<button class="btn btn--block" style="margin-top:12px">${nextStep ? '▶ ' + t('plan.start') : '🎉 ' + t('plan.done')}</button>`);
  if (nextStep) cta.onclick = nextStep.run;
  else cta.disabled = true;
  routine.appendChild(cta);
  view.appendChild(routine);

  /* ---- Compact 2-column Quick Access Grids ---- */
  const row1 = el(`<div class="grid grid--2" style="margin-bottom:var(--sp-3)"></div>`);
  const nbTotal = mistakes.length + phrasesCount;
  const nbCard = el(`
    <div class="card card--tap" style="margin-bottom:0">
      <div class="row" style="justify-content:space-between">
        <strong>📓 ${t('notebook.title')}</strong>
        <span class="badge ${nbTotal ? 'pill' : ''}">${nbTotal}</span>
      </div>
      <small class="muted">${t('focus.notebookHint')}</small>
    </div>`);
  nbCard.onclick = () => navigate('/notebook');

  const roomCard = el(`
    <div class="card card--tap" style="margin-bottom:0;border:1px solid var(--c-accent)">
      <div class="row" style="justify-content:space-between">
        <strong>🎙️ ${t('room.title')}</strong>
        <span class="badge pill">🎤</span>
      </div>
      <small class="muted">${t('focus.roomHint')}</small>
    </div>`);
  roomCard.onclick = () => navigate('/room/session');
  row1.appendChild(nbCard);
  row1.appendChild(roomCard);
  view.appendChild(row1);

  const row2 = el(`<div class="grid grid--2" style="margin-bottom:var(--sp-4)"></div>`);
  const earCard = el(`
    <div class="card card--tap" style="margin-bottom:0">
      <div class="row" style="justify-content:space-between">
        <strong>🎧 ${t('ear.title')}</strong>
        <span>→</span>
      </div>
      <small class="muted">${t('focus.earHint')}</small>
    </div>`);
  earCard.onclick = () => navigate('/ear');

  const expCard = el(`
    <div class="card card--tap" style="margin-bottom:0">
      <div class="row" style="justify-content:space-between">
        <strong>🧭 ${t('explore.title')}</strong>
        <span>→</span>
      </div>
      <small class="muted">${t('focus.exploreHint')}</small>
    </div>`);
  expCard.onclick = () => navigate('/explore');
  row2.appendChild(earCard);
  row2.appendChild(expCard);
  view.appendChild(row2);

  /* ---- End of level exam banner ---- */
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

  /* ---- Collapsible CEFR Unit Journey Map ---- */
  const mapWrap = el(`<details class="card"></details>`);
  mapWrap.appendChild(el(`
    <summary style="cursor:pointer;font-weight:700;list-style:none;display:flex;justify-content:space-between;align-items:center">
      <span>🗺️ ${t('focus.mapTitle')} (${doneCount}/${units.length})</span>
      <span class="muted" style="font-size:.85rem">▾</span>
    </summary>`));
  const mapBody = el(`<div style="margin-top:12px"></div>`);
  mapBody.appendChild(el(`<p class="muted" style="font-size:.85rem;margin-top:0">${t('path.mapHint')}</p>`));

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
          <div class="lesson-node__title">${isCurrent ? '▶️ ' : ''}${escapeHtml(title)}</div>
          <div class="lesson-node__sub">${isCurrent ? t('path.todayHere') + ' · ' : ''}${escapeHtml(sub)}</div>
        </div>
        ${isCurrent ? `<span class="lesson-node__cta">${t('common.start')} →</span>` : ''}
      </div>`);
    if (locked) node.onclick = () => toast('🔒 ' + t('path.lockedMsg'));
    else node.onclick = () => isReading ? navigate(`/lesson/${st.id}`) : navigate(`/unit/${s.level}/${st.id}`);
    mapBody.appendChild(node);
  });

  mapWrap.appendChild(mapBody);
  view.appendChild(mapWrap);
}
