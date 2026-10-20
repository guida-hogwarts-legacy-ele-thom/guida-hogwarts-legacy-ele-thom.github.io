import { createProfileSync, SYNC_PREFIX } from './profile-sync.js?v=2.1.0';
import { KEY as LEGACY_KEY } from './progress.js';

export const OLD_ORIGIN = 'https://gabrielecappello123-blip.github.io';
export const NEW_ORIGIN = 'https://guida-hogwarts-legacy-ele-thom.github.io';
export const NEW_SITE_URL = `${NEW_ORIGIN}/`;
const profiles = ['ele', 'thom'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ITEM_ID = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,119}$/;
const LEGACY_HASHES = new Set(['#bonusTitle', '#hogsmeadeSection', '#upperSection']);

function verificationId(search) {
  const values = new URLSearchParams(search).getAll('verifica');
  return values.length === 1 && UUID.test(values[0]) ? values[0].toLowerCase() : null;
}

/** Fixed destination, never a user-supplied host. No progress or arbitrary query is copied. */
export function safeDestination(hash = '#/', search = '') {
  const target = new URL(NEW_SITE_URL);
  const verification = verificationId(search);
  if (verification) target.searchParams.set('verifica', verification);
  target.hash = typeof hash === 'string'
    && (LEGACY_HASHES.has(hash) || /^#\/(?:[a-z0-9][a-z0-9/_-]{0,240})?$/i.test(hash)) ? hash : '#/';
  return target.href;
}

// Freeze a coherent, read-only snapshot for the existing client's validators.
// Re-reading values as well as keys detects another tab changing a queued record.
function stableRecords(storage, prefix, includeLegacy) {
  function read() {
    const keys = new Set();
    for (let i = 0, length = storage.length; i < length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(prefix) || (includeLegacy && key === LEGACY_KEY)) keys.add(key);
    }
    return [...keys].sort().map(key => [key, storage.getItem(key)]).filter(([, value]) => value !== null);
  }
  let previous = read();
  for (let attempt = 0; attempt < 8; attempt++) {
    const current = read();
    if (JSON.stringify(previous) === JSON.stringify(current)) return new Map(current);
    previous = current;
  }
  throw Error('I progressi stanno cambiando in un’altra scheda. Chiudila e riprova.');
}

function readOnlyStorage(records) {
  return {
    get length() { return records.size; },
    key: index => [...records.keys()][index] ?? null,
    getItem: key => records.get(key) ?? null,
    setItem() { throw Error('Questa verifica è di sola lettura.'); },
    removeItem() { throw Error('Questa verifica è di sola lettura.'); },
  };
}

/**
 * Local preparation only. Disabled by default until the new host is owned and live.
 * inspect()/destination() never write, fetch or navigate. Call synchronize(profile)
 * only after the visitor explicitly chooses "Sincronizza e passa" and a profile.
 * It uses the original client's global queue, which includes BOTH profiles.
 */
export function createHostMigration({
  storage,
  currentOrigin = globalThis.location?.origin,
  enabled = false,
  search = globalThis.location?.search ?? '',
  fetchImpl = (...args) => globalThis.fetch(...args),
} = {}) {
  const verification = verificationId(search);
  const invalidVerification = new URLSearchParams(search).has('verifica') && !verification;
  const dataset = verification ? `verify-${verification}` : 'guide-v1';
  const prefix = `${SYNC_PREFIX}${encodeURIComponent(dataset)}:`;
  let target = storage, active = null, lastError = null;

  function inspectLocal() {
    const base = { status: 'inactive', canContinue: false, pending: { ele: 0, thom: 0 }, legacyPending: 0, rememberedProfile: null };
    if (!enabled || currentOrigin !== OLD_ORIGIN) return base;
    try {
      if (invalidVerification) throw Error('Il collegamento di verifica non è valido. Nessun progresso è stato modificato.');
      target ??= globalThis.localStorage;
      if (!target) throw Error('Memoria del browser non disponibile.');
      const records = stableRecords(target, prefix, !verification);
      const validator = createProfileSync({ storage: readOnlyStorage(records), dataset });
      const state = validator.getState();
      validator.destroy();
      if (state.status === 'storage-error') throw Error(state.error);
      base.rememberedProfile = state.profile;
      for (const [key, raw] of records) {
        if (key.startsWith(`${prefix}op:`)) base.pending[JSON.parse(raw).profile]++;
      }
      // An already imported legacy record is retained for recovery, not imported
      // again. Unrecognized legacy input blocks only an outstanding import.
      if (!verification && !records.has(`${prefix}migration`)) {
        const raw = records.get(LEGACY_KEY);
        const ids = raw === undefined ? [] : JSON.parse(raw);
        if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string' || !ITEM_ID.test(id))) {
          throw Error('I progressi precedenti non sono leggibili. Sono conservati sul vecchio indirizzo.');
        }
        base.legacyPending = new Set(ids).size;
      }
      base.canContinue = !base.legacyPending && !base.pending.ele && !base.pending.thom;
      base.status = base.canContinue ? 'ready' : 'needs-sync';
      return base;
    } catch (error) {
      return { ...base, status: 'blocked', canContinue: false, error: error.message || 'Verifica dei progressi non riuscita.' };
    }
  }

  function inspect() {
    const state = inspectLocal();
    if (state.status === 'inactive' || state.status === 'blocked') return state;
    if (active) return { ...state, canContinue: false };
    if (lastError) return { ...state, status: 'needs-sync', canContinue: false, error: lastError };
    return state;
  }

  function synchronize(profile) {
    if (!profiles.includes(profile)) throw new TypeError('Scegli Ele oppure Thom.');
    if (active) return active;
    const initial = inspectLocal();
    if (initial.status === 'inactive' || initial.status === 'blocked') return Promise.resolve(initial);
    lastError = null;
    // Capture the chosen profile. This separate client has no UI callback, so it
    // cannot switch an already rendered guide while draining the other profile.
    const client = createProfileSync({ storage: target, dataset, fetchImpl });
    active = (async () => {
      try {
        const state = await client.select(profile);
        if (state.status !== 'saved') lastError = state.error || 'Progressi non ancora sincronizzati. Riprova dal vecchio indirizzo.';
      } catch (error) {
        lastError = error.message || 'Passaggio non riuscito. I progressi restano sul vecchio indirizzo.';
      } finally {
        client.destroy();
        active = null;
      }
      return inspect();
    })();
    return active;
  }

  return {
    inspect,
    synchronize,
    destination(hash = '#/') { return inspect().canContinue ? safeDestination(hash, search) : null; },
  };
}
