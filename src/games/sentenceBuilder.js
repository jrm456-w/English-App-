/* Sentence Builder — order scrambled words into a correct sentence (B1+). */
import { el, clear, shuffle, sample } from '../js/ui.js';
import { speak, normalize } from '../js/speech.js';
import { t } from '../js/i18n.js';

function sentences(unit) {
  if (Array.isArray(unit.sentences) && unit.sentences.length) return unit.sentences;
  const examples = (unit.grammar && unit.grammar.examples) || [];
  return examples.filter((s) => s.split(/\s+/).length >= 3 && s.split(/\s+/).length <= 9);
}

export function sentenceBuilder(stage, ctx) {
  const list = sample(sentences(ctx.unit), Math.min(5, sentences(ctx.unit).length));
  let i = 0, correct = 0, attempts = 0;
  const total = list.length;

  function render() {
    const target = list[i];
    const words = target.replace(/[.!?]$/, '').split(/\s+/);
    clear(stage);
    const card = el(`
      <div class="card">
        <p class="muted">${t('quiz.question')} ${i + 1} ${t('quiz.of')} ${total} — ${t('game.sentence_builder')}</p>
        <div class="dropzone" id="answer" aria-label="answer"></div>
        <div class="chips" id="bank" style="margin-top:14px"></div>
        <div id="fb"></div>
        <button class="btn btn--block" id="check" style="margin-top:12px" disabled>${t('common.check')}</button>
      </div>`);
    stage.appendChild(card);
    const bank = card.querySelector('#bank');
    const answer = card.querySelector('#answer');
    const checkBtn = card.querySelector('#check');

    shuffle(words).forEach((w, idx) => {
      const chip = el(`<button class="chip" data-w="${w}" data-id="${idx}">${w}</button>`);
      chip.onclick = () => {
        if (chip.classList.contains('is-used')) return;
        chip.classList.add('is-used');
        const placed = el(`<button class="chip">${w}</button>`);
        placed.onclick = () => { placed.remove(); chip.classList.remove('is-used'); updateBtn(); };
        answer.appendChild(placed);
        updateBtn();
      };
      bank.appendChild(chip);
    });

    function updateBtn() {
      checkBtn.disabled = answer.querySelectorAll('.chip').length !== words.length;
    }

    checkBtn.onclick = () => {
      attempts++;
      const built = Array.from(answer.querySelectorAll('.chip')).map((c) => c.textContent).join(' ');
      const ok = normalize(built) === normalize(target);
      if (ok) correct++;
      const fb = card.querySelector('#fb');
      fb.innerHTML = ok
        ? `<div class="feedback feedback--ok">${t('common.correct')}</div>`
        : `<div class="feedback feedback--no">${t('common.wrong')}<br><strong>${target}</strong></div>`;
      if (ok) speak(target);
      checkBtn.disabled = true;
      const next = el(`<button class="btn btn--block">${i + 1 < total ? t('common.next') : t('quiz.finish')}</button>`);
      next.onclick = () => { i++; i < total ? render() : ctx.finish({ attempts, correct, total }); };
      fb.appendChild(next);
    };
  }

  render();
}
