/* Practice Partner — an offline conversation chat. It asks open questions on a topic;
   you reply by typing OR speaking freely. It can't "understand" like an AI, but it keeps
   a natural back-and-forth going, nudges you to use full sentences and English, and shows
   a model answer to compare. Real free-production practice, no connection or API needed. */
import { el, clear, celebrate, escapeHtml, shuffle } from './ui.js';
import { t } from './i18n.js';
import { getState } from './store.js';
import { speak, listenOnce, sttSupported } from './speech.js';
import { addXp, markDailyTask } from './gamification.js';
import { navigate, goBack } from './router.js';

let cache = null;
async function loadTopics() {
  if (cache) return cache;
  const res = await fetch('./src/data/chatTopics.json');
  cache = (await res.json()).topics;
  return cache;
}

const PRAISE = ['Nice! 👍', 'Good job! 💪', "That's interesting! 🙂", 'Great, keep going! 🌟', 'Well said! 👏', 'Cool! 😎'];

/* Simple offline heuristics — not AI, just gentle nudges. */
function looksSpanish(s) { return /[ñáéíóú¿¡]/i.test(s) || /\b(que|pero|porque|hola|gracias|muy|tambien)\b/i.test(s); }
function tooShort(s) { return s.trim().split(/\s+/).filter(Boolean).length < 3; }

export async function chatList(_p, view) {
  clear(view);
  const all = await loadTopics();
  view.appendChild(el(`<h1 class="h1">🤖 ${t('chat.title')}</h1><p class="muted">${t('chat.subtitle')}</p>`));
  ['A1', 'A2', 'B1', 'B2', 'C1'].forEach((lvl) => {
    const g = all.filter((x) => x.level === lvl);
    if (!g.length) return;
    view.appendChild(el(`<h2 class="h2">${lvl}</h2>`));
    g.forEach((tp) => {
      const c = el(`<div class="card card--tap"><div class="row" style="justify-content:space-between"><strong>${tp.emoji} ${escapeHtml(tp.title)}</strong><span>→</span></div><small class="muted">${escapeHtml(tp.title_es)}</small></div>`);
      c.onclick = () => navigate(`/chat/${tp.id}`);
      view.appendChild(c);
    });
  });
}

export async function chatPlay({ id }, view) {
  const all = await loadTopics();
  const tp = all.find((x) => x.id === id);
  if (!tp) { navigate('/chat'); return; }
  clear(view);

  view.appendChild(el(`
    <div class="row" style="justify-content:space-between">
      <button class="btn btn--ghost btn--small" id="back">← ${t('common.back')}</button>
      <span class="badge pill">${tp.emoji} ${tp.level}</span>
    </div>`));
  view.querySelector('#back').onclick = () => goBack('/chat');
  view.appendChild(el(`<h1 class="h1">${escapeHtml(tp.title)}</h1>`));
  const chat = el(`<div class="chat" id="chat"></div>`);
  view.appendChild(chat);
  const ctrl = el(`<div id="ctrl"></div>`);
  view.appendChild(ctrl);

  let i = 0, answered = 0;

  function bot(text, es) {
    const b = el(`<div class="bubble bubble--them">${escapeHtml(text)} <span class="bubble__say" role="button">🔊</span>${es ? `<div class="muted" style="font-size:.8rem;margin-top:2px">${escapeHtml(es)}</div>` : ''}</div>`);
    b.querySelector('.bubble__say').onclick = () => speak(text);
    chat.appendChild(b); b.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }
  function me(text) {
    const b = el(`<div class="bubble bubble--you">${escapeHtml(text)}</div>`);
    chat.appendChild(b); b.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }

  bot(tp.opener_en);
  setTimeout(() => speak(tp.opener_en), 300);
  ask();

  function ask() {
    clear(ctrl);
    if (i >= tp.prompts.length) return finish();
    const p = tp.prompts[i];
    bot(p.ask_en, p.ask_es);
    setTimeout(() => speak(p.ask_en), 400);

    const box = el(`
      <div class="card">
        <textarea class="input" id="ans" rows="2" placeholder="${t('chat.type')}"></textarea>
        <div class="row" style="margin-top:8px">
          ${sttSupported() ? `<button class="btn btn--accent btn--small" id="mic">🎤 ${t('common.speak')}</button>` : ''}
          <button class="btn btn--small" id="send" style="flex:1">${t('chat.send')}</button>
        </div>
        <button class="btn btn--ghost btn--small btn--block" id="model" style="margin-top:8px">💡 ${t('chat.model')}</button>
        <div id="fb"></div>
      </div>`);
    ctrl.appendChild(box);
    const input = box.querySelector('#ans');
    input.focus();

    box.querySelector('#model').onclick = () => {
      box.querySelector('#fb').innerHTML = `<div class="feedback feedback--ok" style="margin-top:8px">💡 <strong>${escapeHtml(p.model_en)}</strong></div>`;
      speak(p.model_en);
    };

    const mic = box.querySelector('#mic');
    if (mic) mic.onclick = async () => {
      mic.disabled = true; mic.textContent = '🎤 …';
      try { const heard = await listenOnce(); input.value = (heard && heard[0]) || input.value; } catch {}
      mic.disabled = false; mic.textContent = `🎤 ${t('common.speak')}`;
    };

    box.querySelector('#send').onclick = () => {
      const val = input.value.trim();
      if (!val) { input.focus(); return; }
      me(val);
      answered++;
      // Gentle, non-blocking coaching.
      if (looksSpanish(val)) bot(t('chat.tryEnglish'));
      else if (tooShort(val)) bot(t('chat.fuller'));
      else bot(shuffle(PRAISE)[0]);
      i++;
      setTimeout(ask, 500);
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) box.querySelector('#send').click(); });
  }

  function finish() {
    const xp = 15;
    addXp(xp);
    markDailyTask('challenge');
    celebrate();
    bot(t('chat.bye'));
    speak('Great conversation! See you next time.');
    const card = el(`
      <div class="card center pop-in">
        <div style="font-size:2.6rem">🤖</div>
        <h3>${t('chat.done')}</h3>
        <p class="muted">${answered} ${t('chat.replies')}</p>
        <div class="badge pill" style="margin:8px 0">+${xp} XP</div>
        <button class="btn btn--block" id="more">${t('chat.title')}</button>
        <button class="btn btn--ghost btn--block" id="home" style="margin-top:8px">${t('nav.home')}</button>
      </div>`);
    ctrl.appendChild(card);
    card.querySelector('#more').onclick = () => navigate('/chat');
    card.querySelector('#home').onclick = () => navigate('/home');
  }
}
