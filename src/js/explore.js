/* Explorar — Clean catalog of all supplementary learning modes by category,
   keeping the main Home screen focused on the 15-minute daily routine. */
import { el, clear, escapeHtml } from './ui.js';
import { t } from './i18n.js';
import { navigate, goBack } from './router.js';

export function explore(_p, view) {
  clear(view);

  view.appendChild(el(`
    <div class="row" style="justify-content:space-between">
      <button class="btn btn--ghost btn--small" id="back">← ${t('common.back')}</button>
      <span class="badge pill">🧭 ${t('explore.title')}</span>
    </div>`));
  view.querySelector('#back').onclick = () => goBack('/home');

  view.appendChild(el(`<h1 class="h1">🧭 ${t('explore.title')}</h1><p class="muted">${t('explore.subtitle')}</p>`));

  const sections = [
    {
      title: `🗣️ ${t('explore.catSpeak')}`,
      items: [
        { icon: '⚡', title: t('reflex.title'), desc: t('reflex.subtitle'), route: '/reflex' },
        { icon: '🎧', title: t('ear.title'), desc: t('ear.subtitle'), route: '/ear' },
        { icon: '🎙️', title: t('room.title'), desc: t('room.subtitle'), route: '/room' },
        { icon: '🗣️', title: t('speak2.title'), desc: t('speak2.hint'), route: '/speak' },
        { icon: '👂', title: t('pron.title'), desc: t('pron.subtitle'), route: '/pronunciation' }
      ]
    },
    {
      title: `💬 ${t('explore.catConvo')}`,
      items: [
        { icon: '💬', title: t('func.title'), desc: t('func.subtitle'), route: '/functions' },
        { icon: '📅', title: t('prep.title'), desc: t('prep.cta'), route: '/prep' },
        { icon: '🗨️', title: t('convo.title'), desc: t('convo.subtitle'), route: '/convo' },
        { icon: '🤖', title: t('chat.title'), desc: t('chat.subtitle'), route: '/chat' },
        { icon: '🗺️', title: t('adv.title'), desc: t('adv.subtitle'), route: '/adventure' }
      ]
    },
    {
      title: `📚 ${t('explore.catRef')}`,
      items: [
        { icon: '📓', title: t('notebook.title'), desc: t('notebook.subtitle'), route: '/notebook' },
        { icon: '🔤', title: t('dict.title'), desc: t('dict.search'), route: '/dictionary' },
        { icon: '📅', title: t('daily.lesson'), desc: t('daily.reviewOnly'), route: '/daily' },
        { icon: '📖', title: t('stories.title'), desc: t('stories.subtitle'), route: '/stories' },
        { icon: '🎮', title: t('games.title'), desc: t('games.choose'), route: '/games' },
        { icon: '🔁', title: t('review.title'), desc: t('review.subtitle'), route: '/review' }
      ]
    }
  ];

  sections.forEach((sec) => {
    view.appendChild(el(`<h2 class="h2">${escapeHtml(sec.title)}</h2>`));
    const grid = el(`<div class="grid grid--2"></div>`);
    sec.items.forEach((item) => {
      const card = el(`
        <div class="card card--tap" style="margin-bottom:0">
          <div class="row" style="justify-content:space-between">
            <strong>${item.icon} ${escapeHtml(item.title)}</strong>
            <span>→</span>
          </div>
          <small class="muted">${escapeHtml(item.desc)}</small>
        </div>`);
      card.onclick = () => navigate(item.route);
      grid.appendChild(card);
    });
    view.appendChild(grid);
  });
}
