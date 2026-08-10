/* Story-Based Lesson — ONE cohesive guided flow (no jumping around):
   1) Read & listen to a short story (comprehensible input)
   2) Learn the key words FROM that story (image + context sentence + audio)
   3) Play a quick game with those exact words (matching)
   4) Word search (sopa de letras) with the same words
   5) Comprehension quiz
   Everything is anchored to one text, which is how languages are really acquired. */
import { el, clear, shuffle, sample, toast, celebrate, escapeHtml } from './ui.js';
import { t } from './i18n.js';
import { getState } from './store.js';
import { loadStories, getStory } from './data.js';
import { speak, ttsSupported, currentRate } from './speech.js';
import { addXp, scheduleWord, markStoryRead, markDailyTask } from './gamification.js';
import { navigate, goBack } from './router.js';
import { emojiFor } from './emoji.js';
import { saveResume, getResume, clearResume } from './resume.js';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

/* Pick a good story for the user's level (first unread, else first). */
export async function pickLessonStory(level) {
  const stories = (await loadStories()).filter((s) => s.level === level);
  const read = getState().storiesRead || {};
  return stories.find((s) => !read[s.id]) || stories[0] || null;
}

function sentenceWith(story, enWord) {
  const w = enWord.toLowerCase().replace(/^to\s+/, '');
  const re = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
  const hit = story.sentences.find((s) => re.test(s.en));
  return hit ? hit.en : null;
}

