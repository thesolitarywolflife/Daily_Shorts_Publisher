// Node: IG Build video URL (after Gemini)
// Meta pulls the MP4 from this URL — no rupload. Drive file/folder must allow link access.

const gem = $('Gemini title + captions').first()?.json || {};
const fileId = String(gem.fileId || '').trim();
if (!fileId) {
  throw new Error('Missing fileId for IG video_url. Check Pick oldest / Download video.');
}

let wc = {};
try {
  wc = $('Workflow constants').first()?.json || {};
} catch {
  /* optional */
}

const prefix = String(wc.ig_video_url_prefix || '').trim();
const fileName = String(gem.fileName || gem.drive_video_file_name || 'video.mp4').trim();

let ig_video_url;
if (prefix) {
  ig_video_url = prefix.endsWith('/')
    ? prefix + encodeURIComponent(fileName)
    : `${prefix}${encodeURIComponent(fileName)}`;
} else {
  ig_video_url = `https://drive.google.com/uc?export=download&confirm=t&id=${fileId}`;
}

return [
  {
    json: {
      ...gem,
      ig_video_url,
      ig_video_url_hint:
        prefix
          ? 'Using ig_video_url_prefix from Workflow constants.'
          : 'Using Google Drive direct link — share this file (or folder) as Anyone with the link can view.',
    },
  },
];
