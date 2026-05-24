const RAINDROP_API_BASE = 'https://api.raindrop.io/rest/v1';

/**
 * @param {string} token
 * @param {string} path
 * @param {Record<string, string|number>=} queryParams
 */
async function raindropGet(token, path, queryParams) {
  if (!token) {
    throw new Error('RAINDROP_ACCESS_TOKEN is not set.');
  }

  let url = RAINDROP_API_BASE + path;
  if (queryParams) {
    const parts = Object.keys(queryParams).map(function (key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(String(queryParams[key]));
    });
    if (parts.length) url += '?' + parts.join('&');
  }

  const response = await fetch(url, {
    headers: { Authorization: 'Bearer ' + token }
  });

  const body = await response.text();
  if (!response.ok) {
    let detail = body;
    try {
      const parsed = JSON.parse(body);
      detail = parsed.errorMessage || parsed.error || body;
    } catch (e) { /* use raw body */ }
    throw new Error('Raindrop API error (' + response.status + '): ' + detail);
  }

  const data = JSON.parse(body);
  if (data.result === false) {
    throw new Error('Raindrop API error: ' + (data.errorMessage || data.error || 'Unknown error'));
  }

  return data;
}

/**
 * @param {string} token
 * @param {number} collectionId
 */
export async function fetchCollectionMeta(token, collectionId) {
  const data = await raindropGet(token, '/collection/' + collectionId);
  const item = data.item;
  return {
    id: item._id,
    title: item.title || ('Collection ' + collectionId),
    color: item.color || '#5c7cfa',
    count: item.count || 0
  };
}

/**
 * @param {string} token
 * @param {number} collectionId
 * @param {number} perpage
 */
export async function fetchBookmarks(token, collectionId, perpage) {
  const data = await raindropGet(token, '/raindrops/' + collectionId, {
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
 * @param {string} token
 */
export async function listAllCollections(token) {
  const [roots, children] = await Promise.all([
    raindropGet(token, '/collections'),
    raindropGet(token, '/collections/childrens')
  ]);
  const byId = new Map();
  (roots.items || []).concat(children.items || []).forEach(function (c) {
    if (!byId.has(c._id)) {
      byId.set(c._id, c);
    }
  });

  return Array.from(byId.values()).map(function (c) {
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
 * @param {string} token
 * @param {number} collectionId
 * @param {number} perpage
 */
export async function fetchCollectionWithBookmarks(token, collectionId, perpage) {
  const [meta, bookmarks] = await Promise.all([
    fetchCollectionMeta(token, collectionId),
    fetchBookmarks(token, collectionId, perpage)
  ]);

  return {
    id: meta.id,
    title: meta.title,
    color: meta.color,
    count: meta.count,
    bookmarks: bookmarks
  };
}
