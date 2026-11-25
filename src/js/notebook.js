/* Cuaderno — Unified 3-tab personal hub: Mistakes, My Phrases & Searchable Dictionary. */
import { el, clear, toast, escapeHtml } from './ui.js';
import { t } from './i18n.js';
import { getState } from './store.js';
import { loadLevel, levels } from './data.js';
import { speak } from './speech.js';
import { mistakeList, resolveMistake, addMyPhrase, removeMyPhrase } from './gamification.js';
import { navigate } from './router.js';

let dictCache = null;
async function getDictEntries() {
  if (dictCache) return dictCache;
  const seen = new Set();
  const entries = [];
  for (const lvl of levels()) {
    const data = await loadLevel(lvl);
    for (const u of data.units) {
      for (const v of u.vocabulary) {
        const key = v.en.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        entries.push({ en: v.en, es: v.es, level: lvl });
      }
    }
  }
  entries.sort((a, b) => a.en.localeCompare(b.en));
  dictCache = entries;
  return entries;
}

export function notebook(_p, view) {
  let activeTab = 'mistakes';

  function render() {
    clear(view);
    const mistakes = mistakeList();
    const phrases = getState().myPhrases || [];

    view.appendChild(el(`
      <header class="topbar">
        <div>
          <h1 class="topbar__title">📓 ${t('notebook.title')}</h1>
          <div class="topbar__sub">${t('notebook.subtitle')}</div>
        </div>
        <span class="badge pill">${mistakes.length + phrases.length}</span>
      </header>`));

    const tabs = el(`
      <div class="seg-tabs" role="tablist">
        <button class="seg-tab ${activeTab === 'mistakes' ? 'is-active' : ''}" id="tab-mistakes" role="tab" aria-selected="${activeTab === 'mistakes'}">
          🔧 ${t('notebook.tabMistakes')} (${mistakes.length})
        </button>
        <button class="seg-tab ${activeTab === 'phrases' ? 'is-active' : ''}" id="tab-phrases" role="tab" aria-selected="${activeTab === 'phrases'}">
          📓 ${t('notebook.tabPhrases')} (${phrases.length})
        </button>
        <button class="seg-tab ${activeTab === 'dict' ? 'is-active' : ''}" id="tab-dict" role="tab" aria-selected="${activeTab === 'dict'}">
          🔤 ${t('notebook.tabDict')}
        </button>
      </div>`);
    tabs.querySelector('#tab-mistakes').onclick = () => { activeTab = 'mistakes'; render(); };
    tabs.querySelector('#tab-phrases').onclick = () => { activeTab = 'phrases'; render(); };
    tabs.querySelector('#tab-dict').onclick = () => { activeTab = 'dict'; render(); };
    view.appendChild(tabs);

    if (activeTab === 'mistakes') renderMistakes(mistakes);
    else if (activeTab === 'phrases') renderPhrases(phrases);
    else renderDictionary();
  }

  function renderMistakes(mistakes) {
    if (!mistakes.length) {
      view.appendChild(el(`
        <div class="card center">
          <div style="font-size:2.4rem">✨</div>
          <p><strong>${t('notebook.noMistakesTitle')}</strong></p>
          <p class="muted">${t('notebook.noMistakesDesc')}</p>
          <button class="btn btn--block" id="go-reflex">⚡ ${t('reflex.title')}</button>
        </div>`));
      view.querySelector('#go-reflex').onclick = () => navigate('/reflex');
      return;
    }

    const cta = el(`<button class="btn btn--accent btn--block" style="margin-bottom:14px">⚡ ${t('notebook.practiceMistakes')} (${mistakes.length})</button>`);
    cta.onclick = () => navigate('/reflex/mistakes');
    view.appendChild(cta);

    mistakes.forEach((m) => {
      const card = el(`
        <div class="card">
          <div class="row" style="justify-content:space-between;align-items:flex-start">
            <div style="flex:1">
              <strong>${escapeHtml(m.en)}</strong>
              ${m.es ? `<div class="muted" style="font-size:.9rem;margin-top:2px">${escapeHtml(m.es)}</div>` : ''}
            </div>
            <span class="badge">×${m.misses || 1}</span>
          </div>
          ${m.tip ? `<div class="muted" style="font-size:.84rem;margin-top:8px">💡 ${escapeHtml(m.tip)}</div>` : ''}
          <div class="row" style="margin-top:10px;justify-content:space-between">
            <button class="btn btn--ghost btn--small" id="say">🔊 ${t('common.listen')}</button>
            <button class="btn btn--success btn--small" id="done">✓ ${t('notebook.mastered')}</button>
          </div>
        </div>`);
      card.querySelector('#say').onclick = () => speak(m.en);
      card.querySelector('#done').onclick = () => {
        resolveMistake(m.en);
        toast('✅ ' + t('notebook.masteredToast'));
        render();
      };
      view.appendChild(card);
    });
  }

  function renderPhrases(phrases) {
    const form = el(`
      <div class="card" style="border:1px solid var(--c-primary)">
        <strong>➕ ${t('notebook.addTitle')}</strong>
        <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px">
          <input class="input" id="ph-en" placeholder="${escapeHtml(t('notebook.phEn'))}" autocomplete="off" />
          <input class="input" id="ph-es" placeholder="${escapeHtml(t('notebook.phEs'))}" autocomplete="off" />
          <input class="input" id="ph-note" placeholder="${escapeHtml(t('notebook.phNote'))}" autocomplete="off" />
          <button class="btn btn--block" id="ph-save">${t('notebook.saveBtn')}</button>
        </div>
      </div>`);
    form.querySelector('#ph-save').onclick = () => {
      const en = form.querySelector('#ph-en').value.trim();
      const es = form.querySelector('#ph-es').value.trim();
      const note = form.querySelector('#ph-note').value.trim();
      if (!en || !es) {
        toast(t('notebook.fillRequired'));
        return;
      }
      addMyPhrase({ en, es, note });
      toast('✅ ' + t('notebook.savedToast'));
      render();
    };
    view.appendChild(form);

    if (!phrases.length) {
      view.appendChild(el(`<div class="card center"><p class="muted">${t('notebook.noPhrasesDesc')}</p></div>`));
      return;
    }

    const cta = el(`<button class="btn btn--accent btn--block" style="margin-bottom:14px">⚡ ${t('notebook.practicePhrases')} (${phrases.length})</button>`);
    cta.onclick = () => navigate('/reflex/phrases');
    view.appendChild(cta);

    phrases.forEach((p) => {
      const card = el(`
        <div class="card">
          <div class="row" style="justify-content:space-between;align-items:flex-start">
            <div style="flex:1">
              <strong>${escapeHtml(p.en)}</strong>
              <div class="muted" style="font-size:.9rem;margin-top:2px">${escapeHtml(p.es)}</div>
              ${p.note ? `<div class="muted" style="font-size:.82rem;margin-top:6px">📝 ${escapeHtml(p.note)}</div>` : ''}
            </div>
            <div class="row" style="gap:6px">
              <button class="btn btn--ghost btn--small" id="say" aria-label="Listen">🔊</button>
              <button class="btn btn--ghost btn--small" id="del" aria-label="Delete">✕</button>
            </div>
          </div>
        </div>`);
      card.querySelector('#say').onclick = () => speak(p.en);
      card.querySelector('#del').onclick = () => {
        removeMyPhrase(p.id);
        render();
      };
      view.appendChild(card);
    });
  }

  async function renderDictionary() {
    const search = el(`<input class="input" id="dict-search" placeholder="${escapeHtml(t('notebook.searchDict'))}" autocomplete="off" style="margin-bottom:12px" />`);
    const list = el(`<div class="card"><p class="muted center">${t('gate.loading')}</p></div>`);
    view.appendChild(search);
    view.appendChild(list);

    const entries = await getDictEntries();

    function drawRows(filter) {
      if (activeTab !== 'dict') return;
      clear(list);
      const q = (filter || '').toLowerCase().trim();
      const rows = entries.filter((e) => !q || e.en.toLowerCase().includes(q) || e.es.toLowerCase().includes(q)).slice(0, 120);
      if (!rows.length) {
        list.appendChild(el(`<p class="muted center">${t('dict.none')}</p>`));
        return;
      }
      rows.forEach((e) => {
        const row = el(`
          <div class="setting-row">
            <div style="flex:1;min-width:0">
              <strong>${escapeHtml(e.en)}</strong> — <span class="muted">${escapeHtml(e.es)}</span>
              <span class="badge" style="font-size:.7rem;margin-left:4px">${escapeHtml(e.level)}</span>
            </div>
            <div class="row" style="gap:6px;flex-shrink:0">
              <button class="btn btn--ghost btn--small" id="d-say" aria-label="Listen">🔊</button>
              <button class="btn btn--ghost btn--small" id="d-add" title="${escapeHtml(t('notebook.addToPhrases'))}">+</button>
            </div>
          </div>`);
        row.querySelector('#d-say').onclick = () => speak(e.en);
        row.querySelector('#d-add').onclick = () => {
          addMyPhrase({ en: e.en, es: e.es, note: `${t('path.level')} ${e.level}` });
          toast('✅ ' + t('notebook.savedToast'));
          const phrasesTab = view.querySelector('#tab-phrases');
          if (phrasesTab) phrasesTab.textContent = `📓 ${t('notebook.tabPhrases')} (${(getState().myPhrases || []).length})`;
        };
        list.appendChild(row);
      });
    }

    let timer = null;
    search.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => drawRows(search.value), 140);
    });
    drawRows('');
    search.focus();
  }

  render();
}
