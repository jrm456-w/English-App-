/* Speaking Room — VOICE-ONLY conversation to build fluency fast (like real meetings).
   The bot speaks; you answer OUT LOUD (speech recognition); it acknowledges and moves on.
   No reading, no typing. "Voice Mode" chains many questions for non-stop speaking. */
import { el, clear, celebrate, escapeHtml, shuffle } from './ui.js';
import { t } from './i18n.js';
import { getState } from './store.js';
import { speak, speakThen, listenOnce, sttSupported } from './speech.js';
import { addXp, markDailyTask } from './gamification.js';
import { navigate, goBack } from './router.js';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
const ACKS = ['Got it. ', 'Thanks! ', 'I see. ', 'Nice. ', 'Good. ', 'Great. ', 'Okay, and ', 'Right. '];

let cache = null;
async function loadRooms() {
  if (cache) return cache;
  const res = await fetch('./src/data/speakingRooms.json');
  cache = (await res.json()).rooms;
  return cache;
}

export async function roomList(_p, view) {
  clear(view);
  const all = await loadRooms();
  view.appendChild(el(`<h1 class="h1">🎙️ ${t('room.title')}</h1><p class="muted">${t('room.subtitle')}</p>`));
  if (!sttSupported()) view.appendChild(el(`<div class="card"><p class="muted">⚠️ ${t('room.noStt')}</p></div>`));

  // Non-stop voice session (the "just talk" mode).
  const session = el(`<div class="card card--tap" style="border:2px solid var(--c-accent)"><div class="row" style="justify-content:space-between"><strong>♾️ ${t('room.session')}</strong><span>🎤</span></div><small class="muted">${t('room.sessionHint')}</small></div>`);
  session.onclick = () => navigate('/room/session');
  view.appendChild(session);

  view.appendChild(el(`<h2 class="h2">${t('room.scenarios')}</h2>`));
  ['A1', 'A2', 'B1', 'B2', 'C1'].forEach((lvl) => {
    const g = all.filter((x) => x.level === lvl);
    if (!g.length) return;
    view.appendChild(el(`<h3 style="margin:8px 0">${lvl}</h3>`));
    g.forEach((r) => {
      const c = el(`<div class="card card--tap"><div class="row" style="justify-content:space-between"><strong>${r.emoji} ${escapeHtml(r.title)}</strong><span>🎤</span></div><small class="muted">${escapeHtml(r.title_es)}</small></div>`);
      c.onclick = () => navigate(`/room/${r.id}`);
      view.appendChild(c);
    });
  });
}

/* Play a single scenario. */
export async function roomPlay({ id }, view) {
  const all = await loadRooms();
  const r = all.find((x) => x.id === id);
  if (!r) { navigate('/room'); return; }
  playTurns(view, { title: r.title, level: r.level, emoji: r.emoji, turns: r.turns, intro: r.intro_en });
}

/* Voice Mode: chain questions from several scenarios for non-stop speaking. */
export async function roomSession(_p, view) {
  const all = await loadRooms();
  const lvl = getState().level;
  const maxIdx = LEVELS.indexOf(lvl);
  const pool = all.filter((r) => LEVELS.indexOf(r.level) <= Math.max(1, maxIdx));
  const turns = shuffle(pool.flatMap((r) => r.turns)).slice(0, 12);
  playTurns(view, { title: t('room.session'), level: lvl, emoji: '♾️', turns, intro: "Let's just talk. I'll keep asking — you keep speaking. Ready?" });
}

