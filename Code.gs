var CACHE_KEY = 'startpage_data_v1';

/**
 * Web app entry point — deploy as web app and use this URL as your browser start page.
 */
function doGet() {
  var template = HtmlService.createTemplateFromFile('Index');
  template.pageTitle = CONFIG.getPageTitle();

  try {
    template.data = getStartPageData_();
    template.error = null;
  } catch (err) {
    template.data = { collections: [], fetchedAt: null };
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
  var cached = cache.get(CACHE_KEY);

  if (cached) {
    return JSON.parse(cached);
  }

  var data = fetchStartPageData_();
  cache.put(CACHE_KEY, JSON.stringify(data), CONFIG.getCacheSeconds());
  return data;
}

/** Clears cached bookmark data (run after changing Raindrop collections). */
function clearStartPageCache() {
  CacheService.getScriptCache().remove(CACHE_KEY);
  Logger.log('StartPage cache cleared.');
}

/** Forces a fresh fetch and logs collection counts. */
function refreshStartPageData() {
  clearStartPageCache();
  var data = getStartPageData_();
  data.collections.forEach(function (c) {
    Logger.log('%s: %s bookmarks loaded', c.title, c.bookmarks.length);
  });
}
