// KPI DRIVER booking bridge: the only place the HighLevel Private Integration token lives.
// The website's booking form calls it; it calls HighLevel. Standard fetch handler, so it runs
// unchanged as a Cloudflare Worker or a Webflow Cloud function.
//
//   GET  /slots?start=<ms>&end=<ms>&timezone=<IANA>   → { "YYYY-MM-DD": { slots: [iso…] }, … }
//   POST /book   (JSON payload from the form)          → { ok:true, appointment } | { ok:false, code, message }
//   POST /contact (flat JSON from the contact form)     → { ok:true } | { ok:false, code, message }
//                 Forwards to the HighLevel inbound webhook, whose URL stays a server secret.
//
// Settings (environment variables / secrets):
//   HL_TOKEN      secret · HighLevel Private Integration token (scopes: calendars.readonly,
//                 calendars/events.write, contacts.write)
//   LOCATION_ID   KPI DRIVER sub-account id        (default below)
//   CALENDAR_ID   the one discovery calendar        (default below)
//   ALLOWED_ORIGINS comma list of sites allowed to call the bridge (default below)
//   CONTACT_WEBHOOK_URL secret · HighLevel workflow "Inbound Webhook" URL for the contact form

const API = 'https://services.leadconnectorhq.com';
const DEFAULTS = {
  LOCATION_ID: 'nLOdLoui5CvpzktszMJx',
  CALENDAR_ID: '9g3ccVyd2a9NsV51QuKN',
  ALLOWED_ORIGINS: 'https://www.kpidriver.com,https://kpidriver.com,https://kpidriver.webflow.io',
  DURATION_MIN: '45',
  CONTACT_SOURCE: 'SEO'
};
// Custom fields the website may write (HighLevel custom field ids). Anything else is ignored.
const BOOKING_FIELDS = new Set(['st1eCAFAHDcgPM4VvtNn', 'Z8TSBkLl0c3nkOh0d0bj', 'h4JApkD7A1meEgqfLJ4v', 'zntmhqZEVR510izM1Amv',
  'ARe4MceHNpyuA2cKkIEw', 'qmkmAZyHzfeRFjkRKQaw', 'UWxeByWt7W4EuIVVAQsm', 'J1MTiekQt4vbamz8JFee', 'u6f3OtUsag2gUpFKEHCy',
  'TgvNUU7bOSq4YSB2FS9w', 'xOz64JUSqg9hFWthmar5', 'QfNSOY8w6fJUpyxW9al1', '9aMGEJzyATDb4ZGnPLt7', 'rihpUXcXicHdCxEo4CfX',
  'sqX5fTAKqUuNRwdoxaag', 'uclYhjBFIyedqd8xqYwE', 'VLoxJWATbFZMgMOfBb4P', 'kjvFHgnOa8iVNV7YiiBN', 'LNdrE1FEgFjbPydSCntV',
  'FohJiIh9tGFKXI02LSUD', 'crnTGUSW3StY8VTOqaR2', 'EI2ls6K7uJFe75PmRPaX', 'U26ojrxlzQxC1kwAMvki', 'O5yyMN7TXsWzblxrHUfO']);

const str = (v, n = 200) => (v == null ? '' : String(v)).trim().slice(0, n);
const clean = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));
const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
function phoneE164(v) {
  const raw = str(v, 40); if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+')) return '+' + digits;
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  return raw;
}
function pickFields(list) {
  return (Array.isArray(list) ? list : []).filter(f => f && BOOKING_FIELDS.has(f.id)).map(f => ({
    id: f.id,
    fieldValue: Array.isArray(f.fieldValue) ? f.fieldValue.map(x => str(x, 200)).slice(0, 25)
      : typeof f.fieldValue === 'number' ? f.fieldValue : str(f.fieldValue, 5000)
  }));
}

function cors(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || DEFAULTS.ALLOWED_ORIGINS).split(',').map(s => s.trim());
  const ok = allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : allowed[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
}
const json = (body, status, headers) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

async function hl(env, method, path, body) {
  const r = await fetch(API + path, {
    method,
    headers: { Authorization: 'Bearer ' + env.HL_TOKEN, Version: 'v3', Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  let data; try { data = await r.json(); } catch (e) { data = {}; }
  return { status: r.status, ok: r.status >= 200 && r.status < 300, data };
}

async function slots(url, env) {
  const q = url.searchParams;
  let start = Number(q.get('start')), end = Number(q.get('end'));
  let tz = str(q.get('timezone'), 60) || 'America/New_York';
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); } catch (e) { tz = 'America/New_York'; }
  if (!isFinite(start) || !isFinite(end)) return { status: 200, body: {} };
  start = Math.max(start, Date.now());
  end = Math.min(end, start + 31 * 86400000);
  if (end <= start) return { status: 200, body: {} };
  const cal = env.CALENDAR_ID || DEFAULTS.CALENDAR_ID;
  const r = await hl(env, 'GET', `/calendars/${cal}/free-slots?startDate=${Math.floor(start)}&endDate=${Math.floor(end)}&timezone=${encodeURIComponent(tz)}`);
  if (!r.ok) return { status: 502, body: { error: 'availability_unavailable' } };
  const out = {};
  for (const [day, v] of Object.entries(r.data || {})) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(day) && v && Array.isArray(v.slots)) out[day] = { slots: v.slots.filter(s => typeof s === 'string') };
  }
  return { status: 200, body: out };
}

