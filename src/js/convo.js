/* Conversation Simulator — interactive scripted dialogues (offline). Practices real
   communication: you read/hear the other person, then choose how to respond. This adds
   the interactional output the app was missing. */
import { el, clear, shuffle, celebrate, escapeHtml } from './ui.js';
import { t } from './i18n.js';
import { getState } from './store.js';
import { speak } from './speech.js';
import { addXp, markDailyTask } from './gamification.js';
import { navigate, goBack } from './router.js';

let cache = null;
async function loadDialogues() {
  if (cache) return cache;
  const res = await fetch('./src/data/conversations.json');
  cache = (await res.json()).dialogues;
  return cache;
}

export async function pickConversation(level) {
  const all = await loadDialogues();
  return all.filter((d) => d.level === level)[0] || all.find((d) => d.level === level) || null;
}

/* List of conversations. */
export async function convoList(_p, view) {
  clear(view);
  const all = await loadDialogues();
  view.appendChild(el(`<h1 class="h1">💬 ${t('convo.title')}</h1><p class="muted">${t('convo.subtitle')}</p>`));
  ['A1', 'A2', 'B1', 'B2', 'C1'].forEach((lvl) => {
    const group = all.filter((d) => d.level === lvl);
    if (!group.length) return;
    view.appendChild(el(`<h2 class="h2">${lvl}</h2>`));
    group.forEach((d) => {
      const card = el(`
        <div class="card card--tap">
          <div class="row" style="justify-content:space-between">
            <strong>${d.emoji} ${escapeHtml(d.title)}</strong><span>→</span>
          </div>
          <small class="muted">${escapeHtml(d.title_es)}</small>
        </div>`);
      card.onclick = () => navigate(`/convo/${d.id}`);
      view.appendChild(card);
    });
  });
}

/* Play one conversation. */
export async function convoPlay({ id }, view) {
  const all = await loadDialogues();
  const d = all.find((x) => x.id === id);
  if (!d) { navigate('/convo'); return; }
  clear(view);

  view.appendChild(el(`
    <div class="row" style="justify-content:space-between">
      <button class="btn btn--ghost btn--small" id="back">← ${t('common.back')}</button>
      <span class="badge pill">${d.emoji} ${d.level}</span>
    </div>`));
  view.querySelector('#back').onclick = () => goBack('/convo');
  view.appendChild(el(`<h1 class="h1">${escapeHtml(d.title)}</h1>`));
  const chat = el(`<div class="chat" id="chat"></div>`);
  view.appendChild(chat);
  const ctrl = el(`<div id="ctrl"></div>`);
  view.appendChild(ctrl);

  let i = 0, correct = 0, choices = 0;

  function addBubble(side, text, withAudio) {
    const b = el(`<div class="bubble bubble--${side}">${escapeHtml(text)}${withAudio ? ' <span class="bubble__say" role="button">🔊</span>' : ''}</div>`);
    if (withAudio) b.querySelector('.bubble__say').onclick = () => speak(text);
    chat.appendChild(b);
    b.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }

  function step() {
    clear(ctrl);
    if (i >= d.lines.length) return finish();
    const line = d.lines[i];
    if (line.who === 'them') {
      addBubble('them', line.en, true);
      speak(line.en);
      const cont = el(`<button class="btn btn--block" id="c">${line.es ? line.es + ' · ' : ''}${t('convo.continue')}</button>`);
      cont.onclick = () => { i++; step(); };
      ctrl.appendChild(cont);
    } else {
      // user's turn: choose a reply
      const prompt = el(`<p class="muted center">🗣️ ${escapeHtml(line.prompt_es || t('convo.yourTurn'))}</p>`);
      ctrl.appendChild(prompt);
      choices++;
      shuffle(line.options.slice()).forEach((opt) => {
        const b = el(`<button class="option">${escapeHtml(opt.en)}</button>`);
        b.onclick = () => {
          ctrl.querySelectorAll('.option').forEach((o) => o.disabled = true);
          if (opt.ok) {
            correct++;
            b.classList.add('is-correct');
            addBubble('you', opt.en, false);
            speak(opt.en);
            const cont = el(`<button class="btn btn--block" style="margin-top:8px">${t('convo.continue')}</button>`);
            cont.onclick = () => { i++; step(); };
            ctrl.appendChild(cont);
          } else {
            b.classList.add('is-wrong');
            const correctOpt = line.options.find((o) => o.ok);
            ctrl.querySelectorAll('.option').forEach((o) => { if (o.textContent === correctOpt.en) o.classList.add('is-correct'); });
            const tip = el(`<div class="feedback feedback--no">${t('convo.tryThis')}: <strong>${escapeHtml(correctOpt.en)}</strong></div>`);
            ctrl.appendChild(tip);
            const cont = el(`<button class="btn btn--block" style="margin-top:8px">${t('convo.continue')}</button>`);
            cont.onclick = () => { addBubble('you', correctOpt.en, false); speak(correctOpt.en); i++; step(); };
            ctrl.appendChild(cont);
          }
        };
        ctrl.appendChild(b);
      });
    }
  }

  function finish() {
    const xp = 15;
    addXp(xp);
    markDailyTask('challenge');
    const pct = choices ? Math.round((correct / choices) * 100) : 100;
    if (pct >= 70) celebrate();
    clear(ctrl);
    const card = el(`
      <div class="card center pop-in">
        <div style="font-size:3rem">💬</div>
        <h2 class="h2">${t('convo.done')}</h2>
        <p>${t('common.score')}: <strong>${correct}/${choices}</strong> (${pct}%)</p>
        <div class="badge pill" style="margin:8px 0">+${xp} XP</div>
        <button class="btn btn--block" id="more">${t('convo.title')}</button>
        <button class="btn btn--ghost btn--block" id="home" style="margin-top:8px">${t('nav.home')}</button>
      </div>`);
    ctrl.appendChild(card);
    card.querySelector('#more').onclick = () => navigate('/convo');
    card.querySelector('#home').onclick = () => navigate('/home');
  }

  step();
}
