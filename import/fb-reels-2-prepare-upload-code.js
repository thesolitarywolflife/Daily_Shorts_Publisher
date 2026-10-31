// Node: FB Reels 2 Prepare upload (after FB Reels 1 Start)
// Fresh binary attachment for rupload (pass-through metadata alone corrupts uploads).

const start = $('FB Reels 1 Start').first()?.json || {};
const item = $input.first();
const j = { ...start, ...(item.json || {}) };

const videoId = j.video_id || j.videoId;
const uploadUrl = j.upload_url || j.uploadUrl;
if (j.error) {
  throw new Error('FB Start failed: ' + JSON.stringify(j.error).slice(0, 500));
}
if (!videoId) {
  throw new Error('Missing video_id from FB Start. json=' + JSON.stringify(j).slice(0, 400));
}

const gem = $('Gemini title + captions').first();
if (!gem?.binary?.data && !Object.keys(gem.binary || {}).length) {
  throw new Error('Missing video binary on Gemini title + captions.');
}

const binaryKey = gem.binary?.data ? 'data' : Object.keys(gem.binary)[0];
const srcMeta = gem.binary[binaryKey] || {};

const buffer = await this.helpers.getBinaryDataBuffer(
  0,
  binaryKey,
  $('Gemini title + captions').all(),
);
const fileSize = buffer?.length || Number(gem.json?.video_byte_size) || 0;
if (!(fileSize > 0)) {
  throw new Error('Video buffer empty on Gemini output.');
}

const fileName =
  srcMeta.fileName ||
  srcMeta.file_name ||
  gem.json?.binary_video_file_name ||
  gem.json?.drive_video_file_name ||
  'video.mp4';
const mimeType = srcMeta.mimeType || srcMeta.mime_type || 'video/mp4';

const binaryData = await this.helpers.prepareBinaryData(buffer, fileName, mimeType);

const resolvedUploadUrl =
  uploadUrl || `https://rupload.facebook.com/video-upload/v23.0/${videoId}`;

return [
  {
    json: {
      video_id: videoId,
      upload_url: resolvedUploadUrl,
      file_size: String(fileSize),
    },
    binary: {
      data: binaryData,
    },
  },
];
