/* KPI DRIVER — site interactions. Vanilla JS, no dependencies.
   Everything here is progressive enhancement: with JS off, all content stays readable. */
(function () {
  "use strict";
  var doc = document;
  doc.documentElement.classList.remove("no-js");
  var ES = doc.documentElement.lang === "es";
  function L(en, es) { return ES ? es : en; }
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- analytics hook: pushes named events to dataLayer if a tag manager is installed ---- */
  window.dataLayer = window.dataLayer || [];
  function track(name, detail) {
    var payload = { event: name };
    for (var k in detail || {}) payload[k] = detail[k];
    window.dataLayer.push(payload);
  }
  doc.addEventListener("click", function (e) {
    var el = e.target.closest("[data-event]");
    if (el) track(el.getAttribute("data-event"), { label: el.getAttribute("data-label") || (el.textContent || "").trim().slice(0, 60), page: location.pathname });
  });

  /* ---- mobile nav ---- */
  var toggle = doc.querySelector(".nav-toggle");
  var nav = doc.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? L("Close menu", "Cerrar menú") : L("Open menu", "Abrir menú"));
    });
  }

  /* ---- services dropdown (disclosure pattern) ---- */
  var trigger = doc.querySelector(".nav__trigger");
  var menu = doc.getElementById("services-menu");
  function setMenu(open) {
    if (!trigger || !menu) return;
    trigger.setAttribute("aria-expanded", String(open));
    menu.hidden = !open;
  }
  if (trigger && menu) {
    trigger.addEventListener("click", function () { setMenu(trigger.getAttribute("aria-expanded") !== "true"); });
    doc.addEventListener("click", function (e) { if (!e.target.closest(".nav__item--has-menu")) setMenu(false); });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (trigger.getAttribute("aria-expanded") === "true") { setMenu(false); trigger.focus(); }
        else if (nav && nav.classList.contains("is-open")) { toggle.click(); toggle.focus(); }
      }
    });
    var item = trigger.closest(".nav__item--has-menu");
    item.addEventListener("focusout", function (e) { if (!item.contains(e.relatedTarget)) setMenu(false); });
  }

  /* ---- lifecycle journey v5: gear-track diagram + one-row tabs (Home, Services, CRM; EN + ES) ----
     Rebuilds the [data-circuit] block in place from LC data, so English and Spanish share one source.
     Gears: 1 Capture, 2 Acquisitions, 3 Dispositions + 3 TC side by side, 4 Closed (kept) -> P Owned & Rentals,
     5 Closed (sold) -> 6 Funded (top gear); N Nurture, R Contractors & Vendors. Source: src/assets/js/lifecycle.js */
  (function () {
    var LC = {"en":{"stages":[{"tab":"Capture","h":"Every lead lands in one place","p":"Leads from web forms, PPC campaigns, inbound calls, SMS, email and social arrive in a single acquisitions pipeline, so nothing lives in a spreadsheet or someone's inbox.","ticks":["See every new lead in one organized view","Assign the lead to the right team member as it arrives","Keep the full history from first contact onward"],"next":"New leads go straight to the people who close.","routes":[["New Lead","Appointment Set","Offer Made","Contract Sent","Contract Signed"],["New Lead","Contacted","Not Ready","Nurture"],["New Lead","Appointment Set","Offer Made","Offer Declined","Nurture"]]},{"tab":"Acquisitions","h":"Work the seller, secure the property","p":"Your acquisitions team negotiates terms and gets the property under contract, with offers, follow-ups and documents tracked against the deal.","ticks":["Track negotiations and offers in one view","Set reminders for follow-ups and decision dates","Keep property details and documents with the deal"],"next":"A signed contract opens two tracks at once. A stalled seller gets backup.","routes":[["Appointment Set","Offer Made","Contract Sent","Contract Signed","Dispositions + Transaction Coordination"],["Contract Signed","Dispositions + Transaction Coordination","Closed & Funded"],["Offer Made","No Response","Nurture"]]},{"tab":"Nurture","h":"Backup for your acquisitions team","p":"When a seller goes quiet or is not ready, Nurture steps in behind your acquisition managers. Drip campaigns over SMS and email, matched to why the deal stalled, keep working the lead until it comes back to life.","ticks":["Takes stalled leads off your closers' plates","Situational, timed and AI-tailored nurtures, in English and Spanish","Hands revived leads back to acquisitions to close"],"next":"Nurture does not close deals. It revives them for the people who do.","routes":[["Nurture","Seller Re-Engages","Appointment Set","Offer Made","Contract Signed"],["Nurture","Follow-Up Sequence","Still Quiet","Long-Term Nurture"]]},{"tab":"Dispositions","h":"Market and sell the deal","p":"Once a property is under contract, the dispositions pipeline covers marketing to agents, investors and buyers, showings, offers and the buyer agreement.","ticks":["Send listings to your investor network","Track incoming offers and counteroffers","Schedule showings and log feedback"],"next":"Works side by side with Transaction Coordination until the deal is sold or kept.","routes":[["Under Contract","Marketed to Buyers","Offer Received","Buyer Secured","Closed & Funded"],["Under Contract","Keeping It","Owned & Rentals"],["Owned & Rentals","Back on the Market","Buyer Secured","Closed & Funded"]]},{"tab":"Transaction Coordination","short":"Transaction Coord.","h":"From contract to close","p":"Contracts, documents, payoffs and timelines are tracked through closing, with tasks assigned to the people responsible and documents signed inside the platform. TC also schedules and follows contractors and vendors, before the sale and while you own the property.","ticks":["Send contracts for e-signature without leaving the system","Follow closing timelines and pending items","Keep every document linked to its deal"],"next":"Runs alongside Dispositions to Closed & Funded, and keeps vendor work on schedule.","routes":[["Contract Signed","Title Ordered","Inspection & Docs","Clear to Close","Closed & Funded"],["Inspection Findings","Contractors & Vendors","Repairs Complete","Clear to Close"],["Purchase Closed","Kept","Owned & Rentals"]]},{"tab":"Contractors & Vendors","h":"Repairs and vendor work, tracked","p":"A dedicated pipeline for repairs, renovations and vendor tasks, coordinated by Transaction Coordination and tied to the deal or property the work belongs to.","ticks":["Assign jobs and follow timelines","Track expenses against project budgets","Attach invoices, receipts and reports to each job"],"next":"Finished work returns the property to its next step.","routes":[["TC Schedules Work","Vendor Assigned","Work in Progress","Final Walkthrough","Complete"],["Complete","Ready to Sell","Dispositions"],["Maintenance Request","Vendor Assigned","Complete","Owned & Rentals"]]},{"tab":"Owned & Rentals","h":"The portfolio you keep","p":"Vacant properties, active rentals, tenants, lease dates and income are managed in a rentals pipeline that reports into the same KPI tracking.","ticks":["Track rental income and expenses per property","Follow lease start and end dates","Keep tenant communication and lease documents together"],"next":"Kept until sold again: a sale goes back through Dispositions and TC to Closed & Funded.","routes":[["Rented","Maintenance Request","TC","Contractors & Vendors"],["Rented","Selling","Dispositions + TC","Closed & Funded"]]}],"aria":"Lifecycle diagram","tablist":"Stages of the investment lifecycle","nextLabel":"Where it goes next","routesLabel":"Common routes","gearWord":"Gear","top":"top gear","goes":"goes next to","and":" and ","nodes":["Capture","Acquisitions","Nurture","Dispositions","Transaction Coord.","Contractors & Vendors","Owned & Rentals","Closed","Closed","Funded"],"names":["Capture","Acquisitions","Nurture","Dispositions","Transaction Coordination","Contractors & Vendors","Owned & Rentals","Closed","Closed","Funded"],"hud":["Capture","Acquisitions","Nurture","Dispositions","Transaction Coord.","Contractors & Vendors","Owned & Rentals","Closed","Closed","Funded"],"tags":[[150,110,"needs backup",0,"end"],[262,104,"revived",0],[386,164,"in parallel",0,"end"],[492,164,"kept",0,"middle"],[612,142,"sell again",1,"middle"],[846,96,"sold",0,"end"],[484,302,"TC coordinates",1]],"extra":{"7":"<b>4 · Closed</b> · the purchase closes and the property is kept. Goes next to Owned &amp; Rentals.","8":"<b>5 · Closed</b> · the sale closes. Goes next to Funded.","9":"<b>6 · Funded</b> · top gear, the finish. Green lines: every path that ends in a sale."}},"es":{"stages":[{"tab":"Captación","h":"Cada lead llega a un solo lugar","p":"Los leads de formularios web, campañas PPC, llamadas entrantes, SMS, correo y redes sociales llegan a un único pipeline de adquisiciones, así nada vive en una hoja de cálculo o en la bandeja de alguien.","ticks":["Ve cada lead nuevo en una vista organizada","Asigna el lead a la persona correcta en cuanto llega","Conserva el historial completo desde el primer contacto"],"next":"Los leads nuevos van directo a quienes cierran.","routes":[["Lead nuevo","Cita agendada","Oferta hecha","Contrato enviado","Contrato firmado"],["Lead nuevo","Contactado","Aún no está listo","Nurture"],["Lead nuevo","Cita agendada","Oferta hecha","Oferta rechazada","Nurture"]]},{"tab":"Adquisiciones","h":"Trabaja al vendedor, asegura la propiedad","p":"Tu equipo de adquisiciones negocia los términos y pone la propiedad bajo contrato, con ofertas, seguimientos y documentos registrados en el trato.","ticks":["Sigue negociaciones y ofertas en una sola vista","Programa recordatorios de seguimiento y fechas de decisión","Guarda los datos y documentos de la propiedad con el trato"],"next":"Un contrato firmado abre dos caminos a la vez. Un vendedor estancado recibe respaldo.","routes":[["Cita agendada","Oferta hecha","Contrato enviado","Contrato firmado","Disposiciones + Coordinación de transacciones"],["Contrato firmado","Disposiciones + Coordinación de transacciones","Cerrado y financiado"],["Oferta hecha","Sin respuesta","Nurture"]]},{"tab":"Nurture","h":"Respaldo para tu equipo de adquisiciones","p":"Cuando un vendedor deja de responder o no está listo, Nurture entra detrás de tus gerentes de adquisiciones. Campañas por SMS y correo, según la razón por la que se estancó el trato, siguen trabajando el lead hasta que revive.","ticks":["Quita los leads estancados de la carga de tus cerradores","Nurtures por situación, por tiempo y personalizados con IA, en inglés y español","Devuelve los leads revividos a adquisiciones para cerrar"],"next":"Nurture no cierra tratos. Los revive para quienes sí los cierran.","routes":[["Nurture","El vendedor responde","Cita agendada","Oferta hecha","Contrato firmado"],["Nurture","Secuencia de seguimiento","Sigue en silencio","Nurture a largo plazo"]]},{"tab":"Disposiciones","h":"Promociona y vende el trato","p":"Cuando una propiedad está bajo contrato, el pipeline de disposiciones cubre la promoción a agentes, inversionistas y compradores, las visitas, las ofertas y el acuerdo con el comprador.","ticks":["Envía propiedades a tu red de inversionistas","Sigue ofertas y contraofertas entrantes","Programa visitas y registra comentarios"],"next":"Trabaja junto con Coordinación de transacciones hasta que el trato se vende o se conserva.","routes":[["Bajo contrato","Ofrecido a compradores","Oferta recibida","Comprador asegurado","Cerrado y financiado"],["Bajo contrato","Se conserva","Propiedades y rentas"],["Propiedades y rentas","De vuelta al mercado","Comprador asegurado","Cerrado y financiado"]]},{"tab":"Coordinación de transacciones","h":"Del contrato al cierre","p":"Contratos, documentos, liquidaciones y plazos se siguen hasta el cierre, con tareas asignadas a los responsables y documentos firmados dentro de la plataforma. TC también programa y da seguimiento a contratistas y proveedores, antes de la venta y mientras la propiedad es tuya.","ticks":["Envía contratos a firma electrónica sin salir del sistema","Sigue los plazos de cierre y los pendientes","Mantén cada documento ligado a su trato"],"next":"Avanza junto con Disposiciones hasta Cerrado y financiado, y mantiene al día el trabajo de los proveedores.","routes":[["Contrato firmado","Título solicitado","Inspección y documentos","Listo para cerrar","Cerrado y financiado"],["Hallazgos de inspección","Contratistas y proveedores","Reparaciones terminadas","Listo para cerrar"],["Compra cerrada","Se conserva","Propiedades y rentas"]],"short":"Coord. de transacciones"},{"tab":"Contratistas y proveedores","h":"Reparaciones y trabajo de proveedores, bajo control","p":"Un pipeline dedicado a reparaciones, remodelaciones y tareas de proveedores, coordinado por Coordinación de transacciones y ligado al trato o la propiedad a la que pertenece el trabajo.","ticks":["Asigna trabajos y sigue los plazos","Controla gastos contra el presupuesto del proyecto","Adjunta facturas, recibos y reportes a cada trabajo"],"next":"El trabajo terminado devuelve la propiedad a su siguiente paso.","routes":[["TC programa el trabajo","Proveedor asignado","Trabajo en curso","Revisión final","Terminado"],["Terminado","Listo para vender","Disposiciones"],["Solicitud de mantenimiento","Proveedor asignado","Terminado","Propiedades y rentas"]]},{"tab":"Propiedades y rentas","h":"El portafolio que conservas","p":"Propiedades vacías, rentas activas, inquilinos, fechas de contrato e ingresos se gestionan en un pipeline de rentas que reporta al mismo seguimiento de KPIs.","ticks":["Sigue ingresos y gastos de renta por propiedad","Sigue las fechas de inicio y fin de cada contrato","Mantén juntos la comunicación con inquilinos y los contratos"],"next":"Se conserva hasta venderse de nuevo: la venta vuelve a pasar por Disposiciones y TC hasta Cerrado y financiado.","routes":[["Rentada","Solicitud de mantenimiento","TC","Contratistas y proveedores"],["Rentada","Se vende","Disposiciones + TC","Cerrado y financiado"]]}],"aria":"Diagrama del ciclo de vida","tablist":"Etapas del ciclo de inversión","nextLabel":"A dónde va después","routesLabel":"Rutas comunes","gearWord":"Marcha","top":"marcha máxima","goes":"va después a","and":" y ","nodes":["Captación","Adquisiciones","Nurture","Disposiciones","Coord. de transacciones","Contratistas y proveedores","Propiedades\ny rentas","Cerrado","Cerrado","Financiado"],"names":["Captación","Adquisiciones","Nurture","Disposiciones","Coordinación de transacciones","Contratistas y proveedores","Propiedades y rentas","Cerrado","Cerrado","Financiado"],"hud":["Captación","Adquisiciones","Nurture","Disposiciones","Coord. de transacciones","Contratistas y proveedores","Propiedades y rentas","Cerrado","Cerrado","Financiado"],"tags":[[150,110,"necesita apoyo",0,"end"],[262,104,"reactivado",0],[386,164,"en paralelo",0,"end"],[492,164,"se conserva",0,"middle"],[612,142,"revender",1,"middle"],[846,96,"vendido",0,"end"],[484,302,"TC coordina",1]],"extra":{"7":"<b>4 · Cerrado</b> · la compra cierra y la propiedad se conserva. Va después a Propiedades y rentas.","8":"<b>5 · Cerrado</b> · la venta cierra. Va después a Financiado.","9":"<b>6 · Financiado</b> · marcha máxima, la meta. Líneas verdes: cada camino que termina en una venta."}}};
    var T = LC[ES ? "es" : "en"], NS = "http://www.w3.org/2000/svg";
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var E = function (t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); };
    var GEAR = ["1", "2", "N", "3", "3", "R", "P", "4", "5", "6"], LVL = [14, 30, 6, 48, 48, 22, 58, 64, 82, 100];
    var POS = [[60, 160], [220, 160], [220, 52], [400, 80], [400, 240], [560, 332], [706, 160], [560, 160], [900, 160], [1030, 160]];
    /* [from, to, d, kind] — from/to may list two stages for lines that run both ways */
    var EDGES = [
      ["0", "1", "M60 160 H220", "track"], ["1", "3", "M220 160 C320 160 330 80 400 80", "track"], ["1", "4", "M220 160 C320 160 330 240 400 240", "track"],
      ["3", "8", "M400 80 C620 30 800 100 884 150", "track"], ["4", "8", "M400 240 C620 290 800 220 884 170", "track"], ["8", "9", "M900 160 H1030", "track"],
      ["3", "7", "M400 80 C470 80 510 160 560 160", "track thin"], ["4", "7", "M400 240 C470 240 510 160 560 160", "track thin"], ["7", "6", "M560 160 H690", "track thin"],
      ["1", "2", "M208 160 C180 130 180 86 208 52", ""], ["2", "1", "M232 52 C260 86 260 130 232 160", ""],
      ["3 4", "3 4", "M394 98 V222", ""], ["3 4", "3 4", "M406 98 V222", ""],
      ["6", "3", "M692 148 C650 96 520 66 418 76", "again"], ["6", "4", "M692 172 C650 224 520 254 418 244", "again"],
      ["4 5", "4 5", "M400 258 C410 312 480 332 542 332", "coord"]
    ];
    /* label placement per node: [dx, dy, anchor] */
    var LAB = [[0, 42, "middle"], [0, 42, "middle"], [0, -26, "middle"], [0, -28, "middle"], [-28, 6, "end"], [26, 6, "start"], [26, 6, "start"], [0, 44, "middle"], [0, 48, "middle"], [0, 74, "middle"]];
    var R = [18, 18, 16, 18, 18, 16, 16, 18, 18, 30];

    function label(i) {
      var l = LAB[i], lines = T.nodes[i].split("\n"), y = l[1] - (lines.length - 1) * 9;
      return '<text x="' + l[0] + '" y="' + y + '" text-anchor="' + l[2] + '">' + lines.map(function (s, k) { return '<tspan x="' + l[0] + '"' + (k ? ' dy="18"' : "") + ">" + E(s) + "</tspan>"; }).join("") + "</text>";
    }
    function svg() {
      var h = '<svg class="lc-svg" viewBox="0 -76 1100 456" role="group" aria-label="' + E(T.aria) + '"><defs><linearGradient id="lc-rev" gradientUnits="userSpaceOnUse" x1="60" y1="0" x2="1030" y2="0"><stop offset="0" stop-color="#e5484d"/><stop offset=".45" stop-color="#f2a531"/><stop offset="1" stop-color="#3fbf7f"/></linearGradient>' +
        '<linearGradient id="lc-bar" x1="0" x2="1"><stop offset="0" stop-color="#e5484d"/><stop offset=".45" stop-color="#f2a531"/><stop offset="1" stop-color="#3fbf7f"/></linearGradient><clipPath id="lc-win"><rect x="0" y="0" width="40" height="40" rx="7"/></clipPath></defs>';
      EDGES.forEach(function (e) { h += '<path class="lc-edge ' + e[3] + '" data-from="' + e[0] + '" data-to="' + e[1] + '" d="' + e[2] + '"/>'; });
      h += '<g class="lc-hl"></g><g class="lc-fx"></g>';
      for (var i = 0; i < 10; i++) {
        var p = POS[i], fin = i === 9;
        h += '<g class="lc-node' + (fin ? " lc-finish" : "") + '" data-node="' + i + '" transform="translate(' + p[0] + " " + p[1] + ')" tabindex="0" role="button" aria-label="' + E(T.nodes[i].replace("\n", " ") + ", " + T.gearWord + " " + GEAR[i]) + '">' +
          (fin ? '<circle class="lc-ring" r="44"/><circle class="lc-disc" r="30"/><text class="lc-gd" y="8" text-anchor="middle">6</text><text class="lc-top" y="-54" text-anchor="middle">' + E(T.top) + "</text>"
               : '<circle class="lc-gbg" r="' + R[i] + '"/><text class="lc-gd" y="5" text-anchor="middle">' + GEAR[i] + "</text>") + label(i) + "</g>";
      }
      T.tags.forEach(function (t) { h += '<text class="lc-tag' + (t[3] ? " amb" : "") + '" x="' + t[0] + '" y="' + t[1] + '" text-anchor="' + (t[4] || "start") + '">' + E(t[2]) + "</text>"; });
      h += '<g class="lc-hud" transform="translate(14 -66)" aria-hidden="true"><rect class="lc-hud-bg" width="240" height="58" rx="10"/><text class="lc-hud-l" x="62" y="20">' + E(T.gearWord) + '</text>' +
        '<g transform="translate(10 9)"><rect class="lc-hud-win" width="40" height="40" rx="7"/><g class="lc-hud-roll" clip-path="url(#lc-win)"></g></g>' +
        '<text class="lc-hud-n" x="62" y="38"></text><rect class="lc-hud-track" x="62" y="45" width="164" height="5" rx="2.5"/><rect class="lc-hud-fill" x="62" y="45" width="164" height="5" rx="2.5" fill="url(#lc-bar)"/></g>';
      return h + "</svg>";
    }
    function panels() {
      var tabs = "", body = "";
      T.stages.forEach(function (s, i) {
        tabs += '<button class="tabs__tab" role="tab" type="button" id="jt-' + i + '" aria-controls="jp-' + i + '" aria-selected="' + (i === 0) + '" tabindex="' + (i === 0 ? 0 : -1) + '"><span class="lc-g" aria-hidden="true">' + GEAR[i] + "</span>" + E(s.short || s.tab) + "</button>";
        body += '<div class="tabs__panel hud" role="tabpanel" id="jp-' + i + '" aria-labelledby="jt-' + i + '" tabindex="0"' + (i ? " hidden" : "") + '><div class="journey__body">' +
          '<div class="stack"><p class="note">' + E(s.tab) + "</p><h3>" + E(s.h) + '</h3><p class="muted">' + E(s.p) + '</p><ul class="ticks">' + s.ticks.map(function (t) { return "<li>" + E(t) + "</li>"; }).join("") + "</ul></div>" +
          '<dl class="handoff"><div><dt>' + E(T.nextLabel) + "</dt><dd>" + E(s.next) + "</dd></div><div><dt>" + E(T.routesLabel) + '</dt><dd class="routes routes--chain">' +
          s.routes.map(function (r) { return '<span class="route">' + r.map(function (x) { return "<b>" + E(x) + "</b>"; }).join('<i aria-hidden="true">→</i>') + "</span>"; }).join("") + "</dd></div></dl></div></div>";
      });
      return '<div class="tabs__list" role="tablist" aria-label="' + E(T.tablist) + '">' + tabs + '</div><div class="lc-panels">' + body + "</div>";
    }

    doc.querySelectorAll("[data-circuit]").forEach(function (wrap) {
      var tail = wrap.lastElementChild && wrap.lastElementChild.tagName === "P" ? wrap.lastElementChild.outerHTML : "";
      wrap.removeAttribute("data-circuit"); wrap.removeAttribute("data-tabs"); wrap.setAttribute("data-lc", "");
      wrap.innerHTML = '<div class="lc-circuit">' + svg() + '</div><p class="lc-status" data-no-tc aria-live="polite"></p>' + panels() + tail;
      var root = wrap.querySelector(".lc-svg"), tabs = [].slice.call(wrap.querySelectorAll('[role="tab"]'));
      var nodes = [].slice.call(wrap.querySelectorAll(".lc-node")), edges = [].slice.call(wrap.querySelectorAll(".lc-edge"));
      var hlG = wrap.querySelector(".lc-hl"), fxG = wrap.querySelector(".lc-fx"), status = wrap.querySelector(".lc-status");
      var roll = wrap.querySelector(".lc-hud-roll"), hudN = wrap.querySelector(".lc-hud-n"), fill = wrap.querySelector(".lc-hud-fill"), hudBg = wrap.querySelector(".lc-hud-bg");
      var nums = function (a) { return a.split(" ").map(Number); };
      edges.forEach(function (ed) { var h = doc.createElementNS(NS, "path"); h.setAttribute("d", ed.getAttribute("d")); h.setAttribute("class", "lc-trace"); hlG.appendChild(h); ed._hl = h; ed._from = nums(ed.getAttribute("data-from")); ed._to = nums(ed.getAttribute("data-to")); });
      /* the gear readout is as wide as its longest stage name, so it never resizes */
      var hudName = function (i) { return T.hud[i]; };
      var cur = null;
      function fit() {
        try { var wMax = 0; for (var k = 0; k < 10; k++) { hudN.textContent = hudName(k); wMax = Math.max(wMax, hudN.getComputedTextLength()); }
          if (!wMax) return; var W = Math.ceil(62 + wMax + 16); hudBg.setAttribute("width", W); wrap.querySelectorAll(".lc-hud-track, .lc-hud-fill").forEach(function (r) { r.setAttribute("width", W - 76); });
          if (cur != null) hudN.textContent = hudName(cur); } catch (x) {}
      }
      fit(); if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(fit);
      function shift(on) {
        hudN.textContent = hudName(on); fill.style.transform = "scaleX(" + LVL[on] / 100 + ")";
        if (cur === on) return; cur = on;
        var old = roll.querySelector(".lc-hud-d:not(.out)"), t = doc.createElementNS(NS, "text");
        t.setAttribute("class", "lc-hud-d" + (reduce ? "" : " in")); t.setAttribute("x", 20); t.setAttribute("y", 28); t.setAttribute("text-anchor", "middle"); t.textContent = GEAR[on]; roll.appendChild(t);
        if (old) { if (reduce) old.remove(); else { old.classList.add("out"); setTimeout(function () { old.remove(); }, 450); } }
        if (!reduce) requestAnimationFrame(function () { requestAnimationFrame(function () { t.classList.remove("in"); }); });
      }
      var raf = 0, visible = !("IntersectionObserver" in window);
      function fx(on) {
        cancelAnimationFrame(raf); fxG.textContent = "";
        if (reduce || !visible || !root.getBoundingClientRect().width) return;
        var p = POS[on], s = doc.createElementNS(NS, "circle"), runs = [];
        s.setAttribute("cx", p[0]); s.setAttribute("cy", p[1]); s.setAttribute("r", R[on]); s.setAttribute("class", "lc-shock" + (on === 9 ? " green" : "")); fxG.appendChild(s);
        edges.forEach(function (ed, k) {
          var live = on !== 9 && ed._from.indexOf(on) > -1, inn = on === 9 && (ed._to.indexOf(9) > -1 || ed._to.indexOf(8) > -1);
          if (!live && !inn) return;
          var len = ed.getTotalLength(), a = ed.getPointAtLength(0), b = ed.getPointAtLength(len), q = inn ? POS[9] : POS[on];
          var nearA = Math.hypot(a.x - q[0], a.y - q[1]) < Math.hypot(b.x - q[0], b.y - q[1]);
          var dots = [0, 1, 2].map(function (j) { var c = doc.createElementNS(NS, "circle"); c.setAttribute("r", j ? 3 - j * 0.6 : 4.5); c.setAttribute("class", "lc-comet" + (inn ? " green" : "") + (j ? " tail" : "")); c.style.opacity = 0; fxG.appendChild(c); return c; });
          runs.push({ ed: ed, len: len, rev: inn ? nearA : !nearA, dots: dots, dur: Math.max(700, len / 0.26), delay: 250 + (k % 3) * 120 });
        });
        var t0 = performance.now();
        (function tick(now) {
          runs.forEach(function (r) {
            var t = now - t0 - r.delay; if (t < 0) return;
            var u = (t % (r.dur + 500)) / r.dur;
            r.dots.forEach(function (c, j) {
              var v = u - j * 0.035; if (v < 0 || v > 1) { c.style.opacity = 0; return; }
              var e = v < .5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2, pt = r.ed.getPointAtLength((r.rev ? 1 - e : e) * r.len);
              c.setAttribute("cx", pt.x); c.setAttribute("cy", pt.y); c.style.opacity = "";
            });
          });
          raf = requestAnimationFrame(tick);
        })(t0);
      }
      function paint(on) {
        var next = {};
        edges.forEach(function (ed) {
          var live = on !== 9 && ed._from.indexOf(on) > -1, inn = on === 9 && (ed._to.indexOf(9) > -1 || ed._to.indexOf(8) > -1);
          ed._hl.classList.toggle("is-live", live); ed._hl.classList.toggle("is-in", inn);
          if (live) ed._to.forEach(function (t) { if (t !== on) next[t] = 1; });
        });
        nodes.forEach(function (n, i) { n.classList.toggle("is-on", i === on); n.classList.toggle("is-next", !!next[i]); });
        var goes = Object.keys(next).map(function (k) { return GEAR[k] + " " + T.names[k]; }), list = goes.length > 1 ? goes.slice(0, -1).join(", ") + T.and + goes[goes.length - 1] : goes[0];
        status.innerHTML = T.extra[on] || "<b>" + GEAR[on] + " · " + E(T.names[on]) + "</b> · " + E(T.goes) + " " + E(list) + ".";
        shift(on); fx(on);
      }
      function select(i, focus) {
        tabs.forEach(function (t, k) { var on = k === i; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; var pn = doc.getElementById(t.getAttribute("aria-controls")); if (pn) pn.hidden = !on; });
        if (focus) tabs[i].focus();
        paint(i);
      }
      tabs.forEach(function (t, i) {
        t.addEventListener("click", function () { select(i, false); track("product_explore", { label: T.stages[i].tab, group: "lifecycle" }); });
        t.addEventListener("keydown", function (e) {
          var n = null;
          if (e.key === "ArrowRight") n = (i + 1) % tabs.length;
          if (e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
          if (e.key === "Home") n = 0;
          if (e.key === "End") n = tabs.length - 1;
          if (n !== null) { e.preventDefault(); select(n, true); }
        });
      });
      nodes.forEach(function (n, i) {
        var go = function () { if (i < 7) select(i, false); else paint(i); };
        n.addEventListener("click", go);
        n.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
      });
      /* the light runs only while the diagram is on screen */
      paint(0);
      if (!visible) new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible) fx(cur == null ? 0 : cur); else { cancelAnimationFrame(raf); fxG.textContent = ""; }
      }, { threshold: 0.25 }).observe(root);
    });
  })();
  /* ---- end lifecycle journey v5 ---- */
  /* ---- workflow demo: steps highlight one pane at a time; all content is in the DOM at rest ---- */
  doc.querySelectorAll("[data-flow]").forEach(function (flow) {
    var steps = Array.prototype.slice.call(flow.querySelectorAll(".flow__step"));
    var panes = Array.prototype.slice.call(flow.querySelectorAll(".flow__pane"));
    var play = flow.querySelector("[data-flow-play]");
    var timer = null, idx = -1;
    function show(i) {
      idx = i;
      flow.classList.toggle("is-live", i >= 0);
      steps.forEach(function (s, n) { s.setAttribute("aria-pressed", String(n === i)); });
      panes.forEach(function (p, n) { p.classList.toggle("is-on", n === i); });
    }
    function stop() { clearInterval(timer); timer = null; if (play) play.textContent = L("Play walkthrough", "Reproducir recorrido"); }
    steps.forEach(function (s, n) { s.addEventListener("click", function () { stop(); show(idx === n ? -1 : n); }); });
    if (play) {
      if (reduceMotion) { play.hidden = true; return; }
      play.addEventListener("click", function () {
        if (timer) { stop(); show(-1); return; }
        play.textContent = L("Stop", "Detener");
        show(0);
        track("product_explore", { label: "workflow walkthrough" });
        timer = setInterval(function () {
          if (idx >= panes.length - 1) { stop(); show(-1); } else show(idx + 1);
        }, 2600);
      });
    }
  });

  var y = doc.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());
})();

