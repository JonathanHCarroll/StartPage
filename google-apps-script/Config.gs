/**
 * Configuration via Script Properties (Project Settings → Script properties).
 *
 * Required:
 *   RAINDROP_ACCESS_TOKEN — API token from https://app.raindrop.io/settings/integrations
 *   COLLECTION_IDS        — Comma-separated Raindrop collection IDs; first ID is the
 *                           default on load. All listed IDs are preloaded; any other
 *                           collection can be chosen from the picker (loaded on demand).
 *
 * Optional:
 *   BOOKMARKS_PER_PAGE — Max bookmarks per collection (1–50, default 50)
 *   CACHE_MINUTES      — How long to cache API responses (default 15)
 *   PAGE_TITLE         — Browser tab title (default "Start")
 *   ICON_OVERRIDES     — JSON map of bookmark id or domain → icon URL/path
 *                        e.g. {"github.com":"/icons/github.png","8492393":"https://..."}
 */
var CONFIG = (function () {
  var props = PropertiesService.getScriptProperties();

  function get_(key, defaultValue) {
    var value = props.getProperty(key);
    return value !== null && value !== '' ? value : defaultValue;
  }

  function getInt_(key, defaultValue, min, max) {
    var parsed = parseInt(get_(key, String(defaultValue)), 10);
    if (isNaN(parsed)) return defaultValue;
    return Math.min(max, Math.max(min, parsed));
  }

  function getIconOverrides_() {
    var raw = get_('ICON_OVERRIDES', '');
    if (!raw) return {};
    try {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !(parsed instanceof Array)) {
        return parsed;
      }
    } catch (e) { /* ignore invalid JSON */ }
    return {};
  }

  return {
    getAccessToken: function () {
      return get_('RAINDROP_ACCESS_TOKEN', '');
    },

    getCollectionIds: function () {
      var raw = get_('COLLECTION_IDS', '');
      if (!raw) return [];
      return raw.split(',')
        .map(function (id) { return id.trim(); })
        .filter(function (id) { return id.length > 0; })
        .map(function (id) { return parseInt(id, 10); })
        .filter(function (id) { return !isNaN(id); });
    },

    /** @returns {number|null} First COLLECTION_IDS entry, used as the default collection. */
    getDefaultCollectionId: function () {
      var ids = this.getCollectionIds();
      return ids.length ? ids[0] : null;
    },

    getBookmarksPerPage: function () {
      return getInt_('BOOKMARKS_PER_PAGE', 50, 1, 50);
    },

    getCacheMinutes: function () {
      return getInt_('CACHE_MINUTES', 15, 1, 1440);
    },

    getCacheSeconds: function () {
      return this.getCacheMinutes() * 60;
    },

    getPageTitle: function () {
      return get_('PAGE_TITLE', 'Start');
    },

    getIconOverrides: function () {
      return getIconOverrides_();
    }
  };
})();
