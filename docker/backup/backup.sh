#!/bin/sh
# n8n data volume backup → local /backup + rclone to Google Drive
# Container mount: host /opt/n8n-backups → /backup, n8n volume → /data

log="/backup/backup.log"

# Must match remote NAME from `rclone config` (case-sensitive), OAuth — not service account.
# Upload into a Drive folder by ID (note trailing colon):
#   gdrive_remote="gdrive,root_folder_id=YOUR_FOLDER_ID:"
# Or upload into a folder path on that remote:
#   gdrive_remote="gdrive:n8n-backups"
gdrive_remote="gdrive,root_folder_id=PASTE_FOLDER_ID:"

echo "[Script started at $(date +"%Y-%m-%d %H:%M:%S")]" | tee -a "$log"

cd /data || { echo "[ERROR] /data not found (mount n8n data volume here)" | tee -a "$log"; exit 1; }

backup_file="/backup/n8n_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
tar czf "$backup_file" . || { echo "[ERROR] tar failed" | tee -a "$log"; exit 1; }

echo "[Backup completed at $(date +"%Y-%m-%d %H:%M:%S")]" | tee -a "$log"
echo "[Upload started at $(date +"%Y-%m-%d %H:%M:%S")]" | tee -a "$log"

rclone copy "$backup_file" "$gdrive_remote" --drive-chunk-size 128M -v 2>&1 | tee -a "$log"

echo "[Upload completed at $(date +"%Y-%m-%d %H:%M:%S")]" | tee -a "$log"
echo "[Cleanup started at $(date +"%Y-%m-%d %H:%M:%S")]" | tee -a "$log"

to_delete=$(ls -tp /backup/n8n_backup_*.tar.gz 2>/dev/null | grep -v '/$' | tail -n +3)
if [ -n "$to_delete" ]; then
  for file in $to_delete; do
    echo "[Deleting old backup: $file at $(date +"%Y-%m-%d %H:%M:%S")]" | tee -a "$log"
    rm "$file"
  done
fi

retained=$(ls -tp /backup/n8n_backup_*.tar.gz 2>/dev/null | grep -v '/$' | head -n 2 | tr '\n' ' ')
echo "[Retained backups: $retained]" | tee -a "$log"
echo "[All tasks completed at $(date +"%Y-%m-%d %H:%M:%S")]" | tee -a "$log"
