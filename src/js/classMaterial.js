/* Class Material — study the exact material your academy gives you before class,
   so you arrive with the vocabulary and phrases to speak the whole session.
   It auto-expires after N days so old topics never pile up. */
import { el, clear, celebrate, escapeHtml } from './ui.js';
import { t } from './i18n.js';
import { getState, update } from './store.js';
import { speak } from './speech.js';
import { addXp, scheduleWord } from './gamification.js';
import { navigate, goBack } from './router.js';

let cache = null;
async function loadMaterial() {
  if (cache !== null) return cache;
  try {
    const res = await fetch('./src/data/classMaterial.json');
    cache = await res.json();
  } catch { cache = null; }
  return cache;
}

/* Days left before this material hides itself (null = no active material). */
export async function materialStatus() {
  const m = await loadMaterial();
  if (!m || !m.id) return null;
  const seen = getState().materialSeen || {};
  const firstSeen = seen[m.id];
  const days = m.expiresDays || 7;
  if (!firstSeen) return { material: m, daysLeft: days, fresh: true };
  const elapsed = Math.floor((Date.now() - firstSeen) / 86400000);
  const left = days - elapsed;
  return left > 0 ? { material: m, daysLeft: left, fresh: false } : null;
}

export async function classMaterial(_p, view) {
  clear(view);
  const st = await materialStatus();

  view.appendChild(el(`<button class="btn btn--ghost btn--small" id="back">← ${t('common.back')}</button>`));
  view.querySelector('#back').onclick = () => goBack('/home');

  if (!st) {
    view.appendChild(el(`<h1 class="h1">📄 ${t('cm.title')}</h1>`));
    view.appendChild(el(`<div class="card center"><div style="font-size:2.4rem">📭</div><p class="muted">${t('cm.none')}</p></div>`));
    return;
  }

  const m = st.material;
  // Record first view (starts the 7-day countdown) and pre-load words into review.
  update((s) => { s.materialSeen = s.materialSeen || {}; if (!s.materialSeen[m.id]) s.materialSeen[m.id] = Date.now(); });

  view.appendChild(el(`
    <div class="row" style="justify-content:space-between;align-items:baseline">
      <h1 class="h1">📄 ${escapeHtml(m.title)}</h1>
      <span class="badge ${st.daysLeft <= 2 ? 'pill' : ''}">⏳ ${st.daysLeft} ${t('cm.daysLeft')}</span>
    </div>`));
  view.appendChild(el(`<p class="muted" style="margin-top:-6px">${escapeHtml(m.source || '')} · ${m.level || ''}</p>`));
  view.appendChild(el(`<div class="card" style="background:var(--c-surface-2)">🎯 ${escapeHtml(m.intro_es)}</div>`));

  function section(title) { view.appendChild(el(`<h2 class="h2">${title}</h2>`)); }
  function line(en, es, big) {
    const row = el(`<div class="setting-row" style="align-items:flex-start">
      <span>${big ? '<strong>' : ''}${escapeHtml(en)}${big ? '</strong>' : ''}${es ? `<br><span class="muted" style="font-size:.88rem">${escapeHtml(es)}</span>` : ''}</span>
      <button class="btn btn--ghost btn--small" aria-label="listen">🔊</button>
    </div>`);
    row.querySelector('button').onclick = () => speak(en);
    return row;
  }

  // 1) Warm-up questions
  if (m.warmup && m.warmup.length) {
    section('💭 ' + t('cm.warmup'));
    const c = el(`<div class="card"></div>`);
    m.warmup.forEach((w) => c.appendChild(line(w.en, w.es)));
    view.appendChild(c);
  }

  // 2) Key vocabulary (+ add to spaced repetition)
  if (m.vocabulary && m.vocabulary.length) {
    section('📖 ' + t('cm.vocab'));
    const c = el(`<div class="card"></div>`);
    m.vocabulary.forEach((v) => {
      const row = el(`<div class="setting-row" style="align-items:flex-start">
        <span><strong>${escapeHtml(v.en)}</strong> — <span class="muted">${escapeHtml(v.es)}</span>${v.def_en ? `<br><span class="muted" style="font-size:.82rem">${escapeHtml(v.def_en)}</span>` : ''}</span>
        <button class="btn btn--ghost btn--small">🔊</button>
      </div>`);
      row.querySelector('button').onclick = () => speak(v.en);
      c.appendChild(row);
    });
    view.appendChild(c);
    const addBtn = el(`<button class="btn btn--block" style="margin-bottom:10px">🧠 ${t('cm.addReview')}</button>`);
    addBtn.onclick = () => {
      m.vocabulary.forEach((v) => scheduleWord(getState().level, v.en, v.es, false));
      addBtn.disabled = true; addBtn.textContent = '✅ ' + t('cm.added');
    };
    view.appendChild(addBtn);
  }

  // 3) Phrases to actually speak about the topic
  if (m.phrases && m.phrases.length) {
    section('💬 ' + t('cm.phrases'));
    view.appendChild(el(`<p class="muted" style="margin-top:-8px;font-size:.85rem">${t('cm.phrasesHint')}</p>`));
    const c = el(`<div class="card"></div>`);
    m.phrases.forEach((p) => c.appendChild(line(p.en, p.es, true)));
    view.appendChild(c);
  }

  // 4) Discussion questions with model answers
  if (m.discussion && m.discussion.length) {
    section('🗣️ ' + t('cm.discussion'));
    m.discussion.forEach((q) => {
      const card = el(`
        <div class="card">
          <strong>${escapeHtml(q.q_en)}</strong>
          <div class="muted" style="font-size:.85rem">${escapeHtml(q.q_es)}</div>
          <div class="feedback feedback--ok" style="margin-top:8px">
            💡 ${t('cm.modelAnswer')}:<br><strong>${escapeHtml(q.model_en)}</strong>
            <div class="muted" style="font-style:italic;font-size:.85rem;margin-top:4px">${escapeHtml(q.model_es)}</div>
          </div>
          <div class="row" style="margin-top:8px">
            <button class="btn btn--ghost btn--small" data-say>🔊 ${t('cm.hearModel')}</button>
          </div>
        </div>`);
      card.querySelector('[data-say]').onclick = () => speak(q.model_en);
      view.appendChild(card);
    });
  }

  // 5) Comprehension quiz
  if (m.quiz && m.quiz.length) {
    section('✅ ' + t('cm.quiz'));
    const stage = el(`<div></div>`);
    view.appendChild(stage);
    runQuiz(m.quiz, stage);
  }
}

