# Project steps — what the workflow does

**Workflow file:** [Daily Shorts Publisher V3.json](../Daily%20Shorts%20Publisher%20V3.json) (mirror: [workflows/daily-shorts-publisher.json](../workflows/daily-shorts-publisher.json))

**Schedule:** 6:00 PM IST (`Asia/Kolkata`), cron `0 18 * * *`

---

## High-level flow

```text
Schedule / Manual trigger
    → Workflow constants (spreadsheet ID, Meta IDs, Gemini model)
    → Read Config tab
    → Only enabled categories
    → For each category (loop):
          Search Drive (videos in queue folder)
          → Pick oldest video (or skip if empty)
          → Download video
          → Gemini title + captions (+ hashtags from Config)
          → Parallel uploads:
                YouTube
                Instagram Reels (resumable Graph upload)
                Facebook Reels (Page token → resumable upload)
          → Merge social branches
          → Collect post links (full URLs, moveToDone rules)
          → Log row to category sheet tab
          → Move file to done/ (if at least one platform link succeeded)
          → Continue loop
```

---

## Step-by-step (by node group)

### Triggers and config

| Step | Node | Action |
|------|------|--------|
| 1 | **Schedule 6PM IST** / **Manual test trigger** | Starts run |
| 2 | **Workflow constants** | Injects `spreadsheet_id`, `meta_ig_user_id`, `meta_fb_page_id`, `gemini_model`, optional `gemini_api_key` |
| 3 | **Read Config tab** | Loads all category rows from Sheet |
| 4 | **Only enabled categories** | Filters rows where `enabled` is TRUE/YES/1 |
| 5 | **Loop Over Categories** | Processes one category per iteration |

### Drive and AI

| Step | Node | Action |
|------|------|--------|
| 6 | **Search next videos** | Lists video files in `drive_folder_id` |
| 7 | **Pick oldest video** | Chooses earliest by `createdTime`; sets `hasVideo: false` if empty |
| 8 | **Has video?** | Branches: skip log vs continue |
| 9 | **Log skipped (no video)** | Appends row with `status=skipped` when queue is empty |
| 10 | **Download video** | Pulls MP4 binary from Drive |
| 11 | **Gemini title + captions** | Sends video to Gemini; builds `ai_title`, YT/IG/FB captions using **standard_hashtags** from Config |

### YouTube branch

| Step | Node | Action |
|------|------|--------|
| 12 | **Upload YouTube** | Uploads as Shorts; uses title/description from Gemini |

### Instagram branch

| Step | Node | Action |
|------|------|--------|
| 13 | **IG Reels 1 Create container** | `POST /{ig-user-id}/media` resumable container |
| 14 | **IG Merge video + container** | Combines Create response with video binary |
| 15 | **IG Reels 2 Prepare upload** | Resolves `file_size`, rupload URL |
| 16 | **IG Reels 3 Rupload** | POST binary to `rupload.facebook.com` |
| 17 | **IG Wait for processing** | Waits 60s for Meta processing |
| 18 | **Instagram Reels (Graph)** | `media_publish` |
| 19 | **IG Fetch post link** | GET `permalink` for sheet link |

### Facebook branch

| Step | Node | Action |
|------|------|--------|
| 20 | **FB Get page token** | `GET /{page-id}?fields=id,name,access_token` (user OAuth) |
| 21 | **FB Resolve page token** | Extracts `page_access_token` for Reels calls |
| 22 | **FB Reels 1 Start** | `POST /{page-id}/video_reels` `upload_phase=start` |
| 23 | **FB Reels 2 Prepare upload** | Attaches Gemini binary + upload URL |
| 24 | **FB Reels 3 Upload video** | POST to rupload (response text: “Upload Successful…”) |
| 25 | **FB Wait after upload** | 15s pause |
| 26 | **FB Reels 4 Finish** | `upload_phase=finish`, `video_state=PUBLISHED` |
| 27 | **FB Fetch post link** | GET `permalink_url` |

### Collect and finish

| Step | Node | Action |
|------|------|--------|
| 28 | **Merge social uploads** | Waits for YT, FB, IG branches (3 inputs) |
| 29 | **Collect post links** | Builds `youtube_link`, `instagram_link`, `facebook_link` (full FB URL); `status` posted/partial/failed; `moveToDone` only if a link exists |
| 30 | **Log post row** | Appends to tab named in Config **sheet_tab** |
| 31 | **Move to done?** | If `moveToDone`, move Drive file to `drive_done_folder_id` |
| 32 | **Continue loop** | Next category |

---

## Status values in the log sheet

| status | Meaning |
|--------|---------|
| `posted` | All attempted platforms returned links (or full success count) |
| `partial` | Some platforms failed; see **notes** |
| `failed` | No links from any platform |
| `skipped` | No video in queue (separate branch) |

---

## Code maintenance

Logic for Code nodes lives in [import/](../import/) and is **embedded** in the JSON. After editing `.js` files:

```bash
python3 import/sync-into-v3.py
```

Then re-import or save in n8n.

---

## Platform notes

- **Facebook Reels API** publishes to the **Page**, not a personal profile. Reels appear under the Page’s Reels experience when format and permissions are correct.
- **Instagram** requires Creator/Business + linked Page.
- **moveToDone** requires at least one real publish link so files are not archived on failed runs.
