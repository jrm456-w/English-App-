/* Short stories: reading + listening + tap-to-translate + shadowing + comprehension quiz. */
import { el, clear, toast, escapeHtml, celebrate } from './ui.js';
import { t } from './i18n.js';
import { getState } from './store.js';
import { loadStories, getStory } from './data.js';
import { navigate, goBack } from './router.js';
import { speak, ttsSupported, sttSupported, listenOnce, normalize } from './speech.js';
import { markStoryRead, addXp } from './gamification.js';

const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1'];

/* ---------------- Story list ---------------- */
export async function storiesList(_p, view) {
  clear(view);
  const stories = await loadStories();
  const read = getState().storiesRead;

  view.appendChild(el(`<h1 class="h1">${t('stories.title')}</h1><p class="muted">${t('stories.subtitle')}</p>`));

  LEVEL_ORDER.forEach((level) => {
    const group = stories.filter((s) => s.level === level);
    if (!group.length) return;
    view.appendChild(el(`<h2 class="h2">${level}</h2>`));
    group.forEach((s) => {
      const card = el(`
        <div class="card card--tap">
          <div class="row" style="justify-content:space-between">
            <strong>${s.emoji} ${escapeHtml(s.title)}</strong>
            <span class="badge">${read[s.id] ? t('stories.read') : level}</span>
          </div>
          <small class="muted">${escapeHtml(s.summary_es)}</small>
        </div>`);
      card.onclick = () => navigate(`/story/${s.id}`);
      view.appendChild(card);
    });
  });
}

