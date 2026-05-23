# StartPage

A browser start page hosted on [Google Apps Script](https://script.google.com/), displaying bookmarks from one or more [Raindrop.io](https://raindrop.io) collections.

## Features

- Fetches bookmarks from configurable Raindrop collections via the REST API
- Responsive grid layout with collection colors, favicons, and search
- Server-side caching to reduce API calls
- Dark/light mode follows your system preference
- Private by default — deployed as a web app accessible only to you

## Prerequisites

1. A [Raindrop.io](https://raindrop.io) account
2. A [Google account](https://accounts.google.com) for Apps Script
3. (Optional) [Node.js](https://nodejs.org/) and [`clasp`](https://github.com/google/clasp) for local development

## Quick start

### 1. Create the Apps Script project

**Option A — clasp (recommended for this repo)**

```bash
npm install -g @google/clasp
clasp login
clasp create --title "StartPage" --type webapp
clasp push
```

Copy the generated `scriptId` into `.clasp.json` (see `.clasp.json.example`).

**Option B — manual**

1. Go to [script.google.com](https://script.google.com) → **New project**
2. Name it **StartPage**
3. Copy all `.gs` and `.html` files from this repo into the editor (matching filenames)
4. Copy `appsscript.json` settings via **Project Settings** → enable Chrome V8 runtime

### 2. Get a Raindrop API token

1. Open [Raindrop.io → Settings → Integrations](https://app.raindrop.io/settings/integrations)
2. Create a **Test token** (or register an OAuth app for production use)
3. Copy the token

### 3. Find your collection IDs

In the Apps Script editor, select `listRaindropCollections` from the function dropdown and click **Run**. Check **Executions** for a table of collection IDs and titles.

### 4. Configure Script properties

In the Apps Script editor: **Project Settings** (gear) → **Script properties** → add:

| Property | Required | Example |
|----------|----------|---------|
| `RAINDROP_ACCESS_TOKEN` | Yes | `your_token_here` |
| `COLLECTION_IDS` | Yes | `8492393,1234567` |
| `BOOKMARKS_PER_PAGE` | No | `40` (max 40) |
| `CACHE_MINUTES` | No | `15` |
| `PAGE_TITLE` | No | `Start` |

### 5. Deploy as a web app

1. **Deploy** → **New deployment** → type **Web app**
2. **Execute as**: Me
3. **Who has access**: Only myself
4. Copy the deployment URL

### 6. Set as your browser start page

Paste the web app URL into your browser’s home/start page setting:

- **Chrome**: Settings → On startup → Open a specific page
- **Firefox**: Settings → Home → Homepage
- **Safari**: Settings → General → Homepage

## Development

```bash
clasp push          # Upload local changes
clasp pull          # Download from Apps Script
clasp open          # Open project in browser
```

### Useful script functions

| Function | Purpose |
|----------|---------|
| `listRaindropCollections()` | Log all collection IDs (setup helper) |
| `refreshStartPageData()` | Clear cache and refetch bookmarks |
| `clearStartPageCache()` | Clear cached data only |

## Project structure

```
├── Code.gs          # Web app entry (doGet), caching
├── Config.gs        # Script properties configuration
├── Raindrop.gs      # Raindrop.io API client
├── Index.html       # Start page template
├── Styles.html      # CSS (included in Index)
├── Client.html      # Clock, search, favicon fallback
└── appsscript.json  # Apps Script manifest
```

## Security notes

- Keep `RAINDROP_ACCESS_TOKEN` in Script properties only — never commit it
- The web app runs as you; "Only myself" access keeps the URL private to your Google account
- Raindrop tokens can expire; regenerate from Integrations if you see auth errors

## License

MIT
