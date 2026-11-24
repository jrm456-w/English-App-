/* Mi Cuaderno — Personal bank of real mistakes + custom saved phrases.
   Turns everyday mistakes and real-world phrases into instant Reflex Gym drills. */
import { el, clear, toast, escapeHtml } from './ui.js';
import { t } from './i18n.js';
import { getState } from './store.js';
import { speak } from './speech.js';
import { mistakeList, resolveMistake, addMyPhrase, removeMyPhrase } from './gamification.js';
import { navigate, goBack } from './router.js';

export function notebook(_p, view) {
  let activeTab = 'mistakes';

  function render() {
    clear(view);
    const mistakes = mistakeList();
    const phrases = getState().myPhrases || [];

    view.appendChild(el(`
      <div class="row" style="justify-content:space-between">
        <button class="btn btn--ghost btn--small" id="back">← ${t('common.back')}</button>
        <span class="badge pill">📓 ${mistakes.length + phrases.length}</span>
      </div>`));
    view.querySelector('#back').onclick = () => goBack('/home');

    view.appendChild(el(`<h1 class="h1">📓 ${t('notebook.title')}</h1><p class="muted">${t('notebook.subtitle')}</p>`));

    const tabs = el(`
      <div class="tabs" role="tablist">
        <button class="tab ${activeTab === 'mistakes' ? 'is-active' : ''}" id="tab-mistakes" role="tab" aria-selected="${activeTab === 'mistakes'}">
          🔧 ${t('notebook.tabMistakes')} (${mistakes.length})
        </button>
        <button class="tab ${activeTab === 'phrases' ? 'is-active' : ''}" id="tab-phrases" role="tab" aria-selected="${activeTab === 'phrases'}">
          📓 ${t('notebook.tabPhrases')} (${phrases.length})
        </button>
      </div>`);
    tabs.querySelector('#tab-mistakes').onclick = () => { activeTab = 'mistakes'; render(); };
    tabs.querySelector('#tab-phrases').onclick = () => { activeTab = 'phrases'; render(); };
    view.appendChild(tabs);

    if (activeTab === 'mistakes') renderMistakes(mistakes);
    else renderPhrases(phrases);
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

  render();
}
