/* Screen renderers for Home, Learn, Unit, Games, Progress, Settings. */
import { el, clear, toast } from './ui.js';
import { t, setLang, applyTranslations } from './i18n.js';
import { getState, setState, resetState } from './store.js';
import { loadLevel, levels } from './data.js';
import { navigate } from './router.js';
import { speak } from './speech.js';
import {
  levelProgress, recentBadges, BADGES, badgeName, markUnitStudied,
  getDaily, DAILY, unitCompleted, unitPassedCount, levelReadyToAdvance,
  nextLevel, advanceLevel, gamePassed
} from './gamification.js';
import { cloudEnabled, getUser, onUser, signIn, signOutCloud } from './cloud.js';
import { GAMES, gamesForLevel } from '../games/index.js';
import { dueCount } from '../games/review.js';
import { newWordsToday } from './dailyLesson.js';
import { isOnline } from './net.js';

const LEVEL_INDEX = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4 };

/* ---------------- Reusable cards ---------------- */
function taskRow(label, current, target) {
  const done = current >= target;
  const pct = Math.min(100, Math.round((current / target) * 100));
  return `
    <div style="margin-top:10px">
      <div class="row" style="justify-content:space-between">
        <span>${done ? '✅' : '⬜'} ${label}</span>
        <small class="muted">${Math.min(current, target)}/${target}</small>
      </div>
      <div class="progress" style="margin-top:6px;height:8px"><div class="progress__fill" style="width:${pct}%"></div></div>
    </div>`;
}

function dailyCard() {
  const d = getDaily();
  const card = el(`
    <div class="card" style="margin-top:16px">
      <div class="row" style="justify-content:space-between">
        <strong>🎯 ${t('daily.title')}</strong>
        ${d.done ? `<span class="badge pill">${t('daily.allDone')}</span>` : ''}
      </div>
      <small class="muted">${t('daily.subtitle')}</small>
      ${taskRow(t('daily.games'), d.games, DAILY.games)}
      ${taskRow(t('daily.stories'), d.stories, DAILY.stories)}
      ${taskRow(t('daily.xp'), d.xp, DAILY.xp)}
    </div>`);
  return card;
}

function advanceCard(level) {
  const next = nextLevel(level);
  const card = el(`
    <div class="card center" style="border:2px solid var(--c-success)">
      <div style="font-size:2rem">🎓</div>
      <strong>${t('advance.ready')}</strong>
      <p class="muted">${t('advance.button')} ${next}</p>
      <button class="btn btn--success btn--block" id="adv">${t('advance.button')} ${next} →</button>
    </div>`);
  card.querySelector('#adv').onclick = () => {
    const to = advanceLevel();
    if (to) { toast(`${t('advance.done')} ${to}! 🎉`); navigate('/home'); }
  };
  return card;
}

