# n8n backup container (Portainer / Docker)

Fixes the common PDF typo: script path is **`/backup/backup.sh`**, not `/backups/backup.sh`.

## 1. On the VPS host (SSH)

```bash
sudo mkdir -p /opt/n8n-backups
sudo cp backup.sh /opt/n8n-backups/backup.sh   # from this folder
sudo nano /opt/n8n-backups/backup.sh           # set gdrive_remote=...
sudo chmod +x /opt/n8n-backups/backup.sh
```

Configure rclone on the **host** (once):

```bash
sudo apt install -y rclone   # or use rclone inside container only if config is mounted
sudo rclone config           # create remote named e.g. gdrive
```

Config must exist at **`/root/.config/rclone/rclone.conf`** on the host (or adjust mount).

### rclone config (important)

On the **VPS via SSH** (not inside a one-off Alpine container):

```bash
sudo rclone config
```

1. **n** → new remote  
2. Name: **`gdrive`** (use this exact name in `backup.sh`, or change both to match)  
3. Storage: **Google Drive** (number varies)  
4. **Use web browser OAuth** — **not** service account  
5. Complete login in browser (or `rclone authorize drive` on your PC and paste token on headless VPS)

Test on the host:

```bash
sudo rclone lsd gdrive:
sudo rclone copy /opt/n8n-backups/n8n_backup_*.tar.gz "gdrive,root_folder_id=YOUR_FOLDER_ID:" -v
```

**Wrong:** `Gdrive:1r4Eb-y5DOWSNUPMJ_D_4q_64AlMjKh5z` with a service-account remote →  
`open 1r4Eb-...: no such file or directory` (rclone thinks the ID is a JSON key file).

**Right:** OAuth remote + folder ID:

```sh
gdrive_remote="gdrive,root_folder_id=1r4Eb-y5DOWSNUPMJ_D_4q_64AlMjKh5z:"
```

Backup container **must** mount host config:

`/root/.config/rclone` → `/root/.config/rclone`

## 2. Find your n8n data volume name

Portainer → **Volumes** → name is often `n8n_n8n_data`, `stackname_n8n_data`, or similar.

## 3. Backup container (Portainer)

| Setting | Value |
|--------|--------|
| Image | `alpine:latest` |
| **Command** | ` /bin/sh -c "apk add --no-cache tar rclone && sh /backup/backup.sh" ` |
| Volume 1 | **n8n data volume** → `/data` |
| Volume 2 | **`/opt/n8n-backups`** → **`/backup`** |
| Volume 3 | **`/root/.config/rclone`** → **`/root/.config/rclone`** |

Run manually once; check logs for `[All tasks completed]`.

## 4. Schedule (optional)

On VPS cron (runs a one-shot container each time — adjust volume names):

```bash
0 1 * * * docker run --rm -v YOUR_N8N_VOLUME:/data -v /opt/n8n-backups:/backup -v /root/.config/rclone:/root/.config/rclone alpine:latest /bin/sh -c "apk add --no-cache tar rclone && sh /backup/backup.sh"
```

Or Portainer **Schedules** on a stack that wraps the same command.

## Restore (short)

1. `docker stop` n8n  
2. `tar xzf` from `/opt/n8n-backups/n8n_backup_*.tar.gz` into the data volume (see PDF)  
3. `docker start` n8n  
