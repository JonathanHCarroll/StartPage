const MANIFEST_KEY = 'manifest';
const ALL_COLLECTIONS_KEY = 'all_cols';
const COLLECTION_PREFIX = 'col:';

/**
 * @param {KVNamespace} kv
 * @returns {Promise<Object|null>}
 */
export async function readStartPageData(kv) {
  const manifestRaw = await kv.get(MANIFEST_KEY);
  if (!manifestRaw) return null;

  const manifest = JSON.parse(manifestRaw);
  if (!manifest.collectionIds || manifest.defaultCollectionId == null) {
    return null;
  }

  const keys = manifest.collectionIds.map(function (id) {
    return COLLECTION_PREFIX + id;
  });
  keys.push(ALL_COLLECTIONS_KEY);

  const values = await Promise.all(keys.map(function (key) {
    return kv.get(key);
  }));
  const byKey = new Map();
  keys.forEach(function (key, i) {
    if (values[i] != null) byKey.set(key, values[i]);
  });

  const allCollectionsRaw = byKey.get(ALL_COLLECTIONS_KEY);
  if (!allCollectionsRaw) return null;

  const collections = [];
  for (let i = 0; i < manifest.collectionIds.length; i++) {
    const colKey = COLLECTION_PREFIX + manifest.collectionIds[i];
    const colRaw = byKey.get(colKey);
    if (!colRaw) return null;
    collections.push(JSON.parse(colRaw));
  }

  return {
    allCollections: JSON.parse(allCollectionsRaw),
    defaultCollectionId: manifest.defaultCollectionId,
    collections: collections,
    fetchedAt: manifest.fetchedAt
  };
}

/**
 * @param {KVNamespace} kv
 * @param {Object} data
 * @param {number} ttlSeconds
 */
export async function writeStartPageData(kv, data, ttlSeconds) {
  const collectionIds = data.collections.map(function (col) { return col.id; });
  const entries = new Map();

  data.collections.forEach(function (col) {
    entries.set(COLLECTION_PREFIX + col.id, JSON.stringify(col));
  });
  entries.set(ALL_COLLECTIONS_KEY, JSON.stringify(data.allCollections));
  entries.set(MANIFEST_KEY, JSON.stringify({
    defaultCollectionId: data.defaultCollectionId,
    fetchedAt: data.fetchedAt,
    collectionIds: collectionIds
  }));

  const ops = [];
  entries.forEach(function (value, key) {
    ops.push(kv.put(key, value, { expirationTtl: ttlSeconds }));
  });
  await Promise.all(ops);
}

/**
 * @param {KVNamespace} kv
 * @param {number} collectionId
 * @returns {Promise<Object|null>}
 */
export async function readCollection(kv, collectionId) {
  const raw = await kv.get(COLLECTION_PREFIX + collectionId);
  return raw ? JSON.parse(raw) : null;
}

/**
 * @param {KVNamespace} kv
 * @param {Object} collection
 * @param {number} ttlSeconds
 */
export async function writeCollection(kv, collection, ttlSeconds) {
  await kv.put(
    COLLECTION_PREFIX + collection.id,
    JSON.stringify(collection),
    { expirationTtl: ttlSeconds }
  );
}

/**
 * @param {KVNamespace} kv
 */
export async function clearCache(kv) {
  const manifestRaw = await kv.get(MANIFEST_KEY);
  const keys = [MANIFEST_KEY, ALL_COLLECTIONS_KEY];

  if (manifestRaw) {
    try {
      const manifest = JSON.parse(manifestRaw);
      (manifest.collectionIds || []).forEach(function (id) {
        keys.push(COLLECTION_PREFIX + id);
      });
    } catch (e) { /* ignore */ }
  }

  await Promise.all(keys.map(function (key) { return kv.delete(key); }));
}

export { COLLECTION_PREFIX, MANIFEST_KEY };
