// Pass on only the date → slots map the website needs.
const prev = $('Validate').first().json;
const r = $input.first().json;
if (!prev.ok) return [{ json: { status: 200, body: {} } }];
if (!(r.statusCode >= 200 && r.statusCode < 300)) return [{ json: { status: 502, body: { error: 'availability_unavailable' } } }];
const out = {};
for (const [day, v] of Object.entries(r.body || {})) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(day) && v && Array.isArray(v.slots)) out[day] = { slots: v.slots.filter(s => typeof s === 'string') };
}
return [{ json: { status: 200, body: out } }];
