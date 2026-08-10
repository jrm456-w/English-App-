/* End-of-level exam (checkpoint). A mixed-skills test — like a real teacher would give —
   that must be passed (>=70%) to advance. Covers vocabulary, grammar, listening,
   reading and productive recall (typing). */
import { el, clear, shuffle, sample, celebrate } from './ui.js';
import { t } from './i18n.js';
import { loadLevel, loadStories, vocabPool } from './data.js';
import { speak, ttsSupported, normalize } from './speech.js';
import { advanceLevel, nextLevel } from './gamification.js';
import { getState } from './store.js';
import { navigate, goBack } from './router.js';

const PASS = 70;

function distractors(pool, exclude, n) {
  return sample(pool.filter((p) => p.en !== exclude), n).map((p) => p.en);
}

async function buildExam(level) {
  const pool = await vocabPool(level);
  const data = await loadLevel(level);
  const examples = data.units.flatMap((u) => (u.grammar && u.grammar.examples) || []);
  const stories = (await loadStories()).filter((s) => s.level === level);
  const qs = [];

  // 4 vocabulary (ES -> EN)
  sample(pool, 4).forEach((w) => qs.push({
    kind: 'mc', label: t('exam.vocab'), prompt: w.es,
    answer: w.en, options: shuffle([w.en, ...distractors(pool, w.en, 3)])
  }));

  // 3 grammar (fill the blank from real example sentences)
  const usable = examples.filter((e) => e.split(/\s+/).length >= 4);
  const wordBank = examples.join(' ').split(/\s+/).map((w) => w.replace(/[^A-Za-z']/g, '')).filter((w) => w.length > 2);
  sample(usable, 3).forEach((ex) => {
    const words = ex.split(/\s+/);
    const idx = 1 + Math.floor(Math.random() * (words.length - 1));
    const answer = words[idx].replace(/[.,!?]/g, '');
    const sentence = words.map((w, k) => (k === idx ? '_____' : w)).join(' ');
    const opts = shuffle([answer, ...sample(wordBank.filter((w) => w.toLowerCase() !== answer.toLowerCase()), 3)]);
    qs.push({ kind: 'mc', label: t('exam.grammar'), prompt: sentence, answer, options: opts });
  });

  // 2 listening (hear the word, choose it)
  sample(pool, 2).forEach((w) => qs.push({
    kind: 'mc', label: t('exam.listening'), audio: w.en, prompt: '🎧 ' + t('common.type'),
    answer: w.en, options: shuffle([w.en, ...distractors(pool, w.en, 3)])
  }));

  // 2 reading (from a level story)
  if (stories.length) {
    const st = sample(stories, 1)[0];
    sample(st.questions, Math.min(2, st.questions.length)).forEach((q) => qs.push({
      kind: 'mc', label: t('exam.reading'), context: st.summary_es, prompt: q.q, answer: q.answer, options: shuffle(q.options.slice())
    }));
  }

  // 1 productive recall (type the English word)
  const tw = sample(pool, 1)[0];
  qs.push({ kind: 'type', label: t('exam.writing'), prompt: tw.es, answer: tw.en });

  return shuffle(qs);
}

export async function exam({ level }, view) {
  const s = getState();
  level = level || s.level;
  clear(view);

  // Intro
  view.appendChild(el(`<button class="btn btn--ghost btn--small" id="back">← ${t('path.title')}</button>`));
  view.querySelector('#back').onclick = () => goBack('/home');
  const intro = el(`
    <div class="card center">
      <div style="font-size:3rem">📝</div>
      <h1 class="h1">${t('exam.title')} · ${level}</h1>
      <p class="muted">${t('exam.intro')}</p>
      <button class="btn btn--block" id="start">${t('exam.start')}</button>
    </div>`);
  view.appendChild(intro);
  intro.querySelector('#start').onclick = async () => {
    const qs = await buildExam(level);
    run(qs);
  };

  function run(qs) {
    let i = 0, correct = 0;
    const total = qs.length;
    clear(view);
    const stage = el(`<div></div>`);
    view.appendChild(stage);

    function render() {
      const q = qs[i];
      clear(stage);
      const card = el(`
        <div class="card">
          <div class="progress" style="margin-bottom:10px"><div class="progress__fill" style="width:${(i / total) * 100}%"></div></div>
          <div class="row" style="justify-content:space-between"><span class="muted">${i + 1}/${total}</span><span class="badge">${q.label}</span></div>
          ${q.context ? `<p class="muted" style="margin-top:8px">${q.context}</p>` : ''}
          ${q.audio ? `<button class="btn btn--accent btn--block" id="play" style="margin:10px 0">${t('common.listen')}</button>` : ''}
          <h3 style="margin:10px 0 14px">${q.prompt}</h3>
          <div id="opts"></div>
          <div id="fb"></div>
        </div>`);
      stage.appendChild(card);
      if (q.audio) {
        const play = card.querySelector('#play');
        play.onclick = () => speak(q.audio);
        setTimeout(() => speak(q.audio), 300);
      }
      const opts = card.querySelector('#opts');

      if (q.kind === 'type') {
        const input = el(`<input class="input" id="ans" placeholder="${t('common.type')}" autocomplete="off" />`);
        const check = el(`<button class="btn btn--block" id="check" style="margin-top:10px">${t('common.check')}</button>`);
        opts.appendChild(input); opts.appendChild(check);
        const submit = () => grade(normalize(input.value) === normalize(q.answer), q, card, input);
        check.onclick = submit;
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
        input.focus();
      } else {
        q.options.forEach((opt) => {
          const b = el(`<button class="option">${opt}</button>`);
          b.onclick = () => grade(opt === q.answer, q, card, null, b);
          opts.appendChild(b);
        });
      }
    }

    function grade(ok, q, card, input, btn) {
      if (ok) correct++;
      card.querySelectorAll('.option').forEach((o) => { o.disabled = true; if (o.textContent === q.answer) o.classList.add('is-correct'); });
      if (btn && !ok) btn.classList.add('is-wrong');
      if (input) input.disabled = true;
      const fb = card.querySelector('#fb');
      fb.innerHTML = `<div class="feedback ${ok ? 'feedback--ok' : 'feedback--no'}">${ok ? '✅ ' + t('common.correct') : '❌ ' + t('common.wrong') + ' — ' + q.answer}</div>`;
      const next = el(`<button class="btn btn--block">${i + 1 < total ? t('common.next') : t('exam.finish')}</button>`);
      next.onclick = () => { i++; i < total ? render() : finish(); };
      fb.appendChild(next);
    }

    function finish() {
      const pct = Math.round((correct / total) * 100);
      const passed = pct >= PASS;
      clear(stage);
      let advancedTo = null;
      if (passed) { advancedTo = advanceLevel(); celebrate(50); }
      const card = el(`
        <div class="card center pop-in">
          <div style="font-size:3rem">${passed ? '🎓' : '💪'}</div>
          <h2 class="h2">${passed ? t('exam.passed') : t('exam.failed')}</h2>
          <p>${t('common.score')}: <strong>${correct}/${total}</strong> (${pct}%)</p>
          ${passed && advancedTo ? `<div class="badge pill" style="margin:8px 0;font-size:1.1rem">${t('advance.done')} ${advancedTo} 🎉</div>` : ''}
          ${!passed ? `<p class="muted">${t('exam.retry')}</p>` : ''}
          <button class="btn btn--block" id="go" style="margin-top:8px">${t('path.title')}</button>
        </div>`);
      stage.appendChild(card);
      card.querySelector('#go').onclick = () => navigate('/home');
    }

    render();
  }
}
