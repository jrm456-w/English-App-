/* Game registry + shared launcher and result screen. */
import { getUnit, loadLevel } from '../js/data.js';
import { recordGame, unitCompleted, weakGrammarList } from '../js/gamification.js';
import { el, clear, fmtTime, celebrate } from '../js/ui.js';
import { t } from '../js/i18n.js';
import { navigate, goBack } from '../js/router.js';

import { wordMatch } from './wordMatch.js';
import { fillBlank } from './fillBlank.js';
import { listeningEcho } from './listeningEcho.js';
import { flashcard } from './flashcard.js';
import { sentenceBuilder } from './sentenceBuilder.js';
import { storyCloze } from './storyCloze.js';
import { speakingMirror } from './speakingMirror.js';

export const GAMES = {
  word_match: { play: wordMatch, icon: '🔗', minLevel: 0 },
  fill_blank: { play: fillBlank, icon: '✏️', minLevel: 0 },
  listening_echo: { play: listeningEcho, icon: '👂', minLevel: 0 },
  flashcard: { play: flashcard, icon: '🃏', minLevel: 0 },
  sentence_builder: { play: sentenceBuilder, icon: '🧩', minLevel: 2 },
  story_cloze: { play: storyCloze, icon: '📖', minLevel: 3 },
  speaking_mirror: { play: speakingMirror, icon: '🗣️', minLevel: 2 }
};

export const GAME_ORDER = [
  'word_match', 'fill_blank', 'listening_echo', 'flashcard',
  'sentence_builder', 'story_cloze', 'speaking_mirror'
];

/* Launch a game route: /game/:type/:level/:id */
export async function launchGame({ type, level, id }, view) {
  const game = GAMES[type];
  if (!game) { navigate('/games'); return; }
  let unit;
  try {
    unit = await getUnit(level, id);
  } catch {
    view.appendChild(el(`<div class="card center">No se pudo cargar la unidad.</div>`));
    return;
  }
  clear(view);

  const header = el(`
    <div class="row" style="justify-content:space-between">
      <button class="btn btn--ghost btn--small" id="game-back">← ${t('common.back')}</button>
      <span class="badge pill">${game.icon} ${t('game.' + type)}</span>
    </div>`);
  view.appendChild(header);
  header.querySelector('#game-back').onclick = () => goBack('/games');

  const stage = el(`<div id="game-stage"></div>`);
  view.appendChild(stage);

  const started = performance.now();
  const ctx = {
    level, unit, type,
    finish: ({ attempts, correct, total }) => {
      const timeMs = performance.now() - started;
      const xp = recordGame({ level, unitId: unit.id, gameType: type, attempts, correct, total, timeMs });
      showResult(stage, { correct, total, timeMs, xp, type, level, id });
    }
  };
  game.play(stage, ctx);
}

async function showResult(stage, { correct, total, timeMs, xp, type, level, id }) {
  clear(stage);
  const pct = total ? Math.round((correct / total) * 100) : 100;
  const passed = pct >= 60;
  const emoji = pct >= 80 ? '🎉' : passed ? '👍' : '💪';
  if (pct >= 70) celebrate();

  // Work out the next step so the user always knows what to do.
  let unit = null, next = null, completed = false;
  try {
    const data = await loadLevel(level);
    const idx = data.units.findIndex((u) => u.id === id);
    unit = data.units[idx];
    next = data.units[idx + 1] || null;
    completed = unit ? unitCompleted(level, unit) : false;
  } catch {}

  let verdict, hint, primaryLabel, primaryAction, secondaryLabel, secondaryAction;
  if (!passed) {
    verdict = '💪 ' + t('result.almost');
    hint = t('result.willReview');
    primaryLabel = '🔁 ' + t('review.title'); primaryAction = () => navigate('/review');
    secondaryLabel = t('common.again'); secondaryAction = retry;
  } else if (completed && next) {
    verdict = '✅ ' + t('result.lessonDone');
    primaryLabel = t('path.nextLesson') + ' →'; primaryAction = () => navigate(`/unit/${level}/${next.id}`);
    secondaryLabel = t('common.again'); secondaryAction = retry;
  } else if (completed && !next) {
    verdict = '✅ ' + t('result.lessonDone');
    hint = t('result.levelReady');
    primaryLabel = '📝 ' + t('exam.take'); primaryAction = () => navigate(`/exam/${level}`);
    secondaryLabel = t('path.title'); secondaryAction = () => goBack('/home');
  } else { // passed but lesson not complete yet
    verdict = '👍 ' + t('result.good');
    hint = t('result.needMore');
    primaryLabel = t('result.backLesson'); primaryAction = () => navigate(`/unit/${level}/${id}`);
    secondaryLabel = t('common.again'); secondaryAction = retry;
  }

  const weak = weakGrammarList(1)[0];

  const card = el(`
    <div class="card center pop-in">
      <div style="font-size:3rem">${emoji}</div>
      <h2 class="h2">${verdict}</h2>
      <div class="stats" style="margin:14px 0">
        <div class="stat"><div class="stat__num">${correct}/${total}</div><div class="stat__label">${t('common.score')}</div></div>
        <div class="stat"><div class="stat__num">+${xp}</div><div class="stat__label">${t('common.xpEarned')}</div></div>
        <div class="stat"><div class="stat__num">${pct}%</div><div class="stat__label">${t('common.score')}</div></div>
      </div>
      ${hint ? `<p class="muted">${hint}</p>` : ''}
      ${weak ? `<div class="feedback feedback--no" style="text-align:left">📘 ${t('result.reinforce')}: <strong>${weak}</strong></div>` : ''}
      <button class="btn btn--block" id="r-primary" style="margin-top:8px">${primaryLabel}</button>
      <button class="btn btn--ghost btn--block" id="r-secondary" style="margin-top:8px">${secondaryLabel}</button>
    </div>`);
  stage.appendChild(card);
  card.querySelector('#r-primary').onclick = primaryAction;
  card.querySelector('#r-secondary').onclick = secondaryAction;

  function retry() { navigate('/games'); setTimeout(() => navigate(`/game/${type}/${level}/${id}`), 0); }
}

/* Which games are valid for a given level index (0=A1 .. 4=C1). */
export function gamesForLevel(levelIndex) {
  return GAME_ORDER.filter((type) => levelIndex >= GAMES[type].minLevel);
}
