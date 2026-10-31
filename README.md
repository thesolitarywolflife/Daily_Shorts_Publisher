# Daily Shorts Publisher (n8n)

Automates **YouTube Shorts**, **Instagram Reels**, and **Facebook Page Reels** from **Google Drive**, once per enabled category at **6:00 PM IST**. Uses **Google Sheets** for config and logging, **Gemini** for titles, and moves posted files to **`done/`**.

## Quick start

1. Read **[docs/PREREQUISITES.md](docs/PREREQUISITES.md)** — accounts, Drive, Sheet, Google Cloud, Meta app.  
2. Start n8n — **[docker/README.md](docker/README.md)**.  
3. Follow **[docs/IMPLEMENTATION-GUIDE.md](docs/IMPLEMENTATION-GUIDE.md)** — import workflow, test, go live.  
4. Understand the flow — **[docs/PROJECT-STEPS.md](docs/PROJECT-STEPS.md)**.  
5. If something breaks — **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)**.

## Import this workflow

| File | Use |
|------|-----|
| **`Daily Shorts Publisher V3.json`** | Primary template (self-contained Code nodes) |
| `workflows/daily-shorts-publisher.json` | Same content as V3 |

After import: set **Workflow constants** (`spreadsheet_id`, Meta IDs) and map credentials.

## Repo layout

```text
Daily Shorts Publisher V3.json   # Import into n8n
workflows/                       # Mirror of V3
docker/                          # Docker Compose + .env.example
import/                          # Code node sources; run sync-into-v3.py after edits
templates/                       # Sheet header CSV examples
docs/                            # Implementation guides
```

## Stack (typical cost)

| Component | Choice |
|-----------|--------|
| Automation | n8n self-hosted (Docker) |
| AI titles | Google Gemini (API key) |
| Storage / log | Google Drive + Sheets |
| YouTube | YouTube Data API (OAuth) |
| IG + FB | Meta Graph API (Page + Creator IG) |

## Maintaining Code nodes

Edit files in `import/`, then:

```bash
python3 import/sync-into-v3.py
```

Re-import the JSON or update nodes in n8n.
