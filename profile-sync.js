import { KEY as LEGACY_KEY } from './progress.js';

export const API_BASE = 'https://demiguise-progressi.leigan.chatgpt.site';
export const SYNC_PREFIX = 'demiguise-profile-sync-v1:';
export const PREFERENCE_KEY = `${SYNC_PREFIX}guide-v1:selected`;

const profiles = ['ele', 'thom'];
const isProfile = value => profiles.includes(value);
const isId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9:_-]{0,119}$/.test(value);
const isRevision = value => Number.isSafeInteger(value) && value >= 0;
const isValue = value => value === null || ['todo', 'doing', 'done'].includes(value)
  || (Number.isSafeInteger(value) && value >= 0 && value <= 1000000);
const isUuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const localLocks = new WeakMap();

class StorageProblem extends Error {}
class HttpProblem extends Error {}

// Web Locks serializes transports across browser tabs. The module-local mutex also
// serializes clients sharing a Storage object in older browsers and in tests.
function exclusively(storage, name, locks, action) {
  if (locks?.request) return locks.request(name, { mode: 'exclusive' }, action);
  const previous = localLocks.get(storage) ?? Promise.resolve();
  const task = previous.catch(() => {}).then(action);
  localLocks.set(storage, task);
  return task;
}

function validateSnapshot(value, profile) {
  if (!value || value.version !== 1 || value.profile !== profile || !isRevision(value.revision)
      || !isRevision(value.resetRevision) || value.resetRevision > value.revision || !Array.isArray(value.entries)) return false;
  const ids = new Set();
  const validEntries = value.entries.every(entry => {
    if (!entry || !isId(entry.id) || typeof entry.checked !== 'boolean' || !isRevision(entry.revision)
        || entry.revision > value.revision || ids.has(entry.id)) return false;
    ids.add(entry.id);
    return true;
  });
  // Older caches and older server snapshots have no values field. Preserve their
  // existing meaning, while rejecting malformed future values without rewriting.
  if (!validEntries || (value.values !== undefined && !Array.isArray(value.values))) return false;
  const valueIds = new Set();
  return (value.values ?? []).every(entry => {
    if (!entry || !isId(entry.id) || !isValue(entry.value) || !isRevision(entry.revision)
        || entry.revision > value.revision || valueIds.has(entry.id)) return false;
    valueIds.add(entry.id);
    return true;
  });
}

function validateOperation(value) {
  return value && value.version === 1 && isProfile(value.profile) && isUuid(value.requestId)
    && Number.isSafeInteger(value.order) && value.order >= 0
    && (value.type === 'reset' || (value.type === 'set' && isId(value.id) && typeof value.checked === 'boolean')
      || (value.type === 'set-value' && isId(value.id) && isValue(value.value))
      || (value.type === 'seed' && Array.isArray(value.ids) && value.ids.length <= 128 && value.ids.every(isId)));
}

/**
 * Durable, guest-profile sync. No write or network request happens on creation.
 * Every returned Set and Map is a copy. Methods resolve to the latest state, including
 * honest storage/network failure states; only invalid caller arguments throw.
 */