async function book(request, env) {
  let b; try { b = await request.json(); } catch (e) { return { status: 400, body: { ok: false, code: 'invalid', message: 'Bad request.' } }; }
  if (b.hp) return { status: 200, body: { ok: true } };                                   // spam trap: pretend all is well
  if (b.type !== 'booking') return { status: 400, body: { ok: false, code: 'invalid', message: 'Unexpected form type.' } };
  const c = b.contact || {};
  const email = str(c.email, 200).toLowerCase();
  if (!str(c.firstName) || !str(c.lastName) || !isEmail(email) || !str(c.phone)) return { status: 400, body: { ok: false, code: 'invalid', message: 'Please fill in your name, email and phone.' } };
  if (!b.consent || b.consent.sms !== true) return { status: 400, body: { ok: false, code: 'invalid', message: 'Please tick the SMS consent box.' } };
  const start = Date.parse(b.slot && b.slot.start);
  if (!start || start < Date.now() + 5 * 60000) return { status: 409, body: { ok: false, code: 'slot_taken', message: 'That time is no longer available. Please pick another one.' } };
  const duration = Number(env.DURATION_MIN || DEFAULTS.DURATION_MIN);
  const source = str(b.booking_source, 120) || 'Website';
  const tz = str(b.slot.timezone || c.timezone, 60);
  const locationId = env.LOCATION_ID || DEFAULTS.LOCATION_ID;

  // 1. contact (matched by email/phone per the sub-account's duplicate settings)
  const up = await hl(env, 'POST', '/contacts/upsert', clean({
    locationId, firstName: str(c.firstName, 80), lastName: str(c.lastName, 80), email, phone: phoneE164(c.phone),
    companyName: str(c.companyName, 120), address1: str(c.address1, 200), city: str(c.city, 80), state: str(c.state, 80),
    postalCode: str(c.postalCode, 20), country: str(c.country, 2).toUpperCase(), timezone: tz, source: env.CONTACT_SOURCE || DEFAULTS.CONTACT_SOURCE,
    customFields: pickFields(b.customFields),
    dndSettings: { sms: { status: 'inactive', message: 'SMS consent given on the website booking form' } }
  }));
  const contactId = up.data && up.data.contact && up.data.contact.id;
  if (!up.ok || !contactId) return { status: 502, body: { ok: false, code: 'crm_error', message: "We couldn't save your details. Please try again, or email info@kpidriver.com." } };

  // 2. appointment on the one calendar
  const appt = await hl(env, 'POST', '/calendars/events/appointments', {
    calendarId: env.CALENDAR_ID || DEFAULTS.CALENDAR_ID, locationId, contactId,
    startTime: new Date(start).toISOString(), endTime: new Date(start + duration * 60000).toISOString(),
    title: `Discovery Call · ${str(c.firstName, 80)} ${str(c.lastName, 80)}`, appointmentStatus: 'confirmed',
    description: `Booked on the website · ${source}`, toNotify: env.TO_NOTIFY !== 'false'
  });
  if (!appt.ok || !appt.data.id) {
    const taken = appt.status >= 400 && appt.status < 500 && /slot|availab|booked|conflict|not free/i.test(JSON.stringify(appt.data));
    return taken ? { status: 409, body: { ok: false, code: 'slot_taken', message: 'That time was just taken. Please pick another one.' } }
      : { status: 502, body: { ok: false, code: 'crm_error', message: "We couldn't book the call. Please try again, or email info@kpidriver.com." } };
  }

  // 3. tags + note (best effort: the booking already stands)
  const ip = str(request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '', 100).split(',')[0].trim();
  const ctx = b.context || {};
  const note = [
    `Website booking · ${source}`,
    `Call: ${str(b.slot.display, 120) || new Date(start).toISOString()} (${tz})`, '',
    ...(Array.isArray(b.answers) ? b.answers : []).slice(0, 60).map(a => `${str(a.q, 200)}: ${str(a.a, 2000)}`), '',
    `SMS consent: YES · ${str(b.consent.at, 40)} · IP ${ip || 'n/a'} · ${str(b.consent.page, 500)}`,
    `Consent text: ${str(b.consent.text, 1000)}`, '',
    `Page: ${str(ctx.page_url, 500)}`, `Landing page: ${str(ctx.landing_page, 500)}`, `Referrer: ${str(ctx.first_referrer || ctx.referrer, 500) || 'direct'}`,
    ...['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'msclkid'].filter(k => ctx[k]).map(k => `${k}: ${str(ctx[k], 200)}`)
  ].join('\n');
  await Promise.all([
    hl(env, 'POST', `/contacts/${contactId}/tags`, { tags: ['website booking', `src: ${source}`.toLowerCase()] }),
    hl(env, 'POST', `/contacts/${contactId}/notes`, { body: note })
  ]);
  return { status: 200, body: { ok: true, appointment: { id: appt.data.id, startTime: appt.data.startTime || new Date(start).toISOString() }, contactId } };
}

// ---------- contact form → HighLevel inbound webhook ----------
// Same flat object the page used to post straight to the webhook, so the HighLevel field mapping
// ({{inboundWebhookRequest.first_name}} etc.) is unchanged. Only these keys are passed on.
const CONTACT_KEYS = ['form', 'first_name', 'last_name', 'email', 'phone', 'business_name', 'which_bundle_are_you_interested_in',
  'your_message', 'sms_consent', 'consent_text', 'consent_timestamp', 'consent_page', 'campaign', 'booking_source', 'cta_label',
  'cta_type', 'tags', 'contact_source', 'timezone', 'lang', 'page_url', 'page_title', 'landing_page', 'referrer', 'utm_source',
  'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'submitted_at', 'note'];
const CONTACT_LONG = { your_message: 5000, note: 8000, consent_text: 1000, page_url: 1000, consent_page: 1000, landing_page: 1000, referrer: 1000 };
const CONTACT_LIMIT = { max: 5, windowMs: 10 * 60000 };   // per IP; best effort (memory of one edge instance)
const hits = new Map();
function rateLimited(key) {
  const now = Date.now(), recent = (hits.get(key) || []).filter(t => now - t < CONTACT_LIMIT.windowMs);
  recent.push(now); hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > CONTACT_LIMIT.max;
}
async function readForm(request) {
  const text = await request.text();
  if (text.length > 64000) return null;
  try { return JSON.parse(text); } catch (e) { /* the page's fallback sends a simple form post */ }
  try { return Object.fromEntries(new URLSearchParams(text)); } catch (e) { return null; }
}
async function contact(request, env, origin) {
  const allowed = (env.ALLOWED_ORIGINS || DEFAULTS.ALLOWED_ORIGINS).split(',').map(s => s.trim());
  if (!allowed.includes(origin)) return { status: 403, body: { ok: false, code: 'forbidden', message: 'Not allowed.' } };
  if (!env.CONTACT_WEBHOOK_URL) return { status: 503, body: { ok: false, code: 'not_configured', message: 'The contact form is not set up yet. Please email info@kpidriver.com.' } };
  const ip = str(request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '', 100).split(',')[0].trim();
  if (rateLimited(ip || 'unknown')) return { status: 429, body: { ok: false, code: 'rate_limited', message: 'Too many messages from this connection. Please wait a few minutes, or email info@kpidriver.com.' } };
  const b = await readForm(request);
  if (!b || typeof b !== 'object') return { status: 400, body: { ok: false, code: 'invalid', message: 'Bad request.' } };
  if (b.hp) return { status: 200, body: { ok: true } };                                   // spam trap: pretend all is well, send nothing
  if (b.form !== 'contact') return { status: 400, body: { ok: false, code: 'invalid', message: 'Unexpected form type.' } };
  const email = str(b.email, 200).toLowerCase();
  if (!str(b.first_name) || !str(b.last_name) || !isEmail(email) || str(b.phone, 40).replace(/\D/g, '').length < 7)
    return { status: 400, body: { ok: false, code: 'invalid', message: 'Please fill in your name, email and phone.' } };
  if (b.sms_consent !== 'Yes') return { status: 400, body: { ok: false, code: 'invalid', message: 'Please tick the SMS consent box.' } };
  const out = {};
  for (const k of CONTACT_KEYS) { const v = str(b[k], CONTACT_LONG[k] || 300); if (v) out[k] = v; }
  out.email = email;
  if (ip) out.ip = ip;
  const r = await fetch(env.CONTACT_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(out) });
  if (!r.ok) return { status: 502, body: { ok: false, code: 'crm_error', message: "We couldn't send your message. Please try again, or email info@kpidriver.com." } };
  return { status: 200, body: { ok: true } };
}

export default {
  async fetch(request, env) {
    env = env || {};
    const url = new URL(request.url);
    const h = cors(request.headers.get('Origin') || '', env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (request.method === 'POST' && url.pathname.endsWith('/contact')) {
      try { const r = await contact(request, env, request.headers.get('Origin') || ''); return json(r.body, r.status, h); }
      catch (e) { return json({ ok: false, code: 'crm_error', message: "We couldn't send your message. Please try again, or email info@kpidriver.com." }, 502, h); }
    }
    if (!env.HL_TOKEN) return json({ ok: false, code: 'not_configured', message: 'Booking is not configured yet.' }, 503, h);
    try {
      if (request.method === 'GET' && url.pathname.endsWith('/slots')) { const r = await slots(url, env); return json(r.body, r.status, { ...h, 'Cache-Control': 'public, max-age=60' }); }
      if (request.method === 'POST' && url.pathname.endsWith('/book')) { const r = await book(request, env); return json(r.body, r.status, h); }
      return json({ ok: false, code: 'not_found' }, 404, h);
    } catch (e) {
      return json({ ok: false, code: 'crm_error', message: "Something went wrong. Please try again, or email info@kpidriver.com." }, 502, h);
    }
  }
};