export async function storyLesson({ id }, view) {
  const story = await getStory(id);
  if (!story) { navigate('/home'); return; }
  clear(view);

  const words = (story.glossary || []).slice(0, 6);
  const steps = ['read', 'words', 'game', 'search', 'quiz'];
  let stepIdx = 0;

  // Resume mid-lesson: coming back must not restart from phase 1.
  const resumeKey = `lesson:${story.id}`;
  const saved = getResume(resumeKey);
  if (saved && saved.stepIdx > 0 && saved.stepIdx < steps.length) {
    stepIdx = saved.stepIdx;
    toast(`▶️ ${t('resume.continuing')}`, 2600);
  }

  // Header with progress through the 5 phases.
  view.appendChild(el(`
    <div class="row" style="justify-content:space-between">
      <button class="btn btn--ghost btn--small" id="back">← ${t('common.back')}</button>
      <span class="badge pill">${story.emoji} ${story.level}</span>
    </div>`));
  view.querySelector('#back').onclick = () => goBack('/home');
  view.appendChild(el(`<h1 class="h1">${escapeHtml(story.title)}</h1>`));
  const tracker = el(`<div class="steps" id="tracker"></div>`);
  view.appendChild(tracker);
  const stage = el(`<div></div>`);
  view.appendChild(stage);

  const labels = { read: '📖', words: '🔑', game: '🎮', search: '🔡', quiz: '✅' };
  function drawTracker() {
    tracker.innerHTML = steps.map((s, k) =>
      `<span class="steps__item ${k <= stepIdx ? 'is-on' : ''}">${labels[s]}</span>`).join('');
  }

  function nextPhase() { stepIdx++; saveResume(resumeKey, { stepIdx }); run(); }
  function run() {
    drawTracker();
    const phase = steps[stepIdx];
    if (phase === 'read') phaseRead();
    else if (phase === 'words') phaseWords();
    else if (phase === 'game') phaseGame();
    else if (phase === 'search') phaseSearch();
    else if (phase === 'quiz') phaseQuiz();
    else finish();
  }

  /* ---------- 1. READ & LISTEN ---------- */
  function phaseRead() {
    clear(stage);
    stage.appendChild(el(`<p class="muted">📖 ${t('sl.read')} — ${t('story.tapWord')}</p>`));
    const playBtn = el(`<button class="btn btn--accent btn--block" id="play" style="margin-bottom:10px">${t('story.playAll')}</button>`);
    stage.appendChild(playBtn);
    const card = el(`<div class="card"></div>`);
    story.sentences.forEach((s) => {
      const row = el(`
        <div class="story-sentence">
          <div class="story-en">${escapeHtml(s.en)}</div>
          <div class="story-es muted" hidden style="margin-top:4px">${escapeHtml(s.es)}</div>
          <div class="row" style="margin-top:6px">
            <button class="btn btn--ghost btn--small" data-h>🔊</button>
            <button class="btn btn--ghost btn--small" data-e>${t('story.showEs')}</button>
          </div>
        </div>`);
      row.querySelector('[data-h]').onclick = () => speak(s.en);
      const es = row.querySelector('.story-es');
      row.querySelector('[data-e]').onclick = (ev) => { const sh = es.hidden; es.hidden = !sh; ev.target.textContent = sh ? t('story.hideEs') : t('story.showEs'); };
      card.appendChild(row);
    });
    stage.appendChild(card);
    stage.appendChild(el(`<button class="btn btn--block" id="cont">${t('sl.continue')} →</button>`)).onclick = () => nextPhase();

    let playing = false;
    playBtn.onclick = () => {
      if (!ttsSupported()) { toast('🔇'); return; }
      if (playing) { window.speechSynthesis.cancel(); playing = false; playBtn.textContent = t('story.playAll'); return; }
      playing = true; playBtn.textContent = t('story.stop');
      let i = 0;
      const speakNext = () => {
        if (!playing || i >= story.sentences.length) { playing = false; playBtn.textContent = t('story.playAll'); return; }
        const u = new SpeechSynthesisUtterance(story.sentences[i].en);
        u.lang = 'en-US'; u.rate = currentRate(); u.onend = () => { i++; setTimeout(speakNext, 200); }; u.onerror = () => { i++; speakNext(); };
        window.speechSynthesis.speak(u);
      };
      speakNext();
    };
  }

  /* ---------- 2. KEY WORDS ---------- */
  function phaseWords() {
    let k = 0;
    function render() {
      const w = words[k];
      const ctx = sentenceWith(story, w.en);
      clear(stage);
      const card = el(`
        <div class="card center pop-in">
          <p class="muted">🔑 ${t('sl.words')} · ${k + 1}/${words.length}</p>
          ${emojiFor(w.en) ? `<div style="font-size:3.4rem">${emojiFor(w.en)}</div>` : ''}
          <div style="font-size:1.8rem;font-weight:800">${escapeHtml(w.en)}</div>
          <button class="btn btn--ghost btn--small" id="say">🔊</button>
          <div style="font-size:1.2rem;color:var(--c-text-muted);margin:10px 0">${escapeHtml(w.es)}</div>
          ${ctx ? `<div class="muted" style="font-style:italic">"${escapeHtml(ctx)}"</div>` : ''}
          <div class="row" style="margin-top:14px">
            <button class="btn btn--ghost" id="prev">${t('common.prev')}</button>
            <button class="btn" id="next" style="flex:1">${k + 1 < words.length ? t('common.next') : t('sl.toGame') + ' →'}</button>
          </div>
        </div>`);
      stage.appendChild(card);
      setTimeout(() => speak(w.en), 200);
      card.querySelector('#say').onclick = () => speak(w.en);
      card.querySelector('#next').onclick = () => { k++; k < words.length ? render() : nextPhase(); };
      card.querySelector('#prev').onclick = () => { if (k > 0) { k--; render(); } };
    }
    if (!words.length) { nextPhase(); return; }
    render();
  }

  /* ---------- 3. GAME: match these words ---------- */
  function phaseGame() {
    const pairs = words.slice(0, 5);
    if (pairs.length < 2) { nextPhase(); return; }
    let matched = 0, selectedEs = null;
    clear(stage);
    const wrap = el(`
      <div class="card">
        <p class="muted">🎮 ${t('sl.gameTitle')}</p>
        <div class="match"><div class="match__col" id="es"></div><div class="match__col" id="en"></div></div>
      </div>`);
    stage.appendChild(wrap);
    const colEs = wrap.querySelector('#es'), colEn = wrap.querySelector('#en');
    shuffle(pairs).forEach((p) => {
      const b = el(`<button class="option">${escapeHtml(p.es)}</button>`);
      b.onclick = () => { selectedEs = p; colEs.querySelectorAll('.option').forEach((o) => o.classList.remove('is-selected')); b.classList.add('is-selected'); };
      colEs.appendChild(b);
    });
    shuffle(pairs).forEach((p) => {
      const b = el(`<button class="option">${emojiFor(p.en) ? emojiFor(p.en) + ' ' : ''}${escapeHtml(p.en)} 🔊</button>`);
      b.onclick = () => {
        speak(p.en);
        if (!selectedEs) { toast('👈 ' + p.es); return; }
        if (selectedEs.en === p.en) {
          b.classList.add('is-correct'); b.disabled = true;
          const sel = colEs.querySelector('.option.is-selected');
          if (sel) { sel.classList.add('is-correct'); sel.disabled = true; sel.classList.remove('is-selected'); }
          scheduleWord(story.level, p.en, p.es, true);
          selectedEs = null; matched++;
          if (matched === pairs.length) setTimeout(() => nextPhase(), 600);
        } else { b.classList.add('is-wrong'); setTimeout(() => b.classList.remove('is-wrong'), 500); }
      };
      colEn.appendChild(b);
    });
  }

  /* ---------- 4. WORD SEARCH (sopa de letras) ---------- */
  function phaseSearch() {
    const targets = words.map((w) => w.en.toUpperCase().replace(/[^A-Z]/g, '')).filter((w) => w.length >= 3 && w.length <= 9);
    if (targets.length < 2) { nextPhase(); return; }
    const size = Math.max(8, Math.min(11, Math.max(...targets.map((w) => w.length)) + 2));
    const { grid, placed } = buildGrid(targets, size);
    const remaining = new Set(placed);
    const found = new Set();
    let first = null;

    clear(stage);
    const wrap = el(`
      <div class="card">
        <p class="muted">🔡 ${t('sl.searchTitle')}</p>
        <p class="muted" style="font-size:.8rem">${t('sl.searchHint')}</p>
        <div class="ws-grid" id="grid" style="grid-template-columns:repeat(${size},1fr)"></div>
        <div class="chips" id="wlist" style="margin-top:12px"></div>
      </div>`);
    stage.appendChild(wrap);
    const gridEl = wrap.querySelector('#grid');
    const wlist = wrap.querySelector('#wlist');
    placed.forEach((w) => wlist.appendChild(el(`<span class="chip" data-w="${w}">${w}</span>`)));

    grid.forEach((rowArr, r) => rowArr.forEach((ch, c) => {
      const cell = el(`<button class="ws-cell" data-r="${r}" data-c="${c}">${ch}</button>`);
      cell.onclick = () => onCell(r, c, cell);
      gridEl.appendChild(cell);
    }));

    function cellEl(r, c) { return gridEl.querySelector(`[data-r="${r}"][data-c="${c}"]`); }
    function onCell(r, c, cell) {
      if (!first) { first = { r, c }; cell.classList.add('ws-sel'); return; }
      const path = lineCells(first, { r, c });
      gridEl.querySelectorAll('.ws-sel').forEach((x) => x.classList.remove('ws-sel'));
      first = null;
      if (!path) return;
      const word = path.map((p) => grid[p.r][p.c]).join('');
      const rev = word.split('').reverse().join('');
      const hit = remaining.has(word) ? word : (remaining.has(rev) ? rev : null);
      if (hit) {
        remaining.delete(hit); found.add(hit);
        path.forEach((p) => cellEl(p.r, p.c).classList.add('ws-found'));
        const chip = wlist.querySelector(`[data-w="${hit}"]`); if (chip) chip.classList.add('is-used');
        if (!remaining.size) { celebrate(); setTimeout(() => nextPhase(), 700); }
      }
    }
  }

  /* ---------- 5. QUIZ ---------- */
  let quizCorrect = 0, quizTotal = 0;
  function phaseQuiz() {
    const qs = story.questions || [];
    if (!qs.length) { finish(); return; }
    quizTotal = qs.length;
    let k = 0;
    function render() {
      const q = qs[k];
      clear(stage);
      const card = el(`
        <div class="card">
          <p class="muted">✅ ${t('story.quizTitle')} · ${k + 1}/${qs.length}</p>
          <h3 style="margin:8px 0 14px">${escapeHtml(q.q)}</h3>
          <div id="opts"></div><div id="fb"></div>
        </div>`);
      stage.appendChild(card);
      const opts = card.querySelector('#opts');
      q.options.forEach((opt) => {
        const b = el(`<button class="option">${escapeHtml(opt)}</button>`);
        b.onclick = () => {
          card.querySelectorAll('.option').forEach((o) => o.disabled = true);
          const ok = opt === q.answer;
          if (ok) { quizCorrect++; b.classList.add('is-correct'); }
          else { b.classList.add('is-wrong'); card.querySelectorAll('.option').forEach((o) => { if (o.textContent === q.answer) o.classList.add('is-correct'); }); }
          const fb = card.querySelector('#fb');
          fb.innerHTML = `<div class="feedback ${ok ? 'feedback--ok' : 'feedback--no'}">${ok ? '✅ ' + t('common.correct') : '❌ ' + escapeHtml(q.answer)}</div>`;
          const nb = el(`<button class="btn btn--block">${k + 1 < qs.length ? t('common.next') : t('sl.finish')}</button>`);
          nb.onclick = () => { k++; k < qs.length ? render() : finish(); };
          fb.appendChild(nb);
        };
        opts.appendChild(b);
      });
    }
    render();
  }

  /* ---------- DONE ---------- */
  function finish() {
    drawTracker();
    clearResume(resumeKey);
    words.forEach((w) => scheduleWord(story.level, w.en, w.es, true));
    markDailyTask('storyLesson');
    const baseXp = markStoryRead(story.id);
    const quizXp = quizCorrect * 2;
    if (quizXp) addXp(quizXp);
    const xp = baseXp + quizXp + 10;
    addXp(10);
    celebrate(50);
    clear(stage);
    const pct = quizTotal ? Math.round((quizCorrect / quizTotal) * 100) : 100;
    const card = el(`
      <div class="card center pop-in">
        <div style="font-size:3rem">🎉</div>
        <h2 class="h2">${t('sl.done')}</h2>
        ${quizTotal ? `<p>${t('common.score')}: <strong>${quizCorrect}/${quizTotal}</strong> (${pct}%)</p>` : ''}
        <div class="badge pill" style="margin:8px 0;font-size:1.1rem">+${xp} XP</div>
        <p class="muted">${t('sl.scheduled')}</p>
        <button class="btn btn--block" id="more">${t('sl.another')}</button>
        <button class="btn btn--ghost btn--block" id="home" style="margin-top:8px">${t('nav.home')}</button>
      </div>`);
    stage.appendChild(card);
    card.querySelector('#more').onclick = async () => {
      const next = await pickLessonStory(getState().level);
      if (next && next.id !== story.id) navigate(`/lesson/${next.id}`); else navigate('/home');
    };
    card.querySelector('#home').onclick = () => navigate('/home');
  }

  run();
}