function runQuiz(qs, stage) {
  let i = 0, correct = 0;
  function render() {
    const q = qs[i];
    clear(stage);
    const card = el(`<div class="card"><p class="muted">${i + 1}/${qs.length}</p><h3 style="margin:6px 0 12px">${escapeHtml(q.q)}</h3><div id="opts"></div><div id="fb"></div></div>`);
    stage.appendChild(card);
    const opts = card.querySelector('#opts');
    q.options.forEach((opt) => {
      const b = el(`<button class="option">${escapeHtml(opt)}</button>`);
      b.onclick = () => {
        card.querySelectorAll('.option').forEach((o) => o.disabled = true);
        const ok = opt === q.answer;
        if (ok) { correct++; b.classList.add('is-correct'); }
        else { b.classList.add('is-wrong'); card.querySelectorAll('.option').forEach((o) => { if (o.textContent === q.answer) o.classList.add('is-correct'); }); }
        const nb = el(`<button class="btn btn--block" style="margin-top:8px">${i + 1 < qs.length ? t('common.next') : t('sl.finish')}</button>`);
        nb.onclick = () => { i++; i < qs.length ? render() : done(); };
        card.querySelector('#fb').appendChild(nb);
      };
      opts.appendChild(b);
    });
  }
  function done() {
    addXp(15);
    celebrate();
    clear(stage);
    stage.appendChild(el(`<div class="card center pop-in"><div style="font-size:2.4rem">🎉</div><h3>${t('cm.ready')}</h3><p>${t('common.score')}: <strong>${correct}/${qs.length}</strong></p><div class="badge pill" style="margin-top:8px">+15 XP</div></div>`));
  }
  render();
}
