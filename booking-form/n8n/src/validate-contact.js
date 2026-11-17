// Validate the website contact form and build the HighLevel request bodies.
const req = $input.first().json;
const b = req.body || {};
if (b.hp) return [{ json: { ok: false, spam: true, status: 200 } }];
if (b.type !== 'contact') return reject('invalid', 'Unexpected form type.');
const c = b.contact || {};
const email = str(c.email, 200).toLowerCase();
if (!str(c.firstName) || !str(c.lastName) || !isEmail(email)) return reject('invalid', 'Please fill in your name and email.');
if (!b.consent || b.consent.sms !== true) return reject('invalid', 'Please tick the SMS consent box.');
const source = str(b.booking_source, 120) || 'Website';

const upsert = clean({
  locationId: LOCATION_ID,
  firstName: str(c.firstName, 80), lastName: str(c.lastName, 80), email,
  companyName: str(c.companyName, 120), timezone: str(c.timezone, 60), source: CONTACT_SOURCE,
  customFields: pickFields(b.customFields, CONTACT_FIELDS),
  dndSettings: { sms: { status: 'inactive', message: 'SMS consent given on the website contact form' } }
});

const ip = clientIp(req.headers);
const note = [
  `Website contact form · ${source}`,
  '',
  ...(Array.isArray(b.answers) ? b.answers : []).slice(0, 20).map(a => `${str(a.q, 200)}: ${str(a.a, 5000)}`),
  '',
  `SMS consent: YES · ${str(b.consent.at, 40)} · IP ${ip || 'n/a'} · ${str(b.consent.page, 500)}`,
  `Consent text: ${str(b.consent.text, 1000)}`,
  '',
  ...contextLines(b.context)
].join('\n');

return [{ json: { ok: true, source, upsert, note, tags: ['website contact form', `src: ${source}`.toLowerCase()] } }];
