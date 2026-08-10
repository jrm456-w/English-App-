/* Communication / Functional language lesson — how to agree, disagree, give and ask
   for opinions. Topic: crime & the death penalty. Two parts:
   1) LEARN — phrase banks by function, each with audio + example + Spanish.
   2) PRACTICE — pick the best phrase for a situation, then say it out loud. */
import { el, clear, shuffle, celebrate, escapeHtml } from './ui.js';
import { t } from './i18n.js';
import { speak, listenOnce, sttSupported, normalize } from './speech.js';
import { addXp, markDailyTask } from './gamification.js';
import { navigate, goBack } from './router.js';

let cache = null;
async function loadData() {
  if (cache) return cache;
  const res = await fetch('./src/data/functions.json');
  cache = await res.json();
  return cache;
}

function sayBtn(text) {
  const b = el(`<span class="bubble__say" role="button" tabindex="0" style="cursor:pointer">🔊</span>`);
  b.onclick = () => speak(text);
  return b;
}

export async function functionsLesson(_p, view) {
  const data = await loadData();
  clear(view);

  view.appendChild(el(`
    <div class="row" style="justify-content:space-between">
      <button class="btn btn--ghost btn--small" id="back">← ${t('common.back')}</button>
      <span class="badge pill">💬 A2·B1</span>
    </div>`));
  view.querySelector('#back').onclick = () => { window.speechSynthesis && window.speechSynthesis.cancel(); goBack('/home'); };

  view.appendChild(el(`<h1 class="h1">💬 ${t('func.title')}</h1><p class="muted">${t('func.subtitle')}</p>`));
  const intro = el(`<div class="card"><p>${escapeHtml(data.intro_en)}</p><p class="muted" style="font-size:.9rem">${escapeHtml(data.intro_es)}</p></div>`);
  intro.appendChild(sayBtn(data.intro_en));
  view.appendChild(intro);

  // ---- PART 1: LEARN ----
  view.appendChild(el(`<h2 class="h2">📚 ${t('func.learn')}</h2>`));
  data.groups.forEach((g) => {
    const card = el(`<div class="card"><div class="row" style="justify-content:space-between"><strong>${g.emoji} ${escapeHtml(g.fn)}</strong><small class="muted">${escapeHtml(g.fn_es)}</small></div></div>`);
    const list = el(`<div style="margin-top:8px"></div>`);
    g.phrases.forEach((p) => {
      const row = el(`
        <div style="padding:8px 0;border-top:1px solid var(--c-border,#eee)">
          <div class="row" style="justify-content:space-between;align-items:center">
            <strong>${escapeHtml(p.en)}</strong>
          </div>
          <div class="muted" style="font-size:.85rem">${escapeHtml(p.es)}</div>
          <div style="font-size:.9rem;margin-top:2px">💬 ${escapeHtml(p.ex_en)}</div>
          <div class="muted" style="font-size:.8rem">${escapeHtml(p.ex_es)}</div>
        </div>`);
      row.querySelector('.row').appendChild(sayBtn(p.ex_en || p.en));
      list.appendChild(row);
    });
    card.appendChild(list);
    view.appendChild(card);
  });

  // ---- Key vocabulary ----
  const vcard = el(`<div class="card"><strong>🗝️ ${t('func.example')}: crime & justice</strong><div class="chips" style="margin-top:8px"></div></div>`);
  const chips = vcard.querySelector('.chips');
  data.vocab.forEach((v) => {
    const chip = el(`<span class="chip" role="button" tabindex="0" style="cursor:pointer;display:inline-block;margin:3px;padding:6px 10px;border:1px solid var(--c-border,#ddd);border-radius:14px">🔊 ${escapeHtml(v.en)} · <span class="muted">${escapeHtml(v.es)}</span></span>`);
    chip.onclick = () => speak(v.en);
    chips.appendChild(chip);
  });
  view.appendChild(vcard);

  // ---- Start practice ----
  const startBtn = el(`<button class="btn btn--block" style="margin-top:12px">${t('func.startPractice')}</button>`);
  startBtn.onclick = () => runPractice(view, data);
  view.appendChild(startBtn);
  window.scrollTo(0, 0);
}

