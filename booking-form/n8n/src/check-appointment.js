// Did HighLevel book the slot? A taken slot comes back as a 4xx that mentions the slot.
const prev = $('Check contact').first().json;
const r = $input.first().json;
if (r.statusCode >= 200 && r.statusCode < 300 && r.body && r.body.id) {
  return [{ json: { ...prev, ok: true, appointment: { id: r.body.id, startTime: r.body.startTime || prev.appt.startTime } } }];
}
const text = JSON.stringify(r.body || {});
const taken = r.statusCode >= 400 && r.statusCode < 500 && /slot|availab|booked|conflict|not free/i.test(text);
return [{ json: taken
  ? { ok: false, status: 409, code: 'slot_taken', message: 'That time was just taken. Please pick another one.' }
  : { ok: false, status: 502, code: 'crm_error', message: "We couldn't book the call. Please try again, or email info@kpidriver.com.", detail: r.body } }];
