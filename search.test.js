import test from 'node:test';
import assert from 'node:assert/strict';

const module = await import('./search.js').catch(() => ({}));
const run = (...args) => {
  assert.equal(typeof module.searchGuide, 'function', 'searchGuide must be exported');
  return module.searchGuide(...args);
};
const entries = [
  { id: 'guide', title: 'Demiguise e Alohomora', summary: 'Lune e statuette nei luoghi della guida.', aliases: ['luna', 'serrature'], scope: 'sblocchi/demiguise', route: '#/sblocchi/demiguise' },
  { id: 'h2', title: 'Testa di Porco', summary: 'Hogsmeade · Dietro il bancone', aliases: ['luna', 'demiguise'], scope: 'sblocchi/demiguise', route: '#/sblocchi/demiguise/h2' },
  { id: 'h5', title: 'Stratchy & Sons', summary: 'Abbigliamento per maghi · Hogsmeade', aliases: ['luna'], scope: 'sblocchi/demiguise', route: '#/sblocchi/demiguise/h5' },
  { id: 'quest', title: 'Missione da scoprire', summary: 'Una guida alle scelte.', aliases: [], scope: 'missioni/secondarie', route: '#/missioni/secondarie', spoilerTitle: 'La morte del personaggio', body: 'Tradimento segretissimo', fullTitle: 'La morte del personaggio' },
  { id: 'potion', title: 'Pozioni', summary: 'Ingredienti e preparazione', aliases: ['ricette'], scope: 'pratiche/pozioni', route: '#/pratiche/pozioni' }
];

test('exports local search and accent normalizer', () => {
  assert.equal(typeof module.searchGuide, 'function');
  assert.equal(typeof module.normalizeSearch, 'function');
});
test('finds titles ignoring accents, case, punctuation and repeated spaces', () => {
  assert.equal(run(entries, '  TÉSTA—di   PÓRCO  ')[0].id, 'h2');
  assert.equal(run(entries, 'STRATCHY sons')[0].id, 'h5');
  assert.equal(module.normalizeSearch(' Abilità,  POZIONI! '), 'abilita pozioni');
});
test('requires every query token even across safe title, summary and aliases', () => {
  assert.deepEqual(run(entries, 'luna hogsmeade porco').map(x => x.id), ['h2']);
  assert.deepEqual(run(entries, 'porco ingredienti'), []);
});
test('supports explicit safe aliases without changing the entry', () => {
  const before = structuredClone(entries);
  assert.equal(run(entries, 'serrature')[0].id, 'guide');
  assert.equal(run(entries, 'ricette')[0].id, 'potion');
  assert.deepEqual(entries, before);
  assert.equal('approximate' in entries[0], false);
});
test('scope includes exactly the section and descendants, never similar prefixes', () => {
  const extra = [...entries, { id: 'other', title: 'Luna', scope: 'sblocchissimo', route: '#/other' }];
  assert.ok(run(extra, 'luna', { scope: 'sblocchi' }).every(x => x.scope.startsWith('sblocchi/')));
  assert.deepEqual(run(entries, 'luna', { scope: 'missioni' }), []);
  assert.equal(run(entries, 'porco', { scope: 'sblocchi/demiguise' })[0].id, 'h2');
  assert.equal(run(entries, 'luna', { scope: '' }).length, 3);
});
test('ranking prefers exact title then title prefix before summary and aliases', () => {
  const ranked = [
    { id: 'summary', title: 'Guida generale', summary: 'Demiguise', scope: '' },
    { id: 'alias', title: 'Serrature', aliases: ['demiguise'], scope: '' },
    { id: 'prefix', title: 'Demiguise e Alohomora', scope: '' },
    { id: 'exact', title: 'Demiguise', scope: '' }
  ];
  const result = run(ranked, 'demiguise');
  assert.deepEqual(result.slice(0, 2).map(x => x.id), ['exact', 'prefix']);
  assert.ok(result.every(x => x.approximate === false));
});
test('equal relevance preserves catalogue order', () => {
  const same = ['c', 'a', 'b'].map(id => ({ id, title: 'Luna', summary: 'Uguale', scope: '' }));
  assert.deepEqual(run(same, 'luna').map(x => x.id), ['c', 'a', 'b']);
});
test('allows one missing or wrong character in longer words and labels approximate matches', () => {
  assert.equal(run(entries, 'demiguie')[0].id, 'guide');
  assert.equal(run(entries, 'demiguie')[0].approximate, true);
  assert.equal(run(entries, 'poroc')[0].id, 'h2');
  assert.equal(run(entries, 'poroc')[0].approximate, true);
  assert.equal(run(entries, 'demiguise')[0].approximate, false);
});
test('exact matches rank before approximate ones', () => {
  const variants = [{ id: 'fuzzy', title: 'Luna' }, { id: 'exact', title: 'Lune' }];
  assert.deepEqual(run(variants, 'lune').map(x => x.id), ['exact', 'fuzzy']);
});
test('does not fuzz short words, wildly different words or numeric tokens', () => {
  assert.deepEqual(run(entries, 'xxx'), []);
  assert.deepEqual(run(entries, 'demxxuise'), []);
  assert.deepEqual(run([{ id: 'a', title: 'Livello 1' }], 'livello 2'), []);
  assert.deepEqual(run([{ id: 'a', title: 'Tomi' }], 'tom'), [{ id: 'a', title: 'Tomi', approximate: false }]);
});
test('never indexes unapproved plot fields, identifier, route or nested values', () => {
  for (const word of ['morte', 'tradimento', 'segretissimo', 'quest']) {
    assert.deepEqual(run(entries, word), []);
  }
  assert.equal(run(entries, 'missione')[0].title, 'Missione da scoprire');
});
test('empty, single-letter, malformed and excessive queries return no results', () => {
  for (const value of ['', '  ', 'a', null, undefined, {}, 'luna '.repeat(50), Array(13).fill('luna').join(' ')]) {
    assert.deepEqual(run(entries, value), []);
  }
});
test('limits returned results to a safe finite integer no greater than 30', () => {
  const many = Array.from({ length: 60 }, (_, id) => ({ id: String(id), title: 'Luna' }));
  assert.equal(run(many, 'luna').length, 30);
  assert.equal(run(many, 'luna', { limit: 999 }).length, 30);
  assert.equal(run(many, 'luna', { limit: 2.8 }).length, 2);
  assert.equal(run(many, 'luna', { limit: 0 }).length, 0);
  assert.equal(run(many, 'luna', { limit: -1 }).length, 0);
});
test('invalid optional fields and entries do not break search', () => {
  assert.deepEqual(run(null, 'luna'), []);
  assert.deepEqual(run([null, 1, 'string', {}, { id: 'x', title: 5 }], 'luna'), []);
  assert.equal(run([{ id: 'x', title: 'Luna', aliases: [null, {}, 'statua'], summary: null }], 'statua')[0].id, 'x');
});
test('plain-text query cannot create a result or alter the returned label', () => {
  assert.deepEqual(run(entries, '<img src=x onerror=alert(1)>'), []);
  assert.equal(run(entries, 'porco')[0].title, 'Testa di Porco');
});
