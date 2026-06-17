/* Fill the Blank — multiple choice for a missing word (all levels). */
import { el, clear, shuffle, sample } from '../js/ui.js';
import { speak } from '../js/speech.js';
import { t } from '../js/i18n.js';

/* Build questions from unit.fill if present, else derive from grammar examples. */
function buildQuestions(unit) {
  if (Array.isArray(unit.fill) && unit.fill.length) {
    return unit.fill.map((q) => ({
      sentence: q.sentence,
      answer: q.answer,
      options: shuffle([q.answer, ...q.options]).slice(0, 4),
      full: q.sentence.replace('___', q.answer)
    }));
  }
  // Fallback: hide a word in each example sentence.
  const examples = (unit.grammar && unit.grammar.examples) || [];
  const allWords = examples.join(' ').split(/\s+/).map((w) => w.replace(/[^A-Za-z']/g, '')).filter((w) => w.length > 2);
  return sample(examples, Math.min(5, examples.length)).map((ex) => {
    const words = ex.split(/\s+/);
    const idx = Math.max(1, Math.floor(Math.random() * words.length));
    const answer = words[idx].replace(/[.,!?]/g, '');
    const sentence = words.map((w, i) => (i === idx ? '___' : w)).join(' ');
    const distractors = sample(allWords.filter((w) => w.toLowerCase() !== answer.toLowerCase()), 3);
    return { sentence, answer, options: shuffle([answer, ...distractors]), full: ex };
  });
}

export function fillBlank(stage, ctx) {
  const questions = buildQuestions(ctx.unit);
  let i = 0, correct = 0, attempts = 0;
  const total = questions.length;

  function render() {
    const q = questions[i];
    clear(stage);
    const card = el(`
      <div class="card">
        <p class="muted">${t('quiz.question')} ${i + 1} ${t('quiz.of')} ${total}</p>
        <h2 class="h2">${q.sentence}</h2>
        <div id="opts"></div>
        <div id="fb"></div>
      </div>`);
    stage.appendChild(card);
    const opts = card.querySelector('#opts');
    q.options.forEach((opt) => {
      const b = el(`<button class="option">${opt}</button>`);
      b.onclick = () => choose(b, opt, q, card);
      opts.appendChild(b);
    });
  }

  function choose(btn, opt, q, card) {
    attempts++;
    card.querySelectorAll('.option').forEach((o) => o.disabled = true);
    const fb = card.querySelector('#fb');
    if (opt === q.answer) {
      correct++;
      btn.classList.add('is-correct');
      fb.innerHTML = `<div class="feedback feedback--ok">${t('common.correct')}</div>`;
      speak(q.full);
    } else {
      btn.classList.add('is-wrong');
      card.querySelectorAll('.option').forEach((o) => { if (o.textContent === q.answer) o.classList.add('is-correct'); });
      // Explain WHY using the unit's grammar rule (the error is a teaching moment).
      const rule = ctx.unit && ctx.unit.grammar && ctx.unit.grammar.rule;
      fb.innerHTML = `<div class="feedback feedback--no">${t('common.wrong')} — <strong>${q.answer}</strong>${rule ? `<br><small>📘 ${rule}</small>` : ''}</div>`;
      speak(q.full);
    }
    const next = el(`<button class="btn btn--block">${i + 1 < total ? t('common.next') : t('quiz.finish')}</button>`);
    next.onclick = () => { i++; i < total ? render() : ctx.finish({ attempts, correct, total }); };
    fb.appendChild(next);
  }

  render();
}
