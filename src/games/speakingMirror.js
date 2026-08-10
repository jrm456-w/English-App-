/* Speaking Mirror — user speaks a sentence; STT checks pronunciation (B1+). */
import { el, clear, sample } from '../js/ui.js';
import { speak, listenOnce, sttSupported, normalize } from '../js/speech.js';
import { t } from '../js/i18n.js';

export function speakingMirror(stage, ctx) {
  const examples = (ctx.unit.grammar && ctx.unit.grammar.examples) || ctx.unit.vocabulary.map((v) => v.en);
  const items = sample(examples, Math.min(5, examples.length));
  let i = 0, correct = 0, attempts = 0;
  const total = items.length;

  function render() {
    const target = items[i];
    clear(stage);
    const card = el(`
      <div class="card center">
        <p class="muted">${t('quiz.question')} ${i + 1} ${t('quiz.of')} ${total}</p>
        <p>${t('speak.prompt')}</p>
        <h2 class="h2">${target}</h2>
        <button class="btn btn--ghost" id="hear">${t('common.listen')}</button>
        <button class="btn btn--accent btn--block" id="speak" style="margin-top:12px">${t('common.speak')}</button>
        <div id="fb"></div>
      </div>`);
    stage.appendChild(card);
    card.querySelector('#hear').onclick = () => speak(target);

    const fb = card.querySelector('#fb');
    const speakBtn = card.querySelector('#speak');

    if (!sttSupported()) {
      // Fallback: self-assessment after reading aloud.
      fb.innerHTML = `<p class="muted" style="margin-top:12px">${t('speak.unsupported')}</p>`;
      const ok = el(`<button class="btn btn--success btn--block" style="margin-top:8px">✓ ${t('common.know')}</button>`);
      ok.onclick = () => { attempts++; correct++; advance(); };
      fb.appendChild(ok);
      return;
    }

    speakBtn.onclick = async () => {
      attempts++;
      speakBtn.disabled = true;
      fb.innerHTML = `<p class="muted spk-result">🎤 ${t('speak.listening')}</p>`;
      try {
        const heard = await listenOnce();
        const pass = heard.some((h) => normalize(h) === normalize(target)) ||
                     heard.some((h) => similarity(normalize(h), normalize(target)) >= 0.8);
        if (pass) correct++;
        fb.innerHTML = `
          <div class="feedback ${pass ? 'feedback--ok' : 'feedback--no'}">
            ${pass ? '✅ ' + t('common.correct') : '❌ ' + t('common.wrong')}<br>
            <small>${t('speak.heard')}: "${heard[0] || ''}"</small>
          </div>`;
      } catch {
        fb.innerHTML = `<div class="feedback feedback--no">🎤 ${t('common.wrong')}</div>`;
      }
      const next = el(`<button class="btn btn--block">${i + 1 < total ? t('common.next') : t('quiz.finish')}</button>`);
      next.onclick = advance;
      fb.appendChild(next);
    };
  }

  function advance() { i++; i < total ? render() : ctx.finish({ attempts, correct, total }); }
  render();
}

/* Word-overlap similarity for lenient pronunciation grading. */
function similarity(a, b) {
  const wa = a.split(' '), wb = new Set(b.split(' '));
  const hits = wa.filter((w) => wb.has(w)).length;
  return hits / Math.max(wa.length, wb.size, 1);
}