/* ---------------- HOME ---------------- */
export async function home(_p, view) {
  const s = getState();
  clear(view);
  const data = await loadLevel(s.level);
  const prog = levelProgress(data);

  view.appendChild(el(`
    <div class="hero">
      <h1 class="h1">${t('home.greeting')}</h1>
      <p style="opacity:.9">${t('home.subtitle')}</p>
    </div>`));

  view.appendChild(el(`
    <div class="stats">
      <div class="stat"><div class="stat__num">${s.level}</div><div class="stat__label">${t('home.level')}</div></div>
      <div class="stat"><div class="stat__num">${s.xp}</div><div class="stat__label">${t('home.xp')}</div></div>
      <div class="stat"><div class="stat__num">🔥 ${s.streak}</div><div class="stat__label">${t('home.streak')}</div></div>
    </div>`));

  // Daily lesson (the main "do this today" action)
  const lessonDone = getDaily().lessonDone;
  const newCount = (await newWordsToday(s.level)).length;
  const lessonCard = el(`
    <div class="card card--tap" style="margin-top:16px;border:2px solid var(--c-primary)">
      <div class="row" style="justify-content:space-between">
        <strong>📅 ${t('daily.lesson')}</strong>
        <span class="badge ${lessonDone ? '' : 'pill'}">${lessonDone ? '✅' : '▶'}</span>
      </div>
      <small class="muted">${lessonDone ? t('daily.lessonDone') : (newCount ? `${newCount} ${t('daily.newWords')} + ${t('daily.review')}` : t('daily.reviewOnly'))}</small>
    </div>`);
  lessonCard.onclick = () => navigate('/daily');
  view.appendChild(lessonCard);

  // Daily mission
  view.appendChild(dailyCard());

  const cont = el(`
    <div class="card card--tap" style="margin-top:16px">
      <div class="row" style="justify-content:space-between">
        <strong>${t('home.continue')}</strong><span>→</span>
      </div>
      <div class="progress" style="margin-top:10px"><div class="progress__fill" style="width:${prog}%"></div></div>
      <small class="muted">${prog}% · ${t('advance.unitsDone')}: ${data.units.filter((u) => unitCompleted(s.level, u)).length}/${data.units.length}</small>
    </div>`);
  cont.onclick = () => navigate('/learn');
  view.appendChild(cont);

  // Ready to advance?
  if (levelReadyToAdvance(data) && nextLevel(s.level)) {
    view.appendChild(advanceCard(s.level));
  }

  const storiesCard = el(`
    <div class="card card--tap">
      <div class="row" style="justify-content:space-between">
        <strong>📖 ${t('stories.title')}</strong><span>→</span>
      </div>
      <small class="muted">${t('stories.subtitle')}</small>
    </div>`);
  storiesCard.onclick = () => navigate('/stories');
  view.appendChild(storiesCard);

  // Smart review (spaced repetition)
  const due = await dueCount(s.level);
  const reviewCard = el(`
    <div class="card card--tap">
      <div class="row" style="justify-content:space-between">
        <strong>🔁 ${t('review.title')}</strong>
        <span class="badge ${due ? 'pill' : ''}">${due}</span>
      </div>
      <small class="muted">${t('review.subtitle')}</small>
    </div>`);
  reviewCard.onclick = () => navigate('/review');
  view.appendChild(reviewCard);

  const dictCard = el(`
    <div class="card card--tap">
      <div class="row" style="justify-content:space-between">
        <strong>🔤 ${t('dict.title')}</strong><span>→</span>
      </div>
      <small class="muted">${t('dict.search')}</small>
    </div>`);
  dictCard.onclick = () => navigate('/dictionary');
  view.appendChild(dictCard);

  // Quick games
  view.appendChild(el(`<h2 class="h2">${t('home.quickGames')}</h2>`));
  const grid = el(`<div class="grid grid--2"></div>`);
  const firstUnit = data.units[0];
  gamesForLevel(LEVEL_INDEX[s.level]).slice(0, 4).forEach((type) => {
    const c = el(`<div class="card card--tap center"><div style="font-size:1.8rem">${GAMES[type].icon}</div><div>${t('game.' + type)}</div></div>`);
    c.onclick = () => navigate(`/game/${type}/${s.level}/${firstUnit.id}`);
    grid.appendChild(c);
  });
  view.appendChild(grid);

  // Recent badges
  const badges = recentBadges(4);
  if (badges.length) {
    view.appendChild(el(`<h2 class="h2">${t('home.recentBadges')}</h2>`));
    const bg = el(`<div class="grid grid--auto"></div>`);
    badges.forEach((b) => bg.appendChild(el(`<div class="badge-tile"><div class="badge-tile__icon">${b.icon}</div><div class="badge-tile__name">${badgeName(b)}</div></div>`)));
    view.appendChild(bg);
  }
}

/* ---------------- LEARN (unit list) ---------------- */
export async function learn(_p, view) {
  const s = getState();
  clear(view);
  const data = await loadLevel(s.level);
  view.appendChild(el(`<h1 class="h1">${t('learn.title')} · ${s.level}</h1>`));
  const quickRow = el(`<div class="grid grid--2" style="margin-bottom:14px"></div>`);
  const storiesBtn = el(`<button class="btn btn--ghost">📖 ${t('stories.title')}</button>`);
  storiesBtn.onclick = () => navigate('/stories');
  const dictBtn = el(`<button class="btn btn--ghost">🔤 ${t('dict.title')}</button>`);
  dictBtn.onclick = () => navigate('/dictionary');
  quickRow.appendChild(storiesBtn);
  quickRow.appendChild(dictBtn);
  view.appendChild(quickRow);
  data.units.forEach((u) => {
    const done = unitCompleted(s.level, u);
    const passed = unitPassedCount(s.level, u);
    const totalGames = (u.games || []).length;
    const needsNet = u.requiresConnection;
    const c = el(`
      <div class="card card--tap">
        <div class="row" style="justify-content:space-between">
          <strong>${done ? '✅ ' : ''}${u.title}</strong>
          <span class="badge">${passed}/${totalGames} ${t('learn.passed')}</span>
        </div>
        <small class="muted">${u.grammar ? u.grammar.rule : ''}</small>
        ${needsNet ? `<div class="needs-net" style="margin-top:6px">${t('net.needsConnection')}</div>` : ''}
      </div>`);
    if (needsNet && !isOnline()) c.classList.add('is-offline-locked');
    c.onclick = () => navigate(`/unit/${s.level}/${u.id}`);
    view.appendChild(c);
  });
}

