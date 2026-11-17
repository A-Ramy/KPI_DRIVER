// Runs the generated n8n workflows in a tiny simulator: executes the Code nodes, evaluates the
// {{ }} expressions, follows IF branches and fakes HighLevel's replies. Nothing touches the network.
//   node booking-form/tools/test-n8n.js
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const load = f => JSON.parse(fs.readFileSync(path.join(ROOT, 'n8n', f), 'utf8'));
let failures = 0;
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) failures++; };

function evalExpr(str, ctx) {
  if (typeof str !== 'string' || str[0] !== '=') return str;
  const body = str.slice(1);
  const run = code => Function('$json', '$', `return (${code});`)(ctx.$json, ctx.$);
  const whole = body.match(/^\{\{([\s\S]*)\}\}$/);
  if (whole) return run(whole[1]);
  return body.replace(/\{\{([\s\S]*?)\}\}/g, (_, c) => String(run(c)));
}

function runWorkflow(wf, input, hl) {
  const byName = Object.fromEntries(wf.nodes.map(n => [n.name, n]));
  const outputs = {}, calls = [];
  let response = null;
  const $ = name => ({ first: () => ({ json: outputs[name] }) });
  let node = byName['Webhook'], json = input;
  outputs['Webhook'] = json;
  let next = (name, idx = 0) => { const c = (wf.connections[name] || { main: [] }).main[idx] || []; return c[0] && byName[c[0].node]; };
  node = next('Webhook');
  for (let guard = 0; node && guard < 50; guard++) {
    const ctx = { $json: json, $ };
    let branch = 0;
    if (node.type === 'n8n-nodes-base.code') {
      const fn = Function('$input', '$', node.parameters.jsCode);
      const res = fn({ first: () => ({ json }) }, $);
      json = res[0].json;
    } else if (node.type === 'n8n-nodes-base.if') {
      const cond = node.parameters.conditions.conditions[0];
      branch = evalExpr(cond.leftValue, ctx) === true ? 0 : 1;
    } else if (node.type === 'n8n-nodes-base.httpRequest') {
      const p = node.parameters;
      const req = { method: p.method, url: evalExpr(p.url, ctx), headers: Object.fromEntries(p.headerParameters.parameters.map(h => [h.name, h.value])) };
      if (p.sendQuery) req.query = Object.fromEntries(p.queryParameters.parameters.map(q => [q.name, evalExpr(q.value, ctx)]));
      if (p.sendBody) req.body = JSON.parse(evalExpr(p.jsonBody, ctx));
      calls.push(req);
      json = hl(req);
    } else if (node.type === 'n8n-nodes-base.respondToWebhook') {
      response = { status: Number(evalExpr(node.parameters.options.responseCode, ctx)), body: JSON.parse(evalExpr(node.parameters.responseBody, ctx)) };
    }
    outputs[node.name] = json;
    node = next(node.name, branch);
  }
  return { response, calls };
}

const fakeHL = (opts = {}) => req => {
  if (req.url.endsWith('/contacts/upsert')) return opts.upsertFail ? { statusCode: 422, body: { message: 'bad' } } : { statusCode: 201, body: { new: true, contact: { id: 'CONTACT123' } } };
  if (req.url.endsWith('/calendars/events/appointments')) return opts.slotTaken ? { statusCode: 400, body: { message: 'The slot you have selected is no longer available.' } } : { statusCode: 200, body: { id: 'APPT789', startTime: req.body.startTime } };
  if (/\/free-slots$/.test(req.url)) return { statusCode: 200, body: { '2026-11-18': { slots: ['2026-11-18T10:00:00-05:00', 1234] }, traceId: 'x' } };
  return { statusCode: 201, body: {} };
};

