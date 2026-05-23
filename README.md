# StartPage

A personal browser start page backed by [Raindrop.io](https://raindrop.io) collections — iOS-style bookmark grid, collection picker, search, and dark/light mode.

Two deployments live in this repo:

| Path | Platform | Best for |
|------|----------|----------|
| **[`cloudflare/`](cloudflare/)** | Cloudflare Pages + Workers + KV | **Fast new tabs** (recommended) |
| **[`google-apps-script/`](google-apps-script/)** | Google Apps Script web app | Google-only hosting, Workspace auth |

## Features

- Raindrop REST API with server-side caching
- Collection picker (default = first `COLLECTION_IDS` entry)
- Responsive bookmark grid with favicons
- Per-tab default collection (`sessionStorage`)
- Footer: Edit bookmarks, Refresh cache

## Quick start (Cloudflare)

Production URL: **https://startpage-72s.pages.dev**

See **[cloudflare/SETUP.md](cloudflare/SETUP.md)** for first-time setup, or **[cloudflare/README.md](cloudflare/README.md)** for a shorter reference.

```bash
cd cloudflare
npm install
npm run deploy
```

Environment: `RAINDROP_ACCESS_TOKEN` (secret), `COLLECTION_IDS`, and optional vars in `wrangler.toml` / dashboard.

## Quick start (Google Apps Script)

See **[google-apps-script/README.md](google-apps-script/README.md)**.

```bash
# from repo root
clasp push
clasp redeploy <DEPLOYMENT_ID> -d "your message"
```

## Project structure

```
StartPage/
├── cloudflare/              # Pages + Functions (edge deployment)
│   ├── public/              # Static HTML, CSS, JS
│   ├── functions/           # API routes + Raindrop/KV logic
│   ├── wrangler.toml
│   ├── SETUP.md             # First-time Cloudflare walkthrough
│   └── README.md
├── google-apps-script/      # Apps Script source
│   ├── *.gs, *.html
│   ├── appsscript.json
│   ├── scripts/
│   └── README.md
├── .clasp.json              # clasp rootDir → google-apps-script/
└── README.md
```

## Security

- Never commit Raindrop tokens (`.dev.vars`, Script properties, Wrangler secrets only)
- Cloudflare `*.pages.dev` is public unless you add [Cloudflare Access](cloudflare/SETUP.md#part-10--privacy-recommended)
- Apps Script uses Google account / DOMAIN deployment access

## License

MIT
