/**
 * @param {Record<string, string>} env
 */
export function getConfig(env) {
  const rawIds = env.COLLECTION_IDS || '';
  const collectionIds = rawIds
    .split(',')
    .map(function (id) { return id.trim(); })
    .filter(function (id) { return id.length > 0; })
    .map(function (id) { return parseInt(id, 10); })
    .filter(function (id) { return !isNaN(id); });

  const bookmarksPerPage = parseInt(env.BOOKMARKS_PER_PAGE || '50', 10);
  const cacheMinutes = parseInt(env.CACHE_MINUTES || '15', 10);

  return {
    accessToken: (env.RAINDROP_ACCESS_TOKEN || '').trim(),
    collectionIds: collectionIds,
    defaultCollectionId: collectionIds.length ? collectionIds[0] : null,
    bookmarksPerPage: Math.min(50, Math.max(1, isNaN(bookmarksPerPage) ? 50 : bookmarksPerPage)),
    cacheSeconds: Math.min(21600, Math.max(60, (isNaN(cacheMinutes) ? 15 : cacheMinutes) * 60)),
    pageTitle: env.PAGE_TITLE || 'Start'
  };
}