/* ===================== v2: instrument layer ===================== */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- reviews widget: hide the fallback once Elfsight has rendered ---- */
  doc.querySelectorAll("[data-reviews]").forEach(function (box) {
    var w = box.querySelector('[class^="elfsight-app-"], [data-boast-component]');
    if (!w || !window.MutationObserver) return;
    new MutationObserver(function () { if (w.children.length) box.classList.add("is-loaded"); }).observe(w, { childList: true, subtree: true });
  });

  /* ---- pointer spotlight ---- */
  doc.addEventListener("pointermove", function (e) {
    var el = e.target.closest && e.target.closest(".spot");
    if (!el) return;
    var r = el.getBoundingClientRect();
    el.style.setProperty("--mx", (e.clientX - r.left) + "px");
    el.style.setProperty("--my", (e.clientY - r.top) + "px");
  }, { passive: true });

  /* ---- gear HUD + rev bar: scrolling the page shifts gears ---- */
  var hud = doc.querySelector(".gearhud");
  var bar = doc.createElement("div"); bar.className = "revbar"; bar.setAttribute("aria-hidden", "true"); doc.body.appendChild(bar);
  var colors = ["#ed2024", "#ea8c1c", "#ea8c1c", "#fcaf17", "#fcaf17", "#43b749"];
  var gears = hud ? hud.querySelectorAll("li") : [];
  function onScroll() {
    var max = root.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    bar.style.setProperty("--scroll", (p * 100).toFixed(1) + "%");
    if (!hud) return;
    var g = Math.min(5, Math.floor(p * 6));
    gears.forEach(function (li, i) { li.classList.toggle("is-on", i === g); li.classList.toggle("is-past", i < g); });
    hud.style.setProperty("--gear-c", colors[g]);
    hud.style.setProperty("--rev", (((p * 6) % 1) * 100 || (p === 1 ? 100 : 0)).toFixed(0) + "%");
  }
  window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onScroll); onScroll();

  /* ---- hero tachometer (canvas): the brand gauge, drawn large behind the command centre ---- */
  var cv = doc.getElementById("tach");
  if (cv && cv.getContext) {
    var needleColor = getComputedStyle(cv).color;
    doc.addEventListener("themechange", function () { needleColor = getComputedStyle(cv).color; if (reduce) draw(); });
    var ctx = cv.getContext("2d"), cur = 0.04, target = 0.8, raf = null, t0 = performance.now();
    var A0 = Math.PI * 0.82, SWEEP = Math.PI * 1.36; /* gauge opens downward like the logo */
    function lerpColor(p) {
      var stops = [[237, 32, 36], [234, 140, 28], [252, 175, 23], [67, 183, 73]];
      var x = p * 3, i = Math.min(2, Math.floor(x)), f = x - i, a = stops[i], b = stops[i + 1];
      return [0, 1, 2].map(function (k) { return Math.round(a[k] + (b[k] - a[k]) * f); }).join(",");
    }
    function draw() {
      var dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      var cx = w / 2, cy = h / 2, R = w * 0.47, N = 96;
      for (var i = 0; i <= N; i++) {
        var p = i / N, a = A0 + SWEEP * p, major = i % 8 === 0, lit = p <= cur;
        var r1 = R - (major ? 30 : 16), c = Math.cos(a), s = Math.sin(a);
        ctx.beginPath(); ctx.moveTo(cx + c * r1, cy + s * r1); ctx.lineTo(cx + c * R, cy + s * R);
        ctx.lineWidth = major ? 3 : 1.5;
        ctx.strokeStyle = "rgba(" + lerpColor(p) + "," + (lit ? (major ? 0.95 : 0.7) : 0.16) + ")";
        ctx.stroke();
      }
      /* inner hairline arcs */
      [0.78, 0.62].forEach(function (k, n) { ctx.beginPath(); ctx.arc(cx, cy, R * k, A0, A0 + SWEEP); ctx.lineWidth = 1; ctx.globalAlpha = n ? 0.07 : 0.12; ctx.strokeStyle = needleColor; ctx.stroke(); ctx.globalAlpha = 1; });
      /* lit arc + needle */
      var an = A0 + SWEEP * cur, g = ctx.createLinearGradient(cx - R, 0, cx + R, 0);
      g.addColorStop(0, "rgba(237,32,36,0.0)"); g.addColorStop(1, "rgba(67,183,73,0.55)");
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.9, A0, an); ctx.lineWidth = 2; ctx.strokeStyle = g; ctx.stroke();
      ctx.save(); ctx.shadowColor = "rgba(" + lerpColor(cur) + ",0.9)"; ctx.shadowBlur = 22;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(an) * R * 0.56, cy + Math.sin(an) * R * 0.56); ctx.lineTo(cx + Math.cos(an) * R * 1.02, cy + Math.sin(an) * R * 1.02);
      ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.strokeStyle = needleColor; ctx.stroke(); ctx.restore();
    }
    function tick(now) {
      var idle = Math.sin((now - t0) / 900) * 0.012;
      cur += (target + idle - cur) * 0.045;
      draw(); raf = requestAnimationFrame(tick);
    }
    if (reduce) { cur = target; draw(); window.addEventListener("resize", draw); }
    else {
      var hero = cv.closest(".hero");
      hero.addEventListener("pointermove", function (e) { var r = hero.getBoundingClientRect(); target = 0.55 + 0.42 * ((e.clientX - r.left) / r.width); }, { passive: true });
      hero.addEventListener("pointerleave", function () { target = 0.8; });
      if (window.IntersectionObserver) new IntersectionObserver(function (en) { if (en[0].isIntersecting) { if (!raf) raf = requestAnimationFrame(tick); } else { cancelAnimationFrame(raf); raf = null; } }).observe(cv);
      else raf = requestAnimationFrame(tick);
    }
  }
})();


