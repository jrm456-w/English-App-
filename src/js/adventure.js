/* Interactive Adventures — branching stories where YOUR choices change the plot.
   Replayable input: multiple endings make the same content worth reading many times,
   and choosing in English is meaningful language use, not a drill. */
import { el, clear, celebrate, escapeHtml } from './ui.js';
import { t } from './i18n.js';
import { getState, update } from './store.js';
import { speak } from './speech.js';
import { addXp, markDailyTask } from './gamification.js';
import { navigate, goBack } from './router.js';

let cache = null;
async function loadAdventures() {
  if (cache) return cache;
  const res = await fetch('./src/data/adventures.json');
  cache = (await res.json()).adventures;
  return cache;
}

/* List of adventures with endings found so far. */
export async function adventureList(_p, view) {
  clear(view);
  const all = await loadAdventures();
  const found = getState().endingsFound || {};
  view.appendChild(el(`<h1 class="h1">🗺️ ${t('adv.title')}</h1><p class="muted">${t('adv.subtitle')}</p>`));
  all.forEach((a) => {
    const n = (found[a.id] || []).length;
    const card = el(`
      <div class="card card--tap">
        <div class="row" style="justify-content:space-between">
          <strong>${a.emoji} ${escapeHtml(a.title)}</strong>
          <span class="badge ${n ? 'pill' : ''}">${n}/${a.endings} ${t('adv.endings')}</span>
        </div>
        <small class="muted">${escapeHtml(a.summary_es)}</small>
      </div>`);
    card.onclick = () => navigate(`/adventure/${a.id}`);
    view.appendChild(card);
  });
}

export async function adventurePlay({ id }, view) {
  const all = await loadAdventures();
  const adv = all.find((a) => a.id === id);
  if (!adv) { navigate('/adventure'); return; }
  clear(view);

  view.appendChild(el(`
    <div class="row" style="justify-content:space-between">
      <button class="btn btn--ghost btn--small" id="back">← ${t('common.back')}</button>
      <span class="badge pill">${adv.emoji} ${adv.level}</span>
    </div>`));
  view.querySelector('#back').onclick = () => goBack('/adventure');
  view.appendChild(el(`<h1 class="h1">${escapeHtml(adv.title)}</h1>`));
  const stage = el(`<div></div>`);
  view.appendChild(stage);

  let scenes = 0;

  function show(nodeId) {
    const node = adv.nodes[nodeId];
    if (!node) { navigate('/adventure'); return; }
    scenes++;
    clear(stage);
    const card = el(`
      <div class="card pop-in">
        ${node.end ? `<div class="badge pill" style="margin-bottom:8px">🏁 ${escapeHtml(node.ending_title || '')}</div>` : ''}
        <p style="line-height:1.7;font-size:1.05rem" id="txt">${escapeHtml(node.en)}</p>
        <div class="row" style="margin:8px 0">
          <button class="btn btn--ghost btn--small" id="say">🔊</button>
          <button class="btn btn--ghost btn--small" id="tr">${t('story.showEs')}</button>
        </div>
        <div class="story-es muted" id="es" hidden style="font-style:italic">${escapeHtml(node.es)}</div>
        <div id="choices" style="margin-top:12px"></div>
      </div>`);
    stage.appendChild(card);
    setTimeout(() => speak(node.en), 250);
    card.querySelector('#say').onclick = () => speak(node.en);
    const esDiv = card.querySelector('#es');
    card.querySelector('#tr').onclick = (ev) => { const sh = esDiv.hidden; esDiv.hidden = !sh; ev.target.textContent = sh ? t('story.hideEs') : t('story.showEs'); };

    const box = card.querySelector('#choices');
    if (node.end) return finish(nodeId, box);
    box.appendChild(el(`<p class="muted" style="font-size:.85rem">🧭 ${t('adv.choose')}</p>`));
    node.choices.forEach((c) => {
      const b = el(`<button class="option">${escapeHtml(c.en)}</button>`);
      b.onclick = () => { speak(c.en); show(c.next); };
      box.appendChild(b);
    });
  }

  function finish(endingId, box) {
    // Record which endings this player has discovered (fuel for replay).
    update((st) => {
      st.endingsFound = st.endingsFound || {};
      const list = st.endingsFound[adv.id] || [];
      if (!list.includes(endingId)) list.push(endingId);
      st.endingsFound[adv.id] = list;
    });
    markDailyTask('challenge');
    const xp = 15;
    addXp(xp);
    celebrate();
    const found = (getState().endingsFound[adv.id] || []).length;
    box.appendChild(el(`
      <div class="center" style="margin-top:10px">
        <div class="badge pill" style="font-size:1rem;margin-bottom:8px">+${xp} XP · ${found}/${adv.endings} ${t('adv.endings')}</div>
        ${found < adv.endings ? `<p class="muted">${t('adv.replayHint')}</p>` : `<p class="muted">🏆 ${t('adv.allFound')}</p>`}
      </div>`));
    const again = el(`<button class="btn btn--block" style="margin-top:8px">🔁 ${t('adv.replay')}</button>`);
    again.onclick = () => { scenes = 0; show(adv.start); };
    box.appendChild(again);
    const home = el(`<button class="btn btn--ghost btn--block" style="margin-top:8px">${t('nav.home')}</button>`);
    home.onclick = () => navigate('/home');
    box.appendChild(home);
  }

  show(adv.start);
}
