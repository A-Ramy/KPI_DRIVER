// Did HighLevel save the contact? (the HTTP node runs with "full response" + "never error")
const prev = $('Validate').first().json;
const r = $input.first().json;
const id = r.body && r.body.contact && r.body.contact.id;
if (r.statusCode >= 200 && r.statusCode < 300 && id) return [{ json: { ...prev, ok: true, contactId: id } }];
return [{ json: { ok: false, status: 502, code: 'crm_error', message: "We couldn't save your details. Please try again, or email info@kpidriver.com.", detail: r.body } }];
