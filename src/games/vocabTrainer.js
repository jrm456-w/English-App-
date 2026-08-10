/* Vocabulary Trainer — a "see → recall → produce" loop that guarantees active learning.
   Best practice: exposure followed immediately by retrieval (recognition + production),
   feeding the spaced-repetition system. Far more effective than a passive word list. */
import { el, clear, shuffle, sample, celebrate, toast } from '../js/ui.js';
import { saveResume, getResume, clearResume } from '../js/resume.js';
import { t } from '../js/i18n.js';
import { loadLevel } from '../js/data.js';
import { speak, normalize } from '../js/speech.js';
import { addXp, scheduleWord, markUnitStudied } from '../js/gamification.js';
import { navigate, goBack } from '../js/router.js';
import { emojiFor } from '../js/emoji.js';

function exampleFor(examples, enWord) {
  const w = enWord.toLowerCase().replace(/^to\s+/, '').trim();
  const re = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
  return examples.find((ex) => re.test(ex)) || null;
}
function accept(input, answer) {
  const a = normalize(input);
  return a === normalize(answer) || a === normalize(answer.replace(/^to\s+/i, ''));
}
const BATCH = 4;

export async function vocabTrainer({ level, id }, view) {
  const data = await loadLevel(level);
  const unit = data.units.find((u) => u.id === id);
  if (!unit) { navigate('/home'); return; }
  const examples = (unit.grammar && unit.grammar.examples) || [];
  const allWords = unit.vocabulary.slice();

  clear(view);
  view.appendChild(el(`<button class="btn btn--ghost btn--small" id="back">← ${unit.title}</button>`));
  view.querySelector('#back').onclick = () => goBack(`/unit/${level}/${id}`);
  view.appendChild(el(`<h1 class="h1">🧠 ${t('train.title')}</h1>`));
  const stage = el(`<div></div>`);
  view.appendChild(stage);

  // Split into batches; each batch: expose all, then recall each (recognition + production).
  const batches = [];
  for (let i = 0; i < allWords.length; i += BATCH) batches.push(allWords.slice(i, i + BATCH));
  let bi = 0, correct = 0, totalTests = 0;

  // Resume where the learner left off (leaving mid-way must never restart from zero).
  const resumeKey = `study:${level}:${id}`;
  const saved = getResume(resumeKey);
  if (saved && saved.bi > 0 && saved.bi < batches.length) {
    bi = saved.bi;
    toast(`▶️ ${t('resume.continuing')} · ${t('train.batch')} ${bi + 1}/${batches.length}`, 3000);
    const restart = el(`<button class="btn btn--ghost btn--small" style="margin-bottom:8px">↺ ${t('resume.restart')}</button>`);
    restart.onclick = () => { clearResume(resumeKey); vocabTrainer({ level, id }, view); };
    view.insertBefore(restart, stage);
  }

  function runBatch() {
    saveResume(resumeKey, { bi });
    const batch = batches[bi];
    expose(batch, 0);
  }

  /* Phase 1: exposure */
  function expose(batch, k) {
    if (k >= batch.length) { recall(batch, buildTests(batch), 0); return; }
    const w = batch[k];
    const ex = exampleFor(examples, w.en);
    clear(stage);
    stage.appendChild(el(`<div class="progress" style="margin-bottom:10px"><div class="progress__fill" style="width:${(bi / batches.length) * 100}%"></div></div>`));
    const card = el(`
      <div class="card center pop-in">
        <p class="muted">${t('train.learn')} · ${t('train.batch')} ${bi + 1}/${batches.length}</p>
        ${emojiFor(w.en) ? `<div style="font-size:3.4rem;line-height:1">${emojiFor(w.en)}</div>` : ''}
        <div style="font-size:1.9rem;font-weight:800;margin:6px 0">${w.en}</div>
        <button class="btn btn--ghost btn--small" id="say">🔊</button>
        <div style="font-size:1.2rem;color:var(--c-text-muted);margin:12px 0">${w.es}</div>
        ${ex ? `<div class="muted" style="font-style:italic">"${ex}"</div>` : ''}
        <div class="row" style="margin-top:14px">
          <button class="btn btn--ghost" id="prev">${t('common.prev')}</button>
          <button class="btn" id="next" style="flex:1">${t('common.next')}</button>
        </div>
      </div>`);
    stage.appendChild(card);
    setTimeout(() => speak(w.en), 200);
    card.querySelector('#say').onclick = () => speak(w.en);
    card.querySelector('#next').onclick = () => expose(batch, k + 1);
    card.querySelector('#prev').onclick = () => {
      if (k > 0) expose(batch, k - 1);
      else if (bi > 0) { bi--; const pb = batches[bi]; expose(pb, pb.length - 1); }
      else goBack(`/unit/${level}/${id}`);
    };
  }

  /* Build retrieval items: recognition for all, production for short answers. */
  function buildTests(batch) {
    const tests = [];
    batch.forEach((w) => {
      tests.push({ word: w, mode: 'recognition' });
      if (w.en.split(/\s+/).length <= 2) tests.push({ word: w, mode: 'production' });
    });
    return shuffle(tests);
  }

  /* Phase 2: retrieval */
  function recall(batch, tests, k) {
    if (k >= tests.length) {
      bi++;
      if (bi < batches.length) runBatch(); else finish();
      return;
    }
    const { word, mode } = tests[k];
    totalTests++;
    clear(stage);
    stage.appendChild(el(`<div class="progress" style="margin-bottom:10px"><div class="progress__fill" style="width:${((bi + (k / tests.length)) / batches.length) * 100}%"></div></div>`));

    if (mode === 'recognition') {
      const distract = sample(allWords.filter((x) => x.en !== word.en), 3).map((x) => x.en);
      const options = shuffle([word.en, ...distract]);
      const card = el(`
        <div class="card">
          <p class="muted">${t('train.recognize')}</p>
          <h2 class="h2">${word.es}</h2>
          <div id="opts"></div><div id="fb"></div>
        </div>`);
      stage.appendChild(card);
      const opts = card.querySelector('#opts');
      options.forEach((opt) => {
        const b = el(`<button class="option">${opt}</button>`);
        b.onclick = () => {
          card.querySelectorAll('.option').forEach((o) => o.disabled = true);
          const ok = opt === word.en;
          grade(ok, word, b, card, () => recall(batch, tests, k + 1));
        };
        opts.appendChild(b);
      });
    } else {
      const card = el(`
        <div class="card">
          <p class="muted">${t('train.produce')}</p>
          <h2 class="h2">${word.es}</h2>
          <button class="btn btn--ghost btn--small" id="hint">🔊 ${t('train.hint')}</button>
          <input class="input" id="ans" placeholder="${t('train.typeEn')}" autocomplete="off" style="margin-top:10px" />
          <button class="btn btn--block" id="check" style="margin-top:10px">${t('common.check')}</button>
          <div id="fb"></div>
        </div>`);
      stage.appendChild(card);
      const input = card.querySelector('#ans');
      input.focus();
      card.querySelector('#hint').onclick = () => speak(word.en);
      let hinted = false;
      const submit = () => {
        const ok = accept(input.value, word.en);
        // First miss: show the first letter + word shape, let them think again.
        if (!ok && !hinted) {
          hinted = true;
          const base = word.en.replace(/^to\s+/i, '');
          const shape = base[0].toUpperCase() + ' ' + base.slice(1).replace(/[a-zA-Z]/g, '·').replace(/\s/g, '  ');
          card.querySelector('#fb').innerHTML =
            `<div class="feedback feedback--no">💭 <strong>${t('hint.title')}:</strong> ${t('hint.startsWith')} “${shape}”</div>`;
          input.focus(); input.select();
          return;
        }
        input.disabled = true;
        grade(ok, word, null, card, () => recall(batch, tests, k + 1));
      };
      card.querySelector('#check').onclick = submit;
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    }
  }

  function grade(ok, word, btn, card, next) {
    if (ok) correct++;
    scheduleWord(level, word.en, word.es, ok); // feed spaced repetition
    if (btn && !ok) btn.classList.add('is-wrong');
    if (btn && ok) btn.classList.add('is-correct');
    if (!ok) card.querySelectorAll('.option').forEach((o) => { if (o.textContent === word.en) o.classList.add('is-correct'); });
    const fb = card.querySelector('#fb');
    fb.innerHTML = `<div class="feedback ${ok ? 'feedback--ok' : 'feedback--no'}">${ok ? '✅ ' + t('common.correct') : '❌ ' + word.en + ' — ' + word.es}</div>`;
    if (ok) speak(word.en);
    const nb = el(`<button class="btn btn--block">${t('common.next')}</button>`);
    nb.onclick = next;
    fb.appendChild(nb);
  }

  function finish() {
    clearResume(resumeKey);
    markUnitStudied(level, id);
    const xp = 15;
    addXp(xp);
    const pct = totalTests ? Math.round((correct / totalTests) * 100) : 100;
    if (pct >= 70) celebrate();
    clear(stage);
    const card = el(`
      <div class="card center pop-in">
        <div style="font-size:3rem">🧠</div>
        <h2 class="h2">${t('train.done')}</h2>
        <p>${t('common.score')}: <strong>${correct}/${totalTests}</strong> (${pct}%)</p>
        <div class="badge pill" style="margin:8px 0">+${xp} XP</div>
        <p class="muted">${t('train.scheduled')}</p>
        <button class="btn btn--block" id="practice">${t('train.toPractice')}</button>
        <button class="btn btn--ghost btn--block" id="again" style="margin-top:8px">${t('common.again')}</button>
      </div>`);
    stage.appendChild(card);
    card.querySelector('#practice').onclick = () => navigate(`/unit/${level}/${id}`);
    card.querySelector('#again').onclick = () => vocabTrainer({ level, id }, view);
  }

  runBatch();
}
