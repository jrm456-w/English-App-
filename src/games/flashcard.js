/* Flashcard Flip — spaced repetition deck; tracks mastered cards. */
import { el, clear, shuffle } from '../js/ui.js';
import { speak } from '../js/speech.js';
import { t } from '../js/i18n.js';
import { getState, update } from '../js/store.js';

export function flashcard(stage, ctx) {
  const deck = shuffle(ctx.unit.vocabulary.slice());
  let i = 0, correct = 0, attempts = 0;
  const total = deck.length;

  function masteryKey(word) { return `${ctx.level}:${ctx.unit.id}:${word}`; }

  function render() {
    const card = deck[i];
    clear(stage);
    const reps = getState().mastered[masteryKey(card.en)] || 0;
    const wrap = el(`
      <div class="card">
        <div class="row" style="justify-content:space-between">
          <span class="muted">${i + 1} / ${total}</span>
          <span class="badge">${'⭐'.repeat(Math.min(reps, 3)) || '☆'}</span>
        </div>
        <div class="flashcard" id="fc" tabindex="0" role="button" aria-label="${t('common.flip')}">
          <div class="flashcard__inner">
            <div class="flashcard__face">
              <div>
                <div>${card.es}</div>
                <small class="muted">${t('common.flip')}</small>
              </div>
            </div>
            <div class="flashcard__face flashcard__face--back">
              <div>${card.en} <span aria-hidden="true">🔊</span></div>
            </div>
          </div>
        </div>
        <div class="row" style="margin-top:16px;justify-content:space-between">
          <button class="btn btn--ghost" id="dont">${t('common.dontKnow')}</button>
          <button class="btn btn--success" id="know">${t('common.know')}</button>
        </div>
      </div>`);
    stage.appendChild(wrap);
    const fc = wrap.querySelector('#fc');
    const flip = () => { fc.classList.toggle('is-flipped'); if (fc.classList.contains('is-flipped')) speak(card.en); };
    fc.onclick = flip;
    fc.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } };

    wrap.querySelector('#know').onclick = () => advance(card, true);
    wrap.querySelector('#dont').onclick = () => advance(card, false);
  }

  function advance(card, known) {
    attempts++;
    if (known) correct++;
    update((st) => {
      const k = masteryKey(card.en);
      st.mastered[k] = known ? (st.mastered[k] || 0) + 1 : 0;
    });
    i++;
    i < total ? render() : ctx.finish({ attempts, correct, total });
  }

  render();
}
