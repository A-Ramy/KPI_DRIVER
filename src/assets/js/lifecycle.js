  /* ---- lifecycle journey v5: gear-track diagram + one-row tabs (Home, Services, CRM; EN + ES) ----
     Rebuilds the [data-circuit] block in place from LC data, so English and Spanish share one source.
     Gears: 1 Capture, 2 Acquisitions, 3 Dispositions + 3 TC side by side, 4 Closed (kept) -> P Owned & Rentals,
     5 Closed (sold) -> 6 Funded (top gear); N Nurture, R Contractors & Vendors. Source: src/assets/js/lifecycle.js */
  (function () {
    var LC = /*LC_DATA*/null;
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
