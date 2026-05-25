(function () {
  var STORAGE_KEY = 'startpage_collection_id';
  var VIEW_MODES_KEY = 'startpage_view_modes';
  var SORT_MODES_KEY = 'startpage_sort_modes';

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function updateClock() {
    var now = new Date();
    var greetingEl = document.getElementById('greeting');
    var datetimeEl = document.getElementById('datetime');

    if (!greetingEl || !datetimeEl) return;

    var hour = now.getHours();
    var greeting;
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 17) greeting = 'Good afternoon';
    else greeting = 'Good evening';

    greetingEl.textContent = greeting;

    var options = { weekday: 'long', month: 'long', day: 'numeric' };
    var dateStr = now.toLocaleDateString(undefined, options);
    var timeStr = pad(now.getHours()) + ':' + pad(now.getMinutes());
    datetimeEl.textContent = dateStr + ' · ' + timeStr;
  }

  function setFooterFetchedAt(iso) {
    var updated = document.getElementById('footer-updated');
    var sep = document.getElementById('footer-sep');
    if (!updated || !iso) return;
    updated.textContent = 'Updated ' + iso;
    if (sep) sep.hidden = false;
  }

  function showPageError(message) {
    var banner = document.getElementById('error-banner');
    var msg = document.getElementById('error-message');
    var view = document.getElementById('collection-view');
    if (banner && msg) {
      msg.textContent = message;
      banner.hidden = false;
    }
    if (view) view.hidden = true;
  }

  function openSearch(query) {
    var url = 'https://www.google.com/search?q=' + encodeURIComponent(query);
    var target = window.top || window;
    try {
      target.location.href = url;
    } catch (e) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  var searchForm = document.querySelector('.search-wrap');
  if (searchForm) {
    searchForm.addEventListener('submit', function (e) {
      var input = searchForm.querySelector('input[name="q"]');
      var query = input && input.value.trim();
      if (!query) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      openSearch(query);
    });
  }

  var iconOverrides = {};

  function faviconUrl(domain) {
    return 'https://www.google.com/s2/favicons?domain=' +
      encodeURIComponent(domain || '') + '&sz=128';
  }

  function bookmarkIconUrl(b) {
    if (b.id != null && iconOverrides[String(b.id)]) {
      return iconOverrides[String(b.id)];
    }
    var domain = b.domain || '';
    if (domain && iconOverrides[domain]) {
      return iconOverrides[domain];
    }
    return faviconUrl(domain);
  }

  function bindFaviconErrors(root) {
    root.querySelectorAll('.app-icon img').forEach(function (img) {
      if (img.dataset.bound) return;
      img.dataset.bound = '1';
      img.addEventListener('error', function () {
        img.style.visibility = 'hidden';
      });
    });
  }

  function countLabel(loaded, total) {
    if (total > loaded) return loaded + ' / ' + total;
    return String(loaded);
  }

  function loadViewModes() {
    try {
      var raw = localStorage.getItem(VIEW_MODES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function getViewMode(collectionId) {
    var modes = loadViewModes();
    var mode = modes[String(collectionId)];
    return mode === 'list' ? 'list' : 'grid';
  }

  function saveViewMode(collectionId, mode) {
    try {
      var modes = loadViewModes();
      modes[String(collectionId)] = mode;
      localStorage.setItem(VIEW_MODES_KEY, JSON.stringify(modes));
    } catch (e) { /* ignore */ }
  }

  function loadSortModes() {
    try {
      var raw = localStorage.getItem(SORT_MODES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function getSortMode(collectionId) {
    var modes = loadSortModes();
    var mode = modes[String(collectionId)];
    return mode === 'title' ? 'title' : 'manual';
  }

  function saveSortMode(collectionId, mode) {
    try {
      var modes = loadSortModes();
      modes[String(collectionId)] = mode;
      localStorage.setItem(SORT_MODES_KEY, JSON.stringify(modes));
    } catch (e) { /* ignore */ }
  }

  function orderBookmarks(bookmarks, sortMode) {
    if (sortMode !== 'title') return bookmarks;
    return bookmarks.slice().sort(function (a, b) {
      return (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' });
    });
  }

  function renderBookmarks(container, bookmarks, viewMode) {
    container.innerHTML = '';
    if (!bookmarks.length) {
      var empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'No bookmarks in this collection';
      container.appendChild(empty);
      return;
    }

    var isList = viewMode === 'list';
    var list = document.createElement('ul');
    list.className = isList ? 'bookmark-list' : 'bookmark-grid';

    bookmarks.forEach(function (b) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.className = 'bookmark-app';
      a.href = b.link;
      a.target = '_top';
      a.rel = 'noreferrer';
      a.title = b.excerpt || b.title;

      var iconWrap = document.createElement('span');
      iconWrap.className = 'app-icon';
      var img = document.createElement('img');
      img.src = bookmarkIconUrl(b);
      img.alt = '';
      img.width = isList ? 32 : 64;
      img.height = isList ? 32 : 64;
      img.loading = 'lazy';
      iconWrap.appendChild(img);

      var label = document.createElement('span');
      label.className = 'app-label';
      label.textContent = b.title;

      a.appendChild(iconWrap);
      a.appendChild(label);

      if (isList && b.domain) {
        var domain = document.createElement('span');
        domain.className = 'bookmark-domain';
        domain.textContent = b.domain;
        a.appendChild(domain);
      }

      li.appendChild(a);
      list.appendChild(li);
    });

    container.appendChild(list);
    bindFaviconErrors(container);
  }

  async function fetchJson(url, options) {
    var init = Object.assign({ cache: 'no-store' }, options || {});
    var res = await fetch(url, init);
    var body = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      throw new Error(body.error || ('Request failed (' + res.status + ')'));
    }
    return body;
  }

  var applyPageData = null;

  function initCollectionSwitcher(payload) {
    var mount = document.getElementById('bookmark-mount');
    var picker = document.getElementById('collection-picker');
    var trigger = document.getElementById('collection-trigger');
    var menu = document.getElementById('collection-menu');
    var nameEl = document.getElementById('collection-name');
    var view = document.getElementById('collection-view');
    var viewGridBtn = document.getElementById('view-grid');
    var viewListBtn = document.getElementById('view-list');
    var sortManualBtn = document.getElementById('sort-manual');
    var sortTitleBtn = document.getElementById('sort-title');

    if (!mount || !picker || !trigger || !menu) return;

    view.hidden = false;

    var preloaded = [];
    var loadedById = {};
    var allCollections = [];
    var defaultId = null;
    var activeId = null;
    var activeCol = null;
    var viewMode = 'grid';
    var sortMode = 'manual';
    var menuOpen = false;
    var loading = false;

    function syncPayload(payload) {
      preloaded = payload.collections || [];
      loadedById = {};
      preloaded.forEach(function (col) {
        loadedById[col.id] = col;
      });

      allCollections = payload.allCollections || [];
      if (!allCollections.length && preloaded.length) {
        allCollections = preloaded.map(function (col) {
          return {
            id: col.id,
            title: col.title,
            color: col.color,
            count: col.count
          };
        });
      }

      defaultId = payload.defaultCollectionId;
      if (defaultId == null && preloaded.length) {
        defaultId = preloaded[0].id;
      }
    }

    function hasCollectionId(id) {
      if (id == null || isNaN(id)) return false;
      if (loadedById[id]) return true;
      return allCollections.some(function (c) { return c.id === id; });
    }

    function normalizeCollectionTitle(title) {
      return String(title || '').trim().toLowerCase();
    }

    function collectionIdFromUrlParam(value) {
      if (!value || !String(value).trim()) return null;

      var trimmed = String(value).trim();
      var numeric = parseInt(trimmed, 10);
      if (!isNaN(numeric) && String(numeric) === trimmed) {
        return hasCollectionId(numeric) ? numeric : null;
      }

      var needle = normalizeCollectionTitle(trimmed);
      var matches = allCollections.filter(function (c) {
        return normalizeCollectionTitle(c.title) === needle;
      });
      if (matches.length) return matches[0].id;

      return null;
    }

    function resolveActiveId() {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }

      var urlParam = null;
      try {
        urlParam = new URLSearchParams(window.location.search).get('collection');
      } catch (e) { /* ignore */ }

      if (urlParam) {
        var fromUrl = collectionIdFromUrlParam(urlParam);
        if (fromUrl != null) {
          activeId = fromUrl;
          return;
        }
      }

      var stored = sessionStorage.getItem(STORAGE_KEY);
      activeId = stored ? parseInt(stored, 10) : defaultId;
      if (!hasCollectionId(activeId)) {
        activeId = defaultId;
      }
      if (!hasCollectionId(activeId) && preloaded.length) {
        activeId = preloaded[0].id;
      }
    }

    function applyPayload(payload, resetToDefault) {
      iconOverrides = payload.iconOverrides || {};
      syncPayload(payload);
      if (resetToDefault) {
        sessionStorage.removeItem(STORAGE_KEY);
      }
      resolveActiveId();
      renderMenu();
      if (loadedById[activeId]) {
        displayCollection(loadedById[activeId]);
      } else {
        selectCollection(activeId, true);
      }
    }

    function setOpen(open) {
      menuOpen = open;
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      menu.hidden = !open;
    }

    function syncViewToggle() {
      if (!viewGridBtn || !viewListBtn) return;
      var isGrid = viewMode === 'grid';
      viewGridBtn.classList.toggle('is-active', isGrid);
      viewListBtn.classList.toggle('is-active', !isGrid);
      viewGridBtn.setAttribute('aria-pressed', isGrid ? 'true' : 'false');
      viewListBtn.setAttribute('aria-pressed', isGrid ? 'false' : 'true');
    }

    function bookmarksForDisplay() {
      if (!activeCol) return [];
      return orderBookmarks(activeCol.bookmarks || [], sortMode);
    }

    function setViewMode(mode, persist) {
      if (mode !== 'grid' && mode !== 'list') return;
      viewMode = mode;
      syncViewToggle();
      if (persist && activeId != null) {
        saveViewMode(activeId, mode);
      }
      if (activeCol) {
        renderBookmarks(mount, bookmarksForDisplay(), viewMode);
      }
    }

    function syncSortToggle() {
      if (!sortManualBtn || !sortTitleBtn) return;
      var isManual = sortMode === 'manual';
      sortManualBtn.classList.toggle('is-active', isManual);
      sortTitleBtn.classList.toggle('is-active', !isManual);
      sortManualBtn.setAttribute('aria-pressed', isManual ? 'true' : 'false');
      sortTitleBtn.setAttribute('aria-pressed', isManual ? 'false' : 'true');
    }

    function setSortMode(mode, persist) {
      if (mode !== 'manual' && mode !== 'title') return;
      sortMode = mode;
      syncSortToggle();
      if (persist && activeId != null) {
        saveSortMode(activeId, mode);
      }
      if (activeCol) {
        renderBookmarks(mount, bookmarksForDisplay(), viewMode);
      }
    }

    function updateHeader(col) {
      nameEl.textContent = col.title;
      if (view) view.style.setProperty('--collection-color', col.color || '');
    }

    function renderMenu() {
      menu.innerHTML = '';
      allCollections.forEach(function (c) {
        var li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.dataset.collectionId = String(c.id);
        if (c.id === activeId) {
          li.setAttribute('aria-selected', 'true');
          li.className = 'is-active';
        }

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'collection-option';

        var icon = document.createElement('img');
        icon.className = 'collection-option-icon';
        icon.src = '/bookmark.png';
        icon.alt = '';
        icon.width = 14;
        icon.height = 14;

        var label = document.createElement('span');
        label.className = 'collection-option-title';
        label.textContent = c.title;

        var count = document.createElement('span');
        count.className = 'collection-option-count';
        count.textContent = String(c.count || 0);

        btn.appendChild(icon);
        btn.appendChild(label);
        btn.appendChild(count);
        btn.addEventListener('click', function () {
          selectCollection(c.id);
        });

        li.appendChild(btn);
        menu.appendChild(li);
      });
    }

    function showLoading() {
      mount.innerHTML = '<p class="empty-state collection-loading">Loading…</p>';
    }

    function showError(message) {
      mount.innerHTML = '';
      var p = document.createElement('p');
      p.className = 'empty-state collection-error';
      p.textContent = message;
      mount.appendChild(p);
    }

    function displayCollection(col) {
      activeId = col.id;
      activeCol = col;
      sessionStorage.setItem(STORAGE_KEY, String(activeId));
      viewMode = getViewMode(activeId);
      sortMode = getSortMode(activeId);
      syncViewToggle();
      syncSortToggle();
      updateHeader(col);
      renderBookmarks(mount, orderBookmarks(col.bookmarks || [], sortMode), viewMode);
      renderMenu();
    }

    async function selectCollection(id, force) {
      if (id == null || isNaN(id)) {
        if (defaultId != null) id = defaultId;
        else if (preloaded.length) id = preloaded[0].id;
        else return;
      }

      if (loading) {
        setOpen(false);
        return;
      }

      if (!force && id === activeId) {
        setOpen(false);
        return;
      }

      setOpen(false);

      if (loadedById[id]) {
        displayCollection(loadedById[id]);
        return;
      }

      loading = true;
      showLoading();
      trigger.disabled = true;

      try {
        var col = await fetchJson('/api/collections/' + encodeURIComponent(id));
        loadedById[col.id] = col;
        displayCollection(col);
      } catch (err) {
        showError(err.message || 'Could not load collection');
      } finally {
        loading = false;
        trigger.disabled = false;
      }
    }

    if (!applyPageData) {
      trigger.addEventListener('click', function () {
        setOpen(!menuOpen);
      });

      if (viewGridBtn) {
        viewGridBtn.addEventListener('click', function () {
          setViewMode('grid', true);
        });
      }

      if (viewListBtn) {
        viewListBtn.addEventListener('click', function () {
          setViewMode('list', true);
        });
      }

      if (sortManualBtn) {
        sortManualBtn.addEventListener('click', function () {
          setSortMode('manual', true);
        });
      }

      if (sortTitleBtn) {
        sortTitleBtn.addEventListener('click', function () {
          setSortMode('title', true);
        });
      }

      document.addEventListener('click', function (e) {
        if (!picker.contains(e.target)) setOpen(false);
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') setOpen(false);
      });

      applyPageData = function (payload, resetToDefault) {
        applyPayload(payload, resetToDefault);
      };
    }

    applyPageData(payload, false);
  }

  async function boot() {
    updateClock();
    setInterval(updateClock, 30000);

    var refreshBtn = document.getElementById('refresh-cache');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async function () {
        if (refreshBtn.disabled) return;
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Refreshing…';
        var banner = document.getElementById('error-banner');
        if (banner) banner.hidden = true;

        try {
          await fetchJson('/api/data', { method: 'DELETE' });
          var payload = await fetchJson('/api/data');
          if (document.title === 'Start' && payload.pageTitle) {
            document.title = payload.pageTitle;
          }
          setFooterFetchedAt(payload.fetchedAt);
          if (applyPageData) {
            applyPageData(payload, true);
          } else {
            initCollectionSwitcher(payload);
          }
        } catch (err) {
          showPageError(err.message || 'Could not refresh cache');
        } finally {
          refreshBtn.disabled = false;
          refreshBtn.textContent = 'Refresh';
        }
      });
    }

    try {
      var payload = await fetchJson('/api/data');
      if (document.title === 'Start' && payload.pageTitle) {
        document.title = payload.pageTitle;
      }
      setFooterFetchedAt(payload.fetchedAt);
      initCollectionSwitcher(payload);
    } catch (err) {
      showPageError(err.message || 'Could not load start page data');
      var configEmpty = document.getElementById('config-empty');
      if (configEmpty) configEmpty.hidden = false;
    }
  }

  boot();
})();
