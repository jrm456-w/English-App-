/* Daily Speaking — output practice (the missing half: producing language, not just understanding).
   Shadowing: hear a sentence, then say it; speech recognition gives lenient pass/fail.
   Falls back to read-aloud self-assessment when STT is unavailable. */
import { el, clear, sample, celebrate } from './ui.js';
import { t } from './i18n.js';
import { getState } from './store.js';
import { loadLevel } from './data.js';
import { speak, listenOnce, sttSupported, normalize } from './speech.js';
import { addXp, markDailyTask } from './gamification.js';
import { navigate, goBack } from './router.js';

function overlap(a, b) {
  const wa = a.split(' '), wb = new Set(b.split(' '));
  return wa.filter((w) => wb.has(w)).length / Math.max(wa.length, wb.size, 1);
}

export async function speaking(_p, view) {
  const s = getState();
  clear(view);
  const data = await loadLevel(s.level);
  const pool = data.units.flatMap((u) => (u.grammar && u.grammar.examples) || []);
  const items = sample(pool, Math.min(6, pool.length));

  view.appendChild(el(`<button class="btn btn--ghost btn--small" id="back">← ${t('common.back')}</button>`));
  view.querySelector('#back').onclick = () => goBack('/home');
  view.appendChild(el(`<h1 class="h1">🗣️ ${t('speak2.title')}</h1>`));
  view.appendChild(el(`<div class="card"><small class="muted">💡 ${t('speak2.hint')}</small></div>`));
  const stage = el(`<div></div>`);
  view.appendChild(stage);

  let i = 0, good = 0;
  const total = items.length;

  function render() {
    const sentence = items[i];
    clear(stage);
    const card = el(`
      <div class="card center">
        <p class="muted">${i + 1} / ${total}</p>
        <p>${t('speak.prompt')}</p>
        <h2 class="h2">${sentence}</h2>
        <button class="btn btn--ghost" id="hear">${t('common.listen')}</button>
        ${sttSupported() ? `<button class="btn btn--accent btn--block" id="rec" style="margin-top:12px">${t('common.speak')}</button>` : ''}
        <div id="fb"></div>
        ${sttSupported() ? '' : `<button class="btn btn--success btn--block" id="ok" style="margin-top:12px">✓ ${t('speak2.said')}</button>`}
      </div>`);
    stage.appendChild(card);
    setTimeout(() => speak(sentence), 250);
    card.querySelector('#hear').onclick = () => speak(sentence);

    const ok = card.querySelector('#ok');
    if (ok) ok.onclick = () => { good++; nextOne(); };

    const rec = card.querySelector('#rec');
    if (rec) rec.onclick = async () => {
      rec.disabled = true;
      const fb = card.querySelector('#fb');
      fb.innerHTML = `<p class="muted">🎤 ${t('speak.listening')}</p>`;
      try {
        const heard = await listenOnce();
        const pass = heard.some((h) => normalize(h) === normalize(sentence)) ||
                     heard.some((h) => overlap(normalize(h), normalize(sentence)) >= 0.7);
        if (pass) good++;
        fb.innerHTML = `<div class="feedback ${pass ? 'feedback--ok' : 'feedback--no'}">${pass ? '✅ ' + t('common.correct') : '🔁 ' + t('speak.heard') + ': "' + (heard[0] || '') + '"'}</div>`;
      } catch {
        fb.innerHTML = `<div class="feedback feedback--no">🎤 ${t('speak2.retry')}</div>`;
      }
      const nb = el(`<button class="btn btn--block" style="margin-top:8px">${i + 1 < total ? t('common.next') : t('common.complete')}</button>`);
      nb.onclick = nextOne;
      fb.appendChild(nb);
    };
  }

  function nextOne() { i++; i < total ? render() : finish(); }

  function finish() {
    markDailyTask('spoke');
    const xp = 15;
    addXp(xp);
    celebrate();
    clear(stage);
    const card = el(`
      <div class="card center pop-in">
        <div style="font-size:3rem">🗣️</div>
        <h2 class="h2">${t('speak2.done')}</h2>
        <p>${t('common.score')}: <strong>${good}/${total}</strong></p>
        <div class="badge pill" style="margin:8px 0">+${xp} XP</div>
        <button class="btn btn--block" id="home">${t('nav.home')}</button>
      </div>`);
    stage.appendChild(card);
    card.querySelector('#home').onclick = () => navigate('/home');
  }

  render();
}
