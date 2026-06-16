/* Listening Echo — play audio (TTS), user types what they hear. */
import { el, clear, sample } from '../js/ui.js';
import { speak, ttsSupported, normalize } from '../js/speech.js';
import { t } from '../js/i18n.js';

export function listeningEcho(stage, ctx) {
  // Prefer full example sentences; fall back to vocabulary words.
  const examples = (ctx.unit.grammar && ctx.unit.grammar.examples) || [];
  const pool = examples.length ? examples : ctx.unit.vocabulary.map((v) => v.en);
  const items = sample(pool, Math.min(5, pool.length));
  let i = 0, correct = 0, attempts = 0;
  const total = items.length;

  function render() {
    const target = items[i];
    clear(stage);
    const card = el(`
      <div class="card">
        <p class="muted">${t('quiz.question')} ${i + 1} ${t('quiz.of')} ${total}</p>
        <button class="btn btn--accent btn--block" id="play">${t('common.listen')}</button>
        ${ttsSupported() ? '' : `<p class="muted center" style="margin-top:8px">"${target}"</p>`}
        <label class="sr-only" for="echo-input">${t('common.type')}</label>
        <input class="input" id="echo-input" placeholder="${t('common.type')}" autocomplete="off" style="margin-top:12px" />
        <button class="btn btn--block" id="check" style="margin-top:12px">${t('common.check')}</button>
        <div id="fb"></div>
      </div>`);
    stage.appendChild(card);
    const input = card.querySelector('#echo-input');
    card.querySelector('#play').onclick = () => speak(target);
    setTimeout(() => speak(target), 300);
    input.focus();
    const check = () => {
      attempts++;
      const ok = normalize(input.value) === normalize(target);
      if (ok) correct++;
      card.querySelector('#check').disabled = true;
      input.disabled = true;
      const fb = card.querySelector('#fb');
      fb.innerHTML = ok
        ? `<div class="feedback feedback--ok">${t('common.correct')}</div>`
        : `<div class="feedback feedback--no">${t('common.wrong')}<br><strong>${target}</strong></div>`;
      const next = el(`<button class="btn btn--block">${i + 1 < total ? t('common.next') : t('quiz.finish')}</button>`);
      next.onclick = () => { i++; i < total ? render() : ctx.finish({ attempts, correct, total }); };
      fb.appendChild(next);
    };
    card.querySelector('#check').onclick = check;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
  }

  render();
}
