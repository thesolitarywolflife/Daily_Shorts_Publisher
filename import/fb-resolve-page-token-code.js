// Node: FB Resolve page token (after FB Get page token)

const pageId = String(
  $('Workflow constants').first()?.json?.meta_fb_page_id ||
    $env.META_FB_PAGE_ID ||
    '',
).trim();

if (!pageId) throw new Error('Set meta_fb_page_id in Workflow constants.');

const raw = $input.first()?.json || {};

if (raw.error?.code === 104 || /access token is required/i.test(String(raw.error?.message || ''))) {
  throw new Error(
    'Facebook Graph credential sent no access token (Graph #104). ' +
      'In n8n: Credentials → Facebook Graph account → Reconnect (Balaji1 App ID/Secret). ' +
      'Balaji1 → Facebook Login → add redirect http://localhost:5678/rest/oauth2-credential/callback . ' +
      'On node FB Get page token, re-select the same credential as Instagram nodes.',
  );
}

function pickPagePayload(body) {
  if (!body || typeof body !== 'object') return null;
  if (body.error) return { error: body.error };
  // Direct GET /{page-id}?fields=access_token,...
  if (body.access_token && String(body.id || pageId) === pageId) return body;
  if (body.access_token && !body.data) return { ...body, id: body.id || pageId };
  // GET /me/accounts
  const list = body.data || body.accounts?.data;
  if (Array.isArray(list)) {
    return list.find((p) => String(p.id) === pageId) || null;
  }
  return null;
}

const page = pickPagePayload(raw);

if (page?.error) {
  const msg = page.error.message || JSON.stringify(page.error);
  throw new Error(
    `Graph error loading Page token: ${msg}. ` +
      'Add scopes pages_show_list + pages_manage_posts, reconnect Facebook credential, select Page TheSolitarywolf.',
  );
}

if (!page?.access_token) {
  throw new Error(
    `No Page access_token for Page id ${pageId}. Response keys: ${JSON.stringify(Object.keys(raw))}. ` +
      'Raw (trimmed): ' +
      JSON.stringify(raw).slice(0, 800) +
      '. Fix: Meta app → pages_manage_posts → n8n credential Custom Scopes → reconnect. See META-FB-REELS-PERMISSION-FIX.md',
  );
}

return [
  {
    json: {
      page_id: String(page.id || pageId),
      page_name: page.name || '',
      page_access_token: page.access_token,
    },
  },
];
