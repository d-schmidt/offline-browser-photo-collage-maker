'use strict';

/**
 * Browser-local shelf of the last deleted or replaced photos. The original
 * stays in memory for the one-step undo; this module keeps a downscaled copy in
 * localStorage so the shelf survives a reload. Entries are deduplicated by a
 * content hash, newest first, capped at ten.
 */
const History = (() => {
  const STORAGE_KEY = 'photoCollage.history.v1';
  const LIMIT = 10;
  // 800 px on the longer side keeps ten photos inside the usual 5 MB
  // localStorage budget while still looking sharp in ordinary collage boxes.
  const MAX_SIDE = 800;
  const QUALITY = 0.8;

  let entries = [];
  let loaded = false;
  // Saving decodes a photo, so serialize the writes; two quick deletes must
  // not race for the same newest slot.
  let queue = Promise.resolve();

  const isStoredEntry = (entry) =>
    Boolean(
      entry &&
        typeof entry.hash === 'string' &&
        typeof entry.data === 'string' &&
        entry.data.startsWith('data:image/') &&
        Number.isFinite(entry.width) &&
        Number.isFinite(entry.height) &&
        entry.width > 0 &&
        entry.height > 0,
    );

  const persist = () => {
    // Work on a copy: when storage is unavailable, every write fails and the
    // in-memory shelf must survive untouched. When only the quota is tight,
    // trimming the oldest photos lets the newest ones persist.
    let list = entries;
    for (;;) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        entries = list;
        return true;
      } catch {
        if (list.length <= 1) return false;
        list = list.slice(0, -1);
      }
    }
  };

  const load = () => {
    if (loaded) return entries;
    loaded = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return entries;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        entries = parsed.filter(isStoredEntry).slice(0, LIMIT);
      }
    } catch {
      // Private modes and disabled storage simply start with an empty shelf.
      entries = [];
    }
    return entries;
  };

  /** Stable content key so the same photo never fills two slots. */
  const hashOf = async (blob) => {
    if (
      blob &&
      typeof blob.arrayBuffer === 'function' &&
      window.crypto &&
      crypto.subtle
    ) {
      try {
        const digest = await crypto.subtle.digest(
          'SHA-256',
          await blob.arrayBuffer(),
        );
        return Array.from(new Uint8Array(digest), (byte) =>
          byte.toString(16).padStart(2, '0'),
        ).join('');
      } catch {
        // Some file:// origins hide SubtleCrypto; fall back to the descriptor.
      }
    }
    if (blob) {
      return `blob:${blob.size}:${blob.type}:${blob.name || ''}:${
        blob.lastModified || 0
      }`;
    }
    return null;
  };

  const downscale = (image) =>
    new Promise((resolve) => {
      const objectUrl = image.blob ? URL.createObjectURL(image.blob) : null;
      const element = new Image();
      element.decoding = 'async';
      const done = (result) => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        resolve(result);
      };
      element.onload = () => {
        const sourceW = element.naturalWidth || image.width;
        const sourceH = element.naturalHeight || image.height;
        if (!sourceW || !sourceH) {
          done(null);
          return;
        }
        const scale = Math.min(1, MAX_SIDE / Math.max(sourceW, sourceH));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(sourceW * scale));
        canvas.height = Math.max(1, Math.round(sourceH * scale));
        const context = canvas.getContext('2d');
        // JPEG has no alpha; fill white so transparent PNGs do not turn black.
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(element, 0, 0, canvas.width, canvas.height);
        let data = null;
        try {
          data = canvas.toDataURL('image/jpeg', QUALITY);
        } catch {
          // A tainted canvas is impossible for local files, but never crash.
        }
        done(
          data
            ? { data, width: canvas.width, height: canvas.height }
            : null,
        );
      };
      element.onerror = () => done(null);
      element.src = objectUrl || image.url;
    });

  const addImage = async (image) => {
    load();
    const hash = image.hash || (await hashOf(image.blob));
    if (!hash) return entries;

    const existing = entries.findIndex((entry) => entry.hash === hash);
    if (existing !== -1) {
      // The same photo again: move it to the front instead of duplicating it.
      const [entry] = entries.splice(existing, 1);
      entries.unshift(entry);
      persist();
      return entries;
    }

    let stored = null;
    if (typeof image.url === 'string' && image.url.startsWith('data:image/')) {
      // Already a stored copy (a photo taken back from the shelf).
      stored = { data: image.url, width: image.width, height: image.height };
    } else {
      stored = await downscale(image);
    }
    if (!stored) return entries;

    entries.unshift({ hash, ...stored });
    if (entries.length > LIMIT) entries.length = LIMIT;
    persist();
    return entries;
  };

  /** Queue a photo (deleted or replaced) and resolve once it is shelved. */
  const add = (image) => {
    if (!image) return queue;
    queue = queue.then(() => addImage(image)).catch(() => entries);
    return queue;
  };

  /**
   * Empty the shelf and remove its stored copies. The clear waits for any
   * pending add, so a photo shelved just before the click cannot reappear.
   */
  const clear = () => {
    queue = queue.then(() => {
      loaded = true;
      entries = [];
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Storage can be unavailable; the in-memory shelf still empties.
      }
      return entries;
    });
    return queue;
  };

  const find = (hash) =>
    entries.find((entry) => entry.hash === hash) || null;

  /** Turn a shelf entry into the image object a photo box expects. */
  const imageFor = (entry) => ({
    url: entry.data,
    width: entry.width,
    height: entry.height,
    blob: null,
    hash: entry.hash,
    // Shelf copies are JPEGs on a white fill, so they carry no transparency.
    hasAlpha: false,
  });

  return {
    load,
    add,
    clear,
    find,
    imageFor,
    get entries() {
      return entries.slice();
    },
  };
})();
