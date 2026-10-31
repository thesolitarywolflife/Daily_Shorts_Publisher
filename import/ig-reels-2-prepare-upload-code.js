// Node: IG Reels 2 Prepare upload (after IG Merge video + container)
// Full MP4 bytes for rupload (same pattern as FB Prepare).

const item = $input.first();
const j = item.json || {};

const containerId = j.id || j.ig_container_id;
const containerUri = j.uri;
if (!containerId && !containerUri) {
  throw new Error(
    'Missing IG container id/uri after merge. json=' + JSON.stringify(j).slice(0, 400),
  );
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

return [
  {
    json: {
      ...j,
      id: containerId || j.id,
      rupload_url:
        containerUri ||
        j.rupload_url ||
        `https://rupload.facebook.com/ig-api-upload/v23.0/${containerId}`,
      file_size: String(fileSize),
      ig_container_id: containerId,
    },
    binary: {
      data: binaryData,
    },
  },
];
