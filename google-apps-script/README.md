# StartPage — Google Apps Script

Legacy deployment: Raindrop bookmarks via a [Google Apps Script](https://script.google.com/) web app.

For **fast new-tab loading**, use **[Cloudflare Pages](../cloudflare/README.md)** instead (`https://startpage-72s.pages.dev`).

## Files

| File | Role |
|------|------|
| `Code.gs` | Web app entry (`doGet`), caching |
| `Config.gs` | Script properties |
| `Raindrop.gs` | Raindrop REST API client |
| `Index.html` | Page template |
| `Styles.html` | CSS (included in Index) |
| `Client.html` | Clock, search, collection switcher |
| `appsscript.json` | Manifest (V8, web app settings) |

## Prerequisites

- [Raindrop.io](https://raindrop.io) account and API token
- Google account with Apps Script
- [`clasp`](https://github.com/google/clasp) (optional, recommended)

## Script properties

In the Apps Script editor: **Project Settings** → **Script properties**:

| Property | Required | Example |
|----------|----------|---------|
| `RAINDROP_ACCESS_TOKEN` | Yes | From [Integrations](https://app.raindrop.io/settings/integrations) |
| `COLLECTION_IDS` | Yes | `8492393` — first ID is default; all listed IDs are preloaded |
| `BOOKMARKS_PER_PAGE` | No | `50` (max 50) |
| `CACHE_MINUTES` | No | `15` |
| `PAGE_TITLE` | No | `Start` |
| `ICON_OVERRIDES` | No | JSON map — bookmark id or domain → icon URL/path (see below) |

**`ICON_OVERRIDES`** — optional JSON object. Keys are Raindrop bookmark ids (as strings) or hostnames; values are icon URLs or paths under `public/icons/`:

```json
{"github.com":"/icons/github.png","8492393":"https://example.com/my-icon.png"}
```

If a bookmark matches, that icon is used instead of the Google favicon lookup.

Run `listRaindropCollections()` in the editor to list collection IDs.

## Deploy with clasp

From the **repository root** (`.clasp.json` points at this folder):

```bash
clasp push
clasp deployments
clasp redeploy <DEPLOYMENT_ID> -d "describe your change"
```

If `clasp push` reports **Conflicting files found**, delete `Code.js`, `Config.js`, and `Raindrop.js` in this folder (created by `clasp pull`), then push again.

Print the correct Workspace web app URL:

```bash
node google-apps-script/scripts/print-webapp-url.mjs [deploymentId]
```

## Useful editor functions

| Function | Purpose |
|----------|---------|
| `listRaindropCollections()` | Log collection IDs |
| `refreshStartPageData()` | Clear cache and refetch |
| `clearStartPageCache()` | Clear cache only |
| `logStartPageCacheInfo()` | Log cache chunk sizes |

## Security

- Keep `RAINDROP_ACCESS_TOKEN` in Script properties only
- Web app access is set in `appsscript.json` and the deployment UI (`DOMAIN` / Only myself)
