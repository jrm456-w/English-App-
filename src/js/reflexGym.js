/* Gimnasio de Reflejos — Zero multiple-choice active production trainer.
   Trains real-time thinking in English via high-frequency chunks, an 8s recall
   timer, voice/text production, word-by-word diff, and Spanish-trap feedback. */
import { el, clear, shuffle, celebrate, escapeHtml } from './ui.js';
import { t } from './i18n.js';
import { getState } from './store.js';
import { speak, listenOnce, sttSupported, normalize } from './speech.js';
import {
  LEVELS, addXp, markDailyTask, recordMistake, resolveMistake, mistakeList
} from './gamification.js';
import { navigate, goBack } from './router.js';

let drillsCache = null;
async function loadDrills() {
  if (drillsCache) return drillsCache;
  const res = await fetch('./src/data/reflexes.json');
  drillsCache = (await res.json()).drills || [];
  return drillsCache;
}

function tokenOverlap(said, target) {
  const a = normalize(said).split(' ').filter(Boolean);
  const b = normalize(target).split(' ').filter(Boolean);
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let hits = 0;
  b.forEach((w) => { if (setA.has(w)) hits++; });
  return hits / Math.max(a.length, setB.size, 1);
}

/* Word-by-word visual diff: matched (.diff-ok), missing (.diff-miss), extra (.diff-extra). */
export function renderWordDiff(said, target) {
  const targetTokens = target.trim().split(/\s+/).filter(Boolean);
  const saidTokens = (said || '').trim().split(/\s+/).filter(Boolean);
  const saidNorms = saidTokens.map((w) => normalize(w));
  const targetNorms = targetTokens.map((w) => normalize(w));

  const usedSaid = new Set();
  const targetHtml = targetTokens.map((w, idx) => {
    const nw = targetNorms[idx];
    const matchIdx = saidNorms.findIndex((sw, si) => !usedSaid.has(si) && sw && sw === nw);
    if (matchIdx !== -1) {
      usedSaid.add(matchIdx);
      return `<span class="diff-ok">${escapeHtml(w)}</span>`;
    }
    return `<span class="diff-miss">${escapeHtml(w)}</span>`;
  }).join(' ');

  const extraTokens = saidTokens.filter((_w, si) => !usedSaid.has(si) && saidNorms[si]);
  const extraHtml = extraTokens.length
    ? `<div class="muted" style="font-size:.82rem;margin-top:4px">${t('reflex.extra')}: ${extraTokens.map((w) => `<span class="diff-extra">${escapeHtml(w)}</span>`).join(' ')}</div>`
    : '';

  return `<div class="diff-wrap">${targetHtml}${extraHtml}</div>`;
}

function buildQueue(mode, allDrills) {
  const s = getState();
  const mistakes = mistakeList();
  const phrases = s.myPhrases || [];

  if (mode === 'mistakes') {
    return mistakes.slice(0, 8).map((m) => ({
      id: 'm_' + m.en,
      level: s.level,
      chunk: '🔧 ' + t('reflex.yourMistake'),
      situation_es: m.es || t('reflex.translateThis'),
      en: m.en,
      alt: [],
      trap_es: m.tip || t('reflex.defaultTip'),
      connected: '',
      isMistake: true
    }));
  }

  if (mode === 'phrases') {
    return phrases.slice(0, 8).map((p) => ({
      id: p.id,
      level: s.level,
      chunk: '📓 ' + t('reflex.yourPhrase'),
      situation_es: p.es,
      en: p.en,
      alt: [],
      trap_es: p.note || '',
      connected: '',
      isPhrase: true
    }));
  }

  // Default mixed session (max 6): up to 2 mistakes + up to 2 personal phrases + level drills.
  const queue = [];
  mistakes.slice(0, 2).forEach((m) => {
    queue.push({
      id: 'm_' + m.en,
      level: s.level,
      chunk: '🔧 ' + t('reflex.yourMistake'),
      situation_es: m.es || t('reflex.translateThis'),
      en: m.en,
      alt: [],
      trap_es: m.tip || '',
      connected: '',
      isMistake: true
    });
  });

  shuffle(phrases).slice(0, 2).forEach((p) => {
    queue.push({
      id: p.id,
      level: s.level,
      chunk: '📓 ' + t('reflex.yourPhrase'),
      situation_es: p.es,
      en: p.en,
      alt: [],
      trap_es: p.note || '',
      connected: '',
      isPhrase: true
    });
  });

  const curIdx = Math.max(0, LEVELS.indexOf(s.level));
  const levelDrills = shuffle(allDrills.filter((d) => d.level === s.level));
  const nearDrills = shuffle(allDrills.filter((d) => d.level !== s.level && LEVELS.indexOf(d.level) <= curIdx + 1));
  const candidates = [...levelDrills, ...nearDrills];

  for (const d of candidates) {
    if (queue.length >= 6) break;
    if (!queue.some((q) => normalize(q.en) === normalize(d.en))) {
      queue.push(d);
    }
  }
  return queue.slice(0, 6);
}

