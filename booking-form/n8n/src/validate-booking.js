// Validate the website booking and build every HighLevel request body.
const req = $input.first().json;
const b = req.body || {};
if (b.hp) return [{ json: { ok: false, spam: true, status: 200 } }];                 // honeypot: pretend all is well
if (b.type !== 'booking') return reject('invalid', 'Unexpected form type.');
const c = b.contact || {};
const email = str(c.email, 200).toLowerCase();
if (!str(c.firstName) || !str(c.lastName) || !isEmail(email) || !str(c.phone)) return reject('invalid', 'Please fill in your name, email and phone.');
if (!b.consent || b.consent.sms !== true) return reject('invalid', 'Please tick the SMS consent box.');
const start = Date.parse(b.slot && b.slot.start);
if (!start || start < Date.now() + 5 * 60000) return reject('slot_taken', 'That time is no longer available. Please pick another one.', 409);
const end = start + DURATION_MIN * 60000;
const source = str(b.booking_source, 120) || 'Website';
const tz = str(b.slot.timezone || c.timezone, 60);

const upsert = clean({
  locationId: LOCATION_ID,
  firstName: str(c.firstName, 80), lastName: str(c.lastName, 80), email, phone: phoneE164(c.phone),
  companyName: str(c.companyName, 120), address1: str(c.address1, 200), city: str(c.city, 80), state: str(c.state, 80),
  postalCode: str(c.postalCode, 20), country: str(c.country, 2).toUpperCase(), timezone: tz, source: CONTACT_SOURCE,
  customFields: pickFields(b.customFields, BOOKING_FIELDS),
  dndSettings: { sms: { status: 'inactive', message: 'SMS consent given on the website booking form' } }
});

const appt = {
  calendarId: CALENDAR_ID, locationId: LOCATION_ID,
  startTime: new Date(start).toISOString(), endTime: new Date(end).toISOString(),
  title: `Discovery Call · ${upsert.firstName} ${upsert.lastName}`,
  appointmentStatus: 'confirmed',
  description: `Booked on the website · ${source}`,
  toNotify: true                                   // run the calendar's confirmation/reminder automations
};

const ip = clientIp(req.headers);
const note = [
  `Website booking · ${source}`,
  `Call: ${str(b.slot.display, 120) || appt.startTime} (${tz})`,
  '',
  ...(Array.isArray(b.answers) ? b.answers : []).slice(0, 60).map(a => `${str(a.q, 200)}: ${str(a.a, 2000)}`),
  '',
  `SMS consent: YES · ${str(b.consent.at, 40)} · IP ${ip || 'n/a'} · ${str(b.consent.page, 500)}`,
  `Consent text: ${str(b.consent.text, 1000)}`,
  '',
  ...contextLines(b.context)
].join('\n');

return [{ json: { ok: true, source, upsert, appt, note, tags: ['website booking', `src: ${source}`.toLowerCase()] } }];
