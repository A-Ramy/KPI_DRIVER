/* KPI DRIVER first-load intro ("Rev & Shift"), played at half speed (about 5 s).
   Plays once per visit, on the first page opened. A tap, click or key press skips to the reveal.
   Visitors who ask for reduced motion get a short logo fade instead.
   Needs the head snippet (intro/head-snippet.html), which covers the page in navy before first paint
   and sets html.kd-intro-on; this script only runs while that class is present.
   Built by intro/build_intro.py from the logo artwork (src/assets/img/logo-light-text.svg). */
(function () {
  "use strict";
  var root = document.documentElement;
  if (!root.classList.contains("kd-intro-on")) return;              // already seen this visit, or the head snippet gave up
  try { sessionStorage.setItem("kd-intro-seen", "1"); } catch (e) {}

  var SPEED = 0.5;                                                   // half speed, as approved
  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ES = /^\/es(\/|$)/.test(location.pathname);

  var CSS = [
    ".kdi{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;overflow:hidden;cursor:pointer;-webkit-tap-highlight-color:transparent;--ring:min(92vh,92vw);--ring:min(92svh,92vw)}",
    ".kdi__ground{position:absolute;inset:0;background:radial-gradient(60% 55% at 50% 48%,#12233a 0%,#0a1420 45%,#060a10 100%)}",
    ".kdi__edge{position:absolute;top:0;bottom:0;left:-44px;display:flex;gap:3px}.kdi__edge i{width:8px;height:100%}",
    ".kdi__edge i:nth-child(1),.kdi__gl i:nth-child(1){background:#ed2024}.kdi__edge i:nth-child(2),.kdi__gl i:nth-child(2){background:#ea8c1c}",
    ".kdi__edge i:nth-child(3),.kdi__gl i:nth-child(3){background:#fcaf17}.kdi__edge i:nth-child(4),.kdi__gl i:nth-child(4){background:#43b749}",
    ".kdi__ticks{position:absolute;width:var(--ring);height:auto;aspect-ratio:1;left:50%;top:50%;transform:translate(-50%,-50%);overflow:visible}",
    ".kdi__glow{position:absolute;width:calc(var(--ring)*.8);aspect-ratio:1;left:50%;top:47%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,rgba(67,183,73,.34) 0%,rgba(252,175,23,.12) 35%,transparent 65%);opacity:0}",
    ".kdi__streaks{position:absolute;inset:0}.kdi__streaks i{position:absolute;left:0;height:2px;border-radius:2px;opacity:0}",
    ".kdi__center{position:relative;display:grid;justify-items:center;gap:calc(var(--ring)*.04);width:calc(var(--ring)*.6)}",
    ".kdi__logo{width:100%;height:auto;overflow:visible;display:block}",
    ".kdi__gl{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;width:62%;height:4px}.kdi__gl i{border-radius:2px;transform-origin:left center;transform:scaleX(0)}",
    ".kdi__skip{position:absolute;right:max(16px,env(safe-area-inset-right,0px));bottom:max(16px,env(safe-area-inset-bottom,0px));font:500 11px/1 \"JetBrains Mono\",ui-monospace,Menlo,Consolas,monospace;letter-spacing:.14em;text-transform:uppercase;color:rgba(233,238,245,.45)}",
    ".kdi .needle{transform-box:view-box;transform-origin:1046px 395px}.kdi .kpi path{transform-box:fill-box;transform-origin:50% 50%}.kdi .seg{opacity:.12}",
    "html.kd-intro-lock,html.kd-intro-lock body{overflow:hidden!important}"
  ].join("");

  var LOGO = '__LOGO__';

  function start() {
    var style = document.createElement("style"); style.textContent = CSS; document.head.appendChild(style);
    var kdi = document.createElement("div");
    kdi.className = "kdi"; kdi.setAttribute("aria-hidden", "true");
    kdi.innerHTML = '<div class="kdi__ground"></div><div class="kdi__edge"><i></i><i></i><i></i><i></i></div>' +
      '<svg class="kdi__ticks" viewBox="-100 -100 200 200"></svg><div class="kdi__glow"></div><div class="kdi__streaks"></div>' +
      '<div class="kdi__center">' + LOGO + '<div class="kdi__gl"><i></i><i></i><i></i><i></i></div></div>' +
      '<span class="kdi__skip">' + (ES ? "Toca para saltar" : "Tap to skip") + "</span>";
    document.body.appendChild(kdi);
    root.classList.add("kd-intro-lock");
    root.classList.remove("kd-intro-on");                           // the intro now covers the page itself

    var $ = function (s) { return kdi.querySelector(s); }, $$ = function (s) { return [].slice.call(kdi.querySelectorAll(s)); };
    var W = window.innerWidth, anims = [], exitAnims = [], endTimer = 0, finished = false;
    var E = { out: "cubic-bezier(0.2, 0.8, 0.2, 1)", in: "cubic-bezier(0.55, 0, 0.9, 0.4)", rev: "cubic-bezier(0.45, 0, 0.85, 0.55)", back: "cubic-bezier(0.3, 1.45, 0.5, 1)", wipe: "cubic-bezier(0.76, 0, 0.24, 1)" };
    function add(list, el, frames, opts, rate) {
      var a = el.animate(frames, Object.assign({ fill: "both", easing: "linear" }, opts));
      a.playbackRate = rate || SPEED; list.push(a); return a;
    }

    // tach ring: a full circle of 72 ticks, coloured by height (red at the bottom, green at the top)
    var TICKS = 72, ring = $(".kdi__ticks"), NS = "http://www.w3.org/2000/svg", level = [];
    for (var i = 0; i < TICKS; i++) {
      var a = (90 + i * 360 / TICKS) * Math.PI / 180, f = (1 - Math.sin(a)) / 2, major = i % 6 === 0, r1 = major ? 84 : 88;
      var ln = document.createElementNS(NS, "line");
      ln.setAttribute("x1", (Math.cos(a) * r1).toFixed(2)); ln.setAttribute("y1", (Math.sin(a) * r1).toFixed(2));
      ln.setAttribute("x2", (Math.cos(a) * 94).toFixed(2)); ln.setAttribute("y2", (Math.sin(a) * 94).toFixed(2));
      ln.setAttribute("stroke", f < 0.22 ? "#ed2024" : f < 0.45 ? "#ea8c1c" : f < 0.68 ? "#fcaf17" : "#43b749");
      ln.setAttribute("stroke-width", major ? "1.1" : "0.6"); ln.setAttribute("stroke-linecap", "round"); ln.setAttribute("opacity", "0.1");
      ln.setAttribute("class", "tick"); ring.appendChild(ln); level.push(f);
    }

    function done() {
      if (finished) return; finished = true;
      clearTimeout(endTimer);
      root.classList.remove("kd-intro-lock");
      kdi.remove(); style.remove();
    }
    function finishAt(ms) { endTimer = setTimeout(done, ms + 60); }

    if (REDUCED) {
      // calm version: the finished logo fades in, holds, and the cover fades out
      $$(".seg").forEach(function (el) { el.style.opacity = "1"; });
      $(".needle").style.transform = "rotate(-43deg)";
      $$(".kdi__gl i").forEach(function (el) { el.style.transform = "scaleX(1)"; });
      add(anims, $(".kdi__center"), [{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: "ease-out" }, 1);
      add(exitAnims, kdi, [{ opacity: 1 }, { opacity: 0 }], { duration: 350, delay: 1150, easing: "ease-in" }, 1);
      finishAt(1500);
    } else {
      // rev: the needle climbs from below the red to the top of the green, shifts, and settles on green
      add(anims, $(".needle"), [
        { transform: "rotate(40deg)", opacity: 0, offset: 0 },
        { transform: "rotate(40deg)", opacity: 1, offset: 0.12, easing: E.rev },
        { transform: "rotate(-53deg)", opacity: 1, offset: 0.5, easing: E.out },
        { transform: "rotate(-20deg)", offset: 0.58, easing: "ease-in-out" },
        { transform: "rotate(-48deg)", offset: 0.72, easing: "ease-in-out" },
        { transform: "rotate(-41deg)", offset: 0.84 },
        { transform: "rotate(-43deg)", opacity: 1, offset: 1 }
      ], { duration: 2100 });
      [[".seg-r", 380], [".seg-o", 560], [".seg-a", 730], [".seg-g", 900]].forEach(function (p) {
        $$(p[0]).forEach(function (el) { add(anims, el, [{ opacity: 0.12 }, { opacity: 1 }], { duration: 160, delay: p[1], easing: "ease-out" }); });
      });
      $$(".tick").forEach(function (el, i) { add(anims, el, [{ opacity: 0.1 }, { opacity: 0.95 }, { opacity: 0.5 }], { duration: 520, delay: 320 + level[i] * 700, easing: "ease-out" }); });
      $$(".kdi__gl i").forEach(function (el, i) { add(anims, el, [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 190, delay: 360 + i * 175, easing: E.out }); });
      add(anims, ring, [{ transform: "translate(-50%,-50%) rotate(-8deg) scale(0.96)" }, { transform: "translate(-50%,-50%) rotate(0deg) scale(1)" }], { duration: 1100, easing: E.out });
      // shift at 1.05 s (2.1 s at half speed)
      add(anims, $(".kdi__glow"), [{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 0.25 }], { duration: 650, delay: 1000, easing: "ease-out" });
      add(anims, $(".glowcopy"), [{ opacity: 0 }, { opacity: 0.9, offset: 0.2 }, { opacity: 0.35 }], { duration: 700, delay: 980, easing: "ease-out" });
      add(anims, $(".kdi__center"), [{ transform: "translateX(0)" }, { transform: "translateX(-6px) scale(1.012)", offset: 0.3 }, { transform: "translateX(0) scale(1)" }], { duration: 260, delay: 1050, easing: "ease-out" });
      var streaks = $(".kdi__streaks"), COLORS = ["#ed2024", "#ea8c1c", "#fcaf17", "#43b749", "#e9eef5", "#4a9be6"];
      for (var s = 0; s < 11; s++) {
        var st = document.createElement("i"), w = W * (0.18 + ((s * 7) % 5) * 0.06);
        st.style.top = (24 + ((s * 37) % 52)) + "%"; st.style.width = w + "px";
        st.style.background = "linear-gradient(90deg, transparent, " + COLORS[s % COLORS.length] + " 70%, rgba(255,255,255,0.9))";
        streaks.appendChild(st);
        add(anims, st, [{ transform: "translateX(" + (-w) + "px)", opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: "translateX(" + (W + w) + "px)", opacity: 0 }],
          { duration: 380 + (s % 4) * 70, delay: 1040 + (s * 53) % 260, easing: E.in });
      }
      $$(".kpi path").forEach(function (el, i) {
        add(anims, el, [
          { transform: "translateX(-180px) skewX(-22deg)", opacity: 0 },
          { transform: "translateX(14px) skewX(6deg)", opacity: 1, offset: 0.62 },
          { transform: "translateX(0) skewX(0)", opacity: 1 }
        ], { duration: 300, delay: 1060 + i * 70, easing: E.out });
      });
      $$(".driver path").forEach(function (el, i) {
        add(anims, el, [{ transform: "translateY(250px)" }, { transform: "translateY(0)" }], { duration: 420, delay: 1290 + i * 45, easing: E.back });
      });
      // reveal
      add(exitAnims, kdi, [{ transform: "translateX(0)" }, { transform: "translateX(" + (W + 60) + "px)" }], { duration: 480, delay: 2050, easing: E.wipe });
      add(exitAnims, $(".kdi__center"), [{ transform: "translateX(0)", opacity: 1 }, { transform: "translateX(90px)", opacity: 0 }], { duration: 300, delay: 2050, easing: E.in });
      finishAt(2600 / SPEED);
    }

    // skip: straight to the reveal
    function skip(e) {
      if (finished) return;
      if (e) { e.preventDefault(); e.stopPropagation(); }
      clearTimeout(endTimer);
      anims.forEach(function (a) { a.finish(); });
      exitAnims.forEach(function (a) { a.cancel(); }); exitAnims = [];
      if (REDUCED) add(exitAnims, kdi, [{ opacity: 1 }, { opacity: 0 }], { duration: 250, easing: "ease-in" }, 1);
      else add(exitAnims, kdi, [{ transform: "translateX(0)" }, { transform: "translateX(" + (W + 60) + "px)" }], { duration: 420, easing: E.wipe }, 1);
      finishAt(REDUCED ? 260 : 440);
      document.removeEventListener("keydown", onKey, true);
    }
    function onKey(e) { if (!e.metaKey && !e.ctrlKey && !e.altKey) skip(e); }
    kdi.addEventListener("pointerdown", skip);
    kdi.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); });
    document.addEventListener("keydown", onKey, true);
  }

  if (!("animate" in Element.prototype)) { root.classList.remove("kd-intro-on"); return; }   // very old browsers: no intro
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