/* ---------------- Story reader ---------------- */
export async function storyReader({ id }, view) {
  const story = await getStory(id);
  if (!story) { navigate('/stories'); return; }
  clear(view);

  // Glossary lookup (cleaned, lowercase).
  const glossary = {};
  (story.glossary || []).forEach((g) => { glossary[g.en.toLowerCase()] = g.es; });

  let mode = 'read';

  view.appendChild(el(`
    <div class="row" style="justify-content:space-between">
      <button class="btn btn--ghost btn--small" id="back">← ${t('common.back')}</button>
      <span class="badge pill">${story.emoji} ${story.level}</span>
    </div>`));
  view.querySelector('#back').onclick = () => goBack('/stories');
  view.appendChild(el(`<h1 class="h1">${escapeHtml(story.title)}</h1><p class="muted">${escapeHtml(story.title_es)}</p>`));

  // Mode switch
  const modeBar = el(`
    <div class="row" style="margin:12px 0">
      <button class="btn btn--small" id="m-read">${t('story.modeRead')}</button>
      <button class="btn btn--ghost btn--small" id="m-shadow">${t('story.modeShadow')}</button>
    </div>`);
  view.appendChild(modeBar);

  const stage = el(`<div id="story-stage"></div>`);
  view.appendChild(stage);

  modeBar.querySelector('#m-read').onclick = () => { mode = 'read'; setActive(); renderRead(); };
  modeBar.querySelector('#m-shadow').onclick = () => { mode = 'shadow'; setActive(); renderShadow(); };
  function setActive() {
    modeBar.querySelector('#m-read').className = 'btn btn--small' + (mode === 'read' ? '' : ' btn--ghost');
    modeBar.querySelector('#m-shadow').className = 'btn btn--small' + (mode === 'shadow' ? '' : ' btn--ghost');
  }

  function tokenize(sentence, container) {
    sentence.en.split(/(\s+)/).forEach((tok) => {
      if (/^\s+$/.test(tok)) { container.appendChild(document.createTextNode(tok)); return; }
      const clean = tok.toLowerCase().replace(/[^a-z']/g, '');
      const span = el(`<span class="story-word">${escapeHtml(tok)}</span>`);
      span.onclick = () => {
        speak(clean || tok);
        if (glossary[clean]) toast(`${tok} → ${glossary[clean]}`);
      };
      container.appendChild(span);
    });
  }

  /* ----- Read mode ----- */
  function renderRead() {
    clear(stage);
    stage.appendChild(el(`
      <div class="row" style="margin-bottom:12px">
        <button class="btn btn--accent btn--small" id="play-all">${t('story.playAll')}</button>
        <span class="muted" style="font-size:.8rem">${t('story.tapWord')}</span>
      </div>`));
    const list = el(`<div class="card"></div>`);
    story.sentences.forEach((s, idx) => {
      const row = el(`
        <div class="story-sentence" data-idx="${idx}">
          <div class="story-en"></div>
          <div class="row" style="margin-top:6px">
            <button class="btn btn--ghost btn--small" data-act="hear">🔊</button>
            <button class="btn btn--ghost btn--small" data-act="es">${t('story.showEs')}</button>
          </div>
          <div class="story-es muted" hidden>${escapeHtml(s.es)}</div>
        </div>`);
      tokenize(s, row.querySelector('.story-en'));
      row.querySelector('[data-act="hear"]').onclick = () => speak(s.en);
      const esBtn = row.querySelector('[data-act="es"]');
      const esDiv = row.querySelector('.story-es');
      esBtn.onclick = () => {
        const show = esDiv.hidden;
        esDiv.hidden = !show;
        esBtn.textContent = show ? t('story.hideEs') : t('story.showEs');
      };
      list.appendChild(row);
    });
    stage.appendChild(list);

    let stopFlag = false;
    const playBtn = stage.querySelector('#play-all');
    playBtn.onclick = () => {
      if (playBtn.dataset.playing === '1') { stopFlag = true; window.speechSynthesis && window.speechSynthesis.cancel(); return; }
      if (!ttsSupported()) { toast('🔇'); return; }
      stopFlag = false;
      playBtn.dataset.playing = '1';
      playBtn.textContent = t('story.stop');
      playSequential(0);
    };
    function playSequential(i) {
      const rows = list.querySelectorAll('.story-sentence');
      rows.forEach((r) => r.classList.remove('is-playing'));
      if (stopFlag || i >= story.sentences.length) {
        playBtn.dataset.playing = '0'; playBtn.textContent = t('story.playAll');
        return;
      }
      rows[i].classList.add('is-playing');
      rows[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
      const u = new SpeechSynthesisUtterance(story.sentences[i].en);
      u.lang = 'en-US'; u.rate = 0.9;
      u.onend = () => setTimeout(() => playSequential(i + 1), 250);
      u.onerror = () => playSequential(i + 1);
      window.speechSynthesis.speak(u);
    }

    addGlossaryAndQuiz();
  }

  /* ----- Shadowing mode ----- */
  function renderShadow() {
    let i = 0;
    function step() {
      const s = story.sentences[i];
      clear(stage);
      const card = el(`
        <div class="card center">
          <p class="muted">${i + 1} / ${story.sentences.length}</p>
          <p class="muted">${t('story.shadowHint')}</p>
          <h2 class="h2" id="shadow-en"></h2>
          <button class="btn btn--accent btn--small" id="hear">🔊</button>
          <div id="fb"></div>
          <div class="row" style="justify-content:center;margin-top:12px">
            ${sttSupported() ? `<button class="btn" id="rep">${t('story.repeat')}</button>` : ''}
            <button class="btn btn--ghost" id="next">${i + 1 < story.sentences.length ? t('story.next') : t('story.finish')}</button>
          </div>
        </div>`);
      tokenize(s, card.querySelector('#shadow-en'));
      stage.appendChild(card);
      setTimeout(() => speak(s.en), 300);
      card.querySelector('#hear').onclick = () => speak(s.en);

      const repBtn = card.querySelector('#rep');
      if (repBtn) repBtn.onclick = async () => {
        repBtn.disabled = true;
        const fb = card.querySelector('#fb');
        fb.innerHTML = `<p class="muted">🎤 ${t('speak.listening')}</p>`;
        try {
          const heard = await listenOnce();
          const pass = heard.some((h) => normalize(h) === normalize(s.en)) ||
                       heard.some((h) => overlap(normalize(h), normalize(s.en)) >= 0.7);
          fb.innerHTML = `<div class="feedback ${pass ? 'feedback--ok' : 'feedback--no'}">${pass ? '✅ ' + t('common.correct') : '🔁 ' + t('speak.heard') + ': "' + (heard[0] || '') + '"'}</div>`;
        } catch {
          fb.innerHTML = `<div class="feedback feedback--no">🎤</div>`;
        }
        repBtn.disabled = false;
      };

      card.querySelector('#next').onclick = () => {
        i++;
        if (i < story.sentences.length) step();
        else { mode = 'read'; setActive(); renderRead(); window.scrollTo(0, document.body.scrollHeight); }
      };
    }
    step();
  }

  /* ----- Glossary + comprehension quiz ----- */
  function addGlossaryAndQuiz() {
    if (story.glossary && story.glossary.length) {
      stage.appendChild(el(`<h2 class="h2">${t('story.glossary')}</h2>`));
      const g = el(`<div class="card"></div>`);
      story.glossary.forEach((w) => {
        const r = el(`<div class="setting-row"><span><strong>${escapeHtml(w.en)}</strong> — <span class="muted">${escapeHtml(w.es)}</span></span><button class="btn btn--ghost btn--small">🔊</button></div>`);
        r.querySelector('button').onclick = () => speak(w.en);
        g.appendChild(r);
      });
      stage.appendChild(g);
    }
    if (story.questions && story.questions.length) {
      const btn = el(`<button class="btn btn--block" style="margin-top:8px">${t('story.toQuiz')}</button>`);
      btn.onclick = () => runQuiz();
      stage.appendChild(btn);
    } else {
      const btn = el(`<button class="btn btn--block" style="margin-top:8px">${t('story.finish')}</button>`);
      btn.onclick = () => finish(0, 0);
      stage.appendChild(btn);
    }
  }

  function runQuiz() {
    const qs = story.questions;
    let i = 0, correct = 0;
    const results = [];
    function render() {
      const q = qs[i];
      clear(stage);
      stage.appendChild(el(`<h2 class="h2">${t('story.quizTitle')}</h2>`));
      const card = el(`<div class="card"><p class="muted">${i + 1} / ${qs.length}</p><h3 style="margin:8px 0 16px">${escapeHtml(q.q)}</h3><div id="opts"></div><div id="fb"></div></div>`);
      stage.appendChild(card);
      const opts = card.querySelector('#opts');
      q.options.forEach((opt) => {
        const b = el(`<button class="option">${escapeHtml(opt)}</button>`);
        b.onclick = () => {
          card.querySelectorAll('.option').forEach((o) => o.disabled = true);
          const ok = opt === q.answer;
          if (ok) { correct++; b.classList.add('is-correct'); }
          else { b.classList.add('is-wrong'); card.querySelectorAll('.option').forEach((o) => { if (o.textContent === q.answer) o.classList.add('is-correct'); }); }
          results.push({ q: q.q, answer: q.answer, ok });
          const fb = card.querySelector('#fb');
          fb.innerHTML = `<div class="feedback ${ok ? 'feedback--ok' : 'feedback--no'}">${ok ? '✅ ' + t('common.correct') : '❌ ' + t('common.wrong') + ' — ' + escapeHtml(q.answer)}</div>`;
          const next = el(`<button class="btn btn--block" style="margin-top:8px">${i + 1 < qs.length ? t('common.next') : t('story.finish')}</button>`);
          next.onclick = () => { i++; i < qs.length ? render() : finish(correct, qs.length, results); };
          fb.appendChild(next);
        };
        opts.appendChild(b);
      });
    }
    render();
  }

  function finish(correct, total, results = []) {
    const baseXp = markStoryRead(story.id);   // 15 XP first time, 0 if re-read
    const quizXp = correct * 2;
    if (quizXp) addXp(quizXp);
    const xp = baseXp + quizXp;
    clear(stage);
    const pct = total ? Math.round((correct / total) * 100) : 100;
    const emoji = pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪';
    if (pct >= 70) celebrate();
    const card = el(`
      <div class="card center pop-in">
        <div style="font-size:3rem">${emoji}</div>
        <h2 class="h2">${t('common.complete')}</h2>
        ${total ? `<p>${t('common.score')}: <strong>${correct}/${total}</strong> (${pct}%)</p>` : ''}
        <div class="badge pill" style="font-size:1.2rem;padding:10px 22px;margin:8px 0">+${xp} XP</div>
      </div>`);
    stage.appendChild(card);

    // Per-question review so the user sees what they got right or wrong.
    if (results.length) {
      stage.appendChild(el(`<h2 class="h2">${t('story.review')}</h2>`));
      const list = el(`<div class="card"></div>`);
      results.forEach((r) => {
        list.appendChild(el(`
          <div class="setting-row">
            <span>${r.ok ? '✅' : '❌'} ${escapeHtml(r.q)}</span>
            <span class="muted" style="text-align:right">${escapeHtml(r.answer)}</span>
          </div>`));
      });
      stage.appendChild(list);
    }

    const actions = el(`
      <div class="row" style="justify-content:center;margin-top:8px">
        <button class="btn" id="more">${t('stories.title')}</button>
        <button class="btn btn--ghost" id="home">${t('nav.home')}</button>
      </div>`);
    stage.appendChild(actions);
    actions.querySelector('#more').onclick = () => navigate('/stories');
    actions.querySelector('#home').onclick = () => navigate('/home');
  }

  setActive();
  renderRead();
}

function overlap(a, b) {
  const wa = a.split(' '), wb = new Set(b.split(' '));
  return wa.filter((w) => wb.has(w)).length / Math.max(wa.length, wb.size, 1);
}