/* ---------------- UNIT detail ---------------- */
export async function unit({ level, id }, view) {
  const data = await loadLevel(level);
  const u = data.units.find((x) => x.id === id);
  if (!u) { navigate('/learn'); return; }
  clear(view);

  view.appendChild(el(`<button class="btn btn--ghost btn--small" id="back">← ${t('path.title')}</button>`));
  view.querySelector('#back').onclick = () => navigate('/home');

  // Gate content that requires a connection.
  if (u.requiresConnection && !isOnline()) {
    view.appendChild(el(`<h1 class="h1">${u.title}</h1>`));
    view.appendChild(el(`<div class="card center"><div style="font-size:2.4rem">🌐</div><p>${t('net.lockedMsg')}</p></div>`));
    return;
  }
  markUnitStudied(level, u.id);
  const idx = data.units.findIndex((x) => x.id === id);
  view.appendChild(el(`<p class="muted" style="margin-bottom:0">${t('path.lesson')} ${idx + 1} / ${data.units.length}</p>`));
  view.appendChild(el(`<h1 class="h1" style="margin-top:4px">${u.title}</h1>`));
  // 3-step guide so the user always knows what to do.
  view.appendChild(el(`
    <div class="steps">
      <span class="steps__item is-on">1 · ${t('learn.vocab')}</span>
      <span class="steps__item is-on">2 · ${t('learn.grammar')}</span>
      <span class="steps__item ${unitCompleted(level, u) ? 'is-on' : ''}">3 · ${t('learn.practice')}</span>
    </div>`));

  // Vocabulary
  view.appendChild(el(`<h2 class="h2">${t('learn.vocab')}</h2>`));
  const vlist = el(`<div class="card"></div>`);
  u.vocabulary.forEach((v) => {
    const row = el(`
      <div class="setting-row">
        <span><strong>${v.en}</strong> — <span class="muted">${v.es}</span></span>
        <button class="btn btn--ghost btn--small" aria-label="Listen ${v.en}">🔊</button>
      </div>`);
    row.querySelector('button').onclick = () => speak(v.en);
    vlist.appendChild(row);
  });
  view.appendChild(vlist);

  // Grammar
  if (u.grammar) {
    view.appendChild(el(`<h2 class="h2">${t('learn.grammar')}: ${u.grammar.rule}</h2>`));
    const g = el(`<div class="card"><p>${u.grammar.explanation_es}</p><strong>${t('learn.examples')}:</strong></div>`);
    (u.grammar.examples || []).forEach((ex) => {
      const r = el(`<div class="setting-row"><span>${ex}</span><button class="btn btn--ghost btn--small">🔊</button></div>`);
      r.querySelector('button').onclick = () => speak(ex);
      g.appendChild(r);
    });
    view.appendChild(g);
  }

  // Practice games for this unit (passing 2 completes the lesson)
  view.appendChild(el(`<h2 class="h2">${t('learn.practice')}</h2>`));
  view.appendChild(el(`<p class="muted" style="margin-top:-8px">${t('path.passToComplete')}</p>`));
  const grid = el(`<div class="grid grid--2"></div>`);
  (u.games || []).filter((type) => GAMES[type]).forEach((type) => {
    const passed = gamePassed(level, u.id, type);
    const c = el(`<div class="card card--tap center"><div style="font-size:1.6rem">${GAMES[type].icon}</div><div>${passed ? '✅ ' : ''}${t('game.' + type)}</div></div>`);
    c.onclick = () => navigate(`/game/${type}/${level}/${u.id}`);
    grid.appendChild(c);
  });
  view.appendChild(grid);

  // Completion footer with a clear "next lesson" action.
  const done = unitCompleted(level, u);
  const next = data.units[idx + 1];
  if (done) {
    const card = el(`
      <div class="card center" style="border:2px solid var(--c-success)">
        <div style="font-size:2rem">✅</div>
        <strong>${t('path.lessonDone')}</strong>
        ${next ? `<button class="btn btn--success btn--block" id="next" style="margin-top:10px">${t('path.nextLesson')} →</button>`
               : `<button class="btn btn--success btn--block" id="next" style="margin-top:10px">${t('path.backToPath')}</button>`}
      </div>`);
    view.appendChild(card);
    card.querySelector('#next').onclick = () => next ? navigate(`/unit/${level}/${next.id}`) : navigate('/home');
  } else {
    const back = el(`<button class="btn btn--ghost btn--block" style="margin-top:8px">← ${t('path.title')}</button>`);
    back.onclick = () => navigate('/home');
    view.appendChild(back);
  }
}

