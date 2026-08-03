/* Web Speech API helpers with graceful fallbacks. */
import { getState } from './store.js';

export function ttsSupported() {
  return 'speechSynthesis' in window;
}

/* Global speech rate: slower when the 🐢 setting is on (easier listening). */
export function currentRate() {
  return getState().slowAudio ? 0.7 : 0.92;
}

let cachedVoice = null;
function pickEnglishVoice() {
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  cachedVoice =
    voices.find((v) => /en[-_]US/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang)) ||
    null;
  return cachedVoice;
}
if (ttsSupported()) {
  window.speechSynthesis.onvoiceschanged = () => { cachedVoice = null; pickEnglishVoice(); };
}

/* Speak an English string aloud. Returns true if TTS was available. */
export function speak(text, { rate, lang = 'en-US' } = {}) {
  if (!ttsSupported()) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate ?? currentRate();
  const v = pickEnglishVoice();
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
  return true;
}

/* Speak, then run a callback when the audio finishes (used for hands-free flow). */
export function speakThen(text, cb, { lang = 'en-US' } = {}) {
  if (!ttsSupported()) { setTimeout(cb, 200); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = currentRate();
  const v = pickEnglishVoice();
  if (v) u.voice = v;
  let done = false;
  const finish = () => { if (!done) { done = true; cb(); } };
  u.onend = finish;
  u.onerror = finish;
  setTimeout(finish, Math.min(9000, 1500 + text.length * 90)); // safety net
  window.speechSynthesis.speak(u);
}

export function sttSupported() {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

/* Listen once and resolve with the recognized transcript (lowercased). */
export function listenOnce({ lang = 'en-US', timeoutMs = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return reject(new Error('unsupported'));
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    let settled = false;
    const timer = setTimeout(() => { if (!settled) { settled = true; try { rec.stop(); } catch {} reject(new Error('timeout')); } }, timeoutMs);

    rec.onresult = (e) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      const results = Array.from(e.results[0]).map((r) => r.transcript.trim().toLowerCase());
      resolve(results);
    };
    rec.onerror = (e) => { if (!settled) { settled = true; clearTimeout(timer); reject(new Error(e.error || 'error')); } };
    rec.onend = () => { if (!settled) { settled = true; clearTimeout(timer); reject(new Error('no-speech')); } };
    try { rec.start(); } catch (err) { clearTimeout(timer); reject(err); }
  });
}

/* Normalize text for lenient comparison (strip punctuation/case).
   Hyphens count as spaces so "hard-working" === "hard working", and curly
   apostrophes match straight ones so "don’t" === "don't". */
export function normalize(s) {
  return s.toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[-–—/]/g, ' ')
    .replace(/[^a-z0-9\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