/* Shared voice engine: speak a question -> auto-listen -> acknowledge -> next. */
function playTurns(view, { title, level, emoji, turns, intro }) {
  clear(view);
  view.appendChild(el(`
    <div class="row" style="justify-content:space-between">
      <button class="btn btn--ghost btn--small" id="back">← ${t('common.back')}</button>
      <span class="badge pill">${emoji} ${level}</span>
    </div>`));
  view.querySelector('#back').onclick = () => { window.speechSynthesis && window.speechSynthesis.cancel(); goBack('/room'); };
  view.appendChild(el(`<h1 class="h1">${escapeHtml(title)}</h1>`));
  const stage = el(`<div></div>`);
  view.appendChild(stage);

  // Beginners understand reading before listening — show the text and offer slow audio.
  const lowLevel = ['A1', 'A2'].includes(getState().level);
  let i = 0, spoken = 0;
  const started = Date.now();
  let introDone = false;

  function render() {
    const turn = turns[i];
    clear(stage);
    const card = el(`
      <div class="card center">
        <p class="muted">${i + 1} / ${turns.length}</p>
        <div class="room-q" id="q">🔊 …</div>
        <button class="btn btn--ghost btn--small" id="reveal" style="margin-top:6px">👁️ ${t('room.show')}</button>
        <div class="mic-orb" id="orb" role="button" tabindex="0" aria-label="speak">🎤</div>
        <div class="room-state" id="state">${t('room.tapToSpeak')}</div>
        <div id="heard" class="muted" style="font-style:italic;min-height:20px"></div>
        <div id="help-box"></div>
        <button class="btn btn--ghost btn--block" id="help" style="margin-top:8px">🤔 ${t('room.help')}</button>
        <div class="row" style="justify-content:center;margin-top:6px">
          <button class="btn btn--ghost btn--small" id="repeat">🔁 ${t('room.again')}</button>
          <button class="btn btn--ghost btn--small" id="slow">🐢 ${t('room.slow')}</button>
          <button class="btn btn--ghost btn--small" id="skip">${t('common.next')} →</button>
        </div>
      </div>`);
    stage.appendChild(card);
    const qEl = card.querySelector('#q');
    const orb = card.querySelector('#orb');
    const state = card.querySelector('#state');
    const heard = card.querySelector('#heard');
    const helpBox = card.querySelector('#help-box');

    let revealed = lowLevel; // beginners see the text while they listen
    const revealBtn = card.querySelector('#reveal');
    const paintReveal = () => {
      qEl.textContent = revealed ? turn.ask_en : '🔊 …';
      revealBtn.textContent = revealed ? '🙈 ' + t('room.hide') : '👁️ ' + t('room.show');
    };
    paintReveal();
    revealBtn.onclick = () => { revealed = !revealed; paintReveal(); };
    card.querySelector('#repeat').onclick = () => speak(turn.ask_en);
    card.querySelector('#slow').onclick = () => speak(turn.ask_en, { rate: 0.55 });
    card.querySelector('#skip').onclick = () => next();

    // "I don't know how to answer" -> teach it: show the phrase + translation, say it,
    // then let the learner repeat it out loud (learning by producing).
    card.querySelector('#help').onclick = () => {
      speak(turn.model_en);
      helpBox.innerHTML = `
        <div class="feedback feedback--ok" style="text-align:left;margin-top:8px">
          👉 ${t('room.youCanSay')}:<br>
          <strong style="font-size:1.05rem">${escapeHtml(turn.model_en)}</strong>
          ${turn.model_es ? `<div class="muted" style="font-size:.85rem;margin-top:2px">${escapeHtml(turn.model_es)}</div>` : ''}
          <div class="row" style="margin-top:8px">
            <button class="btn btn--ghost btn--small" id="say-model">🔊 ${t('room.model')}</button>
            <button class="btn btn--accent btn--small" id="rep-model" style="flex:1">🎤 ${t('room.repeatIt')}</button>
          </div>
        </div>`;
      helpBox.querySelector('#say-model').onclick = () => speak(turn.model_en);
      helpBox.querySelector('#rep-model').onclick = () => listen();
    };

    const say = (introDone || !intro) ? turn.ask_en : (intro + ' ' + turn.ask_en);
    introDone = true;
    speakThen(say, () => { state.textContent = t('room.tapToSpeak'); listen(); });

    async function listen() {
      orb.classList.add('is-listening');
      state.textContent = '🎤 ' + t('speak.listening');
      heard.textContent = '';
      try {
        const res = await listenOnce({ timeoutMs: 9000 });
        orb.classList.remove('is-listening');
        const said = (res && res[0]) || '';
        if (said) {
          spoken++;
          heard.textContent = '“' + said + '”';
          state.textContent = '✅';
          const ack = ACKS[(i + said.length) % ACKS.length];
          setTimeout(() => { speak(ack); setTimeout(next, 850); }, 250);
        } else { state.textContent = t('room.retry'); card.querySelector('#help').classList.add('pulse-help'); }
      } catch {
        orb.classList.remove('is-listening');
        state.textContent = t('room.retry');
        card.querySelector('#help').classList.add('pulse-help'); // nudge: "don't know? tap here"
      }
    }
    orb.onclick = () => listen();
    orb.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); listen(); } };
  }

  function next() { i++; i < turns.length ? render() : finish(); }

  function finish() {
    markDailyTask('spoke'); markDailyTask('challenge');
    const xp = 20;
    addXp(xp);
    celebrate();
    window.speechSynthesis && window.speechSynthesis.cancel();
    const mins = Math.max(1, Math.round((Date.now() - started) / 60000));
    clear(stage);
    const card = el(`
      <div class="card center pop-in">
        <div style="font-size:3rem">🎙️</div>
        <h2 class="h2">${t('room.done')}</h2>
        <p>${spoken} ${t('room.replies')} · ~${mins} ${t('room.min')}</p>
        <div class="badge pill" style="margin:8px 0">+${xp} XP</div>
        <p class="muted">${t('room.keep')}</p>
        <button class="btn btn--block" id="more">🎙️ ${t('room.title')}</button>
        <button class="btn btn--ghost btn--block" id="home" style="margin-top:8px">${t('nav.home')}</button>
      </div>`);
    stage.appendChild(card);
    card.querySelector('#more').onclick = () => navigate('/room');
    card.querySelector('#home').onclick = () => navigate('/home');
  }

  render();
}
