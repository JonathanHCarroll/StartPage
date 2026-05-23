# StartPage on Cloudflare — first-time setup

This guide assumes you have never used Cloudflare before. You already have Raindrop and Apps Script working; we reuse the same token and collection IDs.

**Time:** about 20–30 minutes  
**Result:** a URL like `https://startpage.pages.dev` for your new-tab extension

---

## Before you start

Have these ready (from Raindrop / your existing Apps Script Script properties, if any):

| Name | Example |
|------|---------|
| `RAINDROP_ACCESS_TOKEN` | (long token string) |
| `COLLECTION_IDS` | `8492393` or `8492393,1234567` (first ID = default collection) |

You also need **Node.js 18+** on your Mac. Check:

```bash
node -v
```

If missing, install from [nodejs.org](https://nodejs.org/).

---

## Part 1 — Cloudflare account

1. Open [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
2. Create an account (free plan is enough).
3. Verify your email if prompted.
4. You do **not** need to add a website/domain yet for `*.pages.dev` hosting.

---

## Part 2 — Log in from your Mac (Wrangler CLI)

Wrangler is Cloudflare’s command-line tool. It deploys your site and manages KV (cache).

1. Open **Terminal**.

2. Go to the Cloudflare project folder:

   ```bash
   cd /Users/jonathan/Dev/StartPage/cloudflare
   ```

3. Install dependencies (if you have not already):

   ```bash
   npm install
   ```

4. Log in to Cloudflare (opens a browser window):

   ```bash
   npx wrangler login
   ```

   - Click **Allow** when Cloudflare asks to connect Wrangler.
   - When the terminal says you are logged in, you can close the browser tab.

---

## Part 3 — Create KV (cache storage)

KV stores cached Raindrop data so new tabs stay fast.

1. Create the **production** namespace:

   ```bash
   npx wrangler kv namespace create STARTPAGE_CACHE
   ```

   The output looks like:

   ```text
   { "id": "a1b2c3d4e5f6..." }
   ```

   Copy that **id** (long hex string).

2. Create the **preview** namespace (for local testing):

   ```bash
   npx wrangler kv namespace create STARTPAGE_CACHE --preview
   ```

   Copy that **preview id** too.

3. Open `wrangler.toml` in this folder and replace the placeholders:

   ```toml
   id = "paste-production-id-here"
   preview_id = "paste-preview-id-here"
   ```

4. Set your collection IDs in the same file (use your real IDs):

   ```toml
   COLLECTION_IDS = "8492393"
   ```

   Save the file.

---

## Part 4 — Local secrets (optional but recommended)

Test on your Mac before deploying to the internet.

1. Copy the example env file:

   ```bash
   cp .dev.vars.example .dev.vars
   ```

2. Edit `.dev.vars` (never commit this file — it is gitignored):

   ```bash
   RAINDROP_ACCESS_TOKEN=paste_your_real_token
   COLLECTION_IDS=8492393
   BOOKMARKS_PER_PAGE=50
   CACHE_MINUTES=15
   PAGE_TITLE=Start
   ```

3. Start the local server:

   ```bash
   npm run dev
   ```

4. **Wait** until the terminal shows:

   ```text
   Ready on http://localhost:8788
   ```

   Leave this terminal window **open** — closing it stops the server.

5. Open this URL in your browser (**exactly**):

   ```text
   http://localhost:8788
   ```

   Important:
   - Use **`http`** not `https`
   - Use port **`8788`**
   - Do **not** open the `https://….pages.dev` URL from the bindings table — that is for production, not local dev

6. You should see the greeting and search box immediately.
   Bookmarks load a moment later.
   If you see an error banner, check the token and `COLLECTION_IDS` in `.dev.vars`.

7. Stop the server with **Ctrl+C** when done.

### Step 4 troubleshooting — “connection refused”

| Cause | Fix |
|-------|-----|
| Server not running | Run `npm run dev` and wait for `Ready on http://localhost:8788` |
| Wrong URL | Use `http://localhost:8788` (not https, not another port) |
| Opened `*.pages.dev` URL | That only works after deploy (Step 5), not during local dev |
| Terminal closed | Keep the `npm run dev` terminal open while testing |
| Wrangler crashed on start | See below |

If Wrangler exits with errors when you run `npm run dev`:

**“too many open files” (EMFILE):**

```bash
ulimit -n 10240
npm run dev
```

**Other startup errors:** try updating Wrangler:

```bash
npm install wrangler@latest
npm run dev
```

**Skip local dev:** Step 4 is optional. You can go straight to **Step 5 (deploy)** and test on `https://startpage.pages.dev` instead.

---

## Part 5 — Deploy to Cloudflare Pages

1. Create the Pages project (first time only):

   ```bash
   npx wrangler pages project create startpage --production-branch=main
   ```

   If it says the project already exists, that is fine.

2. Deploy:

   ```bash
   npm run deploy
   ```

   At the end you will see a URL, e.g.:

   ```text
   https://startpage.pages.dev
   ```

   Copy it.

---

## Part 6 — Production secrets (dashboard)

The Raindrop token must be set as a **secret** in Cloudflare (not in git).

1. Go to [https://dash.cloudflare.com](https://dash.cloudflare.com)
2. Left sidebar: **Workers & Pages**
3. Click your project: **startpage**
4. **Settings** → **Environment variables**
5. Under **Production**, click **Add**:
   - **Type:** Secret
   - **Variable name:** `RAINDROP_ACCESS_TOKEN`
   - **Value:** your Raindrop token
6. Add plain variables if they are not already set from deploy:
   - `COLLECTION_IDS` = your comma-separated IDs
   - `CACHE_MINUTES` = `15` (optional)
   - `PAGE_TITLE` = `Start` (optional)
7. Click **Save**.

**Alternative (terminal):**

```bash
npx wrangler pages secret put RAINDROP_ACCESS_TOKEN --project-name=startpage
```

(Paste the token when prompted.)

After changing variables, redeploy once:

```bash
npm run deploy
```

---

## Part 7 — Bind KV to the Pages project

The Worker code expects a KV binding named `CACHE`.

1. Dashboard: **Workers & Pages** → **startpage** → **Settings**
2. **Bindings** (or **Functions** → **KV namespace bindings**)
3. **Add binding**:
   - **Variable name:** `CACHE` (must be exactly this)
   - **KV namespace:** `STARTPAGE_CACHE`
4. Save.

Redeploy if the site showed “CACHE KV binding is not configured”:

```bash
npm run deploy
```

---

## Part 8 — Verify in the browser

1. Open `https://startpage.pages.dev` (or your deploy URL).
2. Hard-refresh: **Cmd+Shift+R**
3. Check:
   - Greeting + search appear quickly
   - Bookmarks load (default collection = first ID in `COLLECTION_IDS`)
   - Collection picker works
4. Open **Developer Tools → Network**:
   - `index.html`, `styles.css`, `app.js` should load from cache on repeat visits
   - `/api/data` should return JSON (status 200)

If you see **“Could not load bookmarks”**, open the **/api/data** request in Network and read the error JSON. Common fixes:

| Error | Fix |
|-------|-----|
| `RAINDROP_ACCESS_TOKEN is not set` | Add secret in Part 6, redeploy |
| `COLLECTION_IDS is not set` | Set variable in dashboard or `wrangler.toml`, redeploy |
| `CACHE KV binding is not configured` | Part 7 |
| Raindrop 401 | Regenerate token at Raindrop → Settings → Integrations |

---

## Part 9 — Point your new-tab extension at Cloudflare

1. Copy your Pages URL: `https://startpage.pages.dev`
2. In your new-tab extension settings, replace the old Apps Script `/exec` URL with this URL.
3. Open a new tab and confirm it loads the fast version.

Keep the Apps Script URL bookmarked until you are satisfied; both can run in parallel during testing.

---

## Part 10 — Privacy (recommended)

Anyone with the `*.pages.dev` URL can load your start page (they cannot see your token). To lock it down:

1. Add a domain you control to Cloudflare (or use an existing zone).
2. **Workers & Pages** → **startpage** → **Custom domains** → add e.g. `start.jonathanandjodi.com`
3. Enable **[Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/)** on that hostname so only you (or your org) can open it.

This is the Cloudflare equivalent of your Apps Script “DOMAIN” deployment.

---

## Day-to-day updates

After you change code in `cloudflare/public` or `cloudflare/functions`:

```bash
cd /Users/jonathan/Dev/StartPage/cloudflare
npm run deploy
```

Clear Raindrop cache after changing collections:

```bash
curl -X DELETE https://startpage.pages.dev/api/data
```

---

## Quick reference

| Task | Command / place |
|------|------------------|
| Local dev | `npm run dev` |
| Deploy | `npm run deploy` |
| Dashboard | [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → startpage |
| Secrets | Settings → Environment variables |
| KV binding | Settings → Bindings → `CACHE` → `STARTPAGE_CACHE` |
