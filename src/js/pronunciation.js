/* Pronunciation — minimal pairs trainer focused on Spanish-speaker difficulties.
   The app says one word; the learner picks which of the two they heard. This trains
   the ear for contrasts that don't exist in Spanish (ship/sheep, best/vest, think/sink). */
import { el, clear, shuffle, celebrate } from './ui.js';
import { t } from './i18n.js';
import { speak, ttsSupported } from './speech.js';
import { addXp } from './gamification.js';
import { navigate } from './router.js';

let cache = null;
async function loadSets() {
  if (cache) return cache;
  const res = await fetch('./src/data/pronunciation.json');
  cache = (await res.json()).sets;
  return cache;
}

/* List of sound contrasts. */
export async function pronunciation(_p, view) {
  clear(view);
  const sets = await loadSets();
  view.appendChild(el(`<h1 class="h1">🗣️ ${t('pron.title')}</h1><p class="muted">${t('pron.subtitle')}</p>`));
  if (!ttsSupported()) {
    view.appendChild(el(`<div class="card"><p class="muted">${t('pron.noTts')}</p></div>`));
  }
  sets.forEach((s) => {
    const card = el(`
      <div class="card card--tap">
        <div class="row" style="justify-content:space-between">
          <strong>${s.title}</strong><span>→</span>
        </div>
        <small class="muted">${s.tip_es}</small>
      </div>`);
    card.onclick = () => navigate(`/pron/${s.id}`);
    view.appendChild(card);
  });
}

/* The minimal-pairs game for one contrast. */
export async function pronunciationSet({ id }, view) {
  const sets = await loadSets();
  const set = sets.find((s) => s.id === id);
  if (!set) { navigate('/pronunciation'); return; }
  clear(view);

  view.appendChild(el(`<button class="btn btn--ghost btn--small" id="back">← ${t('common.back')}</button>`));
  view.querySelector('#back').onclick = () => navigate('/pronunciation');
  view.appendChild(el(`<h1 class="h1">${set.title}</h1>`));
  view.appendChild(el(`<div class="card"><small class="muted">💡 ${set.tip_es}</small></div>`));

  const rounds = shuffle(set.pairs).slice(0, Math.min(8, set.pairs.length));
  let i = 0, correct = 0;
  const total = rounds.length;
  const stage = el(`<div></div>`);
  view.appendChild(stage);

  function render() {
    const pair = rounds[i];
    const target = Math.random() < 0.5 ? pair.a : pair.b;
    const options = shuffle([pair.a, pair.b]);
    clear(stage);
    const card = el(`
      <div class="card center">
        <p class="muted">${t('quiz.question')} ${i + 1} ${t('quiz.of')} ${total}</p>
        <p>${t('pron.whichHeard')}</p>
        <button class="btn btn--accent btn--block" id="play">${t('common.listen')}</button>
        <div class="row" style="justify-content:center;margin-top:14px" id="opts"></div>
        <div id="fb"></div>
      </div>`);
    stage.appendChild(card);
    card.querySelector('#play').onclick = () => speak(target);
    setTimeout(() => speak(target), 300);
    const opts = card.querySelector('#opts');
    options.forEach((opt) => {
      const b = el(`<button class="option" style="max-width:160px">${opt} 🔊</button>`);
      b.onclick = () => {
        if (b.dataset.done) { speak(opt); return; }
        card.querySelectorAll('.option').forEach((o) => { o.dataset.done = '1'; });
        const ok = opt === target;
        if (ok) correct++;
        card.querySelectorAll('.option').forEach((o) => {
          if (o.textContent.startsWith(target)) o.classList.add('is-correct');
          else if (o === b) o.classList.add('is-wrong');
        });
        const fb = card.querySelector('#fb');
        fb.innerHTML = `<div class="feedback ${ok ? 'feedback--ok' : 'feedback--no'}">${ok ? '✅ ' + t('common.correct') : '❌ ' + t('speak.heard') + ': ' + target}</div>`;
        const next = el(`<button class="btn btn--block">${i + 1 < total ? t('common.next') : t('quiz.finish')}</button>`);
        next.onclick = () => { i++; i < total ? render() : finish(); };
        fb.appendChild(next);
      };
      // tapping a word before answering just plays it
      b.addEventListener('contextmenu', (e) => { e.preventDefault(); speak(opt); });
      opts.appendChild(b);
    });
  }

  function finish() {
    const xp = 10;
    addXp(xp);
    const pct = Math.round((correct / total) * 100);
    if (pct >= 70) celebrate();
    clear(stage);
    const card = el(`
      <div class="card center pop-in">
        <div style="font-size:3rem">👂</div>
        <h2 class="h2">${t('common.complete')}</h2>
        <p>${t('common.score')}: <strong>${correct}/${total}</strong> (${pct}%)</p>
        <div class="badge pill" style="margin:8px 0">+${xp} XP</div>
        <div class="row" style="justify-content:center">
          <button class="btn" id="again">${t('common.again')}</button>
          <button class="btn btn--ghost" id="more">${t('pron.title')}</button>
        </div>
      </div>`);
    stage.appendChild(card);
    card.querySelector('#again').onclick = () => pronunciationSet({ id }, view);
    card.querySelector('#more').onclick = () => navigate('/pronunciation');
  }

  render();
}
