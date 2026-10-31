// Paste into n8n node: "Collect post links" (Code node)

function nodeJson(nodeName) {
  try {
    return $(nodeName).first()?.json || {};
  } catch {
    return {};
  }
}

const base = $('Gemini title + captions').first().json;
const yt = nodeJson('Upload YouTube');
const igCreate = nodeJson('IG Reels 1 Create container');
const igPublish = nodeJson('Instagram Reels (Graph)');
const igMeta = nodeJson('IG Fetch post link');
const igRupload = nodeJson('IG Reels 3 Rupload');
const fbStart = nodeJson('FB Reels 1 Start');
const fbUpload = nodeJson('FB Reels 3 Upload video');
const fbFinish = nodeJson('FB Reels 4 Finish');
const fbMeta = nodeJson('FB Fetch post link');

function youtubeVideoId(data) {
  if (!data || data.error) return '';
  return (
    data.id ||
    data.videoId ||
    data.uploadId ||
    data?.snippet?.resourceId?.videoId ||
    data?.snippet?.id ||
    ''
  );
}

function errText(data) {
  if (!data) return 'no response';
  if (typeof data.error === 'string') return data.error;
  if (data.error?.message) return data.error.message;
  if (data.message) return data.message;
  if (data.errorDescription) return data.errorDescription;
  if (data.description) return data.description;
  return '';
}

function hasGraphError(data) {
  if (!data || typeof data !== 'object') return true;
  if (data.error) return true;
  if (data.status === 'failed' || data.status === 'error') return true;
  return false;
}

function metaUploadOk(data) {
  if (hasGraphError(data)) return false;
  if (data.success === true) return true;
  if (data.h) return true;
  if (typeof data.start_offset === 'string' && data.start_offset !== '0') return true;
  return false;
}

function fbPublishOk(finish) {
  if (hasGraphError(finish)) return false;
  return finish.success === true || Boolean(finish.post_id || finish.id);
}

function youtubeNote(data) {
  const t = errText(data);
  if (/uploadLimitExceeded|exceeded.*upload|daily.*limit|quota/i.test(t)) {
    return 'YouTube skipped: daily upload limit reached (resets ~midnight US Pacific).';
  }
  return `YouTube failed: ${t || 'no video id'}`;
}

/** Graph often returns permalink_url as /reel/123/ — Sheets need a full URL. */
function normalizeFacebookLink(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s.replace(/\/+$/, '') || s;
  if (s.startsWith('//')) return `https:${s}`.replace(/\/+$/, '');
  if (s.startsWith('/')) {
    const path = s.replace(/\/+$/, '');
    return `https://www.facebook.com${path}`;
  }
  if (/^\d+$/.test(s)) return `https://www.facebook.com/reel/${s}`;
  return s;
}

const vid = youtubeVideoId(yt);
const youtube_link = vid ? `https://www.youtube.com/shorts/${vid}` : '';

const igContainerOk = !hasGraphError(igCreate) && Boolean(igCreate?.id);
const igPublishedOk = !hasGraphError(igPublish) && Boolean(igPublish?.id);
const igPermalink = !hasGraphError(igMeta) && igMeta?.permalink ? String(igMeta.permalink) : '';

const instagram_link =
  igContainerOk && igPublishedOk && igPermalink ? igPermalink : '';

let facebook_link = '';
if (
  metaUploadOk(fbUpload) &&
  fbPublishOk(fbFinish) &&
  !hasGraphError(fbMeta) &&
  fbMeta?.permalink_url
) {
  facebook_link = normalizeFacebookLink(fbMeta.permalink_url);
}

const platformNotes = [];
if (!youtube_link) {
  platformNotes.push(youtubeNote(yt));
}
if (!instagram_link) {
  const containerId = igCreate?.id || igPublish?.id;
  const igId = containerId ? ` (container ${containerId})` : '';
  const igErr =
    errText(igCreate) ||
    errText(igRupload) ||
    errText(igPublish) ||
    errText(igMeta) ||
    (igContainerOk && igPublishedOk ? 'no permalink from IG Fetch post link' : 'no permalink');
  platformNotes.push(`Instagram failed: ${igErr}${igId}`);
}
if (!facebook_link) {
  const fbVid = fbStart?.video_id ? ` (video id ${fbStart.video_id})` : '';
  platformNotes.push(
    `Facebook failed: ${errText(fbUpload) || errText(fbFinish) || errText(fbMeta) || errText(fbStart) || 'no permalink'}${fbVid}`,
  );
}

const okCount = [youtube_link, instagram_link, facebook_link].filter(Boolean).length;
let status = 'posted';
if (okCount === 0) status = 'failed';
else if (okCount < 3) status = 'partial';

let notes = platformNotes.join(' | ');
if (base.gemini_skip_reason) {
  notes = [base.gemini_skip_reason, notes].filter(Boolean).join(' | ');
}

const doneId = String(base.drive_done_folder_id || '');
const publishedSomewhere = Boolean(youtube_link || instagram_link || facebook_link);
const moveToDone =
  Boolean(base.fileId) &&
  base.hasVideo !== false &&
  Boolean(doneId) &&
  !doneId.includes('PASTE') &&
  publishedSomewhere;

return [
  {
    json: {
      ...base,
      youtube_link,
      instagram_link,
      facebook_link,
      status,
      notes,
      moveToDone,
    },
  },
];
