/* Game registry + shared launcher and result screen. */
import { getUnit, loadLevel } from '../js/data.js';
import { recordGame } from '../js/gamification.js';
import { el, clear, fmtTime, celebrate } from '../js/ui.js';
import { t } from '../js/i18n.js';
import { navigate } from '../js/router.js';

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
  header.querySelector('#game-back').onclick = () => navigate('/games');

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

function showResult(stage, { correct, total, timeMs, xp, type, level, id }) {
  clear(stage);
  const pct = total ? Math.round((correct / total) * 100) : 100;
  const emoji = pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪';
  if (pct >= 70) celebrate();
  const card = el(`
    <div class="card center pop-in">
      <div style="font-size:3rem">${emoji}</div>
      <h2 class="h2">${t('common.complete')}</h2>
      <div class="stats" style="margin:16px 0">
        <div class="stat"><div class="stat__num">${correct}/${total}</div><div class="stat__label">${t('common.score')}</div></div>
        <div class="stat"><div class="stat__num">+${xp}</div><div class="stat__label">${t('common.xpEarned')}</div></div>
        <div class="stat"><div class="stat__num">${fmtTime(timeMs)}</div><div class="stat__label">${t('common.time')}</div></div>
      </div>
      <div class="row" style="justify-content:center">
        <button class="btn" id="r-again">${t('common.again')}</button>
        <button class="btn btn--ghost" id="r-games">${t('nav.games')}</button>
      </div>
    </div>`);
  stage.appendChild(card);
  // Re-enter the same game route (bounce via /games so the screen fully re-renders).
  card.querySelector('#r-again').onclick = () => { navigate('/games'); setTimeout(() => navigate(`/game/${type}/${level}/${id}`), 0); };
  card.querySelector('#r-games').onclick = () => navigate('/games');
}

/* Which games are valid for a given level index (0=A1 .. 4=C1). */
export function gamesForLevel(levelIndex) {
  return GAME_ORDER.filter((type) => levelIndex >= GAMES[type].minLevel);
}
