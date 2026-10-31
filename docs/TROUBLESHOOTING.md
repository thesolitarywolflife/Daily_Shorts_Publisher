# Troubleshooting

Common issues for **Daily Shorts Publisher V3**.

---

## Gemini

Google returns **different errors for the same key** (retired model, “new users blocked”, prepaid depleted, daily rate limit). Your **AI Studio → Rate limits** page is the source of truth.

| Symptom | What it usually means | Fix |
|---------|----------------------|-----|
| `GEMINI_API_KEY` missing | No key in env/constants | Set key in **Workflow constants** or `docker/.env` |
| **no longer available** (2.0 / 2.5-flash) | Model retired or blocked for your key | **Workflow constants → gemini_model** = `gemini-2.5-flash-lite` (not 2.5-flash, not 2.0) |
| **Prepayment credits depleted** | Project uses prepaid/billing; that balance is $0, or model is paid-only | AI Studio → **Billing** or use a **new API key** on a fresh project without prepaid billing. Do not use `gemini-3.8-flash` unless billing is funded. |
| **RPD bar full** (e.g. 23/20 on 3.8 Flash) | **Free daily limit hit** for that model | Wait until quota resets (Pacific midnight) or use a model with headroom (e.g. **3.5 Flash Lite** 27/500 in Rate limits) |
| Workflow still posts | Fallback title | Code uses filename title when all Gemini calls fail; fix Gemini to restore AI titles |

**Workflow constants (recommended):**

```text
gemini_model = gemini-2.5-flash-lite
```

Re-import **`Daily Shorts Publisher V3.json`** or paste `import/gemini-title-captions-code.js` — it **only** tries lite/preview models and **never** auto-cycles `gemini-2.5-flash` / `3.8-flash`.

---

## YouTube

| Symptom | Fix |
|---------|-----|
| 400 on upload | Ensure binary `mimeType` is `video/mp4`; **Gemini** node normalizes binary |
| Wrong channel | Reconnect YouTube OAuth with the correct Google account |

---

## Instagram

| Symptom | Fix |
|---------|-----|
| Container / rupload errors | Confirm **Facebook Graph** credential on all IG HTTP nodes |
| Numeric id in sheet instead of link | **IG Fetch post link** must run; **Collect** uses `permalink` only |
| `requestWithAuthentication` in Code | Do not use legacy single Code upload; V3 uses HTTP chain |

---

## Facebook — Page token

| Symptom | Fix |
|---------|-----|
| `(#100) nonexisting field (tasks)` | **FB Get page token** query `fields` must be `id,name,access_token` only (no `tasks`) |
| `(#104) access token required` | Reconnect **Facebook Graph** credential; Balaji1 → Facebook Login → redirect `http://localhost:5678/rest/oauth2-credential/callback` |
| `/me/accounts` empty | OK if `GET /{page-id}?fields=id,name,access_token` returns `access_token` |
| `(#200) no permission to post videos` | Page token needs `pages_manage_posts` (Advanced access); reconnect OAuth; post with **Page** token on `video_reels` |

### Graph API Explorer quick test

1. **GET** `1482621931590270?fields=id,name,access_token` (your Page ID).  
2. **POST** `1482621931590270/video_reels` with JSON body:  
   `{"upload_phase":"start","access_token":"<PAGE_TOKEN>"}`  
3. Expect `video_id` + `upload_url`. Until this works, n8n **FB Reels 1 Start** will fail too.

---

## Facebook — upload message

**“Upload Successful. To check the status…”** on **FB Reels 3 Upload** is normal text from rupload, not an error. Publishing happens at **FB Reels 4 Finish**.

---

## Facebook — Reels vs video on Page

API targets the **Facebook Page**, not your personal profile. Check **Page → Reels**. Vertical short MP4 + successful **Finish** should appear as Reels; horizontal or very long files may look like regular videos.

---

## Workflow / n8n

| Symptom | Fix |
|---------|-----|
| File moved to `done/` without links | Update **Collect post links** from repo (requires link before `moveToDone`) |
| Partial platform failure | `status=partial` in log; read **notes** column |
| Import broke credentials | Re-select credentials on nodes (IDs in JSON are from another n8n instance) |

---

## Meta app blocked

**“API access blocked”** in Explorer:

- Confirm app **Administrator** role  
- Complete Data Use / app alerts in Meta dashboard  
- Remove and re-add app under Facebook **Business integrations**  
- Regenerate token in Explorer or n8n **Reconnect**

---

## Security

- Never commit `docker/.env` or OAuth client secrets.  
- Rotate tokens if exposed in screenshots or chat.  
- `.gitignore` excludes `docker/.env` and credential export files.
