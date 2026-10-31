# n8n on Docker Desktop (Mac)

## 1. Install Docker Desktop for Mac

1. Download: [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/) (Apple Silicon or Intel).
2. Open the `.dmg`, drag **Docker** to Applications.
3. Launch **Docker** from Applications; wait until the menu bar whale icon is **Running**.
4. **Open Docker Desktop once** and wait until the menu bar whale shows **Running** (first launch may ask for password / terms).

5. Optional check in Terminal:

   ```bash
   docker --version
   docker compose version
   ```

   If you see `command not found: docker` but `/Applications/Docker.app` exists, reload shell config:

   ```bash
   source ~/.zshrc
   docker --version
   ```

   Or run once without PATH fix:

   ```bash
   /Applications/Docker.app/Contents/Resources/bin/docker --version
   ```

**Requirements:** macOS supported by current Docker Desktop; enough disk for images (~1 GB+ for n8n).

## 2. Start n8n

From this `docker` folder:

```bash
cd "/Users/balajij_othimani/Documents/Balaji_Doc/Anime/N8N/docker"
cp .env.example .env
# Edit .env: set password and GEMINI_API_KEY
docker compose up -d
```

After changing `.env` (e.g. `GEMINI_API_KEY`), **recreate** the container or the key will not load:

```bash
docker compose up -d --force-recreate
```

**If Code node still says GEMINI_API_KEY missing (n8n 2.x task runners):** paste the key in the workflow node **Workflow constants** → field **`gemini_api_key`** (works without Docker env).

Open: [http://localhost:5678](http://localhost:5678)

- First visit: create your **n8n owner account** (in addition to basic auth from `.env` if prompted).
- Import workflow from `../Daily Shorts Publisher V3.json` (or `../workflows/daily-shorts-publisher.json`).
- Setup guide: `../docs/IMPLEMENTATION-GUIDE.md`.

## 3. Stop / logs

```bash
docker compose logs -f n8n
docker compose down
```

Data (workflows, credentials) stays in Docker volume `n8n_data`.

## 4. Mac notes for your shorts workflow

- **6 PM IST** is set via `TZ` / workflow timezone; keep Mac awake at post time or run n8n on a always-on machine/VPS later.
- Large videos: Docker default memory may be low — in Docker Desktop → **Settings → Resources**, give **4 GB+ RAM** if uploads fail.
- **OAuth (Google / YouTube / Meta):** redirect URLs must use `http://localhost:5678/` (or your public URL if you change `N8N_HOST` later).

## 5. Production tip

For daily 6 PM posting, a Mac that sleeps may miss runs. Options: prevent sleep at that time, or move the same `docker-compose.yml` to a small cloud VM later.
