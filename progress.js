// Permanent compatibility contract: never rename this key or reuse item IDs.
export const KEY = 'ele-demiguise-hogsmeade-v1';

export function readProgress(storage) {
  try {
    const target = storage ?? globalThis.localStorage;
    const raw = target.getItem(KEY);
    const values = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(values) || !values.every(id => typeof id === 'string')) {
      return { ok: false, completed: new Set() };
    }
    // Retain IDs absent from this version; opening the page must never write.
    return { ok: true, completed: new Set(values) };
  } catch (_) {
    return { ok: false, completed: new Set() };
  }
}

export function setProgress(id, checked, storage) {
  const current = readProgress(storage);
  if (!current.ok) return current;
  if (checked) current.completed.add(id);
  else current.completed.delete(id);
  try {
    (storage ?? globalThis.localStorage).setItem(KEY, JSON.stringify([...current.completed]));
    return current;
  } catch (_) {
    return { ...current, ok: false };
  }
}

export function clearProgress(storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(KEY, '[]');
    return { ok: true, completed: new Set() };
  } catch (_) {
    return { ok: false, completed: new Set() };
  }
}
