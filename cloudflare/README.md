# StartPage on Cloudflare Pages

Fast new-tab start page: static UI from the CDN edge, Raindrop data from Pages Functions + KV cache.

## Why this is faster than Apps Script

| Layer | Behavior |
|-------|----------|
| **HTML / CSS / JS** | Served from Cloudflare CDN; browser caches assets |
| **`GET /api/data`** | Small JSON from a Worker; KV cache (no 100KB limit) |
| **Collection switch** | `GET /api/collections/:id` — cached in KV after first load |

The greeting, search box, and layout appear immediately while bookmarks load from `/api/data`.

## Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- Raindrop API token (same as Apps Script setup)
- Node.js 18+

## One-time setup

### 1. Install dependencies

```bash
cd cloudflare
npm install
```

### 2. Create a KV namespace

```bash
npx wrangler kv namespace create STARTPAGE_CACHE
npx wrangler kv namespace create STARTPAGE_CACHE --preview
```

Copy the `id` values into `wrangler.toml` (`id` and `preview_id`).

### 3. Configure secrets and vars

Copy `.dev.vars.example` to `.dev.vars` for local dev:

```bash
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your token and COLLECTION_IDS
```

For production, set vars in the Cloudflare dashboard (**Workers & Pages → startpage → Settings → Environment variables**) or:

```bash
npx wrangler pages project create startpage --production-branch=main
npx wrangler secret put RAINDROP_ACCESS_TOKEN --env production
```

Set `COLLECTION_IDS`, `CACHE_MINUTES`, etc. in the dashboard or `wrangler.toml` `[vars]`.

### 4. Create the Pages project (first deploy)

```bash
npm run deploy
```

Follow prompts if the project does not exist yet.

### 5. Bind KV to the Pages project

In **Workers & Pages → startpage → Settings → Functions → KV namespace bindings**:

- Variable name: `CACHE`
- KV namespace: `STARTPAGE_CACHE`

(If you use `wrangler.toml` bindings, `wrangler pages deploy` may apply them automatically for linked projects.)

### 6. Point your new-tab extension at the Pages URL

Example: `https://startpage.pages.dev` or your custom domain.

Hard-refresh once after deploy.

## Local development

```bash
npm run dev
```

Open the URL wrangler prints (usually `http://localhost:8788`).

## API

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/data` | GET | Start page payload (preloaded collections + picker list) |
| `/api/data` | DELETE | Clear KV cache |
| `/api/collections/:id` | GET | One collection (cached after first fetch) |

## Privacy

The default `*.pages.dev` URL is public. To restrict access:

1. Add a custom domain on Cloudflare
2. Enable **[Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/)** on that hostname

This replaces Google Workspace “DOMAIN” deployment from Apps Script.

## Cache bust

```bash
curl -X DELETE https://your-site.pages.dev/api/data
```

Or delete keys in the KV dashboard.

## Apps Script vs Cloudflare

- **`cloudflare/`** — edge deployment (recommended for new tabs)
- **`google-apps-script/`** — Google Apps Script deployment

Use one URL in your browser extension, not both. See [google-apps-script/README.md](../google-apps-script/README.md).