// ---------- booking ----------
const booking = JSON.parse(fs.readFileSync(path.join(ROOT, 'screenshots', 'sample-payload.json'), 'utf8'));
booking.slot.start = new Date(Date.now() + 2 * 86400000).toISOString();
booking.slot.end = new Date(Date.now() + 2 * 86400000 + 45 * 60000).toISOString();
const wfB = load('kd-booking-create.json');
const headers = { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' };

let r = runWorkflow(wfB, { body: booking, headers }, fakeHL());
check(r.response && r.response.status === 200 && r.response.body.ok === true && r.response.body.appointment.id === 'APPT789', 'booking: happy path returns ok + appointment id');
const [up, appt, tags, note] = r.calls;
check(up && up.url.endsWith('/contacts/upsert') && up.headers.Version === 'v3', 'booking: upsert call with Version v3');
check(up.body.locationId === 'nLOdLoui5CvpzktszMJx' && up.body.email === 'test.driver@example.com' && up.body.phone === '+13055550142', `booking: contact mapped (phone ${up.body.phone})`);
check(up.body.customFields.length === 24 && up.body.customFields.some(f => f.id === 'O5yyMN7TXsWzblxrHUfO' && f.fieldValue === 'Business Discovery (SEO) Home – Header'), 'booking: 24 custom fields incl. campaign');
check(up.body.customFields.some(f => f.id === 'UWxeByWt7W4EuIVVAQsm' && Array.isArray(f.fieldValue)), 'booking: checkbox answers sent as a list');
check(!('tags' in up.body), 'booking: upsert does not overwrite tags');
check(up.body.dndSettings.sms.status === 'inactive', 'booking: SMS allowed after consent');
check(appt.body.contactId === 'CONTACT123' && appt.body.calendarId === '17jl7cP7dvOAU48s6C3L' && new Date(appt.body.endTime) - new Date(appt.body.startTime) === 45 * 60000, 'booking: appointment on the calendar, 45 min, linked to contact');
check(tags.url.endsWith('/contacts/CONTACT123/tags') && tags.body.tags.includes('src: home – header'), `booking: tags ${JSON.stringify(tags.body.tags)}`);
check(note.url.endsWith('/contacts/CONTACT123/notes') && /IP 203\.0\.113\.7/.test(note.body.body) && /Home – Header/.test(note.body.body), 'booking: note has answers, source and consent IP');

r = runWorkflow(wfB, { body: booking, headers }, fakeHL({ slotTaken: true }));
check(r.response.status === 409 && r.response.body.code === 'slot_taken', 'booking: taken slot → 409 slot_taken');
r = runWorkflow(wfB, { body: booking, headers }, fakeHL({ upsertFail: true }));
check(r.response.status === 502 && r.response.body.code === 'crm_error' && r.calls.length === 1, 'booking: CRM failure stops before booking');
r = runWorkflow(wfB, { body: { ...booking, hp: 'bot' }, headers }, fakeHL());
check(r.response.status === 200 && r.response.body.ok === true && r.calls.length === 0, 'booking: honeypot → fake success, no CRM calls');
r = runWorkflow(wfB, { body: { ...booking, consent: { sms: false } }, headers }, fakeHL());
check(r.response.status === 400 && r.calls.length === 0, 'booking: no consent → 400, no CRM calls');
r = runWorkflow(wfB, { body: { ...booking, slot: { ...booking.slot, start: '2020-01-01T10:00:00Z' } }, headers }, fakeHL());
check(r.response.status === 409 && r.response.body.code === 'slot_taken', 'booking: past slot → 409');
r = runWorkflow(wfB, { body: { ...booking, customFields: [...booking.customFields, { id: 'EVIL', fieldValue: 'x' }] }, headers }, fakeHL());
check(!r.calls[0].body.customFields.some(f => f.id === 'EVIL'), 'booking: unknown custom fields are dropped');

// ---------- contact ----------
const contact = JSON.parse(fs.readFileSync(path.join(ROOT, 'screenshots', 'sample-payload-contact.json'), 'utf8'));
const wfC = load('kd-contact.json');
r = runWorkflow(wfC, { body: contact, headers }, fakeHL());
check(r.response.status === 200 && r.response.body.ok === true, 'contact: happy path ok');
check(r.calls.length === 3 && r.calls[0].body.customFields.some(f => f.id === '2qGuyylBHmeIFy4ZQITo'), 'contact: upsert with message field, then tags + note');
check(r.calls[1].body.tags.includes('website contact form') && r.calls[1].body.tags.includes('src: contact us – inquiry form'), `contact: tags ${JSON.stringify(r.calls[1].body.tags)}`);
r = runWorkflow(wfC, { body: { ...contact, type: 'booking' }, headers }, fakeHL());
check(r.response.status === 400, 'contact: wrong type rejected');

// ---------- slots ----------
const wfS = load('kd-booking-slots.json');
const now = Date.now();
r = runWorkflow(wfS, { query: { start: String(now - 5 * 86400000), end: String(now + 40 * 86400000), timezone: 'America/Chicago' } }, fakeHL());
const q = r.calls[0].query;
check(r.calls[0].url.endsWith('/calendars/17jl7cP7dvOAU48s6C3L/free-slots') && q.timezone === 'America/Chicago', 'slots: free-slots call for the calendar + time zone');
check(q.startDate >= now - 1000 && q.endDate - q.startDate <= 31 * 86400000, 'slots: range clamped to now … +31 days');
check(r.response.status === 200 && JSON.stringify(r.response.body) === JSON.stringify({ '2026-11-18': { slots: ['2026-11-18T10:00:00-05:00'] } }), 'slots: only clean date → slots map returned');
r = runWorkflow(wfS, { query: { start: 'x', end: 'y', timezone: 'Not/AZone' } }, req => ({ statusCode: 400, body: {} }));
check(r.response.status === 200 && JSON.stringify(r.response.body) === '{}', 'slots: bad request → empty map, no error page');

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
