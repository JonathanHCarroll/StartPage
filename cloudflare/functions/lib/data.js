import { getConfig } from './config.js';
import {
  readStartPageData,
  writeStartPageData,
  readCollection,
  writeCollection
} from './cache.js';
import {
  listAllCollections,
  fetchCollectionWithBookmarks
} from './raindrop.js';

/**
 * @param {Record<string, string>} env
 * @param {KVNamespace} kv
 */
export async function getStartPageData(env, kv) {
  const config = getConfig(env);
  const cached = await readStartPageData(kv);
  if (cached) {
    return Object.assign({}, cached, { pageTitle: config.pageTitle });
  }

  const data = await fetchStartPageData(env, config);
  await writeStartPageData(kv, data, config.cacheSeconds);
  return Object.assign({}, data, { pageTitle: config.pageTitle });
}

/**
 * @param {Record<string, string>} env
 * @param {KVNamespace} kv
 * @param {number} collectionId
 */
export async function getCollectionData(env, kv, collectionId) {
  const config = getConfig(env);
  const id = parseInt(String(collectionId), 10);
  if (isNaN(id)) {
    throw new Error('Invalid collection ID');
  }

  const pageData = await getStartPageData(env, kv);
  for (let i = 0; i < pageData.collections.length; i++) {
    if (pageData.collections[i].id === id) {
      return pageData.collections[i];
    }
  }

  const cached = await readCollection(kv, id);
  if (cached) return cached;

  const collection = await fetchCollectionWithBookmarks(
    config.accessToken,
    id,
    config.bookmarksPerPage
  );
  await writeCollection(kv, collection, config.cacheSeconds);
  return collection;
}

/**
 * @param {Record<string, string>} env
 * @param {ReturnType<typeof getConfig>} config
 */
async function fetchStartPageData(env, config) {
  if (!config.collectionIds.length) {
    throw new Error('COLLECTION_IDS is not set.');
  }

  const allCollections = await listAllCollections(config.accessToken);
  const defaultCollectionId = config.defaultCollectionId;
  const preloadIds = config.collectionIds.slice();
  if (preloadIds.indexOf(defaultCollectionId) === -1) {
    preloadIds.unshift(defaultCollectionId);
  }

  const seen = {};
  const uniqueIds = preloadIds.filter(function (id) {
    if (seen[id]) return false;
    seen[id] = true;
    return true;
  });

  const collections = await Promise.all(uniqueIds.map(function (id) {
    return fetchCollectionWithBookmarks(
      config.accessToken,
      id,
      config.bookmarksPerPage
    );
  }));

  return {
    allCollections: allCollections,
    defaultCollectionId: defaultCollectionId,
    collections: collections,
    fetchedAt: new Date().toISOString()
  };
}

/**
 * @param {unknown} data
 * @param {{ maxAge?: number }} options
 */
export function jsonResponse(data, options) {
  const maxAge = options && options.maxAge ? options.maxAge : 0;
  const headers = {
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (maxAge > 0) {
    headers['Cache-Control'] = 'public, max-age=' + maxAge + ', stale-while-revalidate=60';
  } else {
    headers['Cache-Control'] = 'no-store';
  }

  return new Response(JSON.stringify(data), { headers: headers });
}

/**
 * @param {Error|string} err
 * @param {number} status
 */
export function errorResponse(err, status) {
  const message = err instanceof Error ? err.message : String(err);
  return new Response(JSON.stringify({ error: message }), {
    status: status || 500,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}
