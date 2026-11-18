"""Builds the lifecycle journey data (EN + ES) and splices src/assets/js/lifecycle.js into src/assets/js/site.js.
Run from the repo root: python3 webflow/build_lifecycle.py"""
import json, re

es_map = json.load(open("src/data/es.json", encoding="utf-8"))
MANUAL = {
    "New Lead": "Lead nuevo", "Appointment Set": "Cita agendada", "Offer Made": "Oferta hecha", "Contract Sent": "Contrato enviado",
    "Contract Signed": "Contrato firmado", "Contacted": "Contactado", "Not Ready": "Aún no está listo", "Offer Declined": "Oferta rechazada",
    "Dispositions + Transaction Coordination": "Disposiciones + Coordinación de transacciones", "Closed & Funded": "Cerrado y financiado",
    "No Response": "Sin respuesta", "Seller Re-Engages": "El vendedor responde", "Follow-Up Sequence": "Secuencia de seguimiento",
    "Still Quiet": "Sigue en silencio", "Long-Term Nurture": "Nurture a largo plazo", "Under Contract": "Bajo contrato",
    "Marketed to Buyers": "Ofrecido a compradores", "Offer Received": "Oferta recibida", "Buyer Secured": "Comprador asegurado",
    "Keeping It": "Se conserva", "Back on the Market": "De vuelta al mercado", "Title Ordered": "Título solicitado",
    "Inspection & Docs": "Inspección y documentos", "Clear to Close": "Listo para cerrar", "Inspection Findings": "Hallazgos de inspección",
    "Repairs Complete": "Reparaciones terminadas", "Purchase Closed": "Compra cerrada", "Kept": "Se conserva",
    "TC Schedules Work": "TC programa el trabajo", "Vendor Assigned": "Proveedor asignado", "Work in Progress": "Trabajo en curso",
    "Final Walkthrough": "Revisión final", "Complete": "Terminado", "Ready to Sell": "Listo para vender",
    "Maintenance Request": "Solicitud de mantenimiento", "Rented": "Rentada", "Selling": "Se vende", "Dispositions + TC": "Disposiciones + TC",
    "TC": "TC", "Contractors & Vendors": "Contratistas y proveedores", "Owned & Rentals": "Propiedades y rentas", "Nurture": "Nurture",
    "Works side by side with Transaction Coordination until the deal is sold or kept.":
        "Trabaja junto con Coordinación de transacciones hasta que el trato se vende o se conserva.",
    "Contracts, documents, payoffs and timelines are tracked through closing, with tasks assigned to the people responsible and documents signed inside the platform. TC also schedules and follows contractors and vendors, before the sale and while you own the property.":
        "Contratos, documentos, liquidaciones y plazos se siguen hasta el cierre, con tareas asignadas a los responsables y documentos firmados dentro de la plataforma. TC también programa y da seguimiento a contratistas y proveedores, antes de la venta y mientras la propiedad es tuya.",
    "Runs alongside Dispositions to Closed & Funded, and keeps vendor work on schedule.":
        "Avanza junto con Disposiciones hasta Cerrado y financiado, y mantiene al día el trabajo de los proveedores.",
    "A dedicated pipeline for repairs, renovations and vendor tasks, coordinated by Transaction Coordination and tied to the deal or property the work belongs to.":
        "Un pipeline dedicado a reparaciones, remodelaciones y tareas de proveedores, coordinado por Coordinación de transacciones y ligado al trato o la propiedad a la que pertenece el trabajo.",
    "Kept until sold again: a sale goes back through Dispositions and TC to Closed & Funded.":
        "Se conserva hasta venderse de nuevo: la venta vuelve a pasar por Disposiciones y TC hasta Cerrado y financiado.",
}
missing = []
def es(t):
    if t in MANUAL: return MANUAL[t]
    for k in (t, t.replace("&", "&amp;")):
        if k in es_map: return es_map[k].replace("&amp;", "&")
    missing.append(t); return t