/* ===================== v3: theme toggle + scroll reveals ===================== */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;

  /* ---- theme: the head script sets the initial value; this handles the switch ---- */
  var buttons = doc.querySelectorAll("[data-theme-toggle]");
  var meta = doc.querySelector('meta[name="theme-color"]');
  function paint(t) {
    buttons.forEach(function (b) { b.setAttribute("aria-label", t === "light" ? (root.lang === "es" ? "Cambiar a modo oscuro" : "Switch to dark mode") : (root.lang === "es" ? "Cambiar a modo claro" : "Switch to light mode")); });
    if (meta) meta.setAttribute("content", t === "light" ? "#ffffff" : "#070b11");
    doc.dispatchEvent(new Event("themechange"));
  }
  function current() { return root.getAttribute("data-theme") === "light" ? "light" : "dark"; }
  buttons.forEach(function (b) {
    b.addEventListener("click", function () {
      var t = current() === "light" ? "dark" : "light";
      root.setAttribute("data-theme", t);
      try { localStorage.setItem("kd-theme", t); } catch (e) {}
      paint(t);
      (window.dataLayer = window.dataLayer || []).push({ event: "theme_switch", theme: t });
    });
  });
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: light)");
    var follow = function (e) { var s = null; try { s = localStorage.getItem("kd-theme"); } catch (x) {} if (!s) { root.setAttribute("data-theme", e.matches ? "light" : "dark"); paint(current()); } };
    if (mq.addEventListener) mq.addEventListener("change", follow);
  }
  if (window.MutationObserver) new MutationObserver(function () { paint(current()); }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  buttons.forEach(function (b) { b.setAttribute("aria-label", current() === "light" ? (root.lang === "es" ? "Cambiar a modo oscuro" : "Switch to dark mode") : (root.lang === "es" ? "Cambiar a modo claro" : "Switch to light mode")); });

  /* ---- scroll reveals: only elements below the first screen are hidden, and only when motion is welcome ---- */
  if (!root.classList.contains("anim") || !("IntersectionObserver" in window)) return;
  var sel = ".head, .pillars > li, .kq > li, .tool, .triad__card, .bracket, .model, .offer, .feature, .steps > li, .person, .post-row, .post-feature, .guide, .spec, .dash, .flow, .circuit, .compare-cols, .table-scroll, .support__chat, .kb > li, .faq, .contact-list, .form, .booking, .reviews, .device, .hub";
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
  var vh = window.innerHeight;
  doc.querySelectorAll(sel).forEach(function (el) {
    if (el.closest(".hero, .phead, [hidden], dialog")) return;
    if (el.getBoundingClientRect().top < vh) return; /* already on screen: leave it alone, no flash */
    var i = 0, s = el;
    while ((s = s.previousElementSibling) && i < 5) i++;
    el.style.setProperty("--d", (i * 70) + "ms");
    el.classList.add("rv");
    io.observe(el);
  });
})();

