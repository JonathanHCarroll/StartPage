var RAINDROP_API_BASE = 'https://api.raindrop.io/rest/v1';

/**
 * @param {string} path - API path starting with /
 * @param {Object=} queryParams
 * @returns {Object}
 */
function raindropGet_(path, queryParams) {
  var token = CONFIG.getAccessToken();
  if (!token) {
    throw new Error('RAINDROP_ACCESS_TOKEN is not set. Add it in Project Settings → Script properties.');
  }

  var url = RAINDROP_API_BASE + path;
  if (queryParams) {
    var parts = [];
    Object.keys(queryParams).forEach(function (key) {
      parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(queryParams[key]));
    });
    if (parts.length) url += '?' + parts.join('&');
  }

  var response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true
  });

  var status = response.getResponseCode();
  var body = response.getContentText();

  if (status < 200 || status >= 300) {
    var detail = body;
    try {
      var parsed = JSON.parse(body);
      detail = parsed.errorMessage || parsed.error || body;
    } catch (e) { /* use raw body */ }
    throw new Error('Raindrop API error (' + status + '): ' + detail);
  }

  var data = JSON.parse(body);
  if (data.result === false) {
    throw new Error('Raindrop API error: ' + (data.errorMessage || data.error || 'Unknown error'));
  }

  return data;
}

/**
 * @param {number} collectionId
 * @returns {{ id: number, title: string, color: string, count: number }}
 */
function fetchCollectionMeta_(collectionId) {
  var data = raindropGet_('/collection/' + collectionId);
  var item = data.item;
  return {
    id: item._id,
    title: item.title || ('Collection ' + collectionId),
    color: item.color || '#5c7cfa',
    count: item.count || 0
  };
}

/**
 * @param {number} collectionId
 * @returns {Array<Object>}
 */
function fetchBookmarks_(collectionId) {
  var perpage = CONFIG.getBookmarksPerPage();
  var data = raindropGet_('/raindrops/' + collectionId, {
    perpage: perpage,
    page: 0,
    sort: 'title'
  });

  return (data.items || [])
    .filter(function (b) { return !b.removed; })
    .map(function (b) {
      return {
        id: b._id,
        title: b.title || b.domain || 'Untitled',
        link: b.link,
        domain: b.domain || '',
        excerpt: b.excerpt || '',
        cover: b.cover || '',
        type: b.type || 'link',
        tags: b.tags || []
      };
    });
}

/**
 * Raindrop may return the same collection from /collections and /collections/childrens.
 * @param {Array<Object>} items
 * @returns {Array<Object>}
 */
function dedupeCollectionsById_(items) {
  var seen = {};
  var out = [];
  (items || []).forEach(function (c) {
    if (!seen[c._id]) {
      seen[c._id] = true;
      out.push(c);
    }
  });
  return out;
}

/**
 * @returns {Array<{ id: number, title: string, color: string, count: number }>}
 */
function listAllCollections_() {
  var roots = raindropGet_('/collections');
  var children = raindropGet_('/collections/childrens');
  var all = dedupeCollectionsById_((roots.items || []).concat(children.items || []));

  return all.map(function (c) {
    return {
      id: c._id,
      title: c.title || ('Collection ' + c._id),
      color: c.color || '#5c7cfa',
      count: c.count || 0
    };
  }).sort(function (a, b) {
    return a.title.localeCompare(b.title);
  });
}

/**
 * @param {number} collectionId
 * @returns {{ id: number, title: string, color: string, count: number, bookmarks: Array<Object> }}
 */
function fetchCollectionWithBookmarks_(collectionId) {
  var meta = fetchCollectionMeta_(collectionId);
  var bookmarks = fetchBookmarks_(collectionId);
  return {
    id: meta.id,
    title: meta.title,
    color: meta.color,
    count: meta.count,
    bookmarks: bookmarks
  };
}

/**
 * Fetches collection list and preloads bookmarks for configured collection IDs.
 * @returns {{ allCollections: Array<Object>, defaultCollectionId: number, collections: Array<Object>, fetchedAt: string }}
 */
function fetchStartPageData_() {
  var collectionIds = CONFIG.getCollectionIds();
  if (!collectionIds.length) {
    throw new Error('COLLECTION_IDS is not set. Add comma-separated collection IDs in Script properties.');
  }

  var allCollections = listAllCollections_();
  var defaultCollectionId = CONFIG.getDefaultCollectionId();
  var preloadIds = collectionIds.slice();
  if (preloadIds.indexOf(defaultCollectionId) === -1) {
    preloadIds.unshift(defaultCollectionId);
  }

  var seen = {};
  var collections = [];
  preloadIds.forEach(function (id) {
    if (seen[id]) return;
    seen[id] = true;
    collections.push(fetchCollectionWithBookmarks_(id));
  });

  return {
    allCollections: allCollections,
    defaultCollectionId: defaultCollectionId,
    collections: collections,
    fetchedAt: new Date().toISOString()
  };
}

/**
 * Loads one collection (from cache when preloaded, otherwise from Raindrop).
 * Callable from the web app via google.script.run.
 * @param {number} collectionId
 * @returns {{ id: number, title: string, color: string, count: number, bookmarks: Array<Object> }}
 */
function getCollectionData(collectionId) {
  var id = parseInt(collectionId, 10);
  if (isNaN(id)) {
    throw new Error('Invalid collection ID');
  }

  var data = getStartPageData_();
  for (var i = 0; i < data.collections.length; i++) {
    if (data.collections[i].id === id) {
      return data.collections[i];
    }
  }

  return fetchCollectionWithBookmarks_(id);
}

/**
 * @param {string} text
 * @param {number} width
 * @returns {string}
 */
function padRight_(text, width) {
  var str = String(text);
  while (str.length < width) {
    str += ' ';
  }
  return str;
}

/**
 * Run once from the Apps Script editor to list your collection IDs.
 * View output in Executions log.
 */
function listRaindropCollections() {
  var roots = raindropGet_('/collections');
  var children = raindropGet_('/collections/childrens');

  var all = dedupeCollectionsById_((roots.items || []).concat(children.items || []));
  Logger.log('Your Raindrop collections (' + all.length + ' total):');
  Logger.log(padRight_('ID', 12) + ' | Title');
  Logger.log('------------+------------------------------');

  all.sort(function (a, b) {
    return (a.title || '').localeCompare(b.title || '');
  }).forEach(function (c) {
    var id = String(c._id);
    Logger.log(padRight_(id, 12) + ' | ' + (c.title || ''));
  });

  Logger.log('');
  Logger.log('Copy the IDs you want into COLLECTION_IDS (comma-separated).');
}