STAGES = [
    dict(tab="Capture", h="Every lead lands in one place",
         p="Leads from web forms, PPC campaigns, inbound calls, SMS, email and social arrive in a single acquisitions pipeline, so nothing lives in a spreadsheet or someone's inbox.",
         ticks=["See every new lead in one organized view", "Assign the lead to the right team member as it arrives", "Keep the full history from first contact onward"],
         next="New leads go straight to the people who close.",
         routes=[["New Lead", "Appointment Set", "Offer Made", "Contract Sent", "Contract Signed"], ["New Lead", "Contacted", "Not Ready", "Nurture"], ["New Lead", "Appointment Set", "Offer Made", "Offer Declined", "Nurture"]]),
    dict(tab="Acquisitions", h="Work the seller, secure the property",
         p="Your acquisitions team negotiates terms and gets the property under contract, with offers, follow-ups and documents tracked against the deal.",
         ticks=["Track negotiations and offers in one view", "Set reminders for follow-ups and decision dates", "Keep property details and documents with the deal"],
         next="A signed contract opens two tracks at once. A stalled seller gets backup.",
         routes=[["Appointment Set", "Offer Made", "Contract Sent", "Contract Signed", "Dispositions + Transaction Coordination"], ["Contract Signed", "Dispositions + Transaction Coordination", "Closed & Funded"], ["Offer Made", "No Response", "Nurture"]]),
    dict(tab="Nurture", h="Backup for your acquisitions team",
         p="When a seller goes quiet or is not ready, Nurture steps in behind your acquisition managers. Drip campaigns over SMS and email, matched to why the deal stalled, keep working the lead until it comes back to life.",
         ticks=["Takes stalled leads off your closers' plates", "Situational, timed and AI-tailored nurtures, in English and Spanish", "Hands revived leads back to acquisitions to close"],
         next="Nurture does not close deals. It revives them for the people who do.",
         routes=[["Nurture", "Seller Re-Engages", "Appointment Set", "Offer Made", "Contract Signed"], ["Nurture", "Follow-Up Sequence", "Still Quiet", "Long-Term Nurture"]]),
    dict(tab="Dispositions", h="Market and sell the deal",
         p="Once a property is under contract, the dispositions pipeline covers marketing to agents, investors and buyers, showings, offers and the buyer agreement.",
         ticks=["Send listings to your investor network", "Track incoming offers and counteroffers", "Schedule showings and log feedback"],
         next="Works side by side with Transaction Coordination until the deal is sold or kept.",
         routes=[["Under Contract", "Marketed to Buyers", "Offer Received", "Buyer Secured", "Closed & Funded"], ["Under Contract", "Keeping It", "Owned & Rentals"], ["Owned & Rentals", "Back on the Market", "Buyer Secured", "Closed & Funded"]]),
    dict(tab="Transaction Coordination", short="Transaction Coord.", h="From contract to close",
         p="Contracts, documents, payoffs and timelines are tracked through closing, with tasks assigned to the people responsible and documents signed inside the platform. TC also schedules and follows contractors and vendors, before the sale and while you own the property.",
         ticks=["Send contracts for e-signature without leaving the system", "Follow closing timelines and pending items", "Keep every document linked to its deal"],
         next="Runs alongside Dispositions to Closed & Funded, and keeps vendor work on schedule.",
         routes=[["Contract Signed", "Title Ordered", "Inspection & Docs", "Clear to Close", "Closed & Funded"], ["Inspection Findings", "Contractors & Vendors", "Repairs Complete", "Clear to Close"], ["Purchase Closed", "Kept", "Owned & Rentals"]]),
    dict(tab="Contractors & Vendors", h="Repairs and vendor work, tracked",
         p="A dedicated pipeline for repairs, renovations and vendor tasks, coordinated by Transaction Coordination and tied to the deal or property the work belongs to.",
         ticks=["Assign jobs and follow timelines", "Track expenses against project budgets", "Attach invoices, receipts and reports to each job"],
         next="Finished work returns the property to its next step.",
         routes=[["TC Schedules Work", "Vendor Assigned", "Work in Progress", "Final Walkthrough", "Complete"], ["Complete", "Ready to Sell", "Dispositions"], ["Maintenance Request", "Vendor Assigned", "Complete", "Owned & Rentals"]]),
    dict(tab="Owned & Rentals", h="The portfolio you keep",
         p="Vacant properties, active rentals, tenants, lease dates and income are managed in a rentals pipeline that reports into the same KPI tracking.",
         ticks=["Track rental income and expenses per property", "Follow lease start and end dates", "Keep tenant communication and lease documents together"],
         next="Kept until sold again: a sale goes back through Dispositions and TC to Closed & Funded.",
         routes=[["Rented", "Maintenance Request", "TC", "Contractors & Vendors"], ["Rented", "Selling", "Dispositions + TC", "Closed & Funded"]]),
]

def stages_es():
    out = []
    for s in STAGES:
        o = dict(tab=es(s["tab"]), h=es(s["h"]), p=es(s["p"]), ticks=[es(t) for t in s["ticks"]], next=es(s["next"]), routes=[[es(x) for x in r] for r in s["routes"]])
        if s["tab"] == "Transaction Coordination": o["short"] = "Coord. de transacciones"
        out.append(o)
    return out

