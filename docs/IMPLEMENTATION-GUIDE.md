# Implementation guide

End-to-end plan to deploy **Daily Shorts Publisher V3** on n8n.

---

## Overview

| Phase | Goal | Doc section |
|-------|------|-------------|
| 0 | Prerequisites & accounts | [PREREQUISITES.md](./PREREQUISITES.md) |
| 1 | Google Drive + Sheet | Prerequisites §2–3 |
| 2 | Run n8n (Docker) | [docker/README.md](../docker/README.md) |
| 3 | Google Cloud + n8n credentials | Prerequisites §4 |
| 4 | Import workflow + constants | Below §A |
| 5 | YouTube test | Below §B |
| 6 | Meta (IG + FB) | Prerequisites §5 + [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) |
| 7 | Go live | Below §C |

---

## Phase 2 — Start n8n (Docker)

```bash
cd docker
cp .env.example .env
# Edit .env: N8N_BASIC_AUTH_*, GEMINI_API_KEY, optional META_* IDs
docker compose up -d --force-recreate
```

Open [http://localhost:5678](http://localhost:5678), create owner account, complete setup wizard.

**Resources:** Docker Desktop → **4 GB+ RAM** if large uploads fail.

---

## §A — Import workflow

1. n8n → **Workflows** → **Import from File**.
2. Choose **`Daily Shorts Publisher V3.json`** (or `workflows/daily-shorts-publisher.json` — same content).
3. Open **Workflow constants** → set:
   - `spreadsheet_id` — your Google Sheet ID  
   - `meta_ig_user_id` — Instagram Business account ID  
   - `meta_fb_page_id` — Facebook Page ID  
   - `gemini_model` — e.g. `gemini-2.5-flash`  
   - `gemini_api_key` — optional if `GEMINI_API_KEY` is in Docker env  
4. On each node with a credential warning, select your saved credentials:
   - Google Sheets / Drive  
   - YouTube  
   - Facebook Graph (same credential on all IG + **FB Get page token** nodes)  
5. **Do not activate** the schedule until manual tests pass.

Workflow behavior: [PROJECT-STEPS.md](./PROJECT-STEPS.md).

---

## §B — Test matrix (manual trigger)

Use **Manual test trigger**. Keep **one** category `enabled=TRUE` and one test MP4 in queue.

| # | Test | Expected |
|---|------|----------|
| 1 | Empty queue folder | **Log skipped (no video)** → `status=skipped` |
| 2 | One video | **Gemini** sets `ai_title`; captions include Config hashtags |
| 3 | YouTube only (optional: disable IG/FB temporarily) | `youtube_link` in log; file moves to `done/` |
| 4 | Full run | YT + IG + FB links; `status=posted` or `partial` with **notes** |
| 5 | Facebook link | Full URL `https://www.facebook.com/reel/...` in sheet |

Inspect failed nodes in **Executions** → open node output JSON.

---

## §C — Go live

- [ ] All credentials connected and tested  
- [ ] **Workflow constants** IDs correct  
- [ ] **Collect post links** produces links you can open in a browser  
- [ ] Toggle workflow **Active**  
- [ ] Confirm **Schedule 6PM IST** is enabled  
- [ ] Monitor log tabs for 2–3 days  
- [ ] Export workflow from n8n after changes and commit JSON to this repo  

**Mac / laptop:** machine must be awake at 6 PM IST or move Docker to an always-on host.

---

## Repository layout (after cleanup)

```text
N8N/
├── Daily Shorts Publisher V3.json   # Canonical workflow (import this)
├── workflows/daily-shorts-publisher.json  # Same as V3
├── docker/                          # n8n Docker Compose
├── import/                          # Code node sources + sync script
├── templates/                       # Sheet CSV examples
└── docs/                            # This guide + prerequisites + steps
```

---

## Updating Code nodes

1. Edit the matching file under `import/` (e.g. `collect-post-links-code.js`).
2. Run:

```bash
python3 import/sync-into-v3.py
```

3. Re-import JSON into n8n or paste updated code into the node.

**Note:** `gemini-title-captions-code.js` should match your production prompt logic; the repo JSON is synced from your working n8n export.

---

## Scaling to multiple categories

1. Add Drive folders + `done/` for each category.  
2. Add **Config** rows and matching log tabs.  
3. Set `enabled=TRUE` per row when ready.  
4. Plan separate YouTube channels / Meta assets per brand if needed.

---

## Related

- [PREREQUISITES.md](./PREREQUISITES.md) — create accounts, Sheet, Meta app  
- [PROJECT-STEPS.md](./PROJECT-STEPS.md) — node-by-node behavior  
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — Meta tokens, FB Reels, common errors  