/* Webflow-hosted pages only: language toggle and related posts on articles. */
(function () {
  var d = document, r = d.documentElement;
  if (!r.hasAttribute("data-wf-site")) return;
  var path = location.pathname, es = /^\/es(\/|$)/.test(path), bare = path.replace(/^\/es(?=\/|$)/, "") || "/";
  var tg = d.querySelector(".lang-toggle"), th = d.querySelector(".site-header .theme-toggle");
  function wire() {
    tg.setAttribute("href", (es ? bare : "/es" + (bare === "/" ? "" : bare)) + location.search);
    tg.addEventListener("click", function () { try { localStorage.setItem("kd-lang", es ? "en" : "es"); } catch (e) {} });
  }
  function add() {
    if (tg || !th) return;
    tg = d.createElement("a"); tg.className = "lang-toggle"; tg.innerHTML = "<b>ES</b>";
    tg.setAttribute("hreflang", "es"); tg.setAttribute("lang", "es"); tg.setAttribute("aria-label", "Ver esta página en español");
    th.parentNode.insertBefore(tg, th); wire();
  }
  if (tg) wire();
  else if (d.querySelector('link[rel="alternate"][hreflang^="es"]')) add();
  else { /* show the toggle only once the Spanish locale is published */
    var ok = null; try { ok = sessionStorage.getItem("kd-es-ok"); } catch (e) {}
    if (ok === "1") add();
    else if (ok !== "0" && window.fetch) fetch("/es", { method: "HEAD" }).then(function (x) { try { sessionStorage.setItem("kd-es-ok", x.ok ? "1" : "0"); } catch (e) {} if (x.ok) add(); }).catch(function () {});
  }
  if (es) {
    var T = { "Home": "Inicio", "Notes from the ": "Notas desde el ", "operator's seat": "asiento del operador", "Practical writing on CRMs, KPI tracking, automation and AI for real estate investors and the teams who run their pipelines.": "Contenido práctico sobre CRM, seguimiento de KPI, automatización e IA para inversionistas inmobiliarios y los equipos que operan sus pipelines.", "All posts": "Todas las publicaciones", "By": "Por", "Next": "Siguiente", "Previous": "Anterior" };
    var w = d.createTreeWalker(d.querySelector("main") || d.body, 4, null), n;
    while ((n = w.nextNode())) { var k = n.nodeValue.replace(/^\s+|\s+$/g, ""), raw = n.nodeValue; if (T[raw]) n.nodeValue = T[raw]; else if (T[k]) n.nodeValue = raw.replace(k, T[k]); }
  }
  var m = bare.match(/^\/post\/([^\/]+)\/?$/), main = d.querySelector("main.is-blog") || d.getElementById("main");
  if (!m || !main || !window.KD_POSTS_URL) return;
  var pre = es ? "/es" : "", L = es ? ["Sigue leyendo", "Artículos relacionados", "Todos los artículos de ", "Parte de "] : ["Keep reading", "Related articles", "All articles in ", "Part of "];
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmt(x) { try { return new Date(x + "T12:00:00").toLocaleDateString(es ? "es" : "en-US", { year: "numeric", month: "long", day: "numeric" }); } catch (e) { return x; } }
  window.KD_POSTS_READY = function () {
    var P = window.KD_POSTS || {}, me = P[m[1]], keys = Object.keys(P), rel = me ? me.r : [];
    if (!rel || !rel.length) rel = keys.filter(function (k) { return k !== m[1]; }).sort(function (a, b) { return P[a].d < P[b].d ? 1 : -1; }).slice(0, 3);
    var rows = rel.filter(function (k) { return P[k]; }).map(function (k) { var p = P[k];
      return '<a class="post-row" href="' + pre + "/post/" + k + '"><div class="post-row__meta"><b>' + esc(p.n) + "</b><span>" + fmt(p.d) + '</span><span class="typechip">' + esc(p.y) + "</span></div><div><h3>" + esc(p.t) + "</h3><p>" + esc(p.s) + '</p></div><span class="post-row__go" aria-hidden="true">→</span></a>'; }).join("");
    if (!rows) return;
    var s = d.createElement("section"); s.className = "section section--tight kd-related";
    s.innerHTML = '<div class="wrap">' + (me ? '<aside class="hub tone-crm"><p class="note">' + L[3] + esc(me.n) + '</p><p><a class="link arrow" href="' + pre + "/blog-category/" + me.c + '">' + L[2] + esc(me.n) + "</a></p></aside>" : "") +
      '<div class="head"><p class="eyebrow">' + L[0] + "</p><h2>" + L[1] + '</h2></div><div class="posts">' + rows + "</div></div>";
    main.appendChild(s);
  };
  var sc = d.createElement("script"); sc.src = window.KD_POSTS_URL; sc.async = true; d.head.appendChild(sc);
})();