export async function reflexGym(params, view) {
  const mode = (params && params.mode) || 'default';
  clear(view);

  const allDrills = await loadDrills();
  const queue = buildQueue(mode, allDrills);

  let timerId = null;
  const stopTimer = () => {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  };
  const cleanup = () => {
    stopTimer();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  };
  window.addEventListener('hashchange', cleanup, { once: true });

  view.appendChild(el(`
    <div class="row" style="justify-content:space-between">
      <button class="btn btn--ghost btn--small" id="back">← ${t('common.back')}</button>
      <span class="badge pill">⚡ ${t('reflex.title')}</span>
    </div>`));
  view.querySelector('#back').onclick = () => { cleanup(); goBack('/home'); };

  const titleSub = mode === 'mistakes' ? t('reflex.modeMistakes')
    : mode === 'phrases' ? t('reflex.modePhrases')
      : t('reflex.subtitle');
  view.appendChild(el(`<h1 class="h1">⚡ ${t('reflex.title')}</h1><p class="muted">${escapeHtml(titleSub)}</p>`));

  if (!queue.length) {
    const emptyMsg = mode === 'mistakes' ? t('reflex.noMistakes') : t('reflex.noPhrases');
    const emptyCard = el(`
      <div class="card center">
        <div style="font-size:2.6rem">${mode === 'mistakes' ? '🎉' : '📓'}</div>
        <p>${escapeHtml(emptyMsg)}</p>
        <button class="btn btn--block" id="go-main">${mode === 'mistakes' ? t('reflex.practiceGeneral') : t('notebook.title')}</button>
      </div>`);
    view.appendChild(emptyCard);
    emptyCard.querySelector('#go-main').onclick = () => navigate(mode === 'mistakes' ? '/reflex' : '/notebook');
    return;
  }

  const stage = el(`<div></div>`);
  view.appendChild(stage);

  let idx = 0;
  let passedCount = 0;

  function render() {
    stopTimer();
    const drill = queue[idx];
    clear(stage);

    const card = el(`
      <div class="card pop-in">
        <div class="row" style="justify-content:space-between;margin-bottom:8px">
          <span class="muted">${idx + 1} / ${queue.length}</span>
          <span class="badge">${escapeHtml(drill.chunk)}</span>
        </div>
        <div class="reflex-timer" aria-label="Tiempo para pensar"><div class="reflex-timer__fill" id="t-fill" style="width:100%"></div></div>
        <div class="row" style="justify-content:space-between;margin:6px 0 12px">
          <small class="muted" id="t-label">⏱️ 8s · ${t('reflex.thinkFirst')}</small>
          <button class="btn btn--ghost btn--small" id="pause-btn">⏸ ${t('reflex.pause')}</button>
        </div>
        <h2 class="h2" style="margin-top:4px">${escapeHtml(drill.situation_es)}</h2>
        <div id="input-area">
          ${sttSupported() ? `<button class="btn btn--accent btn--block" id="mic-btn" style="margin-bottom:10px">🎤 ${t('reflex.sayIt')}</button>` : ''}
          <div class="row" style="gap:8px">
            <input class="input" id="ans-input" style="flex:1" placeholder="${escapeHtml(t('reflex.typePlaceholder'))}" autocomplete="off" />
            <button class="btn" id="send-btn">${t('common.check')}</button>
          </div>
          <button class="btn btn--ghost btn--small btn--block" id="giveup-btn" style="margin-top:10px">${t('reflex.cantRemember')}</button>
        </div>
        <div id="fb"></div>
      </div>`);
    stage.appendChild(card);

    const fill = card.querySelector('#t-fill');
    const tLabel = card.querySelector('#t-label');
    const pauseBtn = card.querySelector('#pause-btn');
    const ansInput = card.querySelector('#ans-input');
    const sendBtn = card.querySelector('#send-btn');
    const micBtn = card.querySelector('#mic-btn');
    const giveupBtn = card.querySelector('#giveup-btn');
    const inputArea = card.querySelector('#input-area');
    const fb = card.querySelector('#fb');

    let remainingMs = 8000;
    let paused = false;
    let settled = false;

    const startTick = () => {
      stopTimer();
      timerId = setInterval(() => {
        if (paused || settled) return;
        remainingMs = Math.max(0, remainingMs - 100);
        const pct = Math.round((remainingMs / 8000) * 100);
        fill.style.width = pct + '%';
        const sec = Math.ceil(remainingMs / 1000);
        if (remainingMs > 0) {
          tLabel.textContent = `⏱️ ${sec}s · ${t('reflex.thinkFirst')}`;
        } else {
          stopTimer();
          tLabel.textContent = `⏰ ${t('reflex.timesUp')}`;
        }
      }, 100);
    };
    startTick();

    pauseBtn.onclick = () => {
      paused = !paused;
      pauseBtn.textContent = paused ? `▶ ${t('reflex.resume')}` : `⏸ ${t('reflex.pause')}`;
    };

    function evaluate(rawAnswer, skipped = false) {
      if (settled) return;
      settled = true;
      stopTimer();
      inputArea.hidden = true;

      const said = (rawAnswer || '').trim();
      const candidates = [drill.en, ...(drill.alt || [])];
      let bestCand = drill.en;
      let bestScore = 0;

      if (!skipped && said) {
        for (const cand of candidates) {
          if (normalize(said) === normalize(cand)) {
            bestScore = 1;
            bestCand = cand;
            break;
          }
          const ov = tokenOverlap(said, cand);
          if (ov > bestScore) {
            bestScore = ov;
            bestCand = cand;
          }
        }
      }

      const ok = !skipped && bestScore >= 0.72;
      if (ok) {
        passedCount++;
        if (drill.isMistake || mode === 'mistakes') resolveMistake(drill.en);
      } else {
        recordMistake(drill.en, drill.situation_es, drill.trap_es || drill.connected || '');
      }

      speak(drill.en);

      fb.innerHTML = `
        <div class="feedback ${ok ? 'feedback--ok' : 'feedback--no'}">
          <strong>${ok ? '✅ ' + t('reflex.great') : (skipped ? '💡 ' + t('reflex.answer') : '🔧 ' + t('reflex.almost'))}</strong>
          ${said ? `<div class="muted" style="font-size:.85rem;margin-top:4px">${t('reflex.youSaid')}: “${escapeHtml(said)}”</div>` : ''}
          ${renderWordDiff(said, bestCand)}
        </div>
        <div class="row" style="margin-bottom:10px">
          <button class="btn btn--ghost btn--small" id="hear-norm">🔊 ${t('reflex.normal')}</button>
          <button class="btn btn--ghost btn--small" id="hear-slow">🐢 ${t('reflex.slow')}</button>
        </div>
        ${drill.trap_es ? `<div class="card" style="background:var(--c-surface-2);padding:12px;margin-bottom:10px"><strong>⚠️ ${t('reflex.trap')}:</strong> ${escapeHtml(drill.trap_es)}</div>` : ''}
        ${drill.connected ? `<div class="muted" style="font-size:.85rem;margin-bottom:12px">🗣️ <strong>Connected speech:</strong> ${escapeHtml(drill.connected)}</div>` : ''}
        <div id="repeat-fb"></div>
        <div class="row" style="gap:8px">
          ${!ok ? `<button class="btn btn--accent" id="repeat-btn" style="flex:1">🔁 ${t('reflex.repeatOutLoud')}</button>` : ''}
          <button class="btn" id="next-btn" style="flex:1">${idx + 1 < queue.length ? t('common.next') + ' →' : t('common.complete')}</button>
        </div>`;

      fb.querySelector('#hear-norm').onclick = () => speak(drill.en, { rate: 0.95 });
      fb.querySelector('#hear-slow').onclick = () => speak(drill.en, { rate: 0.68 });

      const repeatBtn = fb.querySelector('#repeat-btn');
      if (repeatBtn) {
        repeatBtn.onclick = async () => {
          const rfb = fb.querySelector('#repeat-fb');
          if (!sttSupported()) {
            speak(drill.en);
            rfb.innerHTML = `<div class="feedback feedback--ok">🗣️ ${t('reflex.sayWithAudio')}</div>`;
            return;
          }
          repeatBtn.disabled = true;
          rfb.innerHTML = `<p class="muted">🎤 ${t('speak.listening')}</p>`;
          try {
            const heard = await listenOnce({ timeoutMs: 8000 });
            const repSaid = (heard && heard[0]) || '';
            const repScore = Math.max(...candidates.map((c) => (normalize(repSaid) === normalize(c) ? 1 : tokenOverlap(repSaid, c))));
            if (repScore >= 0.72) {
              rfb.innerHTML = `<div class="feedback feedback--ok">✅ ${t('reflex.nailedIt')} “${escapeHtml(repSaid)}”</div>`;
            } else {
              rfb.innerHTML = `<div class="feedback feedback--no">🔁 “${escapeHtml(repSaid)}” ${renderWordDiff(repSaid, drill.en)}</div>`;
              speak(drill.en);
            }
          } catch {
            rfb.innerHTML = `<div class="feedback feedback--no">🎤 ${t('room.retry')}</div>`;
          }
          repeatBtn.disabled = false;
        };
      }

      fb.querySelector('#next-btn').onclick = () => {
        idx++;
        idx < queue.length ? render() : finish();
      };
    }

    sendBtn.onclick = () => {
      if (!ansInput.value.trim()) { ansInput.focus(); return; }
      evaluate(ansInput.value, false);
    };
    ansInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendBtn.click();
      }
    });
    giveupBtn.onclick = () => evaluate('', true);

    if (micBtn) {
      micBtn.onclick = async () => {
        paused = true;
        micBtn.disabled = true;
        micBtn.textContent = '🎤 ' + t('speak.listening');
        try {
          const heard = await listenOnce({ timeoutMs: 9000 });
          const spokenText = (heard && heard[0]) || '';
          if (spokenText) {
            evaluate(spokenText, false);
            return;
          }
        } catch {}
        micBtn.disabled = false;
        micBtn.textContent = '🎤 ' + t('reflex.sayIt');
        paused = false;
      };
    }

    ansInput.focus();
  }

  function finish() {
    stopTimer();
    const xp = 25;
    addXp(xp);
    markDailyTask('reflex');
    if (mode === 'mistakes') markDailyTask('mistakes');
    celebrate();
    clear(stage);
    const pct = Math.round((passedCount / queue.length) * 100);
    const card = el(`
      <div class="card center pop-in">
        <div style="font-size:3rem">⚡</div>
        <h2 class="h2">${t('reflex.done')}</h2>
        <p>${t('common.score')}: <strong>${passedCount}/${queue.length}</strong> (${pct}%)</p>
        <div class="badge pill" style="margin:8px 0">+${xp} XP</div>
        <p class="muted">${t('reflex.doneHint')}</p>
        <button class="btn btn--block" id="to-ear" style="margin-top:8px">🎧 ${t('ear.title')} →</button>
        <button class="btn btn--ghost btn--block" id="to-home" style="margin-top:8px">${t('nav.home')}</button>
      </div>`);
    stage.appendChild(card);
    card.querySelector('#to-ear').onclick = () => navigate('/ear');
    card.querySelector('#to-home').onclick = () => navigate('/home');
  }

  render();
}
