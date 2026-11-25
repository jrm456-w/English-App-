/* Practicar — Tactile 2x2 skill pillars + clean grouped catalog. */
import { el, clear, escapeHtml } from './ui.js';
import { t } from './i18n.js';
import { getState } from './store.js';
import { navigate } from './router.js';

export function practiceHub(_p, view) {
  clear(view);
  const s = getState();

  view.appendChild(el(`
    <header class="topbar">
      <div>
        <h1 class="topbar__title">${t('practice.title')}</h1>
        <div class="topbar__sub">${t('practice.subtitle')}</div>
      </div>
      <span class="badge pill">${escapeHtml(s.level)}</span>
    </header>`));

  /* ---- 4 Tactile Skill Stations ---- */
  const skills = [
    {
      cls: 'skill-tile--emerald', icon: '⚡',
      title: t('reflex.title'), desc: t('practice.reflexDesc'), route: '/reflex'
    },
    {
      cls: 'skill-tile--indigo', icon: '🎧',
      title: t('ear.title'), desc: t('practice.earDesc'), route: '/ear'
    },
    {
      cls: 'skill-tile--coral', icon: '🎙️',
      title: t('room.title'), desc: t('practice.roomDesc'), route: '/room/session'
    },
    {
      cls: 'skill-tile--amber', icon: '📖',
      title: t('stories.title'), desc: t('practice.storiesDesc'), route: '/stories'
    }
  ];

  const grid = el(`<div class="skill-grid"></div>`);
  skills.forEach((sk) => {
    const tile = el(`
      <div class="skill-tile ${sk.cls}" role="button" tabindex="0">
        <div class="skill-tile__icon">${sk.icon}</div>
        <div class="skill-tile__title">${escapeHtml(sk.title)}</div>
        <div class="skill-tile__desc">${escapeHtml(sk.desc)}</div>
      </div>`);
    tile.onclick = () => navigate(sk.route);
    tile.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(sk.route); } };
    grid.appendChild(tile);
  });
  view.appendChild(grid);

  function renderGroup(label, rows) {
    view.appendChild(el(`<div class="section-label">${escapeHtml(label)}</div>`));
    const group = el(`<div class="list-group"></div>`);
    rows.forEach((r) => {
      const row = el(`
        <div class="list-row" role="button" tabindex="0">
          <span class="list-row__icon">${r.icon}</span>
          <div class="list-row__body">
            <div class="list-row__title">${escapeHtml(r.title)}</div>
            <div class="list-row__sub">${escapeHtml(r.sub)}</div>
          </div>
          <span class="list-row__chev">›</span>
        </div>`);
      row.onclick = () => navigate(r.route);
      row.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(r.route); } };
      group.appendChild(row);
    });
    view.appendChild(group);
  }

  renderGroup(t('practice.groupCourse'), [
    { icon: '🗺️', title: `${t('focus.mapTitle')} (${s.level})`, sub: t('practice.mapSub'), route: '/learn' },
    { icon: '📅', title: t('daily.lesson'), sub: t('practice.dailySub'), route: '/daily' },
    { icon: '🔁', title: t('review.title'), sub: t('review.subtitle'), route: '/review' },
    { icon: '🎮', title: t('games.title'), sub: t('games.choose'), route: '/games' }
  ]);

  renderGroup(t('practice.groupConvo'), [
    { icon: '💬', title: t('func.title'), sub: t('func.subtitle'), route: '/functions' },
    { icon: '🗨️', title: t('convo.title'), sub: t('convo.subtitle'), route: '/convo' },
    { icon: '🤖', title: t('chat.title'), sub: t('chat.subtitle'), route: '/chat' },
    { icon: '🗣️', title: t('pron.title'), sub: t('pron.subtitle'), route: '/pronunciation' },
    { icon: '📅', title: t('prep.title'), sub: t('prep.cta'), route: '/prep' },
    { icon: '🗺️', title: t('adv.title'), sub: t('adv.subtitle'), route: '/adventure' }
  ]);
}