/* ===================== v3: owner fixes (2026-11-17) ===================== */
(function () {
  var d = document, r = d.documentElement, es = r.lang === "es";
  /* client logins and CRM status open in a new tab; status points at the HighLevel status page */
  d.querySelectorAll("a[href]").forEach(function (a) {
    if (/pulsetic\.com\/status/.test(a.getAttribute("href"))) a.href = "https://status.gohighlevel.com/";
    if (/^https:\/\/(crm\.kpidriver\.com|kpidriver\.ai|status\.gohighlevel\.com)/.test(a.href)) { a.target = "_blank"; a.rel = "noopener"; }
  });
  /* services menu: hover where the full nav is visible, tap the arrow on phones */
  var tg = d.querySelector(".nav-toggle"), item = d.querySelector(".nav__item--has-menu"), menu = d.getElementById("services-menu");
  var hov = window.matchMedia && matchMedia("(hover: hover)");
  function desk() { return !!(hov && hov.matches && tg && getComputedStyle(tg).display === "none"); }
  function mark() { r.classList.toggle("nav-hover", desk()); }
  mark(); addEventListener("resize", mark);
  if (item && menu) {
    var t;
    item.addEventListener("mouseenter", function () { if (!desk()) return; clearTimeout(t); menu.hidden = false; });
    item.addEventListener("mouseleave", function () { if (!desk()) return; t = setTimeout(function () { menu.hidden = true; }, 160); });
  }
  /* close the client login menu after choosing or clicking elsewhere */
  d.addEventListener("click", function (e) { d.querySelectorAll("details.login[open]").forEach(function (x) { if (!x.contains(e.target) || e.target.closest("a")) x.open = false; }); });
  /* client login opens on hover too (devices with a mouse) */
  d.querySelectorAll("details.login").forEach(function (x) {
    var lt;
    x.addEventListener("mouseenter", function () { if (!(hov && hov.matches)) return; clearTimeout(lt); x.open = true; });
    x.addEventListener("mouseleave", function () { if (!(hov && hov.matches)) return; lt = setTimeout(function () { x.open = false; }, 160); });
  });
  /* reviews: load the Boast and Elfsight widgets only when the reviews block comes near the screen
     (they weigh ~1 MB), then hide the fallback note once they have rendered (Boast replaces its placeholder) */
  var revs = d.querySelectorAll("[data-reviews]");
  if (revs.length) {
    var loaded = false, loadReviews = function () {
      if (loaded) return; loaded = true;
      [["https://widgets.boast.io/current/components.js", "[data-boast-component]"], ["https://static.elfsight.com/platform/platform.js", "[class^='elfsight-app-']"]].forEach(function (x) {
        if (!d.querySelector(x[1]) || d.querySelector("script[data-kd-rev='" + x[0] + "']")) return;
        var s = d.createElement("script"); s.src = x[0]; s.async = true; s.setAttribute("data-kd-rev", x[0]); d.body.appendChild(s);
      });
      var n = 0, iv = setInterval(function () {
        d.querySelectorAll("[data-reviews]:not(.is-loaded)").forEach(function (b) { if (b.querySelector("boast-display-widget .swiper-slide, [class*='eapps-'], [class^='elfsight-app-'] > *")) b.classList.add("is-loaded"); });
        if (++n > 60 || !d.querySelector("[data-reviews]:not(.is-loaded)")) clearInterval(iv);
      }, 500);
    };
    if (!("IntersectionObserver" in window)) loadReviews();
    else {
      var rio = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { rio.disconnect(); loadReviews(); } }, { rootMargin: "900px 0px" });
      revs.forEach(function (b) { rio.observe(b); });
    }
  }
})();