/* Build a word-search grid placing words horizontally/vertically (forward or reversed). */
function buildGrid(words, size) {
  const grid = Array.from({ length: size }, () => Array(size).fill(''));
  const placed = [];
  const dirs = [[0, 1], [1, 0]];
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (const word of words) {
    if (word.length > size || placed.includes(word)) continue;
    let ok = false;
    for (let tries = 0; tries < 80 && !ok; tries++) {
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      const w = Math.random() < 0.5 ? word : word.split('').reverse().join('');
      const maxR = size - dir[0] * (w.length - 1);
      const maxC = size - dir[1] * (w.length - 1);
      const r0 = Math.floor(Math.random() * maxR);
      const c0 = Math.floor(Math.random() * maxC);
      let fits = true;
      for (let k = 0; k < w.length; k++) {
        const cell = grid[r0 + dir[0] * k][c0 + dir[1] * k];
        if (cell && cell !== w[k]) { fits = false; break; }
      }
      if (!fits) continue;
      for (let k = 0; k < w.length; k++) grid[r0 + dir[0] * k][c0 + dir[1] * k] = w[k];
      placed.push(word); ok = true;
    }
  }
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!grid[r][c]) grid[r][c] = A[Math.floor(Math.random() * 26)];
  return { grid, placed };
}

/* Cells in a straight line between two points (horizontal or vertical only). */
function lineCells(a, b) {
  if (a.r === b.r) {
    const lo = Math.min(a.c, b.c), hi = Math.max(a.c, b.c);
    const cells = []; for (let c = lo; c <= hi; c++) cells.push({ r: a.r, c });
    return a.c <= b.c ? cells : cells.reverse();
  }
  if (a.c === b.c) {
    const lo = Math.min(a.r, b.r), hi = Math.max(a.r, b.r);
    const cells = []; for (let r = lo; r <= hi; r++) cells.push({ r, c: a.c });
    return a.r <= b.r ? cells : cells.reverse();
  }
  return null;
}
