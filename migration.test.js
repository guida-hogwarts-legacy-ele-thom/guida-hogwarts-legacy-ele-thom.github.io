import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfileSync, SYNC_PREFIX } from './profile-sync.js';

const migration = await import('./migration.js').catch(() => ({}));
const OLD = 'https://gabrielecappello123-blip.github.io';
const NEW = 'https://guida-hogwarts-legacy-ele-thom.github.io';
const PREFIX = `${SYNC_PREFIX}guide-v1:`;
const LEGACY = 'ele-demiguise-hogsmeade-v1';
const VERIFY = '11111111-1111-4111-8111-111111111111';
let sequence = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`;

class Storage {
  data = new Map(); writes = []; failRead = false;
  get length() { if (this.failRead) throw Error('storage unavailable'); return this.data.size; }
  key(i) { return [...this.data.keys()][i] ?? null; }
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { this.writes.push([key, value]); this.data.set(key, String(value)); }
  removeItem(key) { this.writes.push([key, null]); this.data.delete(key); }
}

// Only the network boundary is simulated. Queue parsing, migration, retries and
// durable acknowledgements use the unchanged production profile-sync client.
class Api {
  profiles = new Map(); seen = new Set(); calls = []; offline = false; loseResponse = false;
  get(profile, dataset = 'guide-v1') {
    const key = `${dataset}:${profile}`;
    if (!this.profiles.has(key)) this.profiles.set(key, { version: 1, profile, revision: 0, resetRevision: 0, entries: [], values: [] });
    return this.profiles.get(key);
  }
  fetch = async (url, options = {}) => {
    const parsed = new URL(url), body = options.body ? JSON.parse(options.body) : null;
    const profile = body?.profile ?? parsed.searchParams.get('profile');
    const dataset = body?.dataset ?? parsed.searchParams.get('dataset');
    this.calls.push({ body, profile, dataset });
    if (this.offline) throw Error('offline');
    const state = this.get(profile, dataset);
    if (body && !this.seen.has(`${profile}:${body.requestId}`)) {
      this.seen.add(`${profile}:${body.requestId}`); state.revision++;
      if (body.type === 'set') {
        state.entries = state.entries.filter(e => e.id !== body.id);
        state.entries.push({ id: body.id, checked: body.checked, revision: state.revision });
      } else if (body.type === 'set-value') {
        state.values = state.values.filter(e => e.id !== body.id);
        state.values.push({ id: body.id, value: body.value, revision: state.revision });
      } else if (body.type === 'seed' && state.resetRevision === 0) {
        for (const id of body.ids) if (!state.entries.some(e => e.id === id)) state.entries.push({ id, checked: true, revision: state.revision });
      }
    }
    if (body && this.loseResponse) { this.loseResponse = false; throw Error('response lost'); }
    return { ok: true, status: 200, json: async () => structuredClone(state) };
  };
}
const make = (storage, api = new Api(), options = {}) => migration.createHostMigration({ storage, fetchImpl: api.fetch, currentOrigin: OLD, enabled: true, ...options });
function queued(storage, profile, data) {
  const requestId = uuid();
  storage.setItem(`${PREFIX}op:${requestId}`, JSON.stringify({ version: 1, profile, requestId, order: sequence, ...data }));
  return requestId;
}
const markImported = storage => storage.setItem(`${PREFIX}migration`, JSON.stringify({ version: 1, done: true }));

test('migration exports its controller and fixed destination', () => {
  assert.equal(typeof migration.createHostMigration, 'function');
  assert.equal(typeof migration.safeDestination, 'function');
});

test('opening and inspecting are read-only, with migration disabled by default', () => {
  const storage = new Storage(), api = new Api();
  queued(storage, 'thom', { type: 'set', id: 'h1', checked: true });
  const before = [...storage.data], writes = storage.writes.length;
  const disabled = make(storage, api, { enabled: false });
  assert.equal(disabled.inspect().status, 'inactive');
  const guard = make(storage, api);
  assert.deepEqual(guard.inspect().pending, { ele: 0, thom: 1 });
  assert.equal(guard.inspect().canContinue, false);
  assert.equal(guard.destination('#/'), null);
  assert.deepEqual([...storage.data], before);
  assert.equal(storage.writes.length, writes);
  assert.equal(api.calls.length, 0);
});

test('legacy data blocks passage until an explicit profile action drains both profiles', async () => {
  const storage = new Storage(), api = new Api();
  storage.setItem(LEGACY, JSON.stringify(['h1', 'u1', 'future:moon']));
  const ele = queued(storage, 'ele', { type: 'set-value', id: 'status:quest', value: 'doing' });
  const thom = queued(storage, 'thom', { type: 'set', id: 'h1', checked: false });
  const guard = make(storage, api);
  assert.equal(guard.inspect().legacyPending, 3);
  assert.deepEqual(guard.inspect().pending, { ele: 1, thom: 1 });
  assert.equal(api.calls.length, 0);
  const result = await guard.synchronize('ele');
  assert.equal(result.status, 'ready');
  assert.equal(result.canContinue, true);
  assert.deepEqual(result.pending, { ele: 0, thom: 0 });
  assert.equal(api.get('thom').entries.find(e => e.id === 'h1').checked, false);
  assert.equal(api.get('ele').entries.find(e => e.id === 'future:moon').checked, true);
  assert.equal(api.get('ele').values.find(e => e.id === 'status:quest').value, 'doing');
  assert.ok(api.calls.some(c => c.body?.requestId === ele));
  assert.ok(api.calls.some(c => c.body?.requestId === thom));
  assert.equal(storage.getItem(LEGACY), JSON.stringify(['h1', 'u1', 'future:moon']));
  assert.equal(JSON.parse(storage.getItem(`${PREFIX}selected`)).profile, 'ele');
  assert.ok(api.calls.every(c => c.dataset === 'guide-v1'));
});

test('offline passage preserves every queued UUID and never claims ready', async () => {
  const storage = new Storage(), api = new Api(); markImported(storage);
  const a = queued(storage, 'ele', { type: 'set-value', id: 'demiguise:handed-in', value: 0 });
  const b = queued(storage, 'thom', { type: 'set', id: 'h7', checked: true });
  api.offline = true;
  const guard = make(storage, api);
  const offline = await guard.synchronize('thom');
  assert.equal(offline.canContinue, false);
  assert.equal(guard.destination('#/sblocchi/demiguise'), null);
  assert.ok(storage.getItem(`${PREFIX}op:${a}`));
  assert.ok(storage.getItem(`${PREFIX}op:${b}`));
  api.offline = false;
  assert.equal((await guard.synchronize('thom')).canContinue, true);
  assert.equal(api.get('ele').values.find(e => e.id === 'demiguise:handed-in').value, 0);
  assert.equal(api.get('thom').entries.find(e => e.id === 'h7').checked, true);
});

test('lost response retries the original receipt instead of generating a new edit', async () => {
  const storage = new Storage(), api = new Api(); markImported(storage);
  const id = queued(storage, 'thom', { type: 'set-value', id: 'status:quest', value: 'done' });
  api.loseResponse = true;
  const guard = make(storage, api);
  assert.equal((await guard.synchronize('ele')).canContinue, false);
  assert.ok(storage.getItem(`${PREFIX}op:${id}`));
  const revision = api.get('thom').revision;
  assert.equal((await guard.synchronize('ele')).canContinue, true);
  assert.equal(api.get('thom').revision, revision);
  assert.deepEqual(api.calls.filter(c => c.body).map(c => c.body.requestId), [id, id]);
});

test('unknown, malformed and unreadable local state blocks passage without mutation', async () => {
  for (const [key, value] of [
    [`${PREFIX}future-format`, '{}'], [`${PREFIX}op:${uuid()}`, '{broken'],
    [LEGACY, '{broken'], [LEGACY, '["bad id"]'], [`${PREFIX}cache:ele:4`, '{"version":99}']
  ]) {
    const storage = new Storage(), api = new Api(); storage.setItem(key, value);
    const before = [...storage.data], count = storage.writes.length, guard = make(storage, api);
    assert.equal(guard.inspect().status, 'blocked');
    assert.equal((await guard.synchronize('ele')).canContinue, false);
    assert.deepEqual([...storage.data], before);
    assert.equal(storage.writes.length, count);
    assert.equal(api.calls.length, 0);
  }
  const storage = new Storage(); storage.failRead = true;
  assert.equal(make(storage).inspect().status, 'blocked');
});

test('a new queue entry before departure is detected even after a successful sync', async () => {
  const storage = new Storage(), api = new Api(); markImported(storage);
  const guard = make(storage, api);
  assert.equal((await guard.synchronize('ele')).canContinue, true);
  queued(storage, 'thom', { type: 'set', id: 'b1', checked: true });
  assert.equal(guard.inspect().canContinue, false);
  assert.equal(guard.destination('#/'), null);
});

test('new and unrelated hosts stay inactive and cannot run old-origin migration', async () => {
  for (const currentOrigin of [NEW, 'https://unrelated.example', `${OLD}.example`]) {
    const storage = new Storage(), api = new Api(), guard = make(storage, api, { currentOrigin });
    assert.equal(guard.inspect().status, 'inactive');
    assert.equal((await guard.synchronize('ele')).canContinue, false);
    assert.equal(api.calls.length, 0);
    assert.equal(storage.writes.length, 0);
  }
});

test('the fixed HTTPS destination preserves only valid guide hashes and QA UUIDs', () => {
  assert.equal(migration.safeDestination('#/sblocchi/demiguise'), `${NEW}/#/sblocchi/demiguise`);
  assert.equal(migration.safeDestination('#bonusTitle'), `${NEW}/#bonusTitle`);
  assert.equal(migration.safeDestination('#/missioni/secondarie/q-com-24', `?verifica=${VERIFY}&progress=private`), `${NEW}/?verifica=${VERIFY}#/missioni/secondarie/q-com-24`);
  for (const hash of ['https://evil.example', '#//evil.example', '#/javascript:evil', '#/x?progress=private', '#/a\\b']) {
    assert.equal(migration.safeDestination(hash, '?next=https://evil.example&token=private'), `${NEW}/#/`);
  }
  for (const query of ['?verifica=bad', `?verifica=${VERIFY}&verifica=${VERIFY}`, '?progress=private']) {
    assert.equal(migration.safeDestination('#/', query), `${NEW}/#/`);
  }
});

