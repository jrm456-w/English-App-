/* Grammar Trainer — active construction (not just recognition). The learner reads the
   rule, then BUILDS correct sentences by ordering scrambled words. Targets exactly the
   rules the user gets wrong (reached from "Grammar to reinforce"). */
import { el, clear, shuffle, sample, celebrate } from './ui.js';
import { t } from './i18n.js';
import { loadLevel } from './data.js';
import { speak, normalize } from './speech.js';
import { addXp, recordGrammarResult } from './gamification.js';
import { navigate, goBack } from './router.js';

export async function grammarTrainer({ level, id }, view) {
  const data = await loadLevel(level);
  const unit = data.units.find((u) => u.id === id);
  if (!unit || !unit.grammar) { navigate('/home'); return; }
  const g = unit.grammar;
  const sentences = (g.examples || []).filter((s) => {
    const n = s.replace(/[.!?]$/, '').split(/\s+/).length;
    return n >= 3 && n <= 10;
  });

  clear(view);
  view.appendChild(el(`<button class="btn btn--ghost btn--small" id="back">← ${t('common.back')}</button>`));
  view.querySelector('#back').onclick = () => goBack('/home');
  view.appendChild(el(`<h1 class="h1">🧩 ${t('gram.title')}</h1>`));
  const stage = el(`<div></div>`);
  view.appendChild(stage);

  // Phase 1: read the rule.
  function intro() {
    clear(stage);
    const card = el(`
      <div class="card">
        <h2 class="h2">${g.rule}</h2>
        <p>${g.explanation_es}</p>
        <strong>${t('learn.examples')}:</strong>
        <div id="ex"></div>
        <button class="btn btn--block" id="go" style="margin-top:12px">${t('gram.start')}</button>
      </div>`);
    stage.appendChild(card);
    const ex = card.querySelector('#ex');
    (g.examples || []).slice(0, 4).forEach((e) => {
      const r = el(`<div class="setting-row"><span>${e}</span><button class="btn btn--ghost btn--small">🔊</button></div>`);
      r.querySelector('button').onclick = () => speak(e);
      ex.appendChild(r);
    });
    card.querySelector('#go').onclick = () => { if (sentences.length) drill(); else finish(); };
  }

  // Phase 2: build the sentences.
  const list = sample(sentences, Math.min(5, sentences.length));
  let i = 0, correct = 0;

  function drill() {
    const target = list[i];
    const words = target.replace(/[.!?]$/, '').split(/\s+/);
    clear(stage);
    const card = el(`
      <div class="card">
        <p class="muted">${i + 1} / ${list.length} · ${g.rule}</p>
        <p>${t('gram.order')}</p>
        <div class="dropzone" id="answer"></div>
        <div class="chips" id="bank" style="margin-top:12px"></div>
        <div id="fb"></div>
        <button class="btn btn--block" id="check" style="margin-top:12px" disabled>${t('common.check')}</button>
      </div>`);
    stage.appendChild(card);
    const bank = card.querySelector('#bank');
    const answer = card.querySelector('#answer');
    const checkBtn = card.querySelector('#check');

    shuffle(words).forEach((w) => {
      const chip = el(`<button class="chip">${w}</button>`);
      chip.onclick = () => {
        if (chip.classList.contains('is-used')) return;
        chip.classList.add('is-used');
        const placed = el(`<button class="chip">${w}</button>`);
        placed.onclick = () => { placed.remove(); chip.classList.remove('is-used'); update(); };
        answer.appendChild(placed); update();
      };
      bank.appendChild(chip);
    });
    function update() { checkBtn.disabled = answer.querySelectorAll('.chip').length !== words.length; }

    let hinted = false;
    checkBtn.onclick = () => {
      const built = Array.from(answer.querySelectorAll('.chip')).map((c) => c.textContent).join(' ');
      const ok = normalize(built) === normalize(target);
      const fb = card.querySelector('#fb');

      // First miss: teach HOW to think (strategy + sentence opening) and let them retry.
      if (!ok && !hinted) {
        hinted = true;
        recordGrammarResult(g.rule, false);
        checkBtn.disabled = true;
        fb.innerHTML = `
          <div class="feedback feedback--no">
            💭 <strong>${t('hint.title')}:</strong> ${t('hint.order')}<br>
            <small>${t('hint.startsWith')}: “${words.slice(0, 2).join(' ')}…” · 📘 ${g.rule}</small>
          </div>`;
        const retry = el(`<button class="btn btn--block" style="margin-top:8px">↻ ${t('hint.tryAgain')}</button>`);
        retry.onclick = () => {
          answer.querySelectorAll('.chip').forEach((c) => c.remove());
          bank.querySelectorAll('.chip').forEach((c) => c.classList.remove('is-used'));
          fb.innerHTML = '';
          update();
        };
        fb.appendChild(retry);
        return;
      }

      if (ok && !hinted) { correct++; recordGrammarResult(g.rule, true); }
      checkBtn.disabled = true;
      fb.innerHTML = ok
        ? `<div class="feedback feedback--ok">✅ ${t('common.correct')}${hinted ? ' · ' + t('hint.withHint') : ''}</div>`
        : `<div class="feedback feedback--no">❌ <strong>${target}</strong><br><small>📘 ${g.rule}: ${g.explanation_es}</small></div>`;
      if (ok) speak(target);
      const nb = el(`<button class="btn btn--block" style="margin-top:8px">${i + 1 < list.length ? t('common.next') : t('gram.finish')}</button>`);
      nb.onclick = () => { i++; i < list.length ? drill() : finish(); };
      fb.appendChild(nb);
    };
  }

  function finish() {
    const xp = 15;
    addXp(xp);
    const pct = list.length ? Math.round((correct / list.length) * 100) : 100;
    if (pct >= 70) celebrate();
    clear(stage);
    const card = el(`
      <div class="card center pop-in">
        <div style="font-size:3rem">🧩</div>
        <h2 class="h2">${t('gram.done')}</h2>
        ${list.length ? `<p>${t('common.score')}: <strong>${correct}/${list.length}</strong> (${pct}%)</p>` : ''}
        <div class="badge pill" style="margin:8px 0">+${xp} XP</div>
        <button class="btn btn--block" id="home">${t('nav.home')}</button>
      </div>`);
    stage.appendChild(card);
    card.querySelector('#home').onclick = () => navigate('/home');
  }

  intro();
}

/* Find a unit in the level whose grammar rule matches (to launch from "weak grammar"). */
export async function unitForRule(level, rule) {
  const data = await loadLevel(level);
  return data.units.find((u) => u.grammar && u.grammar.rule === rule) || null;
}
