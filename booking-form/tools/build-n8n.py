"""Build the two importable n8n workflows from booking-form/n8n/src/*.js.

    python3 booking-form/tools/build-n8n.py

Outputs booking-form/n8n/kd-booking-slots.json and kd-booking-create.json.
(The contact form posts straight to a HighLevel inbound webhook, so it has no n8n workflow.)
Each uses one n8n credential, "HighLevel PIT" (type: Header Auth, name "Authorization",
value "Bearer <your HighLevel Private Integration token>"). Import, pick the credential, activate.
"""
import json
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "n8n" / "src"
OUT = ROOT / "n8n"
API = "https://services.leadconnectorhq.com"
ORIGINS = "https://www.kpidriver.com,https://kpidriver.com,https://kpidriver.webflow.io"
CRED = {"httpHeaderAuth": {"id": "", "name": "HighLevel PIT"}}
NS = uuid.UUID("6f1c3e1e-4d2a-4b8e-9a51-6b8d1f0c2a77")


def js(*names):
    return "\n".join((SRC / f"{n}.js").read_text() for n in names)


def nid(wf, name):
    return str(uuid.uuid5(NS, wf + "/" + name))


class WF:
    def __init__(self, name, slug):
        self.name, self.slug, self.nodes, self.conn, self.x = name, slug, [], {}, 0

    def add(self, name, typ, version, params, y=0, **extra):
        node = {"parameters": params, "id": nid(self.slug, name), "name": name, "type": typ,
                "typeVersion": version, "position": [self.x, y]}
        node.update(extra)
        self.nodes.append(node)
        self.x += 240
        return name

    def link(self, a, b, out=0):
        outs = self.conn.setdefault(a, {"main": []})["main"]
        while len(outs) <= out:
            outs.append([])
        outs[out].append({"node": b, "type": "main", "index": 0})

    def chain(self, *names):
        for a, b in zip(names, names[1:]):
            self.link(a, b)

    def save(self):
        data = {"name": self.name, "nodes": self.nodes, "connections": self.conn, "active": False,
                "settings": {"executionOrder": "v1"}, "pinData": {},
                "meta": {"templateCredsSetupCompleted": False}, "tags": []}
        path = OUT / f"{self.slug}.json"
        path.write_text(json.dumps(data, indent=2) + "\n")
        print(f"{path.relative_to(ROOT.parent)}: {len(self.nodes)} nodes")


def webhook(wf, path, method):
    return wf.add("Webhook", "n8n-nodes-base.webhook", 2,
                  {"httpMethod": method, "path": path, "responseMode": "responseNode",
                   "options": {"allowedOrigins": ORIGINS}},
                  webhookId=nid(wf.slug, "webhook-id"))


def code(wf, name, source, y=0):
    return wf.add(name, "n8n-nodes-base.code", 2, {"jsCode": source}, y)


def http(wf, name, method, url, body=None, query=None, y=0):
    p = {"method": method, "url": url, "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth",
         "sendHeaders": True,
         "headerParameters": {"parameters": [{"name": "Version", "value": "v3"}, {"name": "Accept", "value": "application/json"}]},
         "options": {"response": {"response": {"fullResponse": True, "neverError": True}}, "timeout": 15000}}
    if query:
        p["sendQuery"] = True
        p["queryParameters"] = {"parameters": [{"name": k, "value": v} for k, v in query]}
    if body:
        p["sendBody"] = True
        p["specifyBody"] = "json"
        p["jsonBody"] = body
    return wf.add(name, "n8n-nodes-base.httpRequest", 4.2, p, y, credentials=CRED)


def is_ok(wf, name, y=0):
    return wf.add(name, "n8n-nodes-base.if", 2, {
        "conditions": {
            "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "loose"},
            "conditions": [{"id": nid(wf.slug, name + "-c"), "leftValue": "={{ $json.ok }}", "rightValue": "",
                            "operator": {"type": "boolean", "operation": "true", "singleValue": True}}],
            "combinator": "and"},
        "options": {}}, y)


def respond(wf, name, body_expr, code_expr, y=0, cache=None):
    opts = {"responseCode": code_expr}
    headers = [{"name": "Content-Type", "value": "application/json"}]
    if cache:
        headers.append({"name": "Cache-Control", "value": cache})
    opts["responseHeaders"] = {"entries": headers}
    return wf.add(name, "n8n-nodes-base.respondToWebhook", 1.1,
                  {"respondWith": "json", "responseBody": body_expr, "options": opts}, y)


FAIL_BODY = "={{ JSON.stringify($json.spam ? { ok: true } : { ok: false, code: $json.code, message: $json.message }) }}"
FAIL_CODE = "={{ $json.status || 400 }}"

# ---------- 1. free slots ----------
w = WF("KPI DRIVER · Booking · Free slots", "kd-booking-slots")
a = webhook(w, "kd-booking-slots", "GET")
b = code(w, "Validate", js("config", "common", "validate-slots"))
c = http(w, "HighLevel free slots", "GET", "=" + API + "/calendars/{{ $json.calendarId || 'none' }}/free-slots",
         query=[("startDate", "={{ $json.start }}"), ("endDate", "={{ $json.end }}"), ("timezone", "={{ $json.timezone }}")])
d = code(w, "Shape", js("shape-slots"))
e = respond(w, "Respond", "={{ JSON.stringify($json.body) }}", "={{ $json.status }}", cache="public, max-age=60")
w.chain(a, b, c, d, e)
w.save()

# ---------- 2. create booking ----------
w = WF("KPI DRIVER · Booking · Create", "kd-booking-create")
a = webhook(w, "kd-booking-create", "POST")
b = code(w, "Validate", js("config", "common", "validate-booking"))
c = is_ok(w, "Valid?")
d = http(w, "Upsert contact", "POST", API + "/contacts/upsert", body="={{ JSON.stringify($json.upsert) }}")
e = code(w, "Check contact", js("check-contact"))
f = is_ok(w, "Contact saved?")
g = http(w, "Create appointment", "POST", API + "/calendars/events/appointments",
         body="={{ JSON.stringify(Object.assign({}, $json.appt, { contactId: $json.contactId })) }}")
h = code(w, "Check appointment", js("check-appointment"))
i = is_ok(w, "Booked?")
j = http(w, "Add tags", "POST", "=" + API + "/contacts/{{ $json.contactId }}/tags", body="={{ JSON.stringify({ tags: $json.tags }) }}")
k = http(w, "Add note", "POST", "=" + API + "/contacts/{{ $('Check appointment').first().json.contactId }}/notes",
         body="={{ JSON.stringify({ body: $('Check appointment').first().json.note }) }}")
ok = respond(w, "Respond: booked",
             "={{ JSON.stringify({ ok: true, appointment: $('Check appointment').first().json.appointment }) }}", "=200")
self_fail = respond(w, "Respond: rejected", FAIL_BODY, FAIL_CODE, y=220)
crm_fail = respond(w, "Respond: CRM error", FAIL_BODY, FAIL_CODE, y=220)
slot_fail = respond(w, "Respond: not booked", FAIL_BODY, FAIL_CODE, y=220)
w.chain(a, b, c)
w.link(c, d, 0); w.link(c, self_fail, 1)
w.chain(d, e, f)
w.link(f, g, 0); w.link(f, crm_fail, 1)
w.chain(g, h, i)
w.link(i, j, 0); w.link(i, slot_fail, 1)
w.chain(j, k, ok)
w.save()
