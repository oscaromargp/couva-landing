/* ============================================================
 * Almacenamiento offline con IndexedDB (sin dependencias).
 * Stores:
 *   - inspections (keyPath: localId)  → borradores completos
 *   - media       (keyPath: localId)  → blobs de fotos/audio
 * ============================================================ */
const DB = (() => {
  const NAME = 'pdi-couva';
  const VER = 1;
  let _db = null;

  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, VER);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains('inspections')) d.createObjectStore('inspections', { keyPath: 'localId' });
        if (!d.objectStoreNames.contains('media')) d.createObjectStore('media', { keyPath: 'localId' });
      };
      req.onsuccess = () => { _db = req.result; resolve(_db); };
      req.onerror = () => reject(req.error);
    });
  }
  function tx(store, mode) { return open().then((d) => d.transaction(store, mode).objectStore(store)); }
  function pr(request) { return new Promise((res, rej) => { request.onsuccess = () => res(request.result); request.onerror = () => rej(request.error); }); }

  return {
    async put(store, obj) { const s = await tx(store, 'readwrite'); return pr(s.put(obj)); },
    async get(store, key) { const s = await tx(store, 'readonly'); return pr(s.get(key)); },
    async all(store) { const s = await tx(store, 'readonly'); return pr(s.getAll()); },
    async del(store, key) { const s = await tx(store, 'readwrite'); return pr(s.delete(key)); },
    // atajos de medios
    async putMedia(localId, inspLocalId, tipo, blob) { return this.put('media', { localId, inspLocalId, tipo, blob }); },
    async getMedia(localId) { return this.get('media', localId); },
    async delMedia(localId) { return this.del('media', localId); },
  };
})();