/* ---------------- GAMES hub ---------------- */
export async function games(_p, view) {
  const s = getState();
  clear(view);
  const data = await loadLevel(s.level);
  view.appendChild(el(`<h1 class="h1">${t('games.title')}</h1><p class="muted">${t('games.choose')} · ${s.level}</p>`));

  // Unit selector
  const sel = el(`<select class="select" id="unit-sel" style="margin:12px 0"></select>`);
  data.units.forEach((u) => sel.appendChild(el(`<option value="${u.id}">${u.title}</option>`)));
  view.appendChild(sel);

  const grid = el(`<div class="grid grid--2"></div>`);
  view.appendChild(grid);

  function renderGames() {
    clear(grid);
    const unitId = sel.value;
    const u = data.units.find((x) => x.id === unitId);
    const available = gamesForLevel(LEVEL_INDEX[s.level]);
    // Prefer this unit's own games, then any other level-appropriate games.
    const list = Array.from(new Set([...(u.games || []), ...available])).filter((type) => available.includes(type) && GAMES[type]);
    list.forEach((type) => {
      const key = `${s.level}:${unitId}:${type}`;
      const done = getState().completedGames[key];
      const c = el(`
        <div class="card card--tap center">
          <div style="font-size:2rem">${GAMES[type].icon}</div>
          <div><strong>${t('game.' + type)}</strong></div>
          ${done ? `<small class="muted">⭐ ${done.correct}/${done.attempts}</small>` : ''}
        </div>`);
      c.onclick = () => navigate(`/game/${type}/${s.level}/${unitId}`);
      grid.appendChild(c);
    });
  }
  sel.onchange = renderGames;
  renderGames();
}

/* ---------------- PROGRESS ---------------- */
export async function progress(_p, view) {
  const s = getState();
  clear(view);
  const data = await loadLevel(s.level);
  const prog = levelProgress(data);

  view.appendChild(el(`<h1 class="h1">${t('progress.title')}</h1>`));
  const unitsDone = data.units.filter((u) => unitCompleted(s.level, u)).length;
  view.appendChild(el(`
    <div class="card">
      <strong>${t('progress.overall')} · ${s.level}</strong>
      <div class="progress" style="margin-top:10px"><div class="progress__fill" style="width:${prog}%"></div></div>
      <small class="muted">${prog}% · ${t('advance.unitsDone')}: ${unitsDone}/${data.units.length}</small>
      <p class="muted" style="margin:12px 0 0;font-size:.85rem">ℹ️ ${t('advance.criteria')}<br>${t('advance.howto')}</p>
    </div>`));

  if (levelReadyToAdvance(data) && nextLevel(s.level)) view.appendChild(advanceCard(s.level));

  view.appendChild(dailyCard());

  view.appendChild(el(`
    <div class="stats">
      <div class="stat"><div class="stat__num">${s.xp}</div><div class="stat__label">${t('home.xp')}</div></div>
      <div class="stat"><div class="stat__num">🔥 ${s.streak}</div><div class="stat__label">${t('home.streak')}</div></div>
      <div class="stat"><div class="stat__num">${s.badges.length}</div><div class="stat__label">${t('progress.badges')}</div></div>
    </div>`));

  view.appendChild(el(`<h2 class="h2">${t('progress.badges')}</h2>`));
  const bg = el(`<div class="grid grid--auto"></div>`);
  BADGES.forEach((b) => {
    const owned = s.badges.includes(b.id);
    bg.appendChild(el(`<div class="badge-tile ${owned ? '' : 'is-locked'}"><div class="badge-tile__icon">${b.icon}</div><div class="badge-tile__name">${badgeName(b)}</div></div>`));
  });
  view.appendChild(bg);
}

