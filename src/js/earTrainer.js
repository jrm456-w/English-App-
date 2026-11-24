/* Entrenador de Oído Real — Dictation + Connected Speech trainer.
   Plays natural-speed English sentences without showing text, asks the learner
   to type what they heard, highlights missed/confused words, and explains connected speech. */
import { el, clear, shuffle, celebrate, escapeHtml } from './ui.js';
import { t } from './i18n.js';
import { getState } from './store.js';
import { speak, normalize, ttsSupported } from './speech.js';
import { LEVELS, addXp, markDailyTask, recordMistake } from './gamification.js';
import { navigate, goBack } from './router.js';
import { renderWordDiff } from './reflexGym.js';

let earCache = null;
async function loadEarDrills() {
  if (earCache) return earCache;
  const res = await fetch('./src/data/reflexes.json');
  earCache = (await res.json()).drills || [];
  return earCache;
}

function overlapScore(said, target) {
  const a = normalize(said).split(' ').filter(Boolean);
  const b = normalize(target).split(' ').filter(Boolean);
  if (!b.length) return 0;
  const setA = new Set(a);
  let hits = 0;
  b.forEach((w) => { if (setA.has(w)) hits++; });
  return hits / Math.max(a.length, b.length, 1);
}

export async function earTrainer(_p, view) {
  clear(view);
  const s = getState();
  const all = await loadEarDrills();
  const levelItems = shuffle(all.filter((d) => d.level === s.level));
  const curIdx = Math.max(0, LEVELS.indexOf(s.level));
  const fallback = shuffle(all.filter((d) => d.level !== s.level && LEVELS.indexOf(d.level) <= curIdx + 1));
  const items = [...levelItems, ...fallback].slice(0, 5);

  view.appendChild(el(`
    <div class="row" style="justify-content:space-between">
      <button class="btn btn--ghost btn--small" id="back">← ${t('common.back')}</button>
      <span class="badge pill">🎧 ${s.level}</span>
    </div>`));
  view.querySelector('#back').onclick = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    goBack('/home');
  };
  view.appendChild(el(`<h1 class="h1">🎧 ${t('ear.title')}</h1><p class="muted">${t('ear.subtitle')}</p>`));

  if (!items.length) {
    view.appendChild(el(`<div class="card center"><p class="muted">${t('common.error')}</p></div>`));
    return;
  }

  const stage = el(`<div></div>`);
  view.appendChild(stage);

  let idx = 0;
  let scoreCount = 0;

  function render() {
    const item = items[idx];
    clear(stage);
    const card = el(`
      <div class="card pop-in">
        <div class="row" style="justify-content:space-between;margin-bottom:10px">
          <span class="muted">${idx + 1} / ${items.length}</span>
          <span class="badge">${escapeHtml(item.chunk)}</span>
        </div>
        ${!ttsSupported() ? `<p class="feedback feedback--no">${t('pron.noTts')}</p>` : ''}
        <div class="row" style="justify-content:center;gap:10px;margin:12px 0">
          <button class="btn btn--accent" id="play-norm" style="flex:1">🔊 ${t('ear.normalSpeed')}</button>
          <button class="btn btn--ghost" id="play-slow" style="flex:1">🐢 ${t('ear.slowSpeed')}</button>
        </div>
        <p class="muted center" style="font-size:.88rem;margin:6px 0 12px">${t('ear.instruction')}</p>
        <div id="form-area">
          <input class="input" id="ear-in" placeholder="${escapeHtml(t('ear.placeholder'))}" autocomplete="off" />
          <button class="btn btn--block" id="check-btn" style="margin-top:10px">${t('common.check')}</button>
        </div>
        <div id="fb"></div>
      </div>`);
    stage.appendChild(card);

    const input = card.querySelector('#ear-in');
    const checkBtn = card.querySelector('#check-btn');
    const formArea = card.querySelector('#form-area');
    const fb = card.querySelector('#fb');

    card.querySelector('#play-norm').onclick = () => speak(item.en, { rate: 1.0 });
    card.querySelector('#play-slow').onclick = () => speak(item.en, { rate: 0.7 });

    setTimeout(() => speak(item.en, { rate: 1.0 }), 250);

    function submit() {
      const typed = input.value.trim();
      if (!typed) { input.focus(); return; }
      formArea.hidden = true;

      const score = normalize(typed) === normalize(item.en) ? 1 : overlapScore(typed, item.en);
      const ok = score >= 0.8;
      if (ok) scoreCount++;
      else recordMistake(item.en, item.situation_es, item.connected || item.trap_es || '');

      fb.innerHTML = `
        <div class="feedback ${ok ? 'feedback--ok' : 'feedback--no'}">
          <strong>${ok ? '✅ ' + t('ear.sharpEar') : '👂 ' + t('ear.missedDetail')}</strong>
          <div class="muted" style="font-size:.85rem;margin-top:4px">${t('ear.youWrote')}: “${escapeHtml(typed)}”</div>
          ${renderWordDiff(typed, item.en)}
        </div>
        <div class="card" style="background:var(--c-surface-2);padding:12px;margin-bottom:10px">
          <div><strong>💬 ${escapeHtml(item.en)}</strong></div>
          <div class="muted" style="font-size:.9rem;margin-top:4px">${escapeHtml(item.situation_es)}</div>
          ${item.connected ? `<div style="font-size:.88rem;margin-top:8px">🔗 <strong>Connected speech:</strong> ${escapeHtml(item.connected)}</div>` : ''}
        </div>
        <button class="btn btn--block" id="next-btn">${idx + 1 < items.length ? t('common.next') + ' →' : t('common.complete')}</button>`;

      fb.querySelector('#next-btn').onclick = () => {
        idx++;
        idx < items.length ? render() : finish();
      };
    }

    checkBtn.onclick = submit;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    });
    input.focus();
  }

  function finish() {
    const xp = 20;
    addXp(xp);
    markDailyTask('ear');
    celebrate();
    clear(stage);
    const pct = Math.round((scoreCount / items.length) * 100);
    const card = el(`
      <div class="card center pop-in">
        <div style="font-size:3rem">🎧</div>
        <h2 class="h2">${t('ear.done')}</h2>
        <p>${t('common.score')}: <strong>${scoreCount}/${items.length}</strong> (${pct}%)</p>
        <div class="badge pill" style="margin:8px 0">+${xp} XP</div>
        <button class="btn btn--block" id="to-room" style="margin-top:8px">🎙️ ${t('room.cta')} →</button>
        <button class="btn btn--ghost btn--block" id="to-home" style="margin-top:8px">${t('nav.home')}</button>
      </div>`);
    stage.appendChild(card);
    card.querySelector('#to-room').onclick = () => navigate('/room/session');
    card.querySelector('#to-home').onclick = () => navigate('/home');
  }

  render();
}