EN = dict(
    stages=STAGES, aria="Lifecycle diagram", tablist="Stages of the investment lifecycle", nextLabel="Where it goes next", routesLabel="Common routes",
    gearWord="Gear", top="top gear", goes="goes next to", **{"and": " and "},
    nodes=["Capture", "Acquisitions", "Nurture", "Dispositions", "Transaction Coord.", "Contractors & Vendors", "Owned & Rentals", "Closed", "Closed", "Funded"],
    names=["Capture", "Acquisitions", "Nurture", "Dispositions", "Transaction Coordination", "Contractors & Vendors", "Owned & Rentals", "Closed", "Closed", "Funded"],
    hud=["Capture", "Acquisitions", "Nurture", "Dispositions", "Transaction Coord.", "Contractors & Vendors", "Owned & Rentals", "Closed", "Closed", "Funded"],
    tags=[[150, 110, "needs backup", 0, "end"], [262, 104, "revived", 0], [386, 164, "in parallel", 0, "end"], [492, 164, "kept", 0, "middle"],
          [612, 142, "sell again", 1, "middle"], [846, 96, "sold", 0, "end"], [484, 302, "TC coordinates", 1]],
    extra={"7": "<b>4 · Closed</b> · the purchase closes and the property is kept. Goes next to Owned &amp; Rentals.",
           "8": "<b>5 · Closed</b> · the sale closes. Goes next to Funded.",
           "9": "<b>6 · Funded</b> · top gear, the finish. Green lines: every path that ends in a sale."},
)
ES = dict(
    stages=stages_es(), aria="Diagrama del ciclo de vida", tablist=es("Stages of the investment lifecycle"), nextLabel=es("Where it goes next"), routesLabel=es("Common routes"),
    gearWord="Marcha", top="marcha máxima", goes="va después a", **{"and": " y "},
    nodes=["Captación", "Adquisiciones", "Nurture", "Disposiciones", "Coord. de transacciones", "Contratistas y proveedores", "Propiedades\ny rentas", "Cerrado", "Cerrado", "Financiado"],
    names=["Captación", "Adquisiciones", "Nurture", "Disposiciones", "Coordinación de transacciones", "Contratistas y proveedores", "Propiedades y rentas", "Cerrado", "Cerrado", "Financiado"],
    hud=["Captación", "Adquisiciones", "Nurture", "Disposiciones", "Coord. de transacciones", "Contratistas y proveedores", "Propiedades y rentas", "Cerrado", "Cerrado", "Financiado"],
    tags=[[150, 110, "necesita apoyo", 0, "end"], [262, 104, "reactivado", 0], [386, 164, "en paralelo", 0, "end"], [492, 164, "se conserva", 0, "middle"],
          [612, 142, "revender", 1, "middle"], [846, 96, "vendido", 0, "end"], [484, 302, "TC coordina", 1]],
    extra={"7": "<b>4 · Cerrado</b> · la compra cierra y la propiedad se conserva. Va después a Propiedades y rentas.",
           "8": "<b>5 · Cerrado</b> · la venta cierra. Va después a Financiado.",
           "9": "<b>6 · Financiado</b> · marcha máxima, la meta. Líneas verdes: cada camino que termina en una venta."},
)
if missing: raise SystemExit("missing ES: " + repr(sorted(set(missing))))

mod = open("src/assets/js/lifecycle.js", encoding="utf-8").read()
mod = mod.replace("/*LC_DATA*/null", json.dumps({"en": EN, "es": ES}, ensure_ascii=False, separators=(",", ":")))
site = open("src/assets/js/site.js", encoding="utf-8").read()
# replace an earlier splice, or insert before the tabs block
site = re.sub(r"  /\* ---- lifecycle journey v5:.*?/\* ---- end lifecycle journey v5 ---- \*/\n", "", site, flags=re.S)
marker = "  /* ---- tabs (WAI-ARIA tabs with arrow-key support) ---- */"
assert marker in site
site = site.replace(marker, mod + marker, 1)
# drop the old route-chain and diagram-label shims (the block now renders them itself)
a = site.find("  /* ---- content updates (owner, 2026-11-18)")
if a > -1 and "  /* lifecycle diagram label, hero eyebrow and Ahmed's title */" in site:
    b = site.index("  /* lifecycle diagram label, hero eyebrow and Ahmed's title */")
    site = site[:a] + "  /* ---- content updates (owner, 2026-11-18): hero eyebrow and Ahmed's title, until the page embeds are rebuilt ---- */\n" + site[b + len("  /* lifecycle diagram label, hero eyebrow and Ahmed's title */\n"):]
site = site.replace('[["Contratistas", "Contratistas y proveedores", "svg text"], ', "[").replace('[["Contractors", "Contractors & Vendors", "svg text"], ', "[")
open("src/assets/js/site.js", "w", encoding="utf-8").write(site)
print("spliced; site.js", len(site), "bytes")
