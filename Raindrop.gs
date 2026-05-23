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
  var data = raindropGet_('/bookmarks/' + collectionId, {
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
 * Fetches all configured collections with their bookmarks.
 * @returns {{ collections: Array<Object>, fetchedAt: string }}
 */
function fetchStartPageData_() {
  var collectionIds = CONFIG.getCollectionIds();
  if (!collectionIds.length) {
    throw new Error('COLLECTION_IDS is not set. Add comma-separated collection IDs in Script properties.');
  }

  var collections = collectionIds.map(function (id) {
    var meta = fetchCollectionMeta_(id);
    var bookmarks = fetchBookmarks_(id);
    return {
      id: meta.id,
      title: meta.title,
      color: meta.color,
      count: meta.count,
      bookmarks: bookmarks
    };
  });

  return {
    collections: collections,
    fetchedAt: new Date().toISOString()
  };
}

/**
 * Run once from the Apps Script editor to list your collection IDs.
 * View output in Executions log.
 */
function listRaindropCollections() {
  var roots = raindropGet_('/collections');
  var children = raindropGet_('/collections/childrens');

  var all = (roots.items || []).concat(children.items || []);
  Logger.log('Your Raindrop collections (%s total):', all.length);
  Logger.log('%-12s | %s', 'ID', 'Title');
  Logger.log('%-12s-+-%s', '------------', '------------------------------');

  all.sort(function (a, b) {
    return (a.title || '').localeCompare(b.title || '');
  }).forEach(function (c) {
    Logger.log('%-12s | %s', c._id, c.title);
  });

  Logger.log('');
  Logger.log('Copy the IDs you want into COLLECTION_IDS (comma-separated).');
}