/* ---------------- SETTINGS ---------------- */
export function settings(_p, view) {
  const s = getState();
  clear(view);
  view.appendChild(el(`<h1 class="h1">${t('settings.title')}</h1>`));

  const card = el(`<div class="card"></div>`);

  // Dark mode
  const dark = el(`
    <div class="setting-row">
      <span>${t('settings.theme')}</span>
      <label class="switch"><input type="checkbox" id="dark" ${s.theme === 'dark' ? 'checked' : ''}><span class="switch__slider"></span></label>
    </div>`);
  dark.querySelector('#dark').onchange = (e) => {
    setState({ theme: e.target.checked ? 'dark' : 'light' });
    const th = getState().theme;
    document.documentElement.dataset.theme = th;
    document.getElementById('app').dataset.theme = th;
    document.querySelector('meta[name="theme-color"]').setAttribute('content', th === 'dark' ? '#0f172a' : '#2563eb');
  };
  card.appendChild(dark);

  // Language
  const lang = el(`
    <div class="setting-row">
      <span>${t('settings.language')}</span>
      <select class="select" id="lang">
        <option value="es" ${s.lang === 'es' ? 'selected' : ''}>Español</option>
        <option value="en" ${s.lang === 'en' ? 'selected' : ''}>English</option>
      </select>
    </div>`);
  lang.querySelector('#lang').onchange = (e) => { setLang(e.target.value); settings(_p, view); };
  card.appendChild(lang);

  // Level
  const level = el(`<div class="setting-row" style="flex-wrap:wrap"><span>${t('settings.level')}</span><div class="row" id="levels"></div></div>`);
  const lv = level.querySelector('#levels');
  levels().forEach((L) => {
    const chip = el(`<button class="level-chip ${s.level === L ? 'is-active' : ''}">${L}</button>`);
    chip.onclick = () => { setState({ level: L }); toast(`${t('home.level')}: ${L}`); settings(_p, view); };
    lv.appendChild(chip);
  });
  card.appendChild(level);
  view.appendChild(card);

  // Account / cloud sync
  view.appendChild(accountCard(view, _p));

  // Actions
  const actions = el(`<div class="card"></div>`);
  const retake = el(`<button class="btn btn--ghost btn--block" style="margin-bottom:10px">${t('settings.retakeQuiz')}</button>`);
  retake.onclick = () => navigate('/quiz');
  const reset = el(`<button class="btn btn--block" style="background:var(--c-danger)">${t('settings.reset')}</button>`);
  reset.onclick = () => {
    if (confirm(t('settings.reset.confirm'))) {
      resetState();
      document.documentElement.dataset.theme = 'light';
      document.getElementById('app').dataset.theme = 'light';
      applyTranslations();
      navigate('/quiz');
    }
  };
  actions.appendChild(retake);
  actions.appendChild(reset);
  view.appendChild(actions);

  view.appendChild(el(`<p class="muted center" style="margin-top:16px">EngFlow · v1.0 · ${t('settings.about')}: PWA offline para aprender inglés.</p>`));
}

let authSubscribed = false;
function accountCard(view, _p) {
  const card = el(`<div class="card"></div>`);
  card.appendChild(el(`<strong>☁️ ${t('auth.account')}</strong>`));

  if (!cloudEnabled()) {
    card.appendChild(el(`<p class="muted" style="margin:8px 0 0">${t('auth.notConfigured')}</p>`));
    return card;
  }

  const user = getUser();
  if (user) {
    card.appendChild(el(`<p style="margin:8px 0">${t('auth.signedInAs')}<br><strong>${user.email || user.displayName || 'Google'}</strong></p>`));
    card.appendChild(el(`<p class="muted" style="margin:0 0 8px">${t('auth.synced')}</p>`));
    const out = el(`<button class="btn btn--ghost btn--block">${t('auth.signOut')}</button>`);
    out.onclick = async () => { await signOutCloud(); location.reload(); };
    card.appendChild(out);
  } else {
    card.appendChild(el(`<p class="muted" style="margin:8px 0">${t('auth.syncDesc')}</p>`));
    const inBtn = el(`<button class="btn btn--block">${t('auth.signIn')}</button>`);
    inBtn.onclick = async () => {
      inBtn.disabled = true;
      const r = await signIn();
      if (!r.ok && r.reason !== 'unavailable') toast(t('auth.error'));
    };
    card.appendChild(inBtn);
  }

  // Re-render settings when auth state changes (once).
  if (!authSubscribed) {
    authSubscribed = true;
    onUser(() => { if (location.hash.replace(/^#/, '').startsWith('/settings')) settings(_p, view); });
  }
  return card;
}
