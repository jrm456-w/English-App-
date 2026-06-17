/* Word Match — tap a Spanish word then its English translation (A1/A2). */
import { el, clear, shuffle, sample, toast } from '../js/ui.js';
import { speak } from '../js/speech.js';
import { t } from '../js/i18n.js';
import { scheduleWord } from '../js/gamification.js';

export function wordMatch(stage, ctx) {
  const pairs = sample(ctx.unit.vocabulary, Math.min(5, ctx.unit.vocabulary.length));
  let correct = 0, attempts = 0;
  const total = pairs.length;
  let selectedEs = null;

  clear(stage);
  const wrap = el(`
    <div class="card">
      <p class="muted">${t('game.word_match')}</p>
      <div class="match">
        <div class="match__col" id="col-es"></div>
        <div class="match__col" id="col-en"></div>
      </div>
    </div>`);
  stage.appendChild(wrap);

  const colEs = wrap.querySelector('#col-es');
  const colEn = wrap.querySelector('#col-en');

  shuffle(pairs).forEach((p) => {
    const b = el(`<button class="option" data-es="${p.es}">${p.es}</button>`);
    b.onclick = () => { selectedEs = p; colEs.querySelectorAll('.option').forEach((o) => o.classList.remove('is-selected')); b.classList.add('is-selected'); };
    colEs.appendChild(b);
  });

  shuffle(pairs).forEach((p) => {
    const b = el(`<button class="option" data-en="${p.en}">${p.en} <span aria-hidden="true">🔊</span></button>`);
    b.onclick = () => {
      speak(p.en);
      if (!selectedEs) { toast('👈 ' + p.es); return; }
      attempts++;
      const selBtn = colEs.querySelector('.option.is-selected');
      if (selectedEs.en === p.en) {
        correct++;
        scheduleWord(ctx.level, p.en, p.es, true); // remembered -> space it out
        b.classList.add('is-correct'); b.disabled = true;
        if (selBtn) { selBtn.classList.add('is-correct'); selBtn.disabled = true; selBtn.classList.remove('is-selected'); }
        selectedEs = null;
        if (correct === total) setTimeout(() => ctx.finish({ attempts, correct, total }), 600);
      } else {
        scheduleWord(ctx.level, selectedEs.en, selectedEs.es, false); // missed -> bring it back soon
        b.classList.add('is-wrong');
        setTimeout(() => b.classList.remove('is-wrong'), 600);
      }
    };
    colEn.appendChild(b);
  });
}
