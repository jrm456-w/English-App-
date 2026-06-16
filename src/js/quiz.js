/* 15-question diagnostic placement quiz -> assigns CEFR level. */
import { loadQuiz } from './data.js';
import { el, clear } from './ui.js';
import { t } from './i18n.js';
import { setState } from './store.js';
import { speak, ttsSupported } from './speech.js';
import { navigate } from './router.js';
import { touchStreak } from './gamification.js';

function scoreToLevel(score, total) {
  const pct = score / total;
  if (pct >= 0.85) return 'C1';
  if (pct >= 0.65) return 'B2';
  if (pct >= 0.45) return 'B1';
  if (pct >= 0.25) return 'A2';
  return 'A1';
}

export async function renderQuiz(view) {
  const quiz = await loadQuiz();
  const questions = quiz.questions;
  clear(view);

  // Intro screen
  const intro = el(`
    <div class="card center">
      <div style="font-size:3rem">📝</div>
      <h1 class="h1">${t('quiz.title')}</h1>
      <p class="muted">${t('quiz.intro')}</p>
      <button class="btn btn--block" id="start">${t('quiz.start')}</button>
    </div>`);
  view.appendChild(intro);
  intro.querySelector('#start').onclick = () => run();

  function run() {
    let i = 0, score = 0;
    const total = questions.length;

    function render() {
      const q = questions[i];
      clear(view);
      const isListening = q.type === 'listening';
      const card = el(`
        <div class="card">
          <div class="progress" style="margin-bottom:12px"><div class="progress__fill" style="width:${(i / total) * 100}%"></div></div>
          <p class="muted">${t('quiz.question')} ${i + 1} ${t('quiz.of')} ${total}</p>
          <h2 class="h2">${isListening ? '🎧 ' + (ttsSupported() ? t('common.type') : q.audio) : q.prompt}</h2>
          ${isListening ? `<button class="btn btn--accent btn--block" id="play">${t('quiz.listen')}</button><div style="height:12px"></div>` : ''}
          ${q.context ? `<p class="muted">${q.context}</p>` : ''}
          <div id="opts"></div>
        </div>`);
      view.appendChild(card);
      if (isListening) {
        const play = card.querySelector('#play');
        play.onclick = () => speak(q.audio);
        setTimeout(() => speak(q.audio), 300);
      }
      const opts = card.querySelector('#opts');
      q.options.forEach((opt) => {
        const b = el(`<button class="option">${opt}</button>`);
        b.onclick = () => {
          card.querySelectorAll('.option').forEach((o) => o.disabled = true);
          const ok = opt === q.answer;
          if (ok) { score++; b.classList.add('is-correct'); }
          else {
            b.classList.add('is-wrong');
            card.querySelectorAll('.option').forEach((o) => { if (o.textContent === q.answer) o.classList.add('is-correct'); });
          }
          const next = el(`<button class="btn btn--block" style="margin-top:12px">${i + 1 < total ? t('quiz.next') : t('quiz.finish')}</button>`);
          next.onclick = () => { i++; i < total ? render() : finish(); };
          card.appendChild(next);
        };
        opts.appendChild(b);
      });
    }

    function finish() {
      const level = scoreToLevel(score, total);
      setState({ level, onboarded: true, quizScore: score });
      touchStreak();
      clear(view);
      const res = el(`
        <div class="card center">
          <div style="font-size:3rem">🎓</div>
          <p class="muted">${t('quiz.result')}</p>
          <div class="badge pill" style="font-size:2rem;padding:12px 28px;margin:12px 0">${level}</div>
          <p>${t('quiz.score')}: <strong>${score}/${total}</strong></p>
          <button class="btn btn--block" id="go">${t('quiz.go')}</button>
        </div>`);
      view.appendChild(res);
      res.querySelector('#go').onclick = () => navigate('/home');
    }

    render();
  }
}
