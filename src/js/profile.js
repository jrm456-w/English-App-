/* Perfil — Unified Progress + Settings hub with instant level switcher. */
import { el, clear, toast, escapeHtml } from './ui.js';
import { t, setLang, applyTranslations } from './i18n.js';
import { getState, setState, resetState } from './store.js';
import { levels } from './data.js';
import { navigate } from './router.js';
import { progress } from './views.js';
import { cloudEnabled, getUser, onUser, signIn, signOutCloud } from './cloud.js';

let authSub = false;

export function profile(params, view) {
  let activeTab = (params && params.tab) === 'settings' ? 'settings' : 'progress';

  function render() {
    const s = getState();
    const user = getUser();
    clear(view);

    /* ---- Top Profile Summary Card ---- */
    const displayUser = user ? (user.email || user.displayName || 'Google') : t('profile.guest');
    const header = el(`
      <div class="studio-card">
        <div class="row" style="justify-content:space-between;align-items:center">
          <div>
            <h1 class="topbar__title" style="margin:0">👤 ${t('nav.profile')}</h1>
            <div class="topbar__sub">${escapeHtml(displayUser)}</div>
          </div>
          <span class="badge pill">${escapeHtml(s.level)}</span>
        </div>
        <div class="row" style="margin-top:12px;gap:6px" id="lvl-pills"></div>
      </div>`);

    const lvlPills = header.querySelector('#lvl-pills');
    levels().forEach((L) => {
      const chip = el(`<button class="level-chip ${s.level === L ? 'is-active' : ''}">${L}</button>`);
      chip.onclick = () => {
        setState({ level: L });
        toast(`${t('home.level')}: ${L}`);
        render();
      };
      lvlPills.appendChild(chip);
    });
    view.appendChild(header);

    /* ---- Segmented Tab Switcher ---- */
    const tabs = el(`
      <div class="seg-tabs" role="tablist">
        <button class="seg-tab ${activeTab === 'progress' ? 'is-active' : ''}" id="p-prog" role="tab" aria-selected="${activeTab === 'progress'}">
          📈 ${t('nav.progress')}
        </button>
        <button class="seg-tab ${activeTab === 'settings' ? 'is-active' : ''}" id="p-set" role="tab" aria-selected="${activeTab === 'settings'}">
          ⚙️ ${t('nav.settings')}
        </button>
      </div>`);
    tabs.querySelector('#p-prog').onclick = () => { activeTab = 'progress'; renderBody(); updateTabState(); };
    tabs.querySelector('#p-set').onclick = () => { activeTab = 'settings'; renderBody(); updateTabState(); };
    view.appendChild(tabs);

    const body = el(`<div id="profile-body"></div>`);
    view.appendChild(body);

    function updateTabState() {
      const pBtn = tabs.querySelector('#p-prog');
      const sBtn = tabs.querySelector('#p-set');
      pBtn.classList.toggle('is-active', activeTab === 'progress');
      sBtn.classList.toggle('is-active', activeTab === 'settings');
      pBtn.setAttribute('aria-selected', String(activeTab === 'progress'));
      sBtn.setAttribute('aria-selected', String(activeTab === 'settings'));
    }

    async function renderBody() {
      clear(body);
      if (activeTab === 'progress') {
        await progress({}, body);
      } else {
        renderSettings(body);
      }
    }

    function renderSettings(container) {
      const st = getState();
      const card = el(`<div class="card"></div>`);

      // Theme
      const dark = el(`
        <div class="setting-row">
          <span>${t('settings.theme')}</span>
          <label class="switch"><input type="checkbox" id="dark" ${st.theme === 'dark' ? 'checked' : ''}><span class="switch__slider"></span></label>
        </div>`);
      dark.querySelector('#dark').onchange = (e) => {
        const th = e.target.checked ? 'dark' : 'light';
        setState({ theme: th });
        document.documentElement.dataset.theme = th;
        document.getElementById('app').dataset.theme = th;
        document.querySelector('meta[name="theme-color"]').setAttribute('content', th === 'dark' ? '#0D0F14' : '#0F9D58');
      };
      card.appendChild(dark);

      // Slow audio
      const slow = el(`
        <div class="setting-row">
          <span>🐢 ${t('settings.slowAudio')}</span>
          <label class="switch"><input type="checkbox" id="slow" ${st.slowAudio ? 'checked' : ''}><span class="switch__slider"></span></label>
        </div>`);
      slow.querySelector('#slow').onchange = (e) => setState({ slowAudio: e.target.checked });
      card.appendChild(slow);

      // Language
      const lang = el(`
        <div class="setting-row">
          <span>${t('settings.language')}</span>
          <select class="select" id="lang">
            <option value="es" ${st.lang === 'es' ? 'selected' : ''}>Español</option>
            <option value="en" ${st.lang === 'en' ? 'selected' : ''}>English</option>
          </select>
        </div>`);
      lang.querySelector('#lang').onchange = (e) => {
        setLang(e.target.value);
        render();
      };
      card.appendChild(lang);
      container.appendChild(card);

      // Account / Cloud sync
      const acc = el(`<div class="card"></div>`);
      acc.appendChild(el(`<strong>☁️ ${t('auth.account')}</strong>`));
      if (!cloudEnabled()) {
        acc.appendChild(el(`<p class="muted" style="margin:8px 0 0">${t('auth.notConfigured')}</p>`));
      } else if (user) {
        acc.appendChild(el(`<p style="margin:8px 0">${t('auth.signedInAs')}<br><strong>${escapeHtml(user.email || user.displayName || 'Google')}</strong></p>`));
        acc.appendChild(el(`<p class="muted" style="margin:0 0 8px">${t('auth.synced')}</p>`));
        const out = el(`<button class="btn btn--ghost btn--block">${t('auth.signOut')}</button>`);
        out.onclick = async () => { await signOutCloud(); location.reload(); };
        acc.appendChild(out);
      } else {
        acc.appendChild(el(`<p class="muted" style="margin:8px 0">${t('auth.syncDesc')}</p>`));
        const inBtn = el(`<button class="btn btn--block">${t('auth.signIn')}</button>`);
        inBtn.onclick = async () => {
          inBtn.disabled = true;
          const r = await signIn();
          if (!r.ok && r.reason !== 'unavailable') toast(t('auth.error'));
        };
        acc.appendChild(inBtn);
      }
      container.appendChild(acc);

      // Actions
      const actions = el(`<div class="card"></div>`);
      const retake = el(`<button class="btn btn--ghost btn--block" style="margin-bottom:10px">${t('settings.retakeQuiz')}</button>`);
      retake.onclick = () => navigate('/quiz');
      const reset = el(`<button class="btn btn--block" style="background:var(--c-danger);box-shadow:none">${t('settings.reset')}</button>`);
      reset.onclick = () => {
        if (confirm(t('settings.reset.confirm'))) {
          resetState();
          document.documentElement.dataset.theme = 'light';
          document.getElementById('app').dataset.theme = 'light';
          document.querySelector('meta[name="theme-color"]').setAttribute('content', '#0F9D58');
          applyTranslations();
          navigate('/quiz');
        }
      };
      actions.appendChild(retake);
      actions.appendChild(reset);
      container.appendChild(actions);

      container.appendChild(el(`<p class="muted center" style="margin-top:16px">EngFlow · Studio 2.0 · ${t('settings.about')}: PWA offline para aprender inglés.</p>`));
    }

    if (!authSub) {
      authSub = true;
      onUser(() => {
        const cur = location.hash.replace(/^#/, '');
        if (cur.startsWith('/profile') || cur.startsWith('/settings') || cur.startsWith('/progress')) {
          render();
        }
      });
    }

    renderBody();
  }

  render();
}
