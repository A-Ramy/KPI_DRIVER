// LIVE check against the real HighLevel account, using the generated n8n workflows themselves.
// The HighLevel token is NOT in this file: the session's network proxy adds it to requests to
// services.leadconnectorhq.com. Everything this test creates is deleted again at the end.
//   node booking-form/tools/live-test.js [--webhook <inbound webhook url>] [--only-webhook]
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { runWorkflow } = require('./n8n-sim');

const ROOT = path.resolve(__dirname, '..');
const API = 'https://services.leadconnectorhq.com';
const log = [];
let failures = 0;
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) failures++; };

function curl(method, url, body, extraHeaders = []) {
  const args = ['-sS', '-X', method, '-H', 'Version: v3', '-H', 'Accept: application/json', ...extraHeaders.flatMap(h => ['-H', h]), '-w', '\n__STATUS__%{http_code}', '--max-time', '30'];
  if (body !== undefined) args.push('-H', 'Content-Type: application/json', '--data-binary', JSON.stringify(body));
  args.push(url);
  const out = execFileSync('curl', args, { encoding: 'utf8' });
  const i = out.lastIndexOf('\n__STATUS__');
  const text = out.slice(0, i), statusCode = Number(out.slice(i + 11));
  let parsed; try { parsed = JSON.parse(text); } catch (e) { parsed = text; }
  return { statusCode, body: parsed };
}
// what the n8n HTTP nodes would do, but for real (and with automations off for test appointments)
function liveHL(req) {
  let url = req.url;
  if (req.query) url += '?' + new URLSearchParams(req.query).toString();
  const body = req.body ? JSON.parse(JSON.stringify(req.body)) : undefined;
  if (body && /\/calendars\/events\/appointments$/.test(req.url)) body.toNotify = false;   // test only: no emails/SMS/workflows
  const r = curl(req.method, url, body);
  log.push({ method: req.method, url: req.url, status: r.statusCode, body: r.body });
  return r;
}

const created = { contacts: new Set(), events: new Set() };
function cleanup() {
  for (const id of created.events) { const r = curl('DELETE', `${API}/calendars/events/${id}`); check(r.statusCode < 300, `cleanup: deleted test appointment ${id} (HTTP ${r.statusCode})`); }
  for (const id of created.contacts) { const r = curl('DELETE', `${API}/contacts/${id}`); check(r.statusCode < 300, `cleanup: deleted test contact ${id} (HTTP ${r.statusCode})`); }
}

function testPayload(sample, slotIso, email, first) {
  const p = JSON.parse(JSON.stringify(sample));
  const source = 'Live Test – Booking Form';
  p.booking_source = source; p.campaign = 'Business Discovery (SEO) ' + source; p.cta_label = 'live test';
  p.contact = { ...p.contact, firstName: first, lastName: 'Booking Form Check', email, phone: '+13055550100', companyName: 'TEST - please ignore', timezone: 'America/New_York' };
  p.customFields = p.customFields.map(f => f.id === 'O5yyMN7TXsWzblxrHUfO' ? { ...f, fieldValue: p.campaign } : f.id === 'st1eCAFAHDcgPM4VvtNn' ? { ...f, fieldValue: 'TEST - please ignore' } : f);
  const start = new Date(slotIso);
  p.slot = { start: start.toISOString(), end: new Date(start.getTime() + 45 * 60000).toISOString(), timezone: 'America/New_York', display: start.toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'short' }) };
  return p;
}