test('QA mode drains only the isolated verification dataset and ignores personal legacy', async () => {
  const storage = new Storage(), api = new Api(); storage.setItem(LEGACY, '["h1"]');
  queued(storage, 'thom', { type: 'set', id: 'u1', checked: true });
  const personalBefore = [...storage.data], dataset = `verify-${VERIFY}`;
  const guard = make(storage, api, { search: `?verifica=${VERIFY}` });
  assert.equal(guard.inspect().legacyPending, 0);
  assert.deepEqual(guard.inspect().pending, { ele: 0, thom: 0 });
  assert.equal((await guard.synchronize('ele')).canContinue, true);
  assert.ok(api.calls.every(c => c.dataset === dataset));
  for (const [key, value] of personalBefore) assert.equal(storage.getItem(key), value);
  assert.equal(guard.destination('#/'), `${NEW}/?verifica=${VERIFY}#/`);
});

test('invalid or duplicate QA selectors cannot silently fall back to personal progress', async () => {
  for (const search of ['?verifica=invalid', `?verifica=${VERIFY}&verifica=${VERIFY}`]) {
    const storage = new Storage(), api = new Api();
    queued(storage, 'ele', { type: 'set', id: 'h1', checked: true });
    const before = [...storage.data], guard = make(storage, api, { search });
    assert.equal(guard.inspect().status, 'blocked');
    assert.equal((await guard.synchronize('ele')).canContinue, false);
    assert.equal(api.calls.length, 0);
    assert.deepEqual([...storage.data], before);
  }
});

test('new-origin client reads shared progress after migration with fresh local storage', async () => {
  const oldStorage = new Storage(), api = new Api(); markImported(oldStorage);
  queued(oldStorage, 'ele', { type: 'set', id: 'h1', checked: true });
  queued(oldStorage, 'thom', { type: 'set-value', id: 'status:quest', value: 'doing' });
  assert.equal((await make(oldStorage, api).synchronize('ele')).canContinue, true);
  const newStorage = new Storage();
  const client = createProfileSync({ storage: newStorage, fetchImpl: api.fetch });
  await client.select('ele'); assert.ok(client.getState().completed.has('h1'));
  await client.select('thom'); assert.equal(client.getState().values.get('status:quest'), 'doing');
  client.destroy();
});
