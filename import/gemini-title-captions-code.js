// Paste into n8n: "Gemini title + captions" (Code node)
// Run Once for All Items | JavaScript
//
// Pipeline: Google Drive → Pick oldest → Download video (MP4 binary)
//   → this node (Gemini API for title; pass-through same binary)
//   → parallel: Upload YouTube | IG branch | FB branch
//
// Key: GEMINI_API_KEY in docker/.env (restart compose after change).

const item = $input.first();
const meta = item.json;

let wc = {};
try {
  wc = $('Workflow constants').first()?.json || {};
} catch {
  /* Workflow constants node missing */
}

const preferredModel = (wc.gemini_model || 'gemini-3.5-flash-lite').trim();

let fromEnv = '';
try {
  if (typeof $env !== 'undefined' && $env.GEMINI_API_KEY) {
    fromEnv = String($env.GEMINI_API_KEY);
  }
} catch {
  /* n8n blocks $env unless N8N_BLOCK_ENV_ACCESS_IN_NODE=false — use Workflow constants */
}

const apiKey = String(fromEnv || wc.gemini_api_key || '').trim();

if (!apiKey) {
  throw new Error(
    'Gemini API key missing. Either: (1) Workflow constants → gemini_api_key, or (2) Docker env GEMINI_API_KEY + N8N_BLOCK_ENV_ACCESS_IN_NODE=false, then restart n8n.',
  );
}

async function geminiRequest(method, path, body) {
  const opts = {
    method,
    url: `https://generativelanguage.googleapis.com/v1beta/${path}`,
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    json: true,
    ignoreHttpStatusErrors: true,
  };
  if (body !== undefined) opts.body = body;
  return await this.helpers.httpRequest(opts);
}

const listResp = await geminiRequest.call(this, 'GET', 'models', undefined);
if (listResp?.error) {
  throw new Error(
    `Gemini list models failed: ${listResp.error.message || JSON.stringify(listResp.error)}. ` +
      'https://aistudio.google.com/apikey',
  );
}