(async () => {
  if (!process.argv.includes('--only-webhook')) try {
    // 1. free slots, through the generated workflow
    const slotsWf = JSON.parse(fs.readFileSync(path.join(ROOT, 'n8n/kd-booking-slots.json'), 'utf8'));
    const now = Date.now();
    const s = runWorkflow(slotsWf, { query: { start: String(now + 20 * 86400000), end: String(now + 31 * 86400000), timezone: 'America/New_York' } }, liveHL);
    const days = Object.keys(s.response.body).sort();
    check(s.response.status === 200 && days.length > 0, `free slots: ${days.length} days with open times (${days[0]} … ${days[days.length - 1]})`);
    const lastDay = days[days.length - 1], slot = s.response.body[lastDay].slots.slice(-1)[0];
    console.log(`     using ${slot} (last open slot in range, to keep clear of real bookings)`);

    // 2. book it, through the generated workflow
    const sample = JSON.parse(fs.readFileSync(path.join(ROOT, 'screenshots/sample-payload.json'), 'utf8'));
    const bookWf = JSON.parse(fs.readFileSync(path.join(ROOT, 'n8n/kd-booking-create.json'), 'utf8'));
    const headers = { 'x-forwarded-for': '198.51.100.23' };
    const b1 = runWorkflow(bookWf, { body: testPayload(sample, slot, 'kd-booking-form-test-1@example.com', 'Test'), headers }, liveHL);
    const up = log.find(x => x.url.endsWith('/contacts/upsert'));
    const cid = up && up.body && up.body.contact && up.body.contact.id; if (cid) created.contacts.add(cid);
    const apptCall = log.find(x => x.url.endsWith('/calendars/events/appointments'));
    const eid = apptCall && apptCall.body && apptCall.body.id; if (eid) created.events.add(eid);
    check(b1.response.status === 200 && b1.response.body.ok, `booking: workflow answered ok (HTTP ${b1.response.status}) ${JSON.stringify(b1.response.body).slice(0, 160)}`);
    check(up && up.status < 300 && cid, `contact upsert: HTTP ${up && up.status}, contact ${cid}`);
    const cf = (up && up.body.contact && up.body.contact.customFields) || [];
    check(cf.length >= 20, `contact upsert: ${cf.length} custom fields saved`);
    const camp = cf.find(f => f.id === 'O5yyMN7TXsWzblxrHUfO');
    check(camp && /Live Test/.test(JSON.stringify(camp)), `campaign field saved: ${JSON.stringify(camp && (camp.value || camp.fieldValue))}`);
    const multi = cf.find(f => f.id === 'UWxeByWt7W4EuIVVAQsm');
    check(multi && Array.isArray(multi.value || multi.fieldValue), `checkbox field saved as a list: ${JSON.stringify(multi && (multi.value || multi.fieldValue))}`);
    check(apptCall && apptCall.status < 300 && eid, `appointment: HTTP ${apptCall && apptCall.status}, id ${eid}, ${apptCall && apptCall.body && apptCall.body.startTime}`);
    const tagCall = log.find(x => /\/tags$/.test(x.url)), noteCall = log.find(x => /\/notes$/.test(x.url));
    check(tagCall && tagCall.status < 300, `tags added (HTTP ${tagCall && tagCall.status}) ${JSON.stringify(tagCall && tagCall.body && tagCall.body.tags)}`);
    check(noteCall && noteCall.status < 300, `note added (HTTP ${noteCall && noteCall.status})`);

    // 3. same slot again → must come back as "slot taken"
    const before = log.length;
    const b2 = runWorkflow(bookWf, { body: testPayload(sample, slot, 'kd-booking-form-test-2@example.com', 'Test2'), headers }, liveHL);
    const up2 = log.slice(before).find(x => x.url.endsWith('/contacts/upsert'));
    if (up2 && up2.body && up2.body.contact) created.contacts.add(up2.body.contact.id);
    const appt2 = log.slice(before).find(x => x.url.endsWith('/calendars/events/appointments'));
    if (appt2 && appt2.body && appt2.body.id) created.events.add(appt2.body.id);
    console.log(`     HighLevel said: HTTP ${appt2 && appt2.status} ${JSON.stringify(appt2 && appt2.body).slice(0, 200)}`);
    check(b2.response.status === 409 && b2.response.body.code === 'slot_taken', `double booking: visitor is told the slot was taken (HTTP ${b2.response.status} ${b2.response.body.code})`);
  } catch (e) {
    check(false, 'error: ' + e.message);
  } finally {
    cleanup();
  }

  // 4. contact form → inbound webhook (one sample so the workflow can map fields)
  const wi = process.argv.indexOf('--webhook');
  if (wi > 0) {
    const url = process.argv[wi + 1];
    const contact = JSON.parse(fs.readFileSync(path.join(ROOT, 'screenshots/sample-payload-contact.json'), 'utf8'));
    Object.assign(contact, { first_name: 'Test', last_name: 'Contact Form Check', email: 'kd-contact-form-test@example.com', business_name: 'TEST - please ignore', booking_source: 'Live Test – Contact Form', campaign: 'Contact Us (SEO) Live Test – Contact Form', tags: 'website contact form, src: live test – contact form', your_message: 'TEST from the new website contact form. Please ignore.' });
    delete contact.hp;
    const pre = execFileSync('curl', ['-sS', '-o', '/dev/null', '-D', '-', '-X', 'OPTIONS', '-H', 'Origin: https://www.kpidriver.com', '-H', 'Access-Control-Request-Method: POST', '-H', 'Access-Control-Request-Headers: content-type', url], { encoding: 'utf8' });
    const allow = (pre.match(/access-control-allow-origin:\s*(.*)/i) || [])[1];
    console.log(`     webhook CORS: ${allow ? 'allows ' + allow.trim() + ' (JSON post works from the browser)' : 'no CORS headers (the form will use its simple form-post fallback)'}`);
    const r = curl('POST', url, contact, ['Origin: https://www.kpidriver.com']);
    check(r.statusCode >= 200 && r.statusCode < 300, `contact webhook accepted the sample (HTTP ${r.statusCode}) ${JSON.stringify(r.body).slice(0, 120)}`);
    const form = new URLSearchParams(Object.entries(contact).map(([k, v]) => [k, String(v)])).toString();
    const r2 = execFileSync('curl', ['-sS', '-o', '/dev/null', '-w', '%{http_code}', '-X', 'POST', '-H', 'Content-Type: application/x-www-form-urlencoded', '--data-binary', form, url], { encoding: 'utf8' });
    check(Number(r2) >= 200 && Number(r2) < 300, `contact webhook also accepts the form-post fallback (HTTP ${r2})`);
  }
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll live checks passed');
  process.exit(failures ? 1 : 0);
})();
