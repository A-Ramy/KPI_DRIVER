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

  /* ---- tabs (WAI-ARIA tabs with arrow-key support) ---- */
  doc.querySelectorAll("[data-tabs]").forEach(function (root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = doc.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
      track("product_explore", { label: (tab.textContent || "").trim(), group: root.getAttribute("data-tabs") });
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab, false); });
      tab.addEventListener("keydown", function (e) {
        var n = null;
        if (e.key === "ArrowRight") n = tabs[(i + 1) % tabs.length];
        if (e.key === "ArrowLeft") n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === "Home") n = tabs[0];
        if (e.key === "End") n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
  });

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

  /* ---- forms: validate, then hand off. No success message is shown unless a real endpoint confirms. ---- */
  doc.querySelectorAll("form[data-form]").forEach(function (form) {
    var status = form.querySelector(".form__status");
    function setErr(input, msg) {
      var err = doc.getElementById(input.id + "-err");
      input.setAttribute("aria-invalid", msg ? "true" : "false");
      if (err) err.textContent = msg || "";
    }
    function check(input) {
      var v = (input.value || "").trim(), msg = "";
      if (input.required && !v) msg = L("Enter ", "Escribe ") + (input.getAttribute("data-name") || L("this field", "este campo")) + ".";
      else if (input.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = L("Enter an email address like name@company.com.", "Escribe un correo como nombre@empresa.com.");
      else if (input.type === "tel" && v && v.replace(/\D/g, "").length < 10) msg = L("Enter a phone number with area code.", "Escribe un teléfono con código de área.");
      setErr(input, msg);
      return !msg;
    }
    var inputs = Array.prototype.slice.call(form.querySelectorAll("input:not([type=checkbox]):not(.hp input), select, textarea"));
    inputs.forEach(function (i) { i.addEventListener("blur", function () { if (i.value || i.getAttribute("aria-invalid") === "true") check(i); }); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var firstBad = null;
      inputs.forEach(function (i) { if (!check(i) && !firstBad) firstBad = i; });
      if (firstBad) {
        status.hidden = false; status.setAttribute("data-state", "error");
        status.textContent = L("Check the highlighted fields and send again.", "Revisa los campos marcados y vuelve a enviar.");
        firstBad.focus();
        return;
      }
      var honeypot = form.querySelector(".hp input");
      if (honeypot && honeypot.value) return; /* bot: drop silently */
      var endpoint = form.getAttribute("data-endpoint");
      if (!endpoint) {
        /* Preview build: no submission destination is connected yet. Say so plainly. */
        status.hidden = false; status.setAttribute("data-state", "error");
        status.innerHTML = L("<strong>This preview form is not connected yet, so nothing was sent.</strong> To reach the team now, email info@kpidriver.com or book a discovery call.", "<strong>Este formulario de vista previa aún no está conectado, así que no se envió nada.</strong> Para contactar al equipo ahora, escribe a info@kpidriver.com o agenda una llamada.");
        status.focus();
        return;
      }
      var btn = form.querySelector("[type=submit]");
      btn.disabled = true; btn.textContent = L("Sending…", "Enviando…");
      fetch(endpoint, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
        .then(function (r) { if (!r.ok) throw new Error(String(r.status)); track("form_complete", { form: form.getAttribute("data-form") }); window.location.href = form.getAttribute("data-success") || "thank-you.html"; })
        .catch(function () {
          btn.disabled = false; btn.textContent = "Send message";
          status.hidden = false; status.setAttribute("data-state", "error");
          status.textContent = L("Your message did not send. Try again, or email info@kpidriver.com.", "Tu mensaje no se envió. Inténtalo de nuevo o escribe a info@kpidriver.com.");
          status.focus();
        });
    });
  });

  /* ---- booking embed: load the scheduler only where framing is allowed; the direct link always works ---- */
  doc.querySelectorAll("[data-booking]").forEach(function (box) {
    var src = box.getAttribute("data-booking");
    var slot = box.querySelector(".booking__frame");
    if (!slot || !src || /claude|artifact/i.test(location.hostname)) return;
    var f = doc.createElement("iframe");
    f.src = src; f.title = "Schedule a discovery call with KPI DRIVER"; f.loading = "lazy";
    slot.appendChild(f);
  });

  var y = doc.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());
})();

/* ===================== v2: instrument layer ===================== */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var sandboxed = /claude|artifact/i.test(location.hostname); /* hosts that block third-party frames */

  /* ---- booking popup: every booking CTA opens the embedded scheduler ---- */
  var dlg = doc.getElementById("book-dialog");
  if (dlg && dlg.showModal && !sandboxed) {
    var frame = dlg.querySelector(".bookdlg__frame"), alt = dlg.querySelector(".bookdlg__foot a");
    doc.addEventListener("click", function (e) {
      var a = e.target.closest("a[data-book]");
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      var src = "https://link.kpidriver.com/widget/booking/" + a.getAttribute("data-book");
      frame.innerHTML = "";
      var f = doc.createElement("iframe");
      f.src = src; f.title = "Schedule a discovery call with KPI DRIVER";
      frame.appendChild(f); alt.href = src;
      dlg.showModal();
    });
    dlg.querySelector(".bookdlg__close").addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("close", function () { frame.innerHTML = ""; });
  }

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

  /* ---- lifecycle circuit: nodes mirror the tabs; outgoing routes light up ---- */
  doc.querySelectorAll("[data-circuit]").forEach(function (wrap) {
    var nodes = wrap.querySelectorAll(".circuit__node"), edges = wrap.querySelectorAll(".circuit__edge");
    var tabs = wrap.querySelectorAll('[role="tab"]');
    function paint() {
      var on = -1;
      tabs.forEach(function (t, i) { if (t.getAttribute("aria-selected") === "true") on = i; });
      var next = {};
      edges.forEach(function (ed) {
        var from = +ed.getAttribute("data-from"), to = +ed.getAttribute("data-to");
        ed.classList.toggle("is-live", from === on);
        ed.classList.toggle("is-in", false);
        if (from === on) next[to] = 1;
      });
      nodes.forEach(function (n, i) { n.classList.toggle("is-on", i === on); n.classList.toggle("is-next", !!next[i]); });
    }
    nodes.forEach(function (n, i) { n.addEventListener("click", function () { if (tabs[i]) tabs[i].click(); }); });
    tabs.forEach(function (t) { t.addEventListener("click", paint); t.addEventListener("keydown", function () { setTimeout(paint, 0); }); });
    paint();
  });

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
  var sel = ".head, .pillars > li, .kq > li, .tool, .triad__card, .bracket, .model, .offer, .feature, .steps > li, .person, .post-row, .post-feature, .guide, .spec, .dash, .flow, .circuit, .compare-cols, .table-scroll, .support__chat, .kb > li, .kd-faq, .contact-list, .form, .booking, .reviews, .device, .hub";
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