const generateModels = (listResp.models || [])
  .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
  .map((m) => (m.name || '').replace(/^models\//, ''))
  .filter(Boolean);

if (generateModels.length === 0) {
  throw new Error('No generateContent models returned for this API key.');
}

function isRetryable(msg) {
  return /no longer available|not available to new users|not found|429|quota|RESOURCE_EXHAUSTED|rate limit|billing|depleted|invalid argument.*video|mime/i.test(
    String(msg || ''),
  );
}

function pickModels() {
  const order = [
    preferredModel,
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash-preview-05-20',
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
  ];
  const picked = [];
  for (const id of order) {
    if (id && generateModels.includes(id) && !picked.includes(id)) picked.push(id);
  }
  for (const id of generateModels) {
    if (/flash/i.test(id) && !/tts|image|embedding|exp-/i.test(id) && !picked.includes(id)) {
      picked.push(id);
    }
  }
  if (!picked.length) picked.push(generateModels[0]);
  return picked;
}

function extractTitle(response) {
  const parts = response?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((p) => (typeof p.text === 'string' ? p.text : ''))
    .join('')
    .replace(/[\n\r#"]+/g, ' ')
    .trim()
    .slice(0, 80);
}

/** Strip category/channel prefix if the model still adds it (e.g. "Balaji relaxes…"). */
function polishTitle(title, categoryLabel) {
  let t = String(title || '').trim();
  if (!t) return t;
  const labels = [
    categoryLabel,
    'Balaji',
    'Laya',
    'Balaji and Laya',
    'Balaji_and_Laya',
    'Friends',
  ]
    .filter(Boolean)
    .map((s) => String(s).trim())
    .filter((s) => s.length > 1);
  for (const label of labels) {
    const re = new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-–—:|]?\\s*`, 'i');
    t = t.replace(re, '').trim();
    const reMid = new RegExp(`\\b${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    t = t.replace(reMid, '').replace(/\s{2,}/g, ' ').trim();
  }
  return t.slice(0, 80);
}

const modelsToTry = pickModels();

const binaryKey = Object.keys(item.binary || {})[0];
if (!binaryKey) throw new Error('No video binary from Download video.');

const buffer = await this.helpers.getBinaryDataBuffer(0, binaryKey);
const maxBytes = 18 * 1024 * 1024;
if (buffer.length > maxBytes) {
  throw new Error(`Video too large (${(buffer.length / 1024 / 1024).toFixed(1)} MB). Max ~18 MB.`);
}

const base64 = buffer.toString('base64');
const mimeType = item.binary[binaryKey].mimeType || meta.mimeType || 'video/mp4';
const category = String(meta.category || 'shorts').trim();
const hashtags = meta.standard_hashtags || meta.standard_hashtag || '';

// Category (Balaji, Laya, …) is routing only — never in the public title.
const prompt = [
  'You write one short title for a calm, relaxing anime-style vertical short (cozy / unwind vibe).',
  'Watch the video. Describe what you see: who is there (e.g. a man, someone), what they do, place, mood, props.',
  'Use natural English with a relaxing tone. Include at least one calm word such as: relaxing, unwind, peaceful, quiet, cozy, serene, gentle, calm.',
  'If someone is resting or sitting peacefully, say it plainly (e.g. "A man relaxing under the stars with coffee", "Unwinding by the mountains at dusk").',
  'Vary wording each time — do not reuse the same sentence pattern.',
  'Return ONLY the title. Max 80 characters. No hashtags. No quotes.',
  'Do NOT use: filename; Animate, export, mp4;',
  `channel/category names (${category}, Balaji, Laya, Friends) unless written on-screen in the video.`,
].join(' ');

const bodyVideo = {
  contents: [
    {
      parts: [
        { inline_data: { mime_type: mimeType, data: base64 } },
        { text: prompt },
      ],
    },
  ],
  generationConfig: { temperature: 0.85, maxOutputTokens: 256 },
};

const bodyTextOnly = {
  contents: [
    {
      parts: [
        {
          text: `${prompt} (If video unavailable: invent a cozy relaxing scene title with calm wording — no channel names, not a filename.)`,
        },
      ],
    },
  ],
  generationConfig: { temperature: 0.85, maxOutputTokens: 256 },
};

const gemini_attempts = [];
let response;
let usedModel;
let titleSource = 'video';
let lastError = '';

for (const m of modelsToTry) {
  response = await geminiRequest.call(this, 'POST', `models/${m}:generateContent`, bodyVideo);
  const title = !response?.error && response?.candidates?.length ? extractTitle(response) : '';
  if (title) {
    usedModel = m;
    lastError = '';
    gemini_attempts.push({ step: 'video', model: m, ok: true });
    break;
  }
  lastError = response?.error?.message || 'empty or blocked response';
  gemini_attempts.push({ step: 'video', model: m, ok: false, error: lastError });
  if (!isRetryable(lastError)) break;
}

let ai_title = response && !response?.error ? extractTitle(response) : '';

if (!ai_title) {
  titleSource = 'text-only';
  for (const m of modelsToTry) {
    response = await geminiRequest.call(this, 'POST', `models/${m}:generateContent`, bodyTextOnly);
    ai_title = !response?.error && response?.candidates?.length ? extractTitle(response) : '';
    if (ai_title) {
      usedModel = `${m} (text-only fallback)`;
      gemini_attempts.push({ step: 'text-only', model: m, ok: true });
      break;
    }
    lastError = response?.error?.message || 'empty response';
    gemini_attempts.push({ step: 'text-only', model: m, ok: false, error: lastError });
    if (!isRetryable(lastError)) break;
  }
}

if (!ai_title) {
  throw new Error(
    `Gemini could not produce a title. Last error: ${response?.error?.message || lastError}. ` +
      `Tried: ${modelsToTry.slice(0, 6).join(', ')}. Attempts: ${JSON.stringify(gemini_attempts)}`,
  );
}

ai_title = polishTitle(ai_title, category);
if (!ai_title) {
  throw new Error('Gemini title empty after polish. Check prompt or video input.');
}

// YouTube: AI title only; description from Config / Workflow constants (not Gemini).
// IG + FB: title + hashtags from Config.
const socialCaption = hashtags ? `${ai_title}\n\n${hashtags}`.trim() : ai_title;
const youtubeDescription = String(
  meta.youtube_description ||
    meta.default_youtube_description ||
    wc.youtube_default_description ||
    '',
).trim();

const driveFileName = String(meta.fileName || meta.name || '').trim();
const binaryMeta = item.binary?.[binaryKey] || {};
const binaryFileName = String(
  binaryMeta.fileName || binaryMeta.file_name || driveFileName || 'video.mp4',
).trim();
const videoBytes = buffer.length;

// One stable MP4 attachment for YouTube + IG + FB (avoids parallel reads on filesystem refs).
const videoBinary = await this.helpers.prepareBinaryData(
  buffer,
  binaryFileName,
  mimeType,
);

return [
  {
    json: {
      ...meta,
      drive_video_file_name: driveFileName,
      binary_video_file_name: binaryFileName,
      video_byte_size: videoBytes,
      ai_title,
      gemini_model_used: usedModel,
      gemini_title_source: titleSource,
      gemini_attempts,
      youtubeTitle: ai_title.slice(0, 100),
      youtubeDescription,
      igCaption: socialCaption,
      fbCaption: socialCaption,
    },
    binary: {
      data: videoBinary,
    },
  },
];
