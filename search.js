// Local, deterministic search. Index ONLY editorially safe text: title, summary,
// aliases. Story text, hidden titles, rewards and arbitrary fields stay excluded.
const MAX_QUERY_LENGTH = 160;
const MAX_QUERY_WORDS = 12;
const MAX_RESULTS = 30;

export function normalizeSearch(value) {
  return typeof value === 'string'
    ? value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('it')
      .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ')
    : '';
}

function oneTypo(a, b) {
  // Short and numeric words are too ambiguous to correct safely.
  if (a.length < 4 || b.length < 4 || !/^[\p{L}]+$/u.test(a + b)
      || Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) {
    const differences = [];
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) differences.push(i);
      if (differences.length > 2) return false;
    }
    if (differences.length === 1) return true;
    if (differences.length !== 2) return false;
    const [first, second] = differences;
    return second === first + 1 && a[first] === b[second] && a[second] === b[first];
  }
  const short = a.length < b.length ? a : b;
  const long = a.length < b.length ? b : a;
  let index = 0;
  while (index < short.length && short[index] === long[index]) index++;
  return short.slice(index) === long.slice(index + 1);
}

function safeFields(entry) {
  const title = normalizeSearch(entry.title.slice(0, 240));
  const summary = normalizeSearch(typeof entry.summary === 'string' ? entry.summary.slice(0, 1200) : '');
  const aliases = (Array.isArray(entry.aliases) ? entry.aliases : [])
    .filter(value => typeof value === 'string').slice(0, 32)
    .map(value => normalizeSearch(value.slice(0, 160)));
  return {
    title,
    words: [
      ...title.split(' ').map(word => ({ word, weight: 100 })),
      ...aliases.flatMap(alias => alias.split(' ').map(word => ({ word, weight: 60 }))),
      ...summary.split(' ').map(word => ({ word, weight: 40 }))
    ].filter(value => value.word)
  };
}

/**
 * Search safe catalogue entries. scope='' searches all entries; otherwise only
 * that slash-delimited section and descendants. No network, storage or mutation.
 * Every query word must match. At most one typo per word (including a swapped
 * adjacent letter) is accepted, and approximate results rank after exact ones.
 */
export function searchGuide(entries, query, { scope = '', limit = MAX_RESULTS } = {}) {
  if (!Array.isArray(entries) || typeof query !== 'string' || query.length > MAX_QUERY_LENGTH) return [];
  const normalized = normalizeSearch(query);
  const tokens = normalized.split(' ').filter(Boolean);
  if (normalized.length < 2 || !tokens.length || tokens.length > MAX_QUERY_WORDS) return [];
  const resultLimit = Number.isFinite(limit) ? Math.max(0, Math.min(MAX_RESULTS, Math.floor(limit))) : MAX_RESULTS;
  if (!resultLimit) return [];
  const scopePath = typeof scope === 'string' ? scope.replace(/^\/+|\/+$/g, '') : '';
  const ranked = [];

  for (const [position, entry] of entries.entries()) {
    if (!entry || typeof entry !== 'object' || typeof entry.title !== 'string' || !entry.title.trim()) continue;
    if (scopePath && entry.scope !== scopePath && !(typeof entry.scope === 'string' && entry.scope.startsWith(scopePath + '/'))) continue;
    const fields = safeFields(entry);
    let score = 0;
    let approximate = false;
    let matches = true;
    for (const token of tokens) {
      let best = 0;
      for (const { word, weight } of fields.words) {
        if (word === token) best = Math.max(best, weight);
        else if (token.length >= 2 && /^\p{L}+$/u.test(token) && word.startsWith(token)) best = Math.max(best, weight - 15);
      }
      if (!best) {
        for (const { word, weight } of fields.words) {
          if (oneTypo(token, word)) best = Math.max(best, weight - 30);
        }
        if (best) approximate = true;
      }
      if (!best) { matches = false; break; }
      score += best;
    }
    if (!matches) continue;
    if (fields.title === normalized) score += 2000;
    else if (fields.title.startsWith(normalized)) score += 1000;
    ranked.push({ entry, score, approximate, position });
  }
  return ranked.sort((a, b) => Number(a.approximate) - Number(b.approximate)
      || b.score - a.score || a.position - b.position)
    .slice(0, resultLimit).map(({ entry, approximate }) => ({ ...entry, approximate }));
}