export function createProfileSync({
  storage,
  fetchImpl = (...args) => globalThis.fetch(...args),
  baseUrl = API_BASE,
  dataset = 'guide-v1',
  namespace = dataset,
  onChange = () => {},
  uuid = () => globalThis.crypto.randomUUID(),
  now = () => Date.now(),
  locks = globalThis.navigator?.locks,
  requestTimeoutMs = 20000,
} = {}) {
  if (typeof dataset !== 'string' || !/^guide-v1$|^verify-[0-9a-f-]{36}$/i.test(dataset)) throw new TypeError('Dataset non valido.');
  if (typeof namespace !== 'string' || !namespace) throw new TypeError('Namespace non valido.');
  if (!Number.isFinite(requestTimeoutMs) || requestTimeoutMs <= 0) throw new TypeError('Timeout non valido.');
  const storagePrefix = `${SYNC_PREFIX}${encodeURIComponent(namespace)}:`;
  const preferenceKey = `${storagePrefix}selected`;
  const migrationKey = `${storagePrefix}migration`;
  let target = storage;
  let selected = null;
  let storageFailure = null;
  let transportFailure = null;
  let busy = false;
  let active = null;
  let destroyed = false;
  let remembered = { operations: [], caches: {}, migration: false, preference: null };
  const refreshes = new Set();
  const controllers = new Set();

  function readStorage() {
    try {
      target ??= globalThis.localStorage;
      if (!target) throw new Error('Memoria del browser non disponibile.');
      const value = { operations: [], caches: {}, cacheKeys: [], migration: false, preference: null };
      const listKeys = () => {
        const keys = [];
        const length = target.length;
        for (let index = 0; index < length; index++) {
          const key = target.key(index);
          if (key?.startsWith(storagePrefix)) keys.push(key);
        }
        return [...new Set(keys)].sort();
      };
      // Removing a Storage key shifts every later index. Obtain the same key
      // list twice so an acknowledgement in another tab cannot hide a queued
      // operation and let a later one overtake it. Bound churn instead of polling.
      let keys = listKeys();
      let stable = false;
      for (let attempt = 0; attempt < 8; attempt++) {
        const next = listKeys();
        if (JSON.stringify(keys) === JSON.stringify(next)) { stable = true; break; }
        keys = next;
      }
      if (!stable) throw new Error('Dati locali in modifica in un’altra scheda. Riprova.');
      for (const key of keys) {
        const raw = target.getItem(key);
        if (raw === null) continue;
        const item = JSON.parse(raw);
        if (key === preferenceKey) {
          if (item?.version !== 1 || !isProfile(item.profile)) throw new Error('Profilo locale non valido.');
          value.preference = item.profile;
        } else if (key === migrationKey) {
          if (item?.version !== 1 || item.done !== true) throw new Error('Migrazione locale non valida.');
          value.migration = true;
        } else if (key.startsWith(`${storagePrefix}op:`)) {
          if (!validateOperation(item) || key !== `${storagePrefix}op:${item.requestId}`) throw new Error('Operazione locale non valida.');
          value.operations.push(item);
        } else if (key.startsWith(`${storagePrefix}cache:`)) {
          if (!isProfile(item?.profile) || !validateSnapshot(item, item.profile)
              || key !== `${storagePrefix}cache:${item.profile}:${item.revision}`) throw new Error('Copia locale non valida.');
          value.cacheKeys.push({ key, profile: item.profile, revision: item.revision });
          if (!value.caches[item.profile] || item.revision > value.caches[item.profile].revision) value.caches[item.profile] = item;
        } else {
          throw new Error('Formato locale sconosciuto.');
        }
      }
      value.operations.sort((a, b) => a.order - b.order || a.requestId.localeCompare(b.requestId));
      remembered = value;
      return value;
    } catch (error) {
      throw new StorageProblem(`I dati locali non sono leggibili. ${error.message}`);
    }
  }

  function write(key, value) {
    // Never overwrite an unknown/corrupt record, even if a tab was open before
    // corruption appeared. Independent immutable keys avoid queue lost updates.
    readStorage();
    try { target.setItem(key, JSON.stringify(value)); }
    catch (error) { throw new StorageProblem(`Salvataggio locale non riuscito. ${error.message}`); }
  }

  function queue(profile, type, payload = {}) {
    const current = readStorage();
    const requestId = uuid();
    if (!isUuid(requestId)) throw new StorageProblem('Identificativo operazione non disponibile.');
    const order = Math.max(Math.floor(now()), ...current.operations.map(operation => operation.order + 1), 0);
    const operation = { version: 1, profile, requestId, order, type, ...payload };
    const key = `${storagePrefix}op:${requestId}`;
    if (target.getItem(key) !== null) throw new StorageProblem('Identificativo operazione duplicato.');
    write(key, operation);
  }

  function ensureMigration() {
    if (readStorage().migration) return;
    let ids = [];
    if (dataset === 'guide-v1') {
      try {
        const raw = target.getItem(LEGACY_KEY);
        ids = raw === null ? [] : JSON.parse(raw);
        if (!Array.isArray(ids) || !ids.every(isId)) throw new Error('Formato dei progressi precedenti non valido.');
        ids = [...new Set(ids)];
      } catch (error) {
        throw new StorageProblem(`I progressi precedenti sono conservati e non sono stati importati. ${error.message}`);
      }
      // Marker goes last. A crash between writes can only cause a repeated seed,
      // which the API safely ignores for explicit false entries and after reset.
      const batches = [];
      for (let index = 0; index < ids.length; index += 128) batches.push(ids.slice(index, index + 128));
      if (!batches.length) batches.push([]);
      for (const profile of profiles) for (const batch of batches) queue(profile, 'seed', { ids: batch });
    }
    write(migrationKey, { version: 1, done: true });
  }

  function getState() {
    let current;
    try { current = readStorage(); }
    catch (error) { storageFailure = error; current = remembered; }
    const cache = current.caches[selected];
    const entries = new Map((cache?.entries ?? []).map(entry => [entry.id, entry.checked]));
    const values = new Map((cache?.values ?? []).map(entry => [entry.id, entry.value]));
    const operations = current.operations.filter(operation => operation.profile === selected);
    let reset = (cache?.resetRevision ?? 0) > 0;
    for (const operation of operations) {
      if (operation.type === 'reset') { entries.clear(); values.clear(); reset = true; }
      else if (operation.type === 'set') entries.set(operation.id, operation.checked);
      else if (operation.type === 'set-value') values.set(operation.id, operation.value);
      else if (!reset) for (const id of operation.ids) if (!entries.has(id)) entries.set(id, true);
    }
    const completed = new Set([...entries].filter(([, checked]) => checked).map(([id]) => id));
    let status = !selected ? 'choose' : busy ? 'syncing' : 'saved';
    let error;
    if (selected && operations.length && !busy) {
      status = 'offline';
      error = 'Modifiche conservate sul dispositivo, da sincronizzare.';
    }
    if (selected && !cache && !busy && !operations.length) {
      status = 'offline';
      error = 'Progressi non ancora verificati sul server. Riprova per sincronizzare.';
    }
    if (transportFailure && selected) { status = transportFailure.status; error = transportFailure.message; }
    if (storageFailure) { status = 'storage-error'; error = storageFailure.message; }
    return { profile: selected, completed, values, pending: operations.length, status, ...(error ? { error } : {}) };
  }

  function emit() {
    const state = getState();
    if (!destroyed) onChange(state);
    return state;
  }

  function failStorage(error) {
    storageFailure = error instanceof StorageProblem ? error : new StorageProblem(error.message);
    return Promise.resolve(emit());
  }

  function persistSnapshot(snapshot, profile) {
    if (!validateSnapshot(snapshot, profile)) throw new HttpProblem('Risposta del server non valida.');
    const current = readStorage();
    if ((current.caches[profile]?.revision ?? -1) < snapshot.revision) {
      write(`${storagePrefix}cache:${profile}:${snapshot.revision}`, snapshot);
    }
    // Retain the newest durable cache for each profile. Prune only after the
    // replacement is saved, so quota/cleanup failures never discard that cache
    // or the still-unacknowledged operation. All operation IDs stay immutable.
    const saved = readStorage();
    for (const cache of saved.cacheKeys) {
      if (cache.profile !== profile || cache.revision >= saved.caches[profile].revision) continue;
      readStorage();
      try { target.removeItem(cache.key); }
      catch (error) { throw new StorageProblem(`Pulizia della copia locale non riuscita. ${error.message}`); }
    }
  }

  async function request(profile, operation) {
    const controller = new AbortController();
    controllers.add(controller);
    let onAbort;
    const aborted = new Promise((resolve, reject) => {
      onAbort = () => {
        const error = new Error(controller.signal.reason?.message ?? 'Sincronizzazione interrotta.');
        error.syncOffline = true;
        reject(error);
      };
      controller.signal.addEventListener('abort', onAbort, { once: true });
    });
    const timer = setTimeout(() => controller.abort(new Error('Il server non risponde. Riprova per sincronizzare.')), requestTimeoutMs);
    const transport = async () => {
      const url = operation
        ? `${baseUrl.replace(/\/$/, '')}/api/progress`
        : `${baseUrl.replace(/\/$/, '')}/api/progress?profile=${profile}&dataset=${encodeURIComponent(dataset)}`;
      const options = { credentials: 'omit', cache: 'no-store', signal: controller.signal };
      if (operation) {
        const { version, order, ...body } = operation;
        Object.assign(options, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, dataset }) });
      }
      let response;
      try { response = await fetchImpl(url, options); }
      catch (cause) {
        const error = new Error(cause?.message ?? String(cause));
        error.syncOffline = true;
        throw error;
      }
      if (!response.ok) throw new HttpProblem(`Sincronizzazione non riuscita (HTTP ${response.status}). Riprova.`);
      try { return await response.json(); }
      catch (_) { throw new HttpProblem('Risposta del server non leggibile. Riprova.'); }
    };
    let snapshot;
    try { snapshot = await Promise.race([transport(), aborted]); }
    finally {
      clearTimeout(timer);
      controller.signal.removeEventListener('abort', onAbort);
      controllers.delete(controller);
    }
    persistSnapshot(snapshot, profile);
  }

  async function drain() {
    try {
      await exclusively(target, `${storagePrefix}transport`, locks, async () => {
        while (!destroyed) {
          const current = readStorage();
          const operation = current.operations[0];
          if (operation) {
            await request(operation.profile, operation);
            readStorage();
            try { target.removeItem(`${storagePrefix}op:${operation.requestId}`); }
            catch (error) { throw new StorageProblem(`Conferma locale non riuscita. ${error.message}`); }
            emit();
          } else if (refreshes.size) {
            const profile = refreshes.values().next().value;
            refreshes.delete(profile);
            try { await request(profile); }
            catch (error) { refreshes.add(profile); throw error; }
            emit();
          } else break;
        }
      });
    } catch (error) {
      if (error instanceof StorageProblem) storageFailure = error;
      else transportFailure = { status: error.syncOffline ? 'offline' : 'error', message: error.syncOffline
        ? 'Connessione non disponibile: modifiche conservate sul dispositivo. Riprova per sincronizzare.' : error.message };
    } finally {
      busy = false;
      active = null;
      emit();
    }
    return getState();
  }

  function work() {
    if (destroyed) return Promise.resolve(getState());
    if (active) return active;
    busy = true;
    transportFailure = null;
    emit();
    active = drain();
    return active;
  }

  function select(profile) {
    if (!isProfile(profile)) throw new TypeError('Profilo non valido.');
    try {
      readStorage();
      ensureMigration();
      write(preferenceKey, { version: 1, profile });
      selected = profile;
      storageFailure = null;
      refreshes.add(profile);
      emit();
      return work();
    } catch (error) { return failStorage(error); }
  }

  function mutate(type, payload) {
    if (!selected) return Promise.resolve(getState());
    try {
      ensureMigration();
      queue(selected, type, payload);
      storageFailure = null;
      emit(); // Optimistic display follows, and never precedes, durable storage.
      return work();
    } catch (error) { return failStorage(error); }
  }

  function refresh() {
    if (!selected) return Promise.resolve(emit());
    try {
      readStorage();
      ensureMigration();
      storageFailure = null;
      refreshes.add(selected);
      emit();
      return work();
    } catch (error) { return failStorage(error); }
  }

  try { selected = readStorage().preference; }
  catch (error) { storageFailure = error; }

  return {
    storagePrefix,
    preferenceKey,
    isRelevantStorageKey: key => key === null || (typeof key === 'string' && key.startsWith(storagePrefix)),
    select,
    set(id, checked) {
      if (!isId(id) || typeof checked !== 'boolean') throw new TypeError('Spunta non valida.');
      return mutate('set', { id, checked });
    },
    setValue(id, value) {
      if (!isId(id) || !isValue(value)) throw new TypeError('Valore di progresso non valido.');
      return mutate('set-value', { id, value });
    },
    reset: () => mutate('reset'),
    refresh,
    retry: refresh,
    getState,
    destroy() {
      destroyed = true;
      refreshes.clear();
      for (const controller of controllers) controller.abort(new Error('Pagina chiusa.'));
    },
  };
}
