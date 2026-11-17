// Shared helpers (pasted into each Validate node after the settings).
const clean = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));
const str = (v, n = 200) => (v == null ? '' : String(v)).trim().slice(0, n);
const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
function phoneE164(v) {
  const raw = str(v, 40); if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+')) return '+' + digits;
  if (digits.length === 10) return '+1' + digits;            // US/Canada without country code
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  return raw;                                                // leave anything else for HighLevel to parse
}
function pickFields(list, allowed) {
  const ok = new Set(allowed);
  return (Array.isArray(list) ? list : []).filter(f => f && ok.has(f.id)).map(f => ({
    id: f.id,
    fieldValue: Array.isArray(f.fieldValue) ? f.fieldValue.map(x => str(x, 200)).slice(0, 25)
      : typeof f.fieldValue === 'number' ? f.fieldValue : str(f.fieldValue, 5000)
  }));
}
function clientIp(headers) {
  const h = headers || {};
  return str(h['cf-connecting-ip'] || h['x-forwarded-for'] || h['x-real-ip'] || '', 100).split(',')[0].trim();
}
function contextLines(ctx) {
  ctx = ctx || {};
  const utm = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'msclkid']
    .filter(k => ctx[k]).map(k => `${k}: ${str(ctx[k], 200)}`);
  return [`Page: ${str(ctx.page_url, 500)}`, `Landing page: ${str(ctx.landing_page, 500)}`,
    `Referrer: ${str(ctx.first_referrer || ctx.referrer, 500) || 'direct'}`, ...utm];
}
const reject = (code, message, status = 400) => [{ json: { ok: false, status, code, message } }];
