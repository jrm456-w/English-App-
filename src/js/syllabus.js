/* Class Prep — a lightweight weekly prep sheet aligned to the real class calendar.
   No engine, no heavy state: just data (syllabus.json) + audio, so you arrive at
   class already knowing the vocabulary and useful phrases for each theme. */
import { el, clear, escapeHtml } from './ui.js';
import { t } from './i18n.js';
import { speak } from './speech.js';
import { navigate, goBack } from './router.js';

let cache = null;
async function loadSyllabus() {
  if (cache) return cache;
  const res = await fetch('./src/data/syllabus.json');
  cache = await res.json();
  return cache;
}

function sayChip(text_en, label) {
  const chip = el(`<span class="chip" role="button" tabindex="0" style="cursor:pointer;display:inline-block;margin:3px;padding:6px 10px;border:1px solid var(--c-border,#ddd);border-radius:14px">🔊 ${label}</span>`);
  chip.onclick = () => speak(text_en);
  return chip;
}

/* Which week contains today (or the next upcoming one). */
function currentWeekId(weeks) {
  const today = new Date().toISOString().slice(0, 10);
  const inRange = weeks.find((w) => today >= w.start && today <= w.end);
  if (inRange) return inRange.id;
  const upcoming = weeks.find((w) => w.start >= today);
  return (upcoming || weeks[weeks.length - 1]).id;
}

function lessonCard(ls) {
  const card = el(`<div class="card" style="margin-top:10px"></div>`);
  card.appendChild(el(`
    <div class="row" style="justify-content:space-between;align-items:baseline">
      <strong>${ls.bbc ? '📺 ' : '📘 '}Lesson ${escapeHtml(ls.num)} · ${escapeHtml(ls.title)}</strong>
      <small class="muted">${escapeHtml(ls.part)}</small>
    </div>
    <div class="muted" style="font-size:.85rem">${escapeHtml(ls.title_es)}</div>`));

  if (ls.grammar) card.appendChild(el(`<div class="badge pill" style="margin-top:6px">🔑 ${escapeHtml(ls.grammar)}</div>`));

  card.appendChild(el(`<p style="margin-top:8px"><strong>📝 ${t('prep.before')}:</strong> ${escapeHtml(ls.prep_es)}</p>`));
  if (ls.bbc) card.appendChild(el(`<p class="muted" style="font-size:.85rem">📺 ${t('prep.bbc')}</p>`));

  // Vocabulary chips (tap to hear).
  card.appendChild(el(`<div style="margin-top:6px"><strong>🗝️ ${t('prep.vocab')}</strong></div>`));
  const vwrap = el(`<div style="margin-top:4px"></div>`);
  ls.vocab.forEach((v) => vwrap.appendChild(sayChip(v.en, `${escapeHtml(v.en)} · <span class="muted">${escapeHtml(v.es)}</span>`)));
  card.appendChild(vwrap);

  // Useful phrases (tap to hear).
  card.appendChild(el(`<div style="margin-top:10px"><strong>💬 ${t('prep.phrases')}</strong></div>`));
  const pwrap = el(`<div style="margin-top:4px"></div>`);
  ls.phrases.forEach((p) => {
    const row = el(`<div class="row" style="justify-content:space-between;align-items:center;padding:5px 0;border-top:1px solid var(--c-border,#eee)"><span>${escapeHtml(p)}</span><span class="bubble__say" role="button" tabindex="0" style="cursor:pointer">🔊</span></div>`);
    row.querySelector('.bubble__say').onclick = () => speak(p);
    pwrap.appendChild(row);
  });
  card.appendChild(pwrap);

  if (ls.link) {
    const b = el(`<button class="btn btn--ghost btn--block" style="margin-top:10px">▶️ ${t('prep.openLesson')}</button>`);
    b.onclick = () => navigate(ls.link);
    card.appendChild(b);
  }
  return card;
}

export async function classPrep(_p, view) {
  const data = await loadSyllabus();
  clear(view);

  view.appendChild(el(`
    <div class="row" style="justify-content:space-between">
      <button class="btn btn--ghost btn--small" id="back">← ${t('common.back')}</button>
      <span class="badge pill">📅 ${escapeHtml(data.month)}</span>
    </div>`));
  view.querySelector('#back').onclick = () => { window.speechSynthesis && window.speechSynthesis.cancel(); goBack('/home'); };

  view.appendChild(el(`<h1 class="h1">📅 ${t('prep.title')}</h1><p class="muted">${escapeHtml(data.note_es)}</p>`));

  const curId = currentWeekId(data.weeks);

  data.weeks.forEach((w) => {
    const isNow = w.id === curId;
    const wrap = el(`<details class="card" ${isNow ? 'open' : ''} style="${isNow ? 'border:2px solid var(--c-accent)' : ''}"></details>`);
    const sum = el(`<summary style="cursor:pointer;font-weight:600;list-style:none">${isNow ? '👉 ' : ''}${escapeHtml(w.label)}${isNow ? ' · <span class="badge pill">' + t('prep.thisWeek') + '</span>' : ''}</summary>`);
    wrap.appendChild(sum);
    w.lessons.forEach((ls) => wrap.appendChild(lessonCard(ls)));
    view.appendChild(wrap);
  });

  window.scrollTo(0, 0);
}
