/* Speaking Room — a VOICE-ONLY conversation to build fluency fast (like your real
   meetings). The bot speaks a question; you answer OUT LOUD (speech recognition); it
   acknowledges and moves on. No reading, no typing — just talking under light pressure. */
import { el, clear, celebrate, escapeHtml } from './ui.js';
import { t } from './i18n.js';
import { getState } from './store.js';
import { speak, speakThen, listenOnce, sttSupported } from './speech.js';
import { addXp, markDailyTask } from './gamification.js';
import { navigate, goBack } from './router.js';

let cache = null;
async function loadRooms() {
  if (cache) return cache;
  const res = await fetch('./src/data/speakingRooms.json');
  cache = (await res.json()).rooms;
  return cache;
}

const ACKS = ['Got it. ', 'Thanks! ', 'I see. ', 'Nice. ', 'Good. ', 'Great. ', 'Okay. '];

export async function roomList(_p, view) {
  clear(view);
  const all = await loadRooms();
  view.appendChild(el(`<h1 class="h1">🎙️ ${t('room.title')}</h1><p class="muted">${t('room.subtitle')}</p>`));
  if (!sttSupported()) view.appendChild(el(`<div class="card"><p class="muted">⚠️ ${t('room.noStt')}</p></div>`));
  ['A2', 'B1', 'B2', 'C1'].forEach((lvl) => {
    const g = all.filter((x) => x.level === lvl);
    if (!g.length) return;
    view.appendChild(el(`<h2 class="h2">${lvl}</h2>`));
    g.forEach((r) => {
      const c = el(`<div class="card card--tap"><div class="row" style="justify-content:space-between"><strong>${r.emoji} ${escapeHtml(r.title)}</strong><span>🎤</span></div><small class="muted">${escapeHtml(r.title_es)}</small></div>`);
      c.onclick = () => navigate(`/room/${r.id}`);
      view.appendChild(c);
    });
  });
}

export async function roomPlay({ id }, view) {
  const all = await loadRooms();
  const r = all.find((x) => x.id === id);
  if (!r) { navigate('/room'); return; }
  clear(view);

  view.appendChild(el(`
    <div class="row" style="justify-content:space-between">
      <button class="btn btn--ghost btn--small" id="back">← ${t('common.back')}</button>
      <span class="badge pill">${r.emoji} ${r.level}</span>
    </div>`));
  view.querySelector('#back').onclick = () => { window.speechSynthesis && window.speechSynthesis.cancel(); goBack('/room'); };
  view.appendChild(el(`<h1 class="h1">${escapeHtml(r.title)}</h1>`));

  const stage = el(`<div></div>`);
  view.appendChild(stage);

  let i = 0, spoken = 0;
  const started = Date.now();

  function render() {
    const turn = r.turns[i];
    clear(stage);
    const card = el(`
      <div class="card center">
        <p class="muted">${i + 1} / ${r.turns.length}</p>
        <div class="room-q" id="q">🔊 …</div>
        <button class="btn btn--ghost btn--small" id="reveal" style="margin-top:6px">👁️ ${t('room.show')}</button>
        <div class="mic-orb" id="orb" role="button" tabindex="0" aria-label="speak">🎤</div>
        <div class="room-state" id="state">${t('room.tapToSpeak')}</div>
        <div id="heard" class="muted" style="font-style:italic;min-height:20px"></div>
        <div class="row" style="justify-content:center;margin-top:8px">
          <button class="btn btn--ghost btn--small" id="repeat">🔁 ${t('room.again')}</button>
          <button class="btn btn--ghost btn--small" id="model">💡 ${t('room.model')}</button>
          <button class="btn btn--ghost btn--small" id="skip">${t('common.next')} →</button>
        </div>
      </div>`);
    stage.appendChild(card);
    const qEl = card.querySelector('#q');
    const orb = card.querySelector('#orb');
    const state = card.querySelector('#state');
    const heard = card.querySelector('#heard');

    // The question is spoken; text stays hidden so you LISTEN, not read.
    let revealed = false;
    card.querySelector('#reveal').onclick = () => { revealed = !revealed; qEl.textContent = revealed ? turn.ask_en : '🔊 …'; };
    card.querySelector('#repeat').onclick = () => speak(turn.ask_en);
    card.querySelector('#model').onclick = () => { speak(turn.model_en); heard.textContent = '💡 ' + turn.model_en; };
    card.querySelector('#skip').onclick = () => next();

    // Ask, then (hands-free) start listening automatically.
    speakThen(turn.ask_en, () => { state.textContent = t('room.tapToSpeak'); listen(); });

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
          // The bot acknowledges out loud and moves to the next question.
          const ack = ACKS[Math.floor((i + said.length) % ACKS.length)];
          setTimeout(() => { speak(ack); setTimeout(next, 900); }, 300);
        } else {
          state.textContent = t('room.retry');
        }
      } catch {
        orb.classList.remove('is-listening');
        state.textContent = t('room.retry');
      }
    }
    orb.onclick = listen;
    orb.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); listen(); } };
  }

  function next() { i++; i < r.turns.length ? render() : finish(); }

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
        <button class="btn btn--block" id="more">${t('room.title')}</button>
        <button class="btn btn--ghost btn--block" id="home" style="margin-top:8px">${t('nav.home')}</button>
      </div>`);
    stage.appendChild(card);
    card.querySelector('#more').onclick = () => navigate('/room');
    card.querySelector('#home').onclick = () => navigate('/home');
  }

  render();
}
