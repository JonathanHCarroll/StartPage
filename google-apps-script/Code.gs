/** @deprecated Legacy single-blob key; removed on clear. */
var CACHE_KEY = 'startpage_data_v2';
var CACHE_MANIFEST_KEY = 'startpage_manifest_v3';
var CACHE_ALL_COLLECTIONS_KEY = 'startpage_all_cols_v3';
var CACHE_COLLECTION_PREFIX = 'startpage_col_';
var CACHE_MAX_VALUE_BYTES = 102400;

function withClientConfig_(data) {
  return {
    allCollections: data.allCollections,
    defaultCollectionId: data.defaultCollectionId,
    collections: data.collections,
    fetchedAt: data.fetchedAt,
    pageTitle: CONFIG.getPageTitle(),
    iconOverrides: CONFIG.getIconOverrides()
  };
}

/**
 * Web app entry point — deploy as web app and use this URL as your browser start page.
 */
function doGet() {
  var template = HtmlService.createTemplateFromFile('Index');
  template.pageTitle = CONFIG.getPageTitle();

  try {
    var data = getStartPageData_();
    template.data = data;
    template.jsonData = JSON.stringify(withClientConfig_(data)).replace(/</g, '\\u003c');
    template.error = null;
  } catch (err) {
    template.data = {
      allCollections: [],
      defaultCollectionId: null,
      collections: [],
      fetchedAt: null
    };
    template.jsonData = '';
    template.error = err.message || String(err);
  }

  return template.evaluate()
    .setTitle(CONFIG.getPageTitle())
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * @param {string} filename
 * @returns {string}
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * @returns {Object}
 */
function getStartPageData_() {
  var cache = CacheService.getScriptCache();
  var fromCache = readStartPageDataFromCache_(cache);
  if (fromCache) {
    return fromCache;
  }

  var data = fetchStartPageData_();
  writeStartPageDataToCache_(cache, data);
  return data;
}

/**
 * @param {GoogleAppsScript.Cache.Cache} cache
 * @returns {Object|null}
 */
function readStartPageDataFromCache_(cache) {
  var manifestRaw = cache.get(CACHE_MANIFEST_KEY);
  if (!manifestRaw) {
    return readLegacyCache_(cache);
  }

  var manifest = JSON.parse(manifestRaw);
  if (!manifest.collectionKeys || manifest.defaultCollectionId == null) {
    return null;
  }

  var keys = manifest.collectionKeys.slice();
  keys.push(CACHE_ALL_COLLECTIONS_KEY);
  var batch = cache.getAll(keys);

  var allCollectionsRaw = batch[CACHE_ALL_COLLECTIONS_KEY];
  if (!allCollectionsRaw) {
    return null;
  }

  var collections = [];
  for (var i = 0; i < manifest.collectionKeys.length; i++) {
    var colKey = manifest.collectionKeys[i];
    var colRaw = batch[colKey];
    if (!colRaw) {
      return null;
    }
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
 * @param {GoogleAppsScript.Cache.Cache} cache
 * @returns {Object|null}
 */
function readLegacyCache_(cache) {
  var cached = cache.get(CACHE_KEY);
  if (!cached) {
    return null;
  }

  var data = JSON.parse(cached);
  if (data.allCollections && data.defaultCollectionId != null) {
    return data;
  }

  cache.remove(CACHE_KEY);
  return null;
}

/**
 * @param {GoogleAppsScript.Cache.Cache} cache
 * @param {Object} data
 */
function writeStartPageDataToCache_(cache, data) {
  var ttl = CONFIG.getCacheSeconds();
  var collectionKeys = [];
  var items = {};

  data.collections.forEach(function (col) {
    var key = CACHE_COLLECTION_PREFIX + col.id;
    collectionKeys.push(key);
    items[key] = JSON.stringify(col);
  });

  items[CACHE_ALL_COLLECTIONS_KEY] = JSON.stringify(data.allCollections);
  items[CACHE_MANIFEST_KEY] = JSON.stringify({
    defaultCollectionId: data.defaultCollectionId,
    fetchedAt: data.fetchedAt,
    collectionKeys: collectionKeys
  });

  var oversize = [];
  Object.keys(items).forEach(function (key) {
    if (items[key].length > CACHE_MAX_VALUE_BYTES) {
      oversize.push(key + ' (' + items[key].length + ' bytes)');
    }
  });

  if (oversize.length) {
    Logger.log(
      'StartPage cache skipped — over 100KB limit: ' + oversize.join(', ')
    );
    return;
  }

  cache.putAll(items, ttl);
}

/** Clears cached bookmark data (run after changing Raindrop collections). */
function clearStartPageCache() {
  var cache = CacheService.getScriptCache();
  var keys = [CACHE_KEY, CACHE_MANIFEST_KEY, CACHE_ALL_COLLECTIONS_KEY];
  var manifestRaw = cache.get(CACHE_MANIFEST_KEY);

  if (manifestRaw) {
    try {
      var manifest = JSON.parse(manifestRaw);
      (manifest.collectionKeys || []).forEach(function (key) {
        keys.push(key);
      });
    } catch (e) { /* ignore */ }
  }

  cache.removeAll(keys);
  Logger.log('StartPage cache cleared.');
}

/** Forces a fresh fetch and logs collection counts. */
function refreshStartPageData() {
  clearStartPageCache();
  var data = getStartPageData_();
  data.collections.forEach(function (c) {
    Logger.log(c.title + ': ' + c.bookmarks.length + ' bookmarks loaded');
  });
}

/**
 * Logs cache entry sizes (run from the script editor → Executions).
 * Helps confirm whether payloads exceed the 100KB Script Cache limit.
 */
function logStartPageCacheInfo() {
  var cache = CacheService.getScriptCache();
  var manifestRaw = cache.get(CACHE_MANIFEST_KEY);

  if (!manifestRaw) {
    Logger.log('No v3 cache manifest found. Open the start page or run refreshStartPageData().');
    var legacy = cache.get(CACHE_KEY);
    if (legacy) {
      Logger.log('Legacy cache present: ' + legacy.length + ' bytes');
    }
    return;
  }

  var manifest = JSON.parse(manifestRaw);
  Logger.log('Cached at: ' + manifest.fetchedAt);
  Logger.log('Manifest: ' + manifestRaw.length + ' bytes');

  var keys = (manifest.collectionKeys || []).slice();
  keys.push(CACHE_ALL_COLLECTIONS_KEY);
  var batch = cache.getAll(keys);

  keys.forEach(function (key) {
    var value = batch[key];
    Logger.log(
      (value ? key + ': ' + value.length + ' bytes' : key + ': MISSING')
    );
  });
}
