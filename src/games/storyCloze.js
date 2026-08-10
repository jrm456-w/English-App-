/* Story Cloze — fill blanks in a paragraph from a word bank (B2/C1). */
import { el, clear, shuffle } from '../js/ui.js';
import { speak } from '../js/speech.js';
import { t } from '../js/i18n.js';

/* Use unit.story {text, answers, bank} if present, else synthesize from examples. */
function buildStory(unit) {
  if (unit.story && unit.story.text) {
    return { text: unit.story.text, answers: unit.story.answers, bank: shuffle([...unit.story.bank]) };
  }
  const examples = (unit.grammar && unit.grammar.examples) || [];
  const answers = [];
  const text = examples.slice(0, 5).map((ex) => {
    const words = ex.split(/\s+/);
    const idx = Math.max(1, Math.floor(words.length / 2));
    const ans = words[idx].replace(/[.,!?]/g, '');
    answers.push(ans);
    return words.map((w, k) => (k === idx ? '___' : w)).join(' ');
  }).join(' ');
  return { text, answers, bank: shuffle([...answers]) };
}

export function storyCloze(stage, ctx) {
  const story = buildStory(ctx.unit);
  const total = story.answers.length;
  let attempts = 1;

  clear(stage);
  const parts = story.text.split('___');
  let html = `<div class="card"><p class="muted">${t('game.story_cloze')}</p><p style="line-height:2.2">`;
  parts.forEach((p, idx) => {
    html += p;
    if (idx < total) html += `<select class="select" data-idx="${idx}" aria-label="blank ${idx + 1}"><option value=""></option></select>`;
  });
  html += `</p><div id="fb"></div><button class="btn btn--block" id="check">${t('common.check')}</button></div>`;
  const card = el(html);
  stage.appendChild(card);

  card.querySelectorAll('select').forEach((sel) => {
    story.bank.forEach((w) => sel.appendChild(el(`<option value="${w}">${w}</option>`)));
  });

  card.querySelector('#check').onclick = () => {
    let correct = 0;
    card.querySelectorAll('select').forEach((sel) => {
      const idx = +sel.dataset.idx;
      const ok = sel.value.toLowerCase() === String(story.answers[idx]).toLowerCase();
      if (ok) correct++;
      sel.style.borderColor = ok ? 'var(--c-success)' : 'var(--c-danger)';
      sel.disabled = true;
      // Reveal the correct word next to a wrong blank.
      if (!ok) {
        const hint = el(`<span class="needs-net" style="color:var(--c-success);margin-left:4px">→ ${story.answers[idx]}</span>`);
        sel.insertAdjacentElement('afterend', hint);
      }
    });
    const checkBtn = card.querySelector('#check');
    checkBtn.disabled = true;
    const fb = card.querySelector('#fb');
    fb.innerHTML = `<div class="feedback ${correct === total ? 'feedback--ok' : 'feedback--no'}">${correct}/${total} ${t('common.correct')}</div>`;
    speak(story.text.replace(/___/g, (function () { let i = 0; return () => story.answers[i++]; })()));
    // Let the user review the blanks before moving to the score screen.
    const done = el(`<button class="btn btn--block" style="margin-top:12px">${t('quiz.finish')}</button>`);
    done.onclick = () => ctx.finish({ attempts, correct, total });
    fb.appendChild(done);
  };
}
