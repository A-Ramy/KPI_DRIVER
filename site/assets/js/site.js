/* KPI DRIVER — site interactions. Vanilla JS, no dependencies.
   Everything here is progressive enhancement: with JS off, all content stays readable. */
(function () {
  "use strict";
  var doc = document;
  doc.documentElement.classList.remove("no-js");
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
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
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
    function stop() { clearInterval(timer); timer = null; if (play) play.textContent = "Play walkthrough"; }
    steps.forEach(function (s, n) { s.addEventListener("click", function () { stop(); show(idx === n ? -1 : n); }); });
    if (play) {
      if (reduceMotion) { play.hidden = true; return; }
      play.addEventListener("click", function () {
        if (timer) { stop(); show(-1); return; }
        play.textContent = "Stop";
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
      if (input.required && !v) msg = "Enter " + (input.getAttribute("data-name") || "this field") + ".";
      else if (input.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = "Enter an email address like name@company.com.";
      else if (input.type === "tel" && v && v.replace(/\D/g, "").length < 10) msg = "Enter a phone number with area code.";
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
        status.textContent = "Check the highlighted fields and send again.";
        firstBad.focus();
        return;
      }
      var honeypot = form.querySelector(".hp input");
      if (honeypot && honeypot.value) return; /* bot: drop silently */
      var endpoint = form.getAttribute("data-endpoint");
      if (!endpoint) {
        /* Preview build: no submission destination is connected yet. Say so plainly. */
        status.hidden = false; status.setAttribute("data-state", "error");
        status.innerHTML = "<strong>This preview form is not connected yet, so nothing was sent.</strong> To reach the team now, email info@kpidriver.com or book a discovery call.";
        status.focus();
        return;
      }
      var btn = form.querySelector("[type=submit]");
      btn.disabled = true; btn.textContent = "Sending…";
      fetch(endpoint, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
        .then(function (r) { if (!r.ok) throw new Error(String(r.status)); track("form_complete", { form: form.getAttribute("data-form") }); window.location.href = form.getAttribute("data-success") || "thank-you.html"; })
        .catch(function () {
          btn.disabled = false; btn.textContent = "Send message";
          status.hidden = false; status.setAttribute("data-state", "error");
          status.textContent = "Your message did not send. Try again, or email info@kpidriver.com.";
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