function runPractice(view, data) {
  clear(view);
  view.appendChild(el(`
    <div class="row" style="justify-content:space-between">
      <button class="btn btn--ghost btn--small" id="back">← ${t('common.back')}</button>
      <span class="badge pill">✍️ ${t('func.practice')}</span>
    </div>`));
  view.querySelector('#back').onclick = () => { window.speechSynthesis && window.speechSynthesis.cancel(); functionsLesson({}, view); };
  view.appendChild(el(`<h1 class="h1">✍️ ${t('func.chooseRight')}</h1>`));
  const stage = el(`<div></div>`);
  view.appendChild(stage);

  const items = shuffle(data.practice.slice());
  let i = 0, correct = 0;

  function render() {
    clear(stage);
    const q = items[i];
    const card = el(`
      <div class="card pop-in">
        <p class="muted">${i + 1} / ${items.length}</p>
        <p><strong>${t('func.situation')}:</strong> ${escapeHtml(q.situation_es)}</p>
        <div id="opts"></div>
        <div id="fb"></div>
      </div>`);
    stage.appendChild(card);
    const opts = card.querySelector('#opts');
    const fb = card.querySelector('#fb');

    shuffle(q.options.slice()).forEach((opt) => {
      const b = el(`<button class="option" style="display:block;width:100%;text-align:left;margin:6px 0;padding:10px;border:1px solid var(--c-border,#ddd);border-radius:10px">${escapeHtml(opt.en)}</button>`);
      b.onclick = () => {
        opts.querySelectorAll('.option').forEach((o) => o.disabled = true);
        const right = q.options.find((o) => o.ok);
        if (opt.ok) {
          correct++;
          b.style.borderColor = 'var(--c-ok,#2e7d32)';
          b.style.background = 'rgba(46,125,50,.1)';
        } else {
          b.style.borderColor = 'var(--c-no,#c62828)';
          b.style.background = 'rgba(198,40,40,.1)';
          opts.querySelectorAll('.option').forEach((o) => { if (o.textContent === right.en) { o.style.borderColor = 'var(--c-ok,#2e7d32)'; o.style.background = 'rgba(46,125,50,.1)'; } });
        }
        speak(right.en);
        clear(fb);
        const tip = el(`<div class="feedback" style="margin-top:8px"><strong>💡 ${t('func.tip')}:</strong> ${escapeHtml(q.tip_es)}</div>`);
        fb.appendChild(tip);
        // Say-it-out-loud step (optional, if mic supported).
        if (sttSupported()) {
          const sayRow = el(`<div class="row" style="margin-top:8px;align-items:center"><button class="btn btn--ghost btn--small" id="mic">🎤 ${t('func.speakIt')}: "${escapeHtml(right.en)}"</button><span id="heard" class="muted" style="font-style:italic;margin-left:6px"></span></div>`);
          fb.appendChild(sayRow);
          sayRow.querySelector('#mic').onclick = async () => {
            const heard = sayRow.querySelector('#heard');
            heard.textContent = '🎤 …';
            try {
              const r = await listenOnce({ timeoutMs: 8000 });
              const said = (r && r[0]) || '';
              const okSaid = said && (normalize(said) === normalize(right.en) || wordOverlap(normalize(said), normalize(right.en)) >= 0.5);
              heard.textContent = said ? (okSaid ? '✅ “' + said + '”' : '🔁 “' + said + '”') : '…';
              if (!okSaid && said) speak(right.en);
            } catch { heard.textContent = ''; }
          };
        }
        const cont = el(`<button class="btn btn--block" style="margin-top:10px">${i + 1 < items.length ? t('common.next') : t('func.done')}</button>`);
        cont.onclick = () => { i++; i < items.length ? render() : finish(); };
        fb.appendChild(cont);
      };
      opts.appendChild(b);
    });
    window.scrollTo(0, 0);
  }

  function finish() {
    const xp = 20;
    addXp(xp);
    markDailyTask('challenge');
    const pct = Math.round((correct / items.length) * 100);
    if (pct >= 70) celebrate();
    window.speechSynthesis && window.speechSynthesis.cancel();
    clear(stage);
    const card = el(`
      <div class="card center pop-in">
        <div style="font-size:3rem">💬</div>
        <h2 class="h2">${t('func.done')}</h2>
        <p>${t('common.score')}: <strong>${correct}/${items.length}</strong> (${pct}%)</p>
        <div class="badge pill" style="margin:8px 0">+${xp} XP</div>
        <p class="muted">${t('func.nice')}</p>
        <button class="btn btn--block" id="again">📚 ${t('func.showPhrases')}</button>
        <button class="btn btn--ghost btn--block" id="home" style="margin-top:8px">${t('nav.home')}</button>
      </div>`);
    stage.appendChild(card);
    card.querySelector('#again').onclick = () => functionsLesson({}, view);
    card.querySelector('#home').onclick = () => navigate('/home');
  }

  render();
}

function wordOverlap(a, b) {
  const wa = a.split(' ').filter(Boolean), wb = new Set(b.split(' ').filter(Boolean));
  if (!wa.length) return 0;
  return wa.filter((w) => wb.has(w)).length / Math.max(wa.length, wb.size, 1);
}
