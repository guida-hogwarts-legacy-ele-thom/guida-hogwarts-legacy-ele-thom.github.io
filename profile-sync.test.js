import test from 'node:test';
import assert from 'node:assert/strict';

// The module is loaded dynamically so the first red test names the missing API.
const module = await import('./profile-sync.js').catch(() => ({}));

test('exports the durable profile-sync client API', () => {
  assert.equal(typeof module.createProfileSync, 'function');
});

class MemoryStorage {
  data = new Map();
  writes = [];
  failRead = false;
  failWrite = false;
  get length() { if (this.failRead) throw new Error('read blocked'); return this.data.size; }
  key(index) { if (this.failRead) throw new Error('read blocked'); return [...this.data.keys()][index] ?? null; }
  getItem(key) { if (this.failRead) throw new Error('read blocked'); return this.data.get(key) ?? null; }
  setItem(key, value) { if (this.failWrite) throw new Error('quota'); this.writes.push([key, value]); this.data.set(key, String(value)); }
  removeItem(key) { if (this.failWrite) throw new Error('quota'); this.writes.push([key, null]); this.data.delete(key); }
}

const LEGACY = 'ele-demiguise-hogsmeade-v1';
const completed = client => [...client.getState().completed].sort();
let nextUuid = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++nextUuid).padStart(12, '0')}`;
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

class MemoryApi {
  profiles = new Map();
  seen = new Set();
  calls = [];
  offline = false;
  rejectStatus = 0;
  hold = null;
  loseResponse = false;
  entry(dataset, profile) {
    const key = `${dataset}:${profile}`;
    if (!this.profiles.has(key)) this.profiles.set(key, { version: 1, profile, entries: [], values: [], revision: 0, resetRevision: 0 });
    return this.profiles.get(key);
  }
  snapshot(dataset, profile) { return structuredClone(this.entry(dataset, profile)); }
  remoteSet(profile, id, checked, dataset = 'guide-v1') {
    const value = this.entry(dataset, profile);
    value.revision++;
    value.entries = value.entries.filter(entry => entry.id !== id);
    value.entries.push({ id, checked, revision: value.revision });
  }
  fetch = async (url, options = {}) => {
    const parsed = new URL(url);
    const body = options.body ? JSON.parse(options.body) : null;
    const dataset = body?.dataset ?? parsed.searchParams.get('dataset');
    const profile = body?.profile ?? parsed.searchParams.get('profile');
    this.calls.push({ url, options, body, dataset, profile });
    if (this.offline) throw new TypeError('Failed to fetch');
    if (this.rejectStatus) return { ok: false, status: this.rejectStatus, json: async () => ({ error: 'rejected' }) };
    if (this.hold) {
      const gate = this.hold;
      this.hold = null;
      gate.started.resolve();
      await gate.release.promise;
    }
    const value = this.entry(dataset, profile);
    if (body && !this.seen.has(body.requestId)) {
      this.seen.add(body.requestId);
      if (body.type === 'reset') {
        value.revision++;
        value.resetRevision = value.revision;
        value.entries = [];
        value.values = [];
      } else if (body.type === 'set') {
        this.remoteSet(profile, body.id, body.checked, dataset);
      } else if (body.type === 'set-value') {
        value.revision++;
        value.values = value.values.filter(entry => entry.id !== body.id);
        value.values.push({ id: body.id, value: body.value, revision: value.revision });
      } else if (body.type === 'seed' && value.resetRevision === 0) {
        for (const id of body.ids) {
          if (!value.entries.some(entry => entry.id === id)) this.remoteSet(profile, id, true, dataset);
        }
      }
    }
    if (this.loseResponse && body) {
      this.loseResponse = false;
      throw new TypeError('response lost after commit');
    }
    const payload = this.snapshot(dataset, profile);
    return { ok: true, status: 200, json: async () => payload };
  };
}

function setup({ legacy = ['h1', 'future:moon'], storage = new MemoryStorage(), api = new MemoryApi(), ...options } = {}) {
  if (legacy !== null) storage.data.set(LEGACY, JSON.stringify(legacy));
  const changes = [];
  const client = module.createProfileSync({ storage, fetchImpl: api.fetch, uuid, onChange: state => changes.push(state), ...options });
  return { storage, api, client, changes };
}

test('requires a choice without writing; seeds both profiles once and leaves the legacy bytes intact', async () => {
  const { client, storage, api } = setup();
  assert.equal(client.getState().status, 'choose');
  assert.equal(storage.writes.length, 0);
  await client.select('ele');
  assert.deepEqual(completed(client), ['future:moon', 'h1']);
  assert.deepEqual(api.snapshot('guide-v1', 'thom').entries.map(entry => entry.id).sort(), ['future:moon', 'h1']);
  assert.equal(storage.getItem(LEGACY), '["h1","future:moon"]');
  assert.equal(api.calls.filter(call => call.body?.type === 'seed').length, 2);
  await client.select('thom');
  assert.equal(api.calls.filter(call => call.body?.type === 'seed').length, 2);
  assert.equal(client.getState().status, 'saved');
  assert.ok(api.calls.every(call => call.options.credentials === 'omit'));
});

test('persists optimistic changes before notifying and keeps the two profiles independent', async () => {
  const { client, api, storage, changes } = setup();
  await client.select('ele');
  api.offline = true;
  const task = client.set('h2', true);
  assert.ok(changes.at(-1).completed.has('h2'));
  assert.ok([...storage.data.values()].some(raw => raw.includes('"type":"set"') && raw.includes('"id":"h2"')));
  await task;
  assert.equal(client.getState().status, 'offline');
  assert.equal(client.getState().pending, 1);
  await client.select('thom');
  assert.deepEqual(completed(client), ['future:moon', 'h1']);
  api.offline = false;
  await client.retry();
  await client.select('ele');
  assert.deepEqual(completed(client), ['future:moon', 'h1', 'h2']);
  assert.equal(client.getState().pending, 0);
});

test('a lost POST response retries the same operation id and survives an offline reopen', async () => {
  const { client, api, storage } = setup();
  await client.select('ele');
  api.loseResponse = true;
  await client.set('future:new-id', true);
  assert.equal(client.getState().pending, 1);
  const original = api.calls.at(-1).body;
  api.offline = true;
  const reopened = module.createProfileSync({ storage, fetchImpl: api.fetch, uuid });
  assert.equal(reopened.getState().profile, 'ele');
  assert.ok(reopened.getState().completed.has('future:new-id'));
  await reopened.refresh();
  api.offline = false;
  await reopened.retry();
  const retries = api.calls.filter(call => call.body?.type === 'set');
  assert.ok(retries.every(call => call.body.requestId === original.requestId));
  assert.equal(reopened.getState().pending, 0);
  assert.equal(api.snapshot('guide-v1', 'ele').entries.filter(entry => entry.id === 'future:new-id').length, 1);
});

test('a rapid switch during a pending POST routes later edits to the captured profile', async () => {
  const { client, api } = setup();
  await client.select('ele');
  const gate = { started: deferred(), release: deferred() };
  api.hold = gate;
  const earlier = client.set('h2', true);
  await gate.started.promise;
  const switchTask = client.select('thom');
  const later = client.set('u1', true);
  assert.equal(client.getState().profile, 'thom');
  assert.ok(client.getState().completed.has('u1'));
  assert.ok(!client.getState().completed.has('h2'));
  gate.release.resolve();
  await Promise.all([earlier, switchTask, later]);
  assert.equal(api.snapshot('guide-v1', 'ele').entries.find(entry => entry.id === 'h2')?.checked, true);
  assert.equal(api.snapshot('guide-v1', 'thom').entries.find(entry => entry.id === 'u1')?.checked, true);
  assert.equal(api.snapshot('guide-v1', 'thom').entries.find(entry => entry.id === 'h2'), undefined);
  assert.equal(client.getState().profile, 'thom');
});

test('a newer queued edit stays optimistic while an older same-profile request resolves', async () => {
  const { client, api, changes } = setup();
  await client.select('ele');
  const gate = { started: deferred(), release: deferred() };
  api.hold = gate;
  const check = client.set('h2', true);
  await gate.started.promise;
  const uncheck = client.set('h2', false);
  const start = changes.length;
  gate.release.resolve();
  await Promise.all([check, uncheck]);
  assert.ok(changes.slice(start).every(state => !state.completed.has('h2')));
  assert.equal(api.snapshot('guide-v1', 'ele').entries.find(entry => entry.id === 'h2').checked, false);
});

test('two client instances append without losing each other’s queue or cached progress', async () => {
  const { client: first, api, storage } = setup();
  await first.select('ele');
  api.offline = true;
  const second = module.createProfileSync({ storage, fetchImpl: api.fetch, uuid });
  await Promise.all([first.set('h2', true), second.set('h3', true)]);
  assert.deepEqual(completed(first), ['future:moon', 'h1', 'h2', 'h3']);
  assert.deepEqual(completed(second), ['future:moon', 'h1', 'h2', 'h3']);
  api.offline = false;
  await Promise.all([first.retry(), second.retry()]);
  assert.deepEqual(api.snapshot('guide-v1', 'ele').entries.filter(entry => entry.checked).map(entry => entry.id).sort(), ['future:moon', 'h1', 'h2', 'h3']);
});

test('HTTP rejection preserves the immutable queue until an explicit retry', async () => {
  const { client, api } = setup();
  await client.select('ele');
  api.rejectStatus = 503;
  await client.set('h2', true);
  assert.equal(client.getState().status, 'error');
  assert.equal(client.getState().pending, 1);
  const requests = api.calls.length;
  await new Promise(resolve => setTimeout(resolve, 15));
  assert.equal(api.calls.length, requests);
  api.rejectStatus = 0;
  await client.retry();
  assert.equal(client.getState().status, 'saved');
  assert.equal(client.getState().pending, 0);
});

test('reset affects only the selected profile and legacy migration never revives removed IDs', async () => {
  const { client, api, storage } = setup();
  await client.select('ele');
  await client.set('h1', false);
  await client.reset();
  assert.deepEqual(completed(client), []);
  const reopened = module.createProfileSync({ storage, fetchImpl: api.fetch, uuid });
  await reopened.select('ele');
  assert.deepEqual(completed(reopened), []);
  await reopened.select('thom');
  assert.deepEqual(completed(reopened), ['future:moon', 'h1']);
  assert.equal(storage.getItem(LEGACY), '["h1","future:moon"]');
  assert.equal(api.calls.filter(call => call.body?.type === 'seed').length, 2);
});

for (const raw of ['{broken', '["h1",9]', '{"h1":true}']) {
  test(`malformed legacy data is preserved and blocks importing: ${raw}`, async () => {
    const storage = new MemoryStorage();
    storage.data.set(LEGACY, raw);
    const { client, api } = setup({ storage, legacy: null });
    await client.select('ele');
    assert.equal(client.getState().status, 'storage-error');
    assert.equal(storage.getItem(LEGACY), raw);
    assert.equal(storage.writes.length, 0);
    assert.equal(api.calls.length, 0);
  });
}

test('malformed new data remains byte-for-byte intact and blocks posting changes', async () => {
  const { client, storage, api } = setup();
  await client.select('ele');
  const raw = '{"version":999,"queue":[]}';
  const key = `${client.storagePrefix}op:damaged`;
  storage.data.set(key, raw);
  const writes = storage.writes.length;
  const calls = api.calls.length;
  await client.set('h2', true);
  assert.equal(client.getState().status, 'storage-error');
  assert.equal(storage.getItem(key), raw);
  assert.equal(storage.writes.length, writes);
  assert.equal(api.calls.length, calls);
});

test('storage read/write errors preserve the prior displayed state and do not send an undurable edit', async () => {
  const { client, storage, api } = setup();
  await client.select('ele');
  const before = api.calls.length;
  storage.failWrite = true;
  await client.set('h2', true);
  assert.equal(client.getState().status, 'storage-error');
  assert.deepEqual(completed(client), ['future:moon', 'h1']);
  assert.equal(api.calls.length, before);
  storage.failWrite = false;
  storage.failRead = true;
  await client.set('h2', true);
  assert.equal(client.getState().status, 'storage-error');
  assert.deepEqual(completed(client), ['future:moon', 'h1']);
  assert.equal(api.calls.length, before);
});

test('a stale GET snapshot cannot replace a newer cached server revision', async () => {
  const { client, storage, api } = setup();
  await client.select('ele');
  const stale = api.snapshot('guide-v1', 'ele');
  await client.set('h2', true);
  const newer = api.snapshot('guide-v1', 'ele');
  assert.ok(newer.revision > stale.revision);
  const staleFetch = async () => ({ ok: true, status: 200, json: async () => stale });
  const reopened = module.createProfileSync({ storage, fetchImpl: staleFetch, uuid });
  await reopened.refresh();
  assert.ok(reopened.getState().completed.has('h2'));
});

test('verification datasets isolate local storage and never read the legacy key', async () => {
  const storage = new MemoryStorage();
  storage.data.set(LEGACY, '{broken');
  const api = new MemoryApi();
  const client = module.createProfileSync({ storage, fetchImpl: api.fetch, uuid, dataset: 'verify-00000000-0000-4000-8000-000000000099' });
  await client.select('ele');
  assert.equal(client.getState().status, 'saved');
  assert.deepEqual(completed(client), []);
  assert.ok(api.calls.every(call => call.dataset.startsWith('verify-')));
  assert.ok(client.isRelevantStorageKey(client.preferenceKey));
  assert.ok(!client.isRelevantStorageKey(LEGACY));
  assert.equal(storage.getItem(LEGACY), '{broken');
  const normal = module.createProfileSync({ storage, fetchImpl: api.fetch, uuid });
  assert.equal(normal.getState().profile, null);
});

test('an offline reopened queue is never described as already saved online', async () => {
  const { client, storage, api } = setup();
  await client.select('ele');
  api.offline = true;
  await client.set('h2', true);
  const reopened = module.createProfileSync({ storage, fetchImpl: api.fetch, uuid });
  assert.equal(reopened.getState().pending, 1);
  assert.equal(reopened.getState().status, 'offline');
});

test('a refresh requested during a GET performs another GET after the in-flight response', async () => {
  const { client, storage, api } = setup();
  await client.select('ele');
  const gate = { started: deferred(), release: deferred() };
  let gets = 0;
  const fetchImpl = async () => {
    const snapshot = api.snapshot('guide-v1', 'ele');
    if (++gets === 1) { gate.started.resolve(); await gate.release.promise; }
    return { ok: true, status: 200, json: async () => snapshot };
  };
  const reopened = module.createProfileSync({ storage, fetchImpl, uuid });
  const first = reopened.refresh();
  await gate.started.promise;
  api.remoteSet('ele', 'h3', true);
  const second = reopened.refresh();
  gate.release.resolve();
  await Promise.all([first, second]);
  assert.ok(reopened.getState().completed.has('h3'));
  assert.equal(gets, 2);
});

test('concurrent removal during Storage enumeration cannot hide another pending operation', async () => {
  const { client, storage, api } = setup();
  await client.select('ele');
  api.offline = true;
  await client.set('h2', true);
  await client.set('h3', true);
  await client.set('u1', true);
  const operations = [...storage.data.keys()].filter(key => key.startsWith(`${client.storagePrefix}op:`));
  const originalKey = storage.key.bind(storage);
  let removeOnce = true;
  storage.key = index => {
    const key = originalKey(index);
    if (key === operations[0] && removeOnce) { removeOnce = false; storage.data.delete(key); }
    return key;
  };
  assert.ok(client.getState().completed.has('h3'));
  assert.ok(client.getState().completed.has('u1'));
});

test('obsolete immutable cache snapshots are pruned after a newer durable snapshot', async () => {
  const storage = new MemoryStorage();
  const baseSet = storage.setItem.bind(storage);
  storage.setItem = (key, value) => {
    const next = new Map(storage.data);
    next.set(key, value);
    if ([...next].reduce((bytes, [name, raw]) => bytes + name.length + raw.length, 0) > 2048) throw new Error('quota');
    baseSet(key, value);
  };
  const { client } = setup({ storage });
  await client.select('ele');
  for (let turn = 0; turn < 50; turn++) {
    await client.set('h2', turn % 2 === 0);
    assert.equal(client.getState().status, 'saved', `toggle ${turn}`);
  }
  assert.ok([...storage.data.keys()].filter(key => key.startsWith(`${client.storagePrefix}cache:`)).length <= 2);
});

test('a fresh device migration respects explicit false entries and remote reset tombstones', async () => {
  const { client, api } = setup();
  await client.select('ele');
  await client.set('h1', false);
  await client.select('thom');
  await client.reset();
  const freshStorage = new MemoryStorage();
  const { client: fresh } = setup({ storage: freshStorage, api });
  await fresh.select('ele');
  assert.deepEqual(completed(fresh), ['future:moon']);
  await fresh.select('thom');
  assert.deepEqual(completed(fresh), []);
});

test('a previously committed lost-response operation cannot revive progress after a remote reset', async () => {
  const { client, api } = setup();
  await client.select('ele');
  api.loseResponse = true;
  await client.set('h2', true);
  const remote = api.entry('guide-v1', 'ele');
  remote.revision++;
  remote.resetRevision = remote.revision;
  remote.entries = [];
  await client.retry();
  assert.equal(client.getState().pending, 0);
  assert.deepEqual(completed(client), []);
});

test('invalid server snapshots preserve the pending operation for a later valid retry', async () => {
  const { client, api, storage } = setup();
  await client.select('ele');
  api.offline = true;
  await client.set('h2', true);
  const invalid = module.createProfileSync({ storage, uuid, fetchImpl: async () => ({
    ok: true, status: 200, json: async () => ({ version: 99, profile: 'ele', entries: [], revision: 100, resetRevision: 0 }),
  }) });
  await invalid.retry();
  assert.equal(invalid.getState().status, 'error');
  assert.equal(invalid.getState().pending, 1);
  assert.ok(invalid.getState().completed.has('h2'));
  api.offline = false;
  await client.retry();
  assert.equal(client.getState().pending, 0);
});

test('an accepted POST with a failed local cache write remains pending under its original request id', async () => {
  const { client, api, storage } = setup();
  await client.select('ele');
  const originalFetch = api.fetch;
  let failAfterPost = true;
  const reopened = module.createProfileSync({ storage, uuid, fetchImpl: async (...args) => {
    const response = await originalFetch(...args);
    if (failAfterPost && args[1]?.method === 'POST') { storage.failWrite = true; failAfterPost = false; }
    return response;
  } });
  await reopened.set('h2', true);
  assert.equal(reopened.getState().status, 'storage-error');
  assert.equal(reopened.getState().pending, 1);
  const operationId = api.calls.at(-1).body.requestId;
  storage.failWrite = false;
  await reopened.retry();
  assert.equal(reopened.getState().status, 'saved');
  assert.equal(reopened.getState().pending, 0);
  const posts = api.calls.filter(call => call.body?.id === 'h2');
  assert.equal(posts.length, 2);
  assert.ok(posts.every(call => call.body.requestId === operationId));
});

test('bounded request timeout aborts transport, retains the queue, and explicit retry recovers', async () => {
  const storage = new MemoryStorage();
  const api = new MemoryApi();
  let hang = false;
  let hungSignal;
  const fetchImpl = (url, options) => {
    if (!hang) return api.fetch(url, options);
    hungSignal = options.signal;
    return new Promise((resolve, reject) => options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
  };
  const client = module.createProfileSync({ storage, fetchImpl, uuid, requestTimeoutMs: 10 });
  await client.select('ele');
  hang = true;
  const result = await Promise.race([client.set('h2', true), new Promise(resolve => setTimeout(() => resolve('timeout missing'), 70))]);
  assert.notEqual(result, 'timeout missing');
  assert.equal(hungSignal.aborted, true);
  assert.equal(client.getState().status, 'offline');
  assert.equal(client.getState().pending, 1);
  hang = false;
  await client.retry();
  assert.equal(client.getState().status, 'saved');
  assert.equal(client.getState().pending, 0);
});

test('completed request timeout timers are cleared and destroy aborts an active request without notifying', async () => {
  const storage = new MemoryStorage();
  const api = new MemoryApi();
  const signals = [];
  let hang = false;
  const started = deferred();
  let notifications = 0;
  const fetchImpl = (url, options) => {
    signals.push(options.signal);
    if (!hang) return api.fetch(url, options);
    started.resolve();
    return new Promise((resolve, reject) => options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
  };
  const client = module.createProfileSync({ storage, fetchImpl, uuid, requestTimeoutMs: 10, onChange: () => notifications++ });
  await client.select('ele');
  await new Promise(resolve => setTimeout(resolve, 15));
  assert.ok(signals.every(signal => signal && !signal.aborted));
  hang = true;
  const task = client.set('h2', true);
  await started.promise;
  const before = notifications;
  client.destroy();
  const result = await Promise.race([task, new Promise(resolve => setTimeout(() => resolve('destroy did not abort'), 70))]);
  assert.notEqual(result, 'destroy did not abort');
  assert.equal(signals.at(-1).aborted, true);
  assert.equal(notifications, before);
  assert.equal(client.getState().pending, 1);
});

test('a remembered profile without any verified server cache is never labelled saved', () => {
  const storage = new MemoryStorage();
  storage.data.set(module.PREFERENCE_KEY, JSON.stringify({ version: 1, profile: 'ele' }));
  const client = module.createProfileSync({ storage, uuid });
  assert.equal(client.getState().profile, 'ele');
  assert.notEqual(client.getState().status, 'saved');
  assert.equal(storage.writes.length, 0);
});

for (const invalidId of ['future moon', 'a'.repeat(121)]) {
  test(`legacy IDs outside the server contract remain untouched without partial migration: ${invalidId.slice(0, 20)}`, async () => {
    const { client, storage, api } = setup({ legacy: ['h1', invalidId] });
    const raw = storage.getItem(LEGACY);
    await client.select('ele');
    assert.equal(client.getState().status, 'storage-error');
    assert.equal(storage.getItem(LEGACY), raw);
    assert.equal(storage.writes.length, 0);
    assert.equal(api.calls.length, 0);
  });
}

test('129 valid legacy future IDs are migrated in bounded seed batches without dropping IDs', async () => {
  const ids = Array.from({ length: 129 }, (_, index) => `future:${index}`);
  const { client, api, storage } = setup({ legacy: ids });
  const raw = storage.getItem(LEGACY);
  await client.select('ele');
  assert.deepEqual(completed(client), [...ids].sort());
  assert.deepEqual(api.snapshot('guide-v1', 'thom').entries.map(entry => entry.id).sort(), [...ids].sort());
  const seeds = api.calls.filter(call => call.body?.type === 'seed');
  assert.equal(seeds.length, 4);
  assert.ok(seeds.every(call => call.body.ids.length <= 128));
  assert.equal(storage.getItem(LEGACY), raw);
});

test('an incompatible persisted operation is preserved and blocks posting instead of poisoning the queue', async () => {
  const { client, storage, api } = setup();
  await client.select('ele');
  api.offline = true;
  await client.set('h2', true);
  const key = [...storage.data.keys()].find(key => key.startsWith(`${client.storagePrefix}op:`));
  const operation = JSON.parse(storage.getItem(key));
  const raw = JSON.stringify({ ...operation, id: 'future moon' });
  storage.data.set(key, raw);
  const calls = api.calls.length;
  const writes = storage.writes.length;
  api.offline = false;
  await client.retry();
  assert.equal(client.getState().status, 'storage-error');
  assert.equal(storage.getItem(key), raw);
  assert.equal(api.calls.length, calls);
  assert.equal(storage.writes.length, writes);
});


test('three states and scalar zero survive reopen while moon flags stay independent', async () => {
  const { client, storage, api } = setup();
  await client.select('ele');
  assert.deepEqual([...client.getState().values], []);
  for (const value of ['doing', 'done', 'todo']) {
    await client.setValue('status:quest', value);
    assert.equal(client.getState().values.get('status:quest'), value);
  }
  await client.setValue('demiguise:handed-in', 0);
  await client.setValue('demiguise:alohomora-level', 2);
  const reopened = module.createProfileSync({ storage, fetchImpl: api.fetch, uuid });
  assert.equal(reopened.getState().values.get('status:quest'), 'todo');
  assert.equal(reopened.getState().values.get('demiguise:handed-in'), 0);
  assert.equal(reopened.getState().values.get('demiguise:alohomora-level'), 2);
  assert.deepEqual(completed(reopened), ['future:moon', 'h1']);
  reopened.getState().values.set('status:quest', 'done');
  assert.equal(reopened.getState().values.get('status:quest'), 'todo');
});

test('offline scalar edits survive reopen and same-ID transitions preserve the newest intent', async () => {
  const { client, storage, api, changes } = setup();
  await client.select('ele');
  api.offline = true;
  await client.setValue('status:quest', 'doing');
  await client.setValue('status:quest', 'done');
  const reopened = module.createProfileSync({ storage, fetchImpl: api.fetch, uuid });
  assert.equal(reopened.getState().values.get('status:quest'), 'done');
  assert.equal(reopened.getState().pending, 2);
  assert.equal(reopened.getState().status, 'offline');
  api.offline = false;
  await reopened.retry();
  assert.equal(reopened.getState().values.get('status:quest'), 'done');
  assert.equal(reopened.getState().pending, 0);
  assert.ok(changes.some(state => state.values.get('status:quest') === 'doing'));
});

test('scalar edits capture their profile during a rapid profile switch', async () => {
  const { client, api } = setup();
  await client.select('ele');
  const gate = { started: deferred(), release: deferred() };
  api.hold = gate;
  const first = client.setValue('status:quest', 'doing');
  await gate.started.promise;
  const switchTask = client.select('thom');
  const second = client.setValue('status:quest', 'done');
  assert.equal(client.getState().values.get('status:quest'), 'done');
  gate.release.resolve();
  await Promise.all([first, switchTask, second]);
  assert.equal(api.snapshot('guide-v1', 'ele').values[0].value, 'doing');
  assert.equal(api.snapshot('guide-v1', 'thom').values[0].value, 'done');
});

test('scalar lost-response retry retains UUID and ignores newer remote value replay', async () => {
  const { client, api } = setup();
  await client.select('ele');
  api.loseResponse = true;
  await client.setValue('status:quest', 'doing');
  const operation = api.calls.at(-1).body;
  const remote = api.entry('guide-v1', 'ele');
  remote.values[0] = { id: 'status:quest', value: 'done', revision: ++remote.revision };
  await client.retry();
  assert.equal(client.getState().values.get('status:quest'), 'done');
  assert.equal(client.getState().pending, 0);
  const posts = api.calls.filter(call => call.body?.type === 'set-value');
  assert.ok(posts.every(call => call.body.requestId === operation.requestId));
});

test('old cache without scalar field remains readable and view never writes', () => {
  const storage = new MemoryStorage();
  storage.data.set(module.PREFERENCE_KEY, JSON.stringify({ version: 1, profile: 'ele' }));
  storage.data.set(`${module.SYNC_PREFIX}guide-v1:cache:ele:7`, JSON.stringify({ version: 1, profile: 'ele', entries: [{ id: 'h1', checked: true, revision: 7 }], revision: 7, resetRevision: 0 }));
  const client = module.createProfileSync({ storage, uuid });
  assert.deepEqual(completed(client), ['h1']);
  assert.deepEqual([...client.getState().values], []);
  assert.equal(storage.writes.length, 0);
});

test('invalid scalar inputs and malformed scalar cache cannot overwrite existing data', async () => {
  const { client, storage, api } = setup();
  await client.select('ele');
  for (const value of [true, {}, [], -1, 1.5, 1000001, 'started', undefined]) {
    assert.throws(() => client.setValue('status:quest', value), TypeError);
  }
  const key = [...storage.data.keys()].find(key => key.includes('cache:ele:'));
  const cache = JSON.parse(storage.getItem(key));
  const raw = JSON.stringify({ ...cache, values: [{ id: 'status:quest', value: {}, revision: cache.revision }] });
  storage.data.set(key, raw);
  const before = api.calls.length;
  await client.setValue('status:quest', 'done');
  assert.equal(client.getState().status, 'storage-error');
  assert.equal(storage.getItem(key), raw);
  assert.equal(api.calls.length, before);
});

test('stale server snapshot cannot erase a newer scalar state', async () => {
  const { client, storage, api } = setup();
  await client.select('ele');
  const stale = api.snapshot('guide-v1', 'ele');
  await client.setValue('status:quest', 'done');
  const reopened = module.createProfileSync({ storage, uuid, fetchImpl: async () => ({ ok: true, status: 200, json: async () => stale }) });
  await reopened.refresh();
  assert.equal(reopened.getState().values.get('status:quest'), 'done');
});
