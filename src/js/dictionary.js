/* Built-in searchable dictionary: aggregates all vocabulary across levels. */
import { el, clear, escapeHtml } from './ui.js';
import { t } from './i18n.js';
import { loadLevel, levels } from './data.js';
import { speak } from './speech.js';

let cachedEntries = null;

async function allEntries() {
  if (cachedEntries) return cachedEntries;
  const seen = new Set();
  const entries = [];
  for (const lvl of levels()) {
    const data = await loadLevel(lvl);
    for (const u of data.units) {
      for (const v of u.vocabulary) {
        const key = v.en.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        entries.push({ en: v.en, es: v.es, level: lvl, unit: u.title });
      }
    }
  }
  entries.sort((a, b) => a.en.localeCompare(b.en));
  cachedEntries = entries;
  return entries;
}

export async function dictionary(_p, view) {
  clear(view);
  const entries = await allEntries();

  view.appendChild(el(`<h1 class="h1">📖 ${t('dict.title')}</h1>`));
  view.appendChild(el(`<p class="muted">${entries.length} ${t('dict.words')}</p>`));

  const search = el(`<input class="input" id="dict-search" placeholder="${t('dict.search')}" autocomplete="off" style="margin:8px 0 14px" aria-label="${t('dict.search')}" />`);
  view.appendChild(search);

  const list = el(`<div class="card"></div>`);
  view.appendChild(list);

  function render(filter) {
    clear(list);
    const q = (filter || '').toLowerCase().trim();
    const rows = entries.filter((e) => !q || e.en.toLowerCase().includes(q) || e.es.toLowerCase().includes(q)).slice(0, 300);
    if (!rows.length) { list.appendChild(el(`<p class="muted center">${t('dict.none')}</p>`)); return; }
    rows.forEach((e) => {
      const row = el(`
        <div class="setting-row">
          <span><strong>${escapeHtml(e.en)}</strong> — <span class="muted">${escapeHtml(e.es)}</span> <span class="badge" style="font-size:.7rem">${e.level}</span></span>
          <button class="btn btn--ghost btn--small" aria-label="Listen ${escapeHtml(e.en)}">🔊</button>
        </div>`);
      row.querySelector('button').onclick = () => speak(e.en);
      list.appendChild(row);
    });
  }

  let timer = null;
  search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => render(search.value), 150); });
  render('');
  search.focus();
}
