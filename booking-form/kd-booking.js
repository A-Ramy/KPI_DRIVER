/* =====================================================================
   KPI DRIVER · native booking form
   One form + one calendar for the whole site. Every booking carries
   where it came from (booking_source = "<Page> – <Placement>").

   Drop-in: any existing "Book a Discovery Call" link (a[data-book]) or
   any element with [data-kd-book] opens the form in a dialog. An element
   with [data-kd-booking] renders the form inline (booking page), and
   [data-kd-contact] renders the contact form (same design, no calendar).

   Talks to two n8n webhooks (see booking-form/n8n):
     GET  slotsUrl?start=<ms>&end=<ms>&timezone=<IANA>  → HighLevel free-slots map
     POST bookUrl  (JSON payload, see README)            → { ok, appointment } | { ok:false, code }
   With mock:true it runs on sample availability and never sends anything.
   ===================================================================== */
(function () {
  "use strict";

  var CFG = Object.assign({
    slotsUrl: "",                      // n8n webhook: free slots
    bookUrl: "",                       // n8n webhook: create booking
    contactUrl: "",                    // HighLevel workflow "Inbound Webhook" URL (contact form posts straight to it)
    contactCampaignPrefix: "Contact Us (SEO) ",
    contactConsentText: "",            // defaults to the booking form's consent text (see README)
    mock: true,                        // sample availability, no network
    durationMin: 45,                   // the calendar's slot length
    campaignPrefix: "Business Discovery (SEO) ",
    sourceSeparator: " – ",
    thankYouUrl: "",                   // optional redirect after booking
    lang: (document.documentElement.lang || "en").slice(0, 2)
  }, window.KD_BOOKING_CONFIG || {});

  /* ---------- questions (same as the HighLevel form; ids = HighLevel custom field ids) ---------- */
  var CONSENT_TEXT = "I Consent to Receive SMS Notifications, Alerts & Occasional Marketing Communication from KPI DRIVER, LLC. Message frequency varies. Message & data rates may apply. Text HELP to (786) 822-8188 for assistance. You can reply STOP to unsubscribe at any time.";
  var TZ_FIELD_OPTIONS = ["Eastern Standard Time", "Central Standard Time", "Mountain Standard Time", "Pacific Standard Time", "Alaska Standard Time", "Hawaii-Aleutian Standard Time"];
  var ZERO = "Put 0 if None";

  var STEPS = [
    { key: "time", title: "Pick a time", eyebrow: "Discovery call · " + CFG.durationMin + " min" },
    { key: "you", title: "About you", eyebrow: "Contact & business", fields: [
      { name: "firstName", std: "firstName", label: "First Name", type: "text", req: true, ph: "First Name", auto: "given-name", half: true },
      { name: "lastName", std: "lastName", label: "Last Name", type: "text", req: true, ph: "Last Name", auto: "family-name", half: true },
      { name: "email", std: "email", label: "Business Email", type: "email", req: true, ph: "Email", auto: "email", half: true },
      { name: "phone", std: "phone", label: "Phone", type: "tel", req: true, ph: "Phone", auto: "tel", half: true },
      { name: "businessName", cf: "st1eCAFAHDcgPM4VvtNn", std: "companyName", label: "Business Name", type: "text", req: true, ph: "Business Name", auto: "organization" },
      { name: "address1", std: "address1", label: "Street Address", type: "text", req: true, ph: "Address", auto: "address-line1" },
      { name: "city", std: "city", label: "City", type: "text", ph: "City", auto: "address-level2", third: true },
      { name: "state", std: "state", label: "State", type: "text", ph: "State", auto: "address-level1", third: true },
      { name: "postalCode", std: "postalCode", label: "Postal code", type: "text", ph: "Postal Code", auto: "postal-code", third: true },
      { name: "country", std: "country", label: "Country", type: "country", auto: "country" },
      { name: "niche", cf: "Z8TSBkLl0c3nkOh0d0bj", label: "Business Niche", type: "select", req: true, options: ["Real Estate", "Online Courses", "Other"], half: true },
      { name: "tzField", cf: "h4JApkD7A1meEgqfLJ4v", label: "Time Zone", type: "select", req: true, options: TZ_FIELD_OPTIONS, half: true, hint: "Filled in from the time zone you booked in." },
      { name: "plan", cf: "zntmhqZEVR510izM1Amv", label: "Which Plan Are You Interested In", type: "select", options: ["Enterprise Optimization Suite + AI Agent", "Enterprise Optimization Suite", "Don't Know Yet"] }
    ] },
    { key: "marketing", title: "Your lead flow", eyebrow: "Marketing & lead sources", fields: [
      { name: "outsource", cf: "ARe4MceHNpyuA2cKkIEw", label: "Do You Outsource Your Marketing?", type: "radio", req: true, options: ["Yes (Outsourced Only)", "No (In-House Only)", "Both (In-House & Outsourced)"] },
      { name: "leadSourceCount", cf: "qmkmAZyHzfeRFjkRKQaw", label: "How Many Lead Sources Do You Have?", type: "radio", req: true, options: ["1 - 3", "4 - 6", "7 - 9"], inline: true },
      { name: "leadSources", cf: "UWxeByWt7W4EuIVVAQsm", label: "What Are Your Lead Sources?", type: "checkbox", req: true, options: ["Cold Calling", "SMS", "PPC", "PPL", "Direct Mailer", "SEO", "On-Market", "TV Advertising", "Radio Advertising", "Other"], grid: true },
      { name: "leadEntry", cf: "J1MTiekQt4vbamz8JFee", label: "How Are These Lead Sources Entering Your Business?", type: "checkbox", req: true, options: ["Submitting Forms Directly Into the System (CRM)", "Direct Integration With The Platform", "Submitting Forms Indirectly Via 3rd Party (eg. Zapier)", "Google Sheets", "Manual Entry"] },
      { name: "agentsCold", cf: "u6f3OtUsag2gUpFKEHCy", label: "How Many Agents Do You Have On Cold Calling?", type: "number", ph: ZERO, third: true },
      { name: "agentsSms", cf: "TgvNUU7bOSq4YSB2FS9w", label: "How Many Agents Do You Have On SMS?", type: "number", ph: ZERO, third: true },
      { name: "pplProviders", cf: "xOz64JUSqg9hFWthmar5", label: "How Many PPL Providers Do You Use?", type: "number", ph: ZERO, third: true }
    ] },
    { key: "crm", title: "Your CRM", eyebrow: "Systems & numbers", fields: [
      { name: "needCrm", cf: "QfNSOY8w6fJUpyxW9al1", label: "Do You Need a CRM?", type: "radio", req: true, options: ["Yes", "No"], inline: true, half: true },
      { name: "useCrm", cf: "9aMGEJzyATDb4ZGnPLt7", label: "Do You Use A CRM?", type: "radio", req: true, options: ["Yes", "No"], inline: true, half: true },
      { name: "whichCrm", cf: "rihpUXcXicHdCxEo4CfX", label: "Which CRM Do You Use?", type: "radio", req: true, options: ["GHL", "Podio", "Salesforce", "None", "Other"], inline: true },
      { name: "crmAutomations", cf: "sqX5fTAKqUuNRwdoxaag", label: "Does Your CRM Have Follow Up Automations?", type: "radio", req: true, options: ["Yes", "No"], inline: true, half: true },
      { name: "crmFor", cf: "uclYhjBFIyedqd8xqYwE", label: "What Are You Using Your CRM For?", type: "radio", req: true, options: ["ACQ", "Dispo", "ACQ & Dispo"], inline: true, half: true },
      { name: "salesReps", cf: "VLoxJWATbFZMgMOfBb4P", label: "How Many Sales Representatives Do You Have?", type: "number", ph: ZERO },
      { name: "kpis", cf: "kjvFHgnOa8iVNV7YiiBN", label: "How Do You Measure Your KPIs?", type: "textarea", req: true, ph: "On All Channels" },
      { name: "pnl", cf: "LNdrE1FEgFjbPydSCntV", label: "How Do You Keep Track of Your Profits & Losses?", type: "textarea", req: true, ph: "On All Channels" }
    ] },
    { key: "goals", title: "Your goals", eyebrow: "Last step", fields: [
      { name: "heardFrom", cf: "FohJiIh9tGFKXI02LSUD", label: "How Did You Hear About Us", type: "radio", req: true, options: ["Word of Mouth", "Facebook", "Linkedin", "Instagram", "Event", "Referral", "ChatGPT", "Gemini", "Google Search", "Other"], grid: true },
      { name: "difficulties", cf: "crnTGUSW3StY8VTOqaR2", label: "What Difficulties Are You Facing In Your Business Generally?", type: "textarea", req: true },
      { name: "expectations", cf: "EI2ls6K7uJFe75PmRPaX", label: "What Are Your Expectations With KPI DRIVER?", type: "textarea", req: true },
      { name: "startWhen", cf: "U26ojrxlzQxC1kwAMvki", label: "How Soon Are You Looking To Start?", type: "radio", req: true, options: ["ASAP", "Next Month", "Start of Next Quarter", "No Specific Timeline"], inline: true },
      { name: "smsConsent", label: CONSENT_TEXT, type: "consent", req: true }
    ] }
  ];
  var CAMPAIGN_FIELD = "O5yyMN7TXsWzblxrHUfO";

  /* contact form: same questions as the HighLevel "Contact Us" survey (hs57W9QgapW3WAyGZeZb) */
  var CONTACT_STEPS = [
    { key: "contact", title: "Send a general inquiry", eyebrow: "Contact us", fields: [
      { name: "firstName", std: "firstName", label: "First Name", type: "text", req: true, ph: "First Name", auto: "given-name", half: true },
      { name: "lastName", std: "lastName", label: "Last Name", type: "text", req: true, ph: "Last Name", auto: "family-name", half: true },
      { name: "email", std: "email", label: "Email", type: "email", req: true, ph: "Email", auto: "email", half: true },
      { name: "businessName", key: "business_name", cf: "st1eCAFAHDcgPM4VvtNn", std: "companyName", label: "Business Name", type: "text", req: true, ph: "Business Name", auto: "organization", half: true },
      { name: "plan", key: "which_bundle_are_you_interested_in", cf: "zntmhqZEVR510izM1Amv", label: "Which Bundle Are You Interested In", type: "select", req: true, options: ["Enterprise Optimization Suite + AI Agent", "Enterprise Optimization Suite", "Don't Know Yet"] },
      { name: "message", key: "your_message", cf: "2qGuyylBHmeIFy4ZQITo", label: "Your Message", type: "textarea", ph: "Your Message" },
      { name: "smsConsent", label: CFG.contactConsentText || CONSENT_TEXT, type: "consent", req: true }
    ] }
  ];

  /* ---------- where the booking came from ---------- */
  var PAGE_NAMES = {
    "/": "Home", "/services": "Services", "/services/crm": "CRM", "/services/ai-suite": "AI Suite",
    "/services/ai-agent": "AI Agent", "/our-team": "Our Team", "/contact-us": "Contact Us",
    "/book-discovery-call": "Book a Discovery Call", "/thank-you": "Thank You", "/blog": "Blog",
    "/policies/privacy-policy": "Privacy Policy", "/policies/terms-conditions": "Terms & Conditions"
  };
  function titleCase(s) {
    return String(s || "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim()
      .replace(/\b(crm|ai|cta|seo|ppc)\b/gi, function (w) { return w.toUpperCase(); })
      .replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); });
  }
  function pageName() {
    var path = location.pathname.replace(/\/index\.html$/, "/").replace(/\.html$/, "").replace(/\/+$/, "") || "/";
    var es = /^\/es(\/|$)/.test(path);
    if (es) path = path.replace(/^\/es/, "") || "/";
    var name = PAGE_NAMES[path];
    if (!name && /^\/blog\//.test(path)) name = "Blog: " + titleCase(path.split("/").pop());
    if (!name) name = (document.title.split(/[|—–]/)[0] || "").trim() || path;
    return es ? name + " (ES)" : name;
  }
  function sourceFrom(el) {
    var explicit = el && (el.getAttribute("data-source") || el.getAttribute("data-kd-booking-source"));
    if (explicit) return explicit;
    var place = el && (el.getAttribute("data-label") || el.getAttribute("data-placement"));
    if (!place && el && el.closest) {
      if (el.closest("header, .site-header")) place = "header";
      else if (el.closest("footer, .site-footer")) place = "footer";
    }
    var page = pageName(), label = titleCase(place || "Link").split(" ");
    // "crm hero" on the CRM page reads "CRM – Hero", not "CRM – CRM Hero"
    var last = page.replace(/\s*\(ES\)$/, "").split(/[\s:]+/).pop().toLowerCase();
    if (label.length > 1 && label[0].toLowerCase() === last) label.shift();
    return page + CFG.sourceSeparator + label.join(" ");
  }
  function attribution() {
    var q = new URLSearchParams(location.search), a = {};
    var keep = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "msclkid"];
    var stored = {}; try { stored = JSON.parse(sessionStorage.getItem("kd-attrib") || "{}"); } catch (e) {}
    keep.forEach(function (k) { if (q.get(k)) stored[k] = q.get(k); });
    if (!stored.landing_page) stored.landing_page = location.href;
    if (!stored.first_referrer) stored.first_referrer = document.referrer || "";
    try { sessionStorage.setItem("kd-attrib", JSON.stringify(stored)); } catch (e) {}
    keep.concat(["landing_page", "first_referrer"]).forEach(function (k) { a[k] = stored[k] || ""; });
    return a;
  }
  attribution(); // remember UTMs from the landing page for later bookings in the same visit

  /* ---------- time zones ---------- */
  var BROWSER_TZ = (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York"; } catch (e) { return "America/New_York"; } })();
  var PINNED_TZ = [["America/New_York", "Eastern Time"], ["America/Chicago", "Central Time"], ["America/Denver", "Mountain Time"], ["America/Phoenix", "Arizona"], ["America/Los_Angeles", "Pacific Time"], ["America/Anchorage", "Alaska"], ["Pacific/Honolulu", "Hawaii"]];
  function allZones() {
    try { if (Intl.supportedValuesOf) return Intl.supportedValuesOf("timeZone"); } catch (e) {}
    return PINNED_TZ.map(function (p) { return p[0]; }).concat(["Europe/London", "Europe/Madrid", "America/Mexico_City", "America/Bogota", "America/Sao_Paulo", "Asia/Dubai", "Africa/Cairo"]);
  }
  function tzOffsetMin(ts, tz) {
    var p = parts(new Date(ts), tz);
    return (Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(ts / 1000) * 1000) / 60000;
  }
  var partCache = {};
  function parts(date, tz) {
    var f = partCache[tz] || (partCache[tz] = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    var o = {}; f.formatToParts(date).forEach(function (x) { o[x.type] = x.value; });
    return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second };
  }
  function zonedMidnight(y, m0, d, tz) { // epoch ms of 00:00 on y-m-d in tz
    var guess = Date.UTC(y, m0, d);
    var t = guess - tzOffsetMin(guess, tz) * 60000;
    return guess - tzOffsetMin(t, tz) * 60000;
  }
  function offsetLabel(tz) {
    var o = Math.round(tzOffsetMin(Date.now(), tz)), s = o < 0 ? "-" : "+"; o = Math.abs(o);
    return "GMT" + s + String(Math.floor(o / 60)).padStart(2, "0") + ":" + String(o % 60).padStart(2, "0");
  }
  function tzFieldFor(tz) {
    var map = { Eastern: /^America\/(New_York|Detroit|Toronto|Indiana|Kentucky|Nassau|Montreal|Iqaluit)/, Central: /^America\/(Chicago|Winnipeg|Menominee|North_Dakota|Indiana\/(Knox|Tell_City)|Matamoros)/, Mountain: /^America\/(Denver|Boise|Phoenix|Edmonton|Ojinaga|Yellowknife)/, Pacific: /^America\/(Los_Angeles|Vancouver|Tijuana)/, Alaska: /^America\/(Anchorage|Juneau|Sitka|Nome|Yakutat|Metlakatla)/, "Hawaii-Aleutian": /^(Pacific\/Honolulu|America\/Adak)/ };
    for (var k in map) if (map[k].test(tz)) return k + " Standard Time";
    return "";
  }
  var fmtCache = {};
  function fmt(date, tz, opts) {
    var key = tz + JSON.stringify(opts);
    return (fmtCache[key] || (fmtCache[key] = new Intl.DateTimeFormat("en-US", Object.assign({ timeZone: tz }, opts)))).format(date);
  }

  /* ---------- countries (names from the browser, so the list stays short) ---------- */
  var REGIONS = "AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BA BW BV BR IO BN BG BF BI KH CM CA CV KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW".split(" ");
  function countries() {
    var dn = null; try { dn = new Intl.DisplayNames(["en"], { type: "region" }); } catch (e) {}
    return REGIONS.map(function (c) { return [c, dn ? dn.of(c) : c]; }).sort(function (a, b) { return a[1].localeCompare(b[1]); });
  }

  /* ---------- availability ---------- */
  function mockSlots(start, end, tz) {
    var out = {}, now = Date.now() + 18 * 3600000; // ~next-day minimum notice
    for (var t = start; t < end; t += 86400000) {
      var p = parts(new Date(t + 43200000), "America/New_York"); // noon of that day, Eastern
      var dow = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
      if (dow === 0 || dow === 6) continue;
      [10, 11, 13, 14, 15, 16].forEach(function (h, i) {
        if ((p.d + i) % 5 === 0) return; // a few gaps so it looks real
        var at = zonedMidnight(p.y, p.m - 1, p.d, "America/New_York") + h * 3600000;
        if (at < now || at < start || at >= end) return;
        var key = dayKey(at, tz); (out[key] = out[key] || { slots: [] }).slots.push(new Date(at).toISOString());
      });
    }
    return Promise.resolve(out);
  }
  function dayKey(ts, tz) { var p = parts(new Date(ts), tz); return p.y + "-" + String(p.m).padStart(2, "0") + "-" + String(p.d).padStart(2, "0"); }
  var slotCache = {};
  function loadMonth(y, m0, tz) {
    var key = y + "-" + m0 + "-" + tz;
    if (slotCache[key]) return slotCache[key];
    var start = zonedMidnight(y, m0, 1, tz), end = Math.min(zonedMidnight(y, m0 + 1, 1, tz), start + 31 * 86400000);
    var p = CFG.mock || !CFG.slotsUrl ? mockSlots(start, end, tz)
      : fetch(CFG.slotsUrl + (CFG.slotsUrl.indexOf("?") < 0 ? "?" : "&") + "start=" + start + "&end=" + end + "&timezone=" + encodeURIComponent(tz), { headers: { Accept: "application/json" } })
          .then(function (r) { if (!r.ok) throw new Error("slots " + r.status); return r.json(); })
          .then(function (j) { return j && j.slots && !Array.isArray(j.slots) ? j.slots : j; });
    slotCache[key] = p.then(function (map) {
      var byDay = {};
      Object.keys(map || {}).forEach(function (k) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !map[k] || !map[k].slots) return;
        map[k].slots.forEach(function (iso) { var ts = Date.parse(iso); if (!isNaN(ts)) { var d = dayKey(ts, tz); (byDay[d] = byDay[d] || []).push(ts); } });
      });
      Object.keys(byDay).forEach(function (d) { byDay[d].sort(function (a, b) { return a - b; }); });
      return byDay;
    }, function (e) { delete slotCache[key]; throw e; });
    return slotCache[key];
  }

  /* ---------- tiny DOM helpers ---------- */
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k]; if (v == null || v === false) return;
      if (k === "class") el.className = v; else if (k === "text") el.textContent = v; else if (k === "html") el.innerHTML = v;
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? "" : v);
    });
    (kids || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return el;
  }
  var uid = 0;

  /* ---------- the form ---------- */
  function Booking(host, opts) {
    this.host = host; this.opts = opts || {}; this.id = "kdb" + (++uid);
    this.kind = this.opts.kind === "contact" ? "contact" : "booking";
    this.steps = this.kind === "contact" ? CONTACT_STEPS : STEPS;
    this.state = { step: 0, tz: BROWSER_TZ, slot: null, view: null, data: {}, source: this.opts.source || pageName() + CFG.sourceSeparator + (this.kind === "contact" ? "Inquiry Form" : "Booking Page"), ctaLabel: this.opts.ctaLabel || "" };
    var now = parts(new Date(), this.state.tz); this.state.view = { y: now.y, m0: now.m - 1 };
    this.render();
  }
  Booking.prototype.render = function () {
    var STEPS = this.steps;
    var self = this, s = this.state;
    this.host.innerHTML = "";
    this.root = h("form", { class: "kdb kdb--" + this.kind, novalidate: true, "aria-labelledby": this.id + "-title", onsubmit: function (e) { e.preventDefault(); self.next(); } });
    // progress: the gear line, one segment per step
    var gear = STEPS.length < 2 ? null : h("ol", { class: "kdb__gear", "aria-label": "Booking progress" }, STEPS.map(function (st, i) {
      return h("li", { class: "kdb__gear-i" + (i < s.step ? " is-done" : "") + (i === s.step ? " is-on" : ""), "aria-current": i === s.step ? "step" : null }, [h("span", { class: "kdb__gear-n", text: "0" + (i + 1) }), h("span", { class: "kdb__gear-t", text: st.title })]);
    }));
    var st = STEPS[s.step];
    var head = h("div", { class: "kdb__head" }, [
      h("p", { class: "kdb__eyebrow", text: st.eyebrow }),
      h("h2", { class: "kdb__title", id: this.id + "-title", tabindex: "-1", text: st.title }),
      s.step > 0 && s.slot ? this.slotChip() : null
    ]);
    var body = h("div", { class: "kdb__body" });
    if (st.key === "time") this.renderTime(body); else this.renderFields(body, st.fields);
    var foot = h("div", { class: "kdb__foot" }, [
      s.step > 0 ? h("button", { type: "button", class: "kdb__btn kdb__btn--ghost", onclick: function () { self.back(); } }, [h("span", { class: "kdb__arr", "aria-hidden": "true", text: "←" }), "Back"]) : h("span"),
      h("span", { class: "kdb__count", text: STEPS.length > 1 ? "Step " + (s.step + 1) + " / " + STEPS.length : "" }),
      h("button", { type: "submit", class: "kdb__btn kdb__btn--primary" }, s.step === STEPS.length - 1 ? [this.kind === "contact" ? "Send message" : "Book my call"] : ["Continue", h("span", { class: "kdb__arr", "aria-hidden": "true", text: "→" })])
    ]);
    this.msg = h("p", { class: "kdb__msg", role: "alert", "aria-live": "assertive" });
    if (gear) this.root.appendChild(gear); this.root.appendChild(head); this.root.appendChild(this.msg); this.root.appendChild(body); this.root.appendChild(foot);
    // honeypot: bots fill it, people never see it
    this.root.appendChild(h("label", { class: "kdb__hp", "aria-hidden": "true" }, ["Company website", h("input", { type: "text", name: "website", tabindex: "-1", autocomplete: "off" })]));
    this.host.appendChild(this.root);
  };
  Booking.prototype.slotChip = function () {
    var s = this.state, self = this;
    return h("button", { type: "button", class: "kdb__chip", title: "Change time", onclick: function () { self.go(0); } }, [
      h("span", { class: "kdb__chip-dot" }),
      fmt(new Date(s.slot), s.tz, { weekday: "short", month: "short", day: "numeric" }) + " · " + fmt(new Date(s.slot), s.tz, { hour: "numeric", minute: "2-digit" }) + " · " + shortTz(s.tz),
      h("span", { class: "kdb__chip-edit", text: "Change" })
    ]);
  };
  function shortTz(tz) { var p = PINNED_TZ.filter(function (x) { return x[0] === tz; })[0]; return p ? p[1] : tz.split("/").pop().replace(/_/g, " "); }

  /* step 1: calendar + slots + time zone */
  Booking.prototype.renderTime = function (body) {
    var self = this, s = this.state;
    var tzSel = h("select", { class: "kdb__input kdb__tz", id: this.id + "-tz", onchange: function () { s.tz = this.value; s.slot = null; s.day = null; self.render(); self.focusTitle(); } });
    var pinned = h("optgroup", { label: "United States" }, PINNED_TZ.map(function (p) { return h("option", { value: p[0], selected: p[0] === s.tz, text: p[1] + " (" + offsetLabel(p[0]) + ")" }); }));
    var rest = h("optgroup", { label: "All time zones" }, allZones().filter(function (z) { return !PINNED_TZ.some(function (p) { return p[0] === z; }); }).map(function (z) {
      return h("option", { value: z, selected: z === s.tz, text: z.replace(/_/g, " ") + " (" + offsetLabel(z) + ")" });
    }));
    tzSel.appendChild(pinned); tzSel.appendChild(rest);
    var cal = h("div", { class: "kdb__cal" }), slots = h("div", { class: "kdb__slots", "aria-live": "polite" });
    body.appendChild(h("div", { class: "kdb__time" }, [
      h("div", { class: "kdb__cal-wrap" }, [cal, h("div", { class: "kdb__field kdb__tz-field" }, [h("label", { class: "kdb__label", for: this.id + "-tz", text: "Time zone" }), tzSel])]),
      slots
    ]));
    this.drawCalendar(cal, slots);
  };
  Booking.prototype.drawCalendar = function (cal, slotsEl) {
    var self = this, s = this.state, v = s.view;
    var now = parts(new Date(), s.tz), isFirst = v.y === now.y && v.m0 === now.m - 1;
    var label = new Date(Date.UTC(v.y, v.m0, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
    cal.innerHTML = "";
    cal.appendChild(h("div", { class: "kdb__cal-head" }, [
      h("button", { type: "button", class: "kdb__nav", "aria-label": "Previous month", disabled: isFirst, onclick: function () { self.shift(-1, cal, slotsEl); }, text: "‹" }),
      h("p", { class: "kdb__month", text: label }),
      h("button", { type: "button", class: "kdb__nav", "aria-label": "Next month", onclick: function () { self.shift(1, cal, slotsEl); }, text: "›" })
    ]));
    var grid = h("div", { class: "kdb__grid is-loading", role: "grid", "aria-label": label });
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach(function (d) { grid.appendChild(h("span", { class: "kdb__dow", role: "columnheader", text: d })); });
    var first = (new Date(Date.UTC(v.y, v.m0, 1)).getUTCDay() + 6) % 7, days = new Date(Date.UTC(v.y, v.m0 + 1, 0)).getUTCDate();
    for (var i = 0; i < first; i++) grid.appendChild(h("span", { class: "kdb__day is-pad" }));
    var cells = [];
    for (var d = 1; d <= days; d++) {
      var key = v.y + "-" + String(v.m0 + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
      var b = h("button", { type: "button", class: "kdb__day", disabled: true, "data-day": key, "aria-label": new Date(Date.UTC(v.y, v.m0, d)).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }), text: String(d) });
      if (isFirst && d === now.d) b.classList.add("is-today");
      grid.appendChild(b); cells.push(b);
    }
    cal.appendChild(grid);
    slotsEl.innerHTML = ""; slotsEl.appendChild(h("p", { class: "kdb__hint", text: "Loading available times…" }));
    loadMonth(v.y, v.m0, s.tz).then(function (byDay) {
      if (s.view !== v) return;
      grid.classList.remove("is-loading");
      var firstOpen = null;
      cells.forEach(function (b) {
        var k = b.getAttribute("data-day");
        if (byDay[k] && byDay[k].length) {
          b.disabled = false; b.classList.add("is-open"); if (!firstOpen) firstOpen = k;
          b.addEventListener("click", function () { s.day = k; s.slot = null; cells.forEach(function (c) { c.classList.toggle("is-sel", c === b); c.setAttribute("aria-pressed", c === b); }); self.drawSlots(slotsEl, byDay[k]); if (window.matchMedia && matchMedia("(max-width: 759px)").matches && slotsEl.scrollIntoView) slotsEl.scrollIntoView({ block: "start", behavior: "smooth" }); });
        }
      });
      var pick = s.day && byDay[s.day] ? s.day : firstOpen;
      if (pick) { s.day = pick; cells.forEach(function (c) { var on = c.getAttribute("data-day") === pick; c.classList.toggle("is-sel", on); c.setAttribute("aria-pressed", on); }); self.drawSlots(slotsEl, byDay[pick]); }
      else { slotsEl.innerHTML = ""; slotsEl.appendChild(h("p", { class: "kdb__hint", text: "No open times this month." })); slotsEl.appendChild(h("button", { type: "button", class: "kdb__btn kdb__btn--ghost", text: "See next month →", onclick: function () { self.shift(1, cal, slotsEl); } })); }
    }).catch(function () {
      slotsEl.innerHTML = ""; slotsEl.appendChild(h("p", { class: "kdb__hint kdb__hint--err", text: "We couldn't load the calendar. Please try again in a moment." }));
      slotsEl.appendChild(h("button", { type: "button", class: "kdb__btn kdb__btn--ghost", text: "Retry", onclick: function () { self.drawCalendar(cal, slotsEl); } }));
    });
  };
  Booking.prototype.shift = function (n, cal, slotsEl) {
    var v = this.state.view, m = v.m0 + n;
    this.state.view = { y: v.y + Math.floor(m / 12), m0: ((m % 12) + 12) % 12 }; this.state.day = null;
    this.drawCalendar(cal, slotsEl);
  };
  Booking.prototype.drawSlots = function (el, list) {
    var self = this, s = this.state;
    el.innerHTML = "";
    var day = new Date(list[0]);
    el.appendChild(h("p", { class: "kdb__slots-day", text: fmt(day, s.tz, { weekday: "long", month: "long", day: "numeric" }) }));
    var ul = h("div", { class: "kdb__slot-list", role: "radiogroup", "aria-label": "Available times" });
    list.forEach(function (ts) {
      var b = h("button", { type: "button", role: "radio", "aria-checked": s.slot === ts, class: "kdb__slot" + (s.slot === ts ? " is-sel" : ""), text: fmt(new Date(ts), s.tz, { hour: "numeric", minute: "2-digit" }),
        onclick: function () { s.slot = ts; [].forEach.call(ul.children, function (c) { c.classList.toggle("is-sel", c === b); c.setAttribute("aria-checked", c === b); }); self.msg.textContent = ""; } });
      ul.appendChild(b);
    });
    el.appendChild(ul);
    el.appendChild(h("p", { class: "kdb__hint", text: CFG.durationMin + "-minute call · times shown in " + shortTz(s.tz) }));
  };

  /* steps 2-5: questions */
  Booking.prototype.renderFields = function (body, fields) {
    var self = this, d = this.state.data;
    if (fields.some(function (f) { return f.name === "tzField"; }) && !d.tzField) d.tzField = tzFieldFor(this.state.tz);
    var wrap = h("div", { class: "kdb__fields" });
    fields.forEach(function (f) {
      var id = self.id + "-" + f.name, err = h("p", { class: "kdb__err", id: id + "-err" }), el, ctl;
      var cls = "kdb__field" + (f.half ? " kdb__field--half" : "") + (f.third ? " kdb__field--third" : "");
      var label = f.label + (f.req ? "" : "");
      var req = f.req ? h("span", { class: "kdb__req", "aria-hidden": "true", text: " *" }) : h("span", { class: "kdb__opt", text: " (optional)" });
      if (f.type === "radio" || f.type === "checkbox") {
        ctl = h("div", { class: "kdb__choices" + (f.inline ? " kdb__choices--inline" : "") + (f.grid ? " kdb__choices--grid" : "") });
        f.options.forEach(function (o, i) {
          var checked = f.type === "radio" ? d[f.name] === o : (d[f.name] || []).indexOf(o) >= 0;
          ctl.appendChild(h("label", { class: "kdb__choice" }, [h("input", { type: f.type, name: f.name, value: o, checked: checked, onchange: function () { self.capture(f); } }), h("span", { text: o })]));
        });
        el = h("fieldset", { class: cls, "aria-describedby": id + "-err", "data-field": f.name, "aria-required": f.req ? "true" : null }, [h("legend", { class: "kdb__label" }, [f.label, req]), ctl, err]);
      } else if (f.type === "consent") {
        el = h("div", { class: cls + " kdb__consent", "data-field": f.name }, [
          h("label", { class: "kdb__choice kdb__choice--consent" }, [h("input", { type: "checkbox", name: f.name, id: id, checked: !!d[f.name], "aria-describedby": id + "-err", required: f.req, onchange: function () { self.capture(f); } }), h("span", { text: f.label })]), err]);
      } else {
        if (f.type === "textarea") ctl = h("textarea", { class: "kdb__input", rows: "3" });
        else if (f.type === "select" || f.type === "country") {
          ctl = h("select", { class: "kdb__input" });
          ctl.appendChild(h("option", { value: "", text: f.type === "country" ? "Country" : "Select…" }));
          (f.type === "country" ? countries() : f.options.map(function (o) { return [o, o]; })).forEach(function (o) { ctl.appendChild(h("option", { value: o[0], text: o[1] })); });
          if (f.type === "country" && !d.country) d.country = "US";
        } else ctl = h("input", { class: "kdb__input", type: f.type === "number" ? "text" : f.type, inputmode: f.type === "number" ? "numeric" : f.type === "tel" ? "tel" : null });
        ctl.id = id; ctl.name = f.name; if (f.ph) ctl.placeholder = f.ph; if (f.auto) ctl.autocomplete = f.auto; if (f.req) ctl.required = true;
        ctl.setAttribute("aria-describedby", id + "-err" + (f.hint ? " " + id + "-hint" : ""));
        if (d[f.name] != null) ctl.value = d[f.name];
        ctl.addEventListener("input", function () { self.capture(f); }); ctl.addEventListener("change", function () { self.capture(f); });
        el = h("div", { class: cls, "data-field": f.name }, [h("label", { class: "kdb__label", for: id }, [f.label, req]), ctl, f.hint ? h("p", { class: "kdb__hint", id: id + "-hint", text: f.hint }) : null, err]);
      }
      wrap.appendChild(el);
    });
    body.appendChild(wrap);
  };
  Booking.prototype.capture = function (f) {
    var d = this.state.data, box = this.root.querySelector('[data-field="' + f.name + '"]');
    if (f.type === "radio") { var c = box.querySelector("input:checked"); d[f.name] = c ? c.value : ""; }
    else if (f.type === "checkbox") d[f.name] = [].map.call(box.querySelectorAll("input:checked"), function (x) { return x.value; });
    else if (f.type === "consent") d[f.name] = box.querySelector("input").checked;
    else d[f.name] = box.querySelector(".kdb__input").value.trim();
    if (box.classList.contains("is-invalid")) {
      this.validateField(f);
      if (!this.root.querySelector(".is-invalid") && /attention/.test(this.msg.textContent)) this.msg.textContent = "";
    }
  };
  Booking.prototype.validateField = function (f) {
    var v = this.state.data[f.name], msg = "";
    var empty = v == null || v === "" || v === false || (Array.isArray(v) && !v.length);
    if (f.req && empty) msg = f.type === "consent" ? "Please tick the box to continue." : (f.type === "radio" || f.type === "select" || f.type === "country") ? "Please choose an option." : f.type === "checkbox" ? "Please choose at least one." : "This field is required.";
    else if (!empty && f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = "Enter a valid email address.";
    else if (!empty && f.type === "tel" && String(v).replace(/\D/g, "").length < 7) msg = "Enter a valid phone number.";
    else if (!empty && f.type === "number" && !/^\d{1,5}$/.test(String(v))) msg = "Enter a whole number (0 if none).";
    var box = this.root.querySelector('[data-field="' + f.name + '"]');
    if (box) {
      box.classList.toggle("is-invalid", !!msg); box.querySelector(".kdb__err").textContent = msg;
      var ctl = box.querySelector(".kdb__input, input"); if (ctl) ctl.setAttribute("aria-invalid", msg ? "true" : "false");
    }
    return !msg;
  };
  Booking.prototype.validateStep = function () {
    var STEPS = this.steps;
    var self = this, st = STEPS[this.state.step];
    if (st.key === "time") { if (!this.state.slot) { this.msg.textContent = "Pick a day and a time to continue."; return false; } return true; }
    var ok = true, firstBad = null;
    st.fields.forEach(function (f) { self.capture(f); if (!self.validateField(f)) { ok = false; firstBad = firstBad || f; } });
    if (!ok) {
      this.msg.textContent = "A few answers need attention.";
      var box = this.root.querySelector('[data-field="' + firstBad.name + '"]'), ctl = box && box.querySelector("input, select, textarea");
      if (ctl) ctl.focus(); if (box && box.scrollIntoView) box.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    return ok;
  };
  Booking.prototype.go = function (n) { this.state.step = n; this.render(); this.focusTitle(); };
  Booking.prototype.focusTitle = function () { var t = this.root.querySelector(".kdb__title"); if (t) t.focus({ preventScroll: true }); var sc = this.host.closest(".kdb-dialog__body") || this.host; if (sc.scrollTo) sc.scrollTo({ top: 0 }); };
  Booking.prototype.back = function () { if (this.state.step > 0) this.go(this.state.step - 1); };
  Booking.prototype.next = function () {
    var STEPS = this.steps;
    if (this.busy || !this.validateStep()) return;
    if (this.state.step < STEPS.length - 1) return this.go(this.state.step + 1);
    this.submit();
  };

  /* ---------- payload + submit ---------- */
  Booking.prototype.payload = function () {
    var STEPS = this.steps;
    var s = this.state, d = s.data, contact = {}, custom = [], answers = [];
    STEPS.forEach(function (st) {
      (st.fields || []).forEach(function (f) {
        var v = d[f.name]; if (v == null || v === "" || (Array.isArray(v) && !v.length)) return;
        if (f.std) contact[f.std] = v;
        if (f.cf) custom.push({ id: f.cf, fieldValue: f.type === "number" ? Number(v) : v });
        if (f.type !== "consent") answers.push({ q: f.label, a: Array.isArray(v) ? v.join(", ") : String(v) });
      });
    });
    var campaign = (this.kind === "contact" ? CFG.contactCampaignPrefix : CFG.campaignPrefix) + s.source;
    custom.push({ id: CAMPAIGN_FIELD, fieldValue: campaign });
    contact.timezone = s.tz;
    var root = this.root.querySelector('input[name="website"]');
    if (this.kind === "contact") return this.flatPayload(contact, answers, campaign, root);
    return {
      version: 1,
      type: this.kind,
      booking_source: s.source,
      campaign: campaign,
      cta_label: s.ctaLabel,
      slot: this.kind === "contact" ? null : { start: new Date(s.slot).toISOString(), end: new Date(s.slot + CFG.durationMin * 60000).toISOString(), timezone: s.tz, display: fmt(new Date(s.slot), s.tz, { dateStyle: "full", timeStyle: "short" }) },
      contact: contact,
      customFields: custom,
      answers: answers,
      consent: { sms: !!d.smsConsent, text: this.kind === "contact" ? (CFG.contactConsentText || CONSENT_TEXT) : CONSENT_TEXT, at: new Date().toISOString(), page: location.href },
      context: Object.assign({ page_url: location.href, page_title: document.title, referrer: document.referrer || "", lang: CFG.lang, user_agent: navigator.userAgent }, attribution()),
      hp: root ? root.value : ""
    };
  };
  /* Contact form → HighLevel inbound webhook: one flat object, so every value is a single
     pick in HighLevel's mapper ({{inboundWebhookRequest.first_name}} etc.). */
  Booking.prototype.flatPayload = function (contact, answers, campaign, hp) {
    var s = this.state, d = s.data, a = attribution(), now = new Date().toISOString();
    var consentText = CFG.contactConsentText || CONSENT_TEXT;
    var tags = ["website contact form", ("src: " + s.source).toLowerCase()];
    var out = {
      form: "contact",
      first_name: contact.firstName || "", last_name: contact.lastName || "", email: contact.email || "",
      business_name: d.businessName || "", which_bundle_are_you_interested_in: d.plan || "", your_message: d.message || "",
      sms_consent: d.smsConsent ? "Yes" : "No", consent_text: consentText, consent_timestamp: now, consent_page: location.href,
      campaign: campaign, booking_source: s.source, cta_label: s.ctaLabel || "", tags: tags.join(", "),
      contact_source: "SEO", timezone: s.tz, lang: CFG.lang,
      page_url: location.href, page_title: document.title, landing_page: a.landing_page, referrer: a.first_referrer || document.referrer || "",
      utm_source: a.utm_source, utm_medium: a.utm_medium, utm_campaign: a.utm_campaign, utm_term: a.utm_term, utm_content: a.utm_content,
      gclid: a.gclid, fbclid: a.fbclid, submitted_at: now
    };
    out.note = ["Website contact form · " + s.source, ""].concat(answers.map(function (x) { return x.q + ": " + x.a; }), ["",
      "SMS consent: " + out.sms_consent + " · " + now + " · " + location.href, "Consent text: " + consentText, "",
      "Page: " + location.href, "Landing page: " + a.landing_page, "Referrer: " + (out.referrer || "direct")],
      ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"].filter(function (k) { return a[k]; }).map(function (k) { return k + ": " + a[k]; })).join("\n");
    out.hp = hp ? hp.value : "";
    return out;
  };
  // HighLevel inbound webhooks may not send CORS headers: try a normal JSON post, and if the browser
  // blocks it before sending (preflight), send the same data as a simple form post instead.
  function postToWebhook(url, data) {
    return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      .then(function (r) { return { ok: r.ok }; })
      .catch(function () {
        var form = new URLSearchParams(); Object.keys(data).forEach(function (k) { if (data[k] != null) form.append(k, data[k]); });
        return fetch(url, { method: "POST", mode: "no-cors", body: form }).then(function () { return { ok: true }; });
      });
  }
  Booking.prototype.submit = function () {
    var self = this, s = this.state, body = this.payload(), btn = this.root.querySelector(".kdb__btn--primary");
    var url = this.kind === "contact" ? CFG.contactUrl : CFG.bookUrl, label = this.kind === "contact" ? "Send message" : "Book my call";
    this.busy = true; btn.disabled = true; btn.textContent = this.kind === "contact" ? "Sending…" : "Booking…"; this.msg.textContent = "";
    var req = CFG.mock || !url
      ? new Promise(function (r) { setTimeout(function () { window.KD_BOOKING_LAST_PAYLOAD = body; r(body.slot ? { ok: true, appointment: { id: "mock", startTime: body.slot.start } } : { ok: true, contactId: "mock" }); }, 700); })
      : this.kind === "contact"
        ? (body.hp ? Promise.resolve({ ok: true }) : postToWebhook(url, body))     // honeypot: show success, send nothing
        : fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) })
            .then(function (r) { return r.json().catch(function () { return { ok: false, code: "bad_response" }; }); });
    req.then(function (res) {
      self.busy = false;
      if (res && res.ok) {
        try { (window.dataLayer = window.dataLayer || []).push({ event: self.kind === "contact" ? "contact_form_sent" : "discovery_call_booked", booking_source: s.source }); } catch (e) {}
        if (CFG.thankYouUrl) { location.href = CFG.thankYouUrl; return; }
        return self.kind === "contact" ? self.sent() : self.done(body);
      }
      if (res && res.code === "slot_taken" && self.kind === "booking") {
        slotCache = {}; s.slot = null; self.go(0);
        self.msg.textContent = "That time was just taken. Please pick another one."; return;
      }
      btn.disabled = false; btn.textContent = label;
      self.msg.textContent = (res && res.message) || (self.kind === "contact" ? "Something went wrong and your message wasn't sent." : "Something went wrong and your call wasn't booked.") + " Please try again, or email info@kpidriver.com.";
    }).catch(function () {
      self.busy = false; btn.disabled = false; btn.textContent = label;
      self.msg.textContent = "We couldn't reach the booking service. Check your connection and try again.";
    });
  };
  Booking.prototype.done = function (p) {
    var STEPS = this.steps;
    var s = this.state, start = new Date(s.slot), end = new Date(s.slot + CFG.durationMin * 60000);
    var ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//KPI DRIVER//Booking//EN", "BEGIN:VEVENT", "UID:" + s.slot + "@kpidriver.com",
      "DTSTAMP:" + icsDate(new Date()), "DTSTART:" + icsDate(start), "DTEND:" + icsDate(end), "SUMMARY:Discovery call · KPI DRIVER",
      "DESCRIPTION:Your discovery call with KPI DRIVER. The meeting link arrives by email.", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    this.host.innerHTML = "";
    this.host.appendChild(h("div", { class: "kdb kdb--done", role: "status" }, [
      h("ol", { class: "kdb__gear is-complete", "aria-hidden": "true" }, STEPS.map(function () { return h("li", { class: "kdb__gear-i is-done" }); })),
      h("p", { class: "kdb__eyebrow", text: "Confirmed" }),
      h("h2", { class: "kdb__title", tabindex: "-1", text: "You're booked, " + (s.data.firstName || "driver") + "." }),
      h("div", { class: "kdb__ticket" }, [
        h("p", { class: "kdb__ticket-k", text: "Discovery call" }),
        h("p", { class: "kdb__ticket-v", text: fmt(start, s.tz, { weekday: "long", month: "long", day: "numeric" }) }),
        h("p", { class: "kdb__ticket-t", text: fmt(start, s.tz, { hour: "numeric", minute: "2-digit" }) + " – " + fmt(end, s.tz, { hour: "numeric", minute: "2-digit" }) + " · " + shortTz(s.tz) })
      ]),
      h("p", { class: "kdb__lede", text: "A confirmation with the meeting link is on its way to " + (s.data.email || "your inbox") + "." }),
      h("a", { class: "kdb__btn kdb__btn--ghost", download: "kpi-driver-discovery-call.ics", href: "data:text/calendar;charset=utf-8," + encodeURIComponent(ics), text: "Add to calendar" })
    ]));
    var t = this.host.querySelector(".kdb__title"); if (t) t.focus();
  };
  Booking.prototype.sent = function () {
    var s = this.state;
    this.host.innerHTML = "";
    this.host.appendChild(h("div", { class: "kdb kdb--done", role: "status" }, [
      h("p", { class: "kdb__eyebrow", text: "Message sent" }),
      h("h2", { class: "kdb__title", tabindex: "-1", text: "Thanks, " + (s.data.firstName || "driver") + "." }),
      h("p", { class: "kdb__lede", text: "Your message is with the team. We'll reply to " + (s.data.email || "your email") + " within one business day." }),
      h("a", { class: "kdb__btn kdb__btn--primary", href: "#", "data-kd-book": true, "data-label": "contact form success" }, ["Book a discovery call", h("span", { class: "kdb__arr", "aria-hidden": "true", text: "→" })])
    ]));
    var t = this.host.querySelector(".kdb__title"); if (t) t.focus();
  };
  function icsDate(d) { return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); }

  /* ---------- dialog + wiring ---------- */
  var dlg = null, current = null;
  function dialog() {
    if (dlg) return dlg;
    dlg = h("dialog", { class: "kdb-dialog", "aria-label": "Book a Discovery Call" }, [
      h("div", { class: "kdb-dialog__bar" }, [
        h("span", { class: "kdb-dialog__brand", text: "Book a Discovery Call" }),
        h("button", { type: "button", class: "kdb-dialog__close", "aria-label": "Close", text: "Close ✕", onclick: function () { dlg.close(); } })
      ]),
      h("div", { class: "kdb-dialog__body" })
    ]);
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    document.body.appendChild(dlg);
    return dlg;
  }
  function open(source, ctaLabel) {
    var d = dialog(), body = d.querySelector(".kdb-dialog__body");
    current = new Booking(body, { source: source, ctaLabel: ctaLabel });
    if (d.showModal) d.showModal(); else d.setAttribute("open", "");
    current.focusTitle();
    try { (window.dataLayer = window.dataLayer || []).push({ event: "discovery_call_open", booking_source: source }); } catch (e) {}
  }
  // capture phase, so it runs before the site's old iframe pop-up handler
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[data-book], [data-kd-book]");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
    e.preventDefault(); e.stopImmediatePropagation();
    open(sourceFrom(a), a.getAttribute("data-label") || "");
  }, true);
  function mountInline() {
    [].forEach.call(document.querySelectorAll("[data-kd-booking]"), function (el) {
      if (el.__kdb) return;
      el.__kdb = new Booking(el, { source: el.getAttribute("data-kd-booking-source") || pageName() + CFG.sourceSeparator + "Booking Page" });
    });
    [].forEach.call(document.querySelectorAll("[data-kd-contact]"), function (el) {
      if (el.__kdb) return;
      el.__kdb = new Booking(el, { kind: "contact", source: el.getAttribute("data-kd-contact-source") || pageName() + CFG.sourceSeparator + "Inquiry Form" });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountInline); else mountInline();

  window.KDBooking = { open: open, mount: mountInline, config: CFG, steps: STEPS, sourceFrom: sourceFrom, pageName: pageName };
})();