/* ===================== v4: owner fixes (2026-11-17, round 3) ===================== */
(function () {
  var d = document, r = d.documentElement, es = r.lang === "es";

  /* current page in the main menu (one shared header for every page, EN + ES): Services covers its three pages,
     Blog covers posts and categories */
  var here = location.pathname.replace(/^\/es(?=\/|$)/, "").replace(/\/$/, "") || "/";
  if (/^\/(post|blog-category)\//.test(here)) here = "/blog";
  if (/^\/services\//.test(here)) here = "/services";
  d.querySelectorAll(".site-header .nav__link").forEach(function (a) {
    var h = (a.getAttribute("href") || "").replace(/^\/es(?=\/|$)/, "").replace(/\/$/, "") || "/";
    if (h === here) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });

  /* members log-in form: the show-password toggle is an icon-only link; give it a name */
  d.querySelectorAll("a.show-password").forEach(function (a) { a.setAttribute("role", "button"); a.setAttribute("aria-label", es ? "Mostrar contrase\u00f1a" : "Show password"); });

  /* scrollbar width of this device (0 where scrollbars overlay the content); CSS uses it to push the
     scheduler's own scrollbar just outside the visible edge of the booking pop-up */
  var probe = d.createElement("div");
  probe.style.cssText = "position:absolute;top:-9999px;left:-9999px;width:100px;height:100px;overflow:scroll";
  d.body.appendChild(probe);
  var sbw = probe.offsetWidth - probe.clientWidth;
  probe.remove();
  if (sbw > 0) r.style.setProperty("--kd-sbw", sbw + "px");

  /* gear HUD doubles as the page scroller (the native scrollbar is hidden): click a gear to jump there */
  var hud = d.querySelector(".gearhud");
  if (hud) {
    var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    hud.querySelectorAll("li").forEach(function (li, i) {
      li.title = es ? "Ir a la marcha " + (i + 1) : "Shift to gear " + (i + 1);
      li.addEventListener("click", function () {
        var max = r.scrollHeight - innerHeight;
        window.scrollTo({ top: i === 5 ? max : Math.ceil(max * i / 6) + 2, behavior: still ? "auto" : "smooth" });
      });
    });
  }

  /* Title Case for all running text (English only), the brand's style: every word capitalised except
     short articles, conjunctions and prepositions mid-sentence. Blog post content and excerpts, legal text,
     customer reviews, chat/transcript bubbles, quotes and typed text are left as written. */
  if (es || !/^en/i.test(r.lang || "en")) return;
  var SMALL = /^(a|an|and|as|at|but|by|for|from|in|into|nor|of|on|or|per|so|than|the|to|via|vs\.?|with)$/i;
  var PHRASAL = /\b(Log|Logged|Logging|Sign|Signed|Signing|Check|Checking|Checked|Opt|Plug)(\s+)(in|on)\b/g;
  var SKIP = ".is-blog,.kd-post-1,.w-richtext,.legal,.bubble,.transcript__say,.reviews,boast-display-widget,q,blockquote,.keep-case,.field__err,.form__status,.post-row,.post-feature,.post-card,.kd-post-card,.blog-list,.blog_item,.card-blog,input,textarea,select,option,script,style,noscript,code,pre,svg,iframe,[data-no-tc]";
  var disp = new WeakMap();
  function blockOf(e) {
    while (e && e !== d.body) {
      var v = disp.get(e); if (v === undefined) { v = getComputedStyle(e).display; disp.set(e, v); }
      if (v !== "inline" && v !== "contents") return e;
      e = e.parentElement;
    }
    return d.body;
  }
  function cap(h) { return h.replace(/^([^A-Za-z]*)([a-z])/, function (m, a, c) { return a + c.toUpperCase(); }); }
  function word(w, force) {
    if (/[A-Za-z][\u2014\u2013][A-Za-z]/.test(w)) {                                 /* tools\u2014they: each side is a word */
      return w.split(/([\u2014\u2013])/).map(function (seg, i) { return i % 2 ? seg : word(seg, i === 0 ? force : true); }).join("");
    }
    if (/[@\/]|\.(com|ai|io|net|org)\b|^\(?\+?\d|^www\./i.test(w)) return w;     /* emails, links, numbers */
    if (/[.!?:]["')\u201d]*$/.test(w)) force = true;                                 /* last word of a sentence */
    var hs = w.split("-");
    return hs.map(function (h, i) {
      if (/[A-Z]/.test(h.slice(1)) || !/[a-z]/.test(h)) return h;                    /* CRM, AI, iMessage, KPI DRIVER */
      var core = h.replace(/^[^A-Za-z]+|[^A-Za-z']+$/g, "");
      var small = SMALL.test(core);
      if (hs.length === 1) return small && !force ? h.toLowerCase() : cap(h);
      return i > 0 && small ? h.toLowerCase() : cap(h);                               /* In-House, Pay-as-You-Go */
    }).join("-");
  }
  function breaks(prev) { return !prev || /[.!?:\u2014\u2013]["')\u201d]*$/.test(prev) || /^[\u00b7|\u2022\u2014\u2013-]$/.test(prev); }
  function run() {
    var w = d.createTreeWalker(d.body, NodeFilter.SHOW_TEXT, { acceptNode: function (n) {
      var p = n.parentElement;
      return !p || !n.textContent.trim() || p.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    } });
    var last = null, prev = "", n;
    while ((n = w.nextNode())) {
      var blk = blockOf(n.parentElement);
      if (blk !== last) { prev = ""; last = blk; }
      var parts = n.textContent.split(/(\s+)/), changed = false;
      for (var k = 0; k < parts.length; k++) {
        var t = parts[k]; if (!t || !t.trim()) continue;
        var v = word(t, breaks(prev));
        if (v !== t) { parts[k] = v; changed = true; }
        prev = v;
      }
      var out = parts.join("").replace(PHRASAL, function (m, a, b, c) { return a + b + c.charAt(0).toUpperCase() + c.slice(1); });  /* Log In, Sign In */
      if (changed || out !== n.textContent) n.textContent = out;
    }
  }
  run();
  addEventListener("load", run);                                        /* late content: related posts, menus */
})();
