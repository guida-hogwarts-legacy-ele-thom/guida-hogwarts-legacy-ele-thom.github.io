import test from 'node:test';
import assert from 'node:assert/strict';
import { MOONS } from './content/demiguise.js';
import { KEY, readProgress, setProgress, clearProgress } from './progress.js';

// Implements the browser Storage contract; browser reopening still needs live QA.
class Storage {
  constructor(raw = null) { this.raw = raw; this.writes = 0; }
  getItem(key) { assert.equal(key, KEY); return this.raw; }
  setItem(key, value) { assert.equal(key, KEY); this.raw = value; this.writes++; }
}

test('keeps the existing storage key and all nine stable identifiers', () => {
  assert.equal(KEY, 'ele-demiguise-hogsmeade-v1');
  const ids = new Set(MOONS.map(moon => moon.id));
  for (const id of ['h1','h2','h3','h4','h5','h6','h7','u1','b1']) assert.ok(ids.has(id), id);
});

test('restores existing checks without writing during page opening', () => {
  const storage = new Storage('["h1","b1"]');
  assert.deepEqual([...readProgress(storage).completed], ['h1', 'b1']);
  assert.equal(storage.writes, 0);
});

test('a subsequent opening and a later version keep previously saved checks', () => {
  const storage = new Storage();
  assert.equal(setProgress('h2', true, storage).ok, true);
  assert.deepEqual([...readProgress(storage).completed], ['h2']);
  assert.equal(setProgress('u1', true, storage).ok, true);
  assert.deepEqual([...readProgress(storage).completed], ['h2', 'u1']);
});

test('a temporary rollback and another check preserve IDs from future content', () => {
  const storage = new Storage('["h1","future-moon"]');
  readProgress(storage);
  setProgress('h2', true, storage);
  assert.deepEqual(JSON.parse(storage.raw), ['h1', 'future-moon', 'h2']);
});

test('an older open tab does not overwrite a later check from another tab', () => {
  const storage = new Storage('["h1"]');
  readProgress(storage); // old tab snapshot
  setProgress('u1', true, storage); // another tab
  setProgress('h2', true, storage); // old tab acts
  assert.deepEqual(JSON.parse(storage.raw), ['h1', 'u1', 'h2']);
});

test('unchecking removes just the selected identifier', () => {
  const storage = new Storage('["h1","h2","b1","future-moon"]');
  setProgress('h2', false, storage);
  assert.deepEqual(JSON.parse(storage.raw), ['h1', 'b1', 'future-moon']);
});

for (const raw of ['invalid JSON', '{"futureSchema":2}', '["h1",42]']) {
  test(`unrecognized saved data stays untouched: ${raw}`, () => {
    const storage = new Storage(raw);
    assert.equal(readProgress(storage).ok, false);
    assert.equal(setProgress('h2', true, storage).ok, false);
    assert.equal(storage.raw, raw);
    assert.equal(storage.writes, 0);
  });
}

test('blocked browser storage reports failure without crashing', () => {
  const storage = { getItem() { throw new Error('SecurityError'); } };
  assert.equal(readProgress(storage).ok, false);
  assert.equal(setProgress('h1', true, storage).ok, false);
});

test('a full disk or quota failure keeps the old data and reports failure', () => {
  const storage = new Storage('["h1"]');
  storage.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.equal(setProgress('h2', true, storage).ok, false);
  assert.equal(storage.raw, '["h1"]');
  assert.equal(clearProgress(storage).ok, false);
});

test('an explicit reset clears checks, including the independent bonus', () => {
  const storage = new Storage('["h1","b1","future-moon"]');
  assert.equal(clearProgress(storage).ok, true);
  assert.deepEqual([...readProgress(storage).completed], []);
});
