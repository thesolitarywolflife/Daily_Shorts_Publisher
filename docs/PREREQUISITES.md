# Prerequisites — what to create before importing the workflow

Complete these **in order**. You can stop after YouTube-only testing and add Meta later.

---

## 1. Accounts and decisions

| Item | Requirement | How to create |
|------|-------------|---------------|
| **Google account** | Owns Drive, Sheet, YouTube | Existing Gmail / Google account |
| **n8n host** | Self-hosted (recommended) or Cloud | [Docker setup](../docker/README.md) or n8n Cloud signup |
| **Gemini API key** | AI titles from video | [Google AI Studio](https://aistudio.google.com/apikey) → Create API key |
| **YouTube channel** | Shorts upload target | [YouTube Studio](https://studio.youtube.com/) |
| **Facebook Page** | FB Reels + IG link | [Create a Page](https://www.facebook.com/pages/creation/) (e.g. brand name) |
| **Instagram Creator** | IG Reels via API | Instagram app → Account → **Switch to professional** → **Creator**; link to Page in Meta Business Suite |
| **Meta Developer app** | OAuth for n8n | [developers.facebook.com](https://developers.facebook.com/) → Create app → add **Facebook Login** + Page / Instagram use cases |

**Important:** Personal Instagram cannot use the official publish API. Use **Creator** (or Business) linked to a **Facebook Page**.

---

## 2. Google Drive layout

Create one queue folder and a `done/` subfolder per category (start with one category, e.g. Balaji):

```text
Shorts/
└── Balaji/
    ├── (drop videos here — queue)
    └── done/   (workflow moves files here after a successful post)
```

**Folder IDs:** Open a folder in Drive; copy the ID from the URL:

`https://drive.google.com/drive/folders/<FOLDER_ID>`

Record queue ID and `done/` ID for the Sheet **Config** tab.

**Video files:** MP4 (H.264), vertical Shorts; aim **≤ ~18 MB** for reliable Gemini inline analysis on the free tier.

---

## 3. Google Sheet workbook

1. Create a spreadsheet (e.g. **Shorts Publishing Log**).
2. Copy **Spreadsheet ID** from the URL:  
   `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`

### Tab: `Config`

Row 1 headers:

| category | standard_hashtags | drive_folder_id | drive_done_folder_id | sheet_tab | enabled |
|----------|-------------------|-----------------|----------------------|-----------|---------|

Example row (v1 — one category):

```text
Balaji   #Balaji #Anime #Shorts   <queue_folder_id>   <done_folder_id>   Balaji   TRUE
```

Use `TRUE` / `FALSE` in **enabled** (only enabled rows run). See [templates/sheet-config-example.csv](../templates/sheet-config-example.csv).

### Tab: log sheet (one per category)

Tab name must match **sheet_tab** (e.g. `Balaji`). Row 1 headers — see [templates/log-tab-headers.csv](../templates/log-tab-headers.csv):

`s.no`, `date`, `time`, `ai_title`, `instagram_link`, `facebook_link`, `youtube_link`, `status`, `notes`, `drive_file_id`

---

## 4. Google Cloud project (Drive, Sheets, YouTube)

1. [Google Cloud Console](https://console.cloud.google.com/) → **New project**.
2. **APIs & Services → Enable APIs:**
   - Google Drive API  
   - Google Sheets API  
   - YouTube Data API v3  
3. **OAuth consent screen** — configure (External or Internal).
4. **Credentials → Create OAuth client** (Web application) for n8n:
   - Redirect URI: `http://localhost:5678/rest/oauth2-credential/callback` (adjust if n8n is on another URL).

In **n8n**, create and connect:

- Google Drive OAuth2  
- Google Sheets OAuth2  
- YouTube OAuth2  

Use the same Google account that owns Drive/Sheet/channel.

---

## 5. Meta app (Instagram + Facebook Reels)

### 5.1 App setup (Balaji1-style)

1. [developers.facebook.com](https://developers.facebook.com/) → **Create app** (Business type is fine).
2. Add use case **Manage everything on your Page** (wording may vary).
3. **Facebook Login → Settings:**
   - **Valid OAuth Redirect URIs:**  
     `http://localhost:5678/rest/oauth2-credential/callback`
   - Enable **Client OAuth login** and **Web OAuth login**.
4. **App roles:** your Facebook user = **Administrator** or **Developer**.
5. **Permissions** (for development / your own Page):  
   `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`  
   Request **Advanced access** for `pages_manage_posts` if FB Reels return permission errors.

### 5.2 Link app to Business Suite (if Page is in Business Manager)

[business.facebook.com](https://business.facebook.com/) → **Settings → Accounts → Apps** → connect your Meta app.

### 5.3 IDs for the workflow

| ID | Where to get it |
|----|-----------------|
| **Facebook Page ID** | Graph API Explorer: `GET` `1482621931590270?fields=id,name` (your Page’s numeric id) |
| **Instagram Business Account ID** | `GET` `{page-id}?fields=instagram_business_account` → use `instagram_business_account.id` |

Set in n8n node **Workflow constants**: `meta_fb_page_id`, `meta_ig_user_id` (or env `META_FB_PAGE_ID`, `META_IG_USER_ID` in [docker/.env.example](../docker/.env.example)).

### 5.4 n8n Facebook credential

- Type: **Facebook Graph API** (OAuth2).
- App ID + App Secret from Meta → **Settings → Basic**.
- **Custom scopes** (comma-separated):

```text
pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish
```

**Connect / Reconnect** → approve as Page admin → select Page + Instagram when prompted.

---

## 6. n8n environment

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | Gemini title generation (or set `gemini_api_key` in **Workflow constants**) |
| `META_IG_USER_ID` | Optional if set in Workflow constants |
| `META_FB_PAGE_ID` | Optional if set in Workflow constants |
| `N8N_DEFAULT_BINARY_DATA_MODE=filesystem` | Large video uploads (included in [docker-compose.yml](../docker/docker-compose.yml)) |

See [docker/README.md](../docker/README.md) for Docker setup.

---

## 7. Pre-import checklist

- [ ] Drive queue + `done/` folder IDs recorded  
- [ ] Sheet **Config** + log tab with headers  
- [ ] Spreadsheet ID copied  
- [ ] Gemini API key ready  
- [ ] Google OAuth credentials connected in n8n  
- [ ] YouTube OAuth connected  
- [ ] Meta app + Facebook Graph credential connected (if using IG/FB)  
- [ ] Page ID + IG user ID in **Workflow constants**  
- [ ] One test MP4 in the queue folder  

Next: [IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md).
