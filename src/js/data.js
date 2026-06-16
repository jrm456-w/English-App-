/* Loads and caches lesson data + the diagnostic quiz. */
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
const cache = {};

export function levels() { return LEVELS.slice(); }

export async function loadLevel(level) {
  const key = level.toLowerCase();
  if (cache[key]) return cache[key];
  const res = await fetch(`./src/data/${key}.json`);
  if (!res.ok) throw new Error(`No data for level ${level}`);
  const json = await res.json();
  cache[key] = json;
  return json;
}

export async function loadStories() {
  if (cache.stories) return cache.stories;
  const res = await fetch('./src/data/stories.json');
  const json = await res.json();
  cache.stories = json.stories;
  return json.stories;
}

export async function getStory(id) {
  const stories = await loadStories();
  return stories.find((s) => s.id === id);
}

export async function loadQuiz() {
  if (cache.quiz) return cache.quiz;
  const res = await fetch('./src/data/quiz.json');
  const json = await res.json();
  cache.quiz = json;
  return json;
}

export async function getUnit(level, unitId) {
  const data = await loadLevel(level);
  return data.units.find((u) => u.id === unitId);
}

/* Pull a pool of vocabulary across all units in a level. */
export async function vocabPool(level) {
  const data = await loadLevel(level);
  return data.units.flatMap((u) => u.vocabulary.map((v) => ({ ...v, unitId: u.id })));
}
