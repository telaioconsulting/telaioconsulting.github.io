/* ============================================================
   TELAIO — HOME: motion graphic
   GSAP + ScrollTrigger + SplitText + Lenis (ospitate in /assets/vendor/).
   Senza librerie o con "riduci movimento" la pagina resta statica:
   il telaio in apertura viene disegnato una volta, fermo.
   ============================================================ */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var gsap = window.gsap, ST = window.ScrollTrigger, Split = window.SplitText;
  var motion = root.classList.contains("motion") && !reduce && !!gsap && !!ST;
  window.__home = true;
  if (!motion) root.classList.remove("motion");

  var isEn = (root.lang || "").toLowerCase().indexOf("en") === 0;

  var weave = initWeave();
  if (!motion) return;

  // Arrivo diretto su una sezione (es. /en/#faq): niente apertura, si va dritti lì.
  var deepLink = null;
  try { deepLink = location.hash.length > 1 ? document.querySelector(location.hash) : null; } catch (e) {}
  if (!deepLink) window.scrollTo(0, 0);

  // Si parte a font caricati (SplitText misura le righe); l'apertura copre l'attesa.
  var booted = false;
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(boot).catch(function (e) { console.error(e && e.stack); });
    setTimeout(boot, 1500);
  }
  else boot();

  function boot() {
    if (booted) return;
    booted = true;
    gsap.registerPlugin(ST);
    if (Split) gsap.registerPlugin(Split);
    var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    /* ---- Scorrimento morbido ---- */
    var lenis = null;
    if (window.Lenis) {
      lenis = new window.Lenis({ lerp: 0.085 });
      lenis.on("scroll", ST.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
      // Link a una sezione di questa stessa pagina ("#faq" o "/en/#faq"): scorrimento morbido
      document.addEventListener("click", function (e) {
        var a = e.target.closest ? e.target.closest("a[href*='#']") : null;
        if (!a || a.pathname !== location.pathname || a.hash.length < 2) return;
        var target = null;
        try { target = document.querySelector(a.hash); } catch (err) {}
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -64, duration: 1.4 });
        history.pushState(null, "", a.hash);
      });
    }

    /* ---- Barra di avanzamento ---- */
    gsap.to(".p-progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });

    /* ============================================================
       APERTURA: il marchio si tesse, il sipario sale, entra il titolo
       ============================================================ */
    (function () {
      var intro = document.querySelector(".p-intro");
      var h1 = document.querySelector(".p-h1");
      var h1Split = Split ? Split.create(h1, { type: "lines", mask: "lines", linesClass: "p-line" }) : null;
      var accent = h1.querySelector(".p-accent");
      gsap.set(h1, { visibility: "visible" });
      if (h1Split) gsap.set(h1Split.lines, { yPercent: 112 });
      if (accent) gsap.set(accent, { "--mark": 0 });
      if (lenis) lenis.stop();

      var tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.to(".p-intro-mk path", { strokeDashoffset: 0, duration: 0.8, stagger: 0.07, ease: "power3.inOut" }, 0)
        .fromTo(".p-intro-wm span", { y: 0, yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.045 }, 0.25)
        .to(".p-intro-tag", { opacity: 1, duration: 0.6, ease: "power2.out" }, 0.55)
        .to(intro, { clipPath: "inset(0% 0% 100% 0%)", duration: 1.1, ease: "expo.inOut" }, 1.3)
        .to(weave, { weave: 1, duration: 2.8, ease: "power2.out" }, 1.4)
        .fromTo(".top", { y: 0, yPercent: -100 }, { yPercent: 0, duration: 1 }, 2.0)
        .fromTo(".p-kicker", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1 }, 1.75)
        .to(h1Split ? h1Split.lines : h1, { yPercent: 0, duration: 1.3, stagger: 0.09 }, 1.8)
        .to(accent, { "--mark": 1, duration: 1, ease: "expo.inOut" }, 2.35)
        .fromTo("[data-hero-item]:not(.p-kicker)", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, stagger: 0.09 }, 2.15)
        .add(function () { intro.parentNode && intro.parentNode.removeChild(intro); if (lenis) lenis.start(); }, 2.45)
        .add(function () { if (h1Split) h1Split.revert(); });
      if (deepLink) {
        tl.progress(1);
        if (intro.parentNode) intro.parentNode.removeChild(intro);
        if (lenis) lenis.start();
      }

      // Uscita della hero mentre si scorre
      gsap.to(".p-hero-in", { y: -90, opacity: 0, ease: "none", scrollTrigger: { trigger: ".p-hero", start: "top top", end: "bottom 10%", scrub: true } });
      gsap.to(".p-hero-foot", { opacity: 0, ease: "none", scrollTrigger: { trigger: ".p-hero", start: "top top", end: "30% top", scrub: true } });
    })();

    /* ---- Titoli: le righe salgono da una maschera ---- */
    if (Split) {
      gsap.utils.toArray("[data-split]").forEach(function (el) {
        Split.create(el, {
          type: "lines", mask: "lines", linesClass: "p-line", autoSplit: true,
          onSplit: function (self) {
            return gsap.from(self.lines, {
              yPercent: 108, duration: 1.2, ease: "expo.out", stagger: 0.08,
              scrollTrigger: { trigger: el, start: "top 86%", toggleActions: "play none none none" }
            });
          }
        });
      });
    }

    /* ---- Comparse generiche ----
       Niente "once": i trigger che si eliminano da soli mentre ScrollTrigger
       calcola le posizioni lo mandano in errore se la pagina si apre già scorsa.
       Ogni elemento compare una volta sola grazie al segno __shown. */
    function firstTime(els) { return els.filter(function (el) { return !el.__shown && (el.__shown = true); }); }
    ST.batch("[data-reveal]", {
      start: "top 90%",
      onEnter: function (els) {
        els = firstTime(els);
        if (els.length) gsap.fromTo(els, { y: 46, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: "expo.out", stagger: 0.08, overwrite: "auto" });
      }
    });

    /* ---- Nastro: velocità e inclinazione seguono lo scroll ---- */
    (function () {
      var track = document.querySelector(".p-marquee-track");
      if (!track) return;
      var group = track.children[0], w = group.offsetWidth, x = 0, boost = 0, dir = 1, visible = false;
      var setX = gsap.quickSetter(track, "x", "px"), setSkew = gsap.quickSetter(track, "skewX", "deg");
      window.addEventListener("resize", function () { w = group.offsetWidth; });
      ST.create({ start: 0, end: "max", onUpdate: function (s) { dir = s.direction; boost = Math.min(Math.abs(s.getVelocity()) / 240, 14); } });
      ST.create({ trigger: ".p-marquee", start: "top bottom", end: "bottom top", onToggle: function (s) { visible = s.isActive; } });
      gsap.ticker.add(function (time, dtMs) {
        if (!visible) return;
        x -= (1 + boost) * dir * dtMs * 0.055;
        if (x <= -w) x += w; else if (x > 0) x -= w;
        boost *= 0.9;
        setX(x); setSkew(-boost * 0.6 * dir);
      });
    })();

    /* ---- Numeri: conteggio + mini grafici ---- */
    gsap.utils.toArray("[data-count]").forEach(function (el) {
      var to = parseFloat(el.getAttribute("data-count")), dec = parseInt(el.getAttribute("data-decimals") || "0", 10), o = { v: 0 };
      function fmt(v) { var s = v.toFixed(dec); return isEn ? s : s.replace(".", ","); }
      el.textContent = fmt(0);
      gsap.to(o, {
        v: to, duration: 2.2, ease: "power3.out",
        onUpdate: function () { el.textContent = fmt(o.v); },
        scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none none" }
      });
    });
    gsap.utils.toArray(".p-stat").forEach(function (st) {
      var tl = gsap.timeline({ defaults: { ease: "expo.out" }, scrollTrigger: { trigger: st, start: "top 80%", toggleActions: "play none none none" } });
      function add(sel, vars, at) { var els = st.querySelectorAll(sel); if (els.length) tl.from(els, vars, at); }
      add(".p-stat-num", { yPercent: 25, opacity: 0, duration: 1.2 }, 0);
      add(".p-col i", { scaleY: 0, duration: 1.3, stagger: 0.18 }, 0.2);
      add(".p-hrow em", { scaleX: 0, duration: 1.5, stagger: 0.18 }, 0.2);
      add(".p-viz-dots i", { scale: 0, duration: 0.9, stagger: 0.14, ease: "back.out(2.2)" }, 0.2);
      add(".p-stat-body > p", { y: 24, opacity: 0, duration: 1, stagger: 0.08 }, 0.35);
    });

    /* ---- Manifesto: le parole si accendono una a una ---- */
    (function () {
      var el = document.querySelector(".p-manifesto-text");
      if (!el || !Split) return;
      var s = Split.create(el, { type: "words", wordsClass: "p-word" });
      gsap.fromTo(s.words, { opacity: 0.13 }, {
        opacity: 1, ease: "none", stagger: 0.1,
        scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: true }
      });
    })();

    /* ---- Casi: scorrimento orizzontale con la sezione bloccata ---- */
    var mm = gsap.matchMedia();
    mm.add("(min-width: 900px)", function () {
      var pin = document.querySelector(".p-cases-pin"), track = document.querySelector(".p-cases-track");
      var rail = document.querySelector(".p-rail i"), count = document.querySelector(".p-cases-count b");
      var cards = track.querySelectorAll(".p-case:not(.p-case-cta)").length;
      function dist() { return Math.max(0, track.scrollWidth - document.documentElement.clientWidth); }
      var tw = gsap.to(track, {
        x: function () { return -dist(); }, ease: "none",
        scrollTrigger: {
          trigger: pin, start: "top top", end: function () { return "+=" + dist(); },
          pin: true, scrub: 0.9, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: function (self) {
            gsap.set(rail, { scaleX: self.progress });
            var n = Math.min(cards, 1 + Math.floor(self.progress * cards));
            count.textContent = (n < 10 ? "0" : "") + n;
          }
        }
      });
      gsap.utils.toArray(".p-case", track).forEach(function (c) {
        gsap.fromTo(c, { y: 80, rotation: 2.5, opacity: 0.15 }, {
          y: 0, rotation: 0, opacity: 1, ease: "none",
          scrollTrigger: { trigger: c, containerAnimation: tw, start: "left 100%", end: "left 68%", scrub: true }
        });
      });
    });
    mm.add("(max-width: 899px)", function () {
      ST.batch(".p-case", {
        start: "top 90%",
        onEnter: function (els) {
          els = firstTime(els);
          if (els.length) gsap.fromTo(els, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "expo.out", stagger: 0.08 });
        }
      });
    });

    /* ---- Come lavoriamo: il filo si tesse e il contatore scorre ---- */
    (function () {
      var wrap = document.querySelector(".p-steps");
      if (!wrap) return;
      var svg = wrap.querySelector(".p-thread"), bg = svg.querySelector(".bg"), fg = svg.querySelector(".fg");
      var steps = gsap.utils.toArray(".p-step"), reel = document.querySelector(".p-counter-reel");
      var len = 0;
      function build() {
        var h = wrap.offsetHeight, d = "M12 0", seg = 110, y = 0, side = 1;
        while (y < h) {
          var y2 = Math.min(h, y + seg);
          d += " C " + (12 + 9 * side) + " " + (y + seg * 0.35) + ", " + (12 + 9 * side) + " " + (y + seg * 0.65) + ", 12 " + y2;
          y = y2; side = -side;
        }
        svg.setAttribute("viewBox", "0 0 24 " + h);
        svg.style.height = h + "px";
        bg.setAttribute("d", d); fg.setAttribute("d", d);
        len = fg.getTotalLength();
        fg.style.strokeDasharray = len + " " + len;
      }
      build();
      ST.addEventListener("refreshInit", build);
      gsap.fromTo(fg, { strokeDashoffset: function () { return len; } }, {
        strokeDashoffset: 0, ease: "none",
        scrollTrigger: { trigger: wrap, start: "top 62%", end: "bottom 62%", scrub: true, invalidateOnRefresh: true }
      });
      function setStep(i) {
        steps.forEach(function (s, k) { s.classList.toggle("is-on", k === i); s.classList.toggle("is-lit", k <= i); });
        if (reel) gsap.to(reel, { yPercent: -25 * i, duration: 0.9, ease: "expo.out" });
      }
      steps.forEach(function (s, i) {
        ST.create({ trigger: s, start: "top 62%", end: "bottom 62%", onToggle: function (self) { if (self.isActive) setStep(i); } });
      });
      setStep(0);
    })();

    /* ---- Check-up: il blocco blu si apre a tutta pagina ---- */
    gsap.fromTo(".p-checkup-bg", { clipPath: "inset(6% 4% 6% 4% round 32px)" }, {
      clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none",
      scrollTrigger: { trigger: ".p-checkup", start: "top 95%", end: "top 20%", scrub: true }
    });

    /* ---- Chiusura e piè di pagina ---- */
    gsap.fromTo(".p-final-glow", { scale: 0.55, opacity: 0 }, {
      scale: 1, opacity: 1, ease: "none",
      scrollTrigger: { trigger: ".p-final", start: "top 85%", end: "center center", scrub: true }
    });
    gsap.from(".p-orb", { scale: 0, rotation: -90, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".p-orb", start: "top 92%", toggleActions: "play none none none" } });
    gsap.fromTo(".p-bigword span", { yPercent: 100 }, {
      yPercent: 0, ease: "none", stagger: 0.06,
      scrollTrigger: { trigger: ".p-bigword", start: "top bottom", end: "bottom bottom", scrub: 1 }
    });

    /* ---- Mouse: card che si inclinano, pulsanti magnetici ---- */
    if (finePointer) {
      gsap.utils.toArray("[data-tilt]").forEach(function (el) {
        gsap.set(el, { transformPerspective: 900 });
        var rx = gsap.quickTo(el, "rotationX", { duration: 0.6, ease: "power3.out" });
        var ry = gsap.quickTo(el, "rotationY", { duration: 0.6, ease: "power3.out" });
        el.addEventListener("pointermove", function (e) {
          var r = el.getBoundingClientRect();
          ry(((e.clientX - r.left) / r.width - 0.5) * 9);
          rx(-((e.clientY - r.top) / r.height - 0.5) * 9);
          el.style.setProperty("--mx", (e.clientX - r.left) + "px");
          el.style.setProperty("--my", (e.clientY - r.top) + "px");
        });
        el.addEventListener("pointerleave", function () { rx(0); ry(0); });
      });
      gsap.utils.toArray("[data-magnetic]").forEach(function (el) {
        var k = el.classList.contains("p-orb") ? 0.4 : 0.22;
        var xTo = gsap.quickTo(el, "x", { duration: 0.9, ease: "elastic.out(1, 0.35)" });
        var yTo = gsap.quickTo(el, "y", { duration: 0.9, ease: "elastic.out(1, 0.35)" });
        el.addEventListener("pointermove", function (e) {
          var r = el.getBoundingClientRect();
          xTo((e.clientX - r.left - r.width / 2) * k);
          yTo((e.clientY - r.top - r.height / 2) * k);
        });
        el.addEventListener("pointerleave", function () { xTo(0); yTo(0); });
      });
    }

    // Arrivo su una sezione: si scorre lì a posizioni ricalcolate (le sezioni bloccate allungano la pagina)
    if (deepLink) {
      ST.refresh();
      if (lenis) lenis.scrollTo(deepLink, { offset: -64, immediate: true, force: true });
      else deepLink.scrollIntoView();
    }

  }

  /* ============================================================
     IL TELAIO 3D — un tessuto di fili (ordito + trama) in prospettiva
     · onde lente · navette di luce che passano sulla trama
     · il mouse solleva il tessuto · scorrendo si distende e si appiattisce
     ============================================================ */
  function initWeave() {
    var canvas = document.getElementById("weave");
    if (!canvas || !canvas.getContext) return null;
    var ctx = canvas.getContext("2d");
    var hero = canvas.parentNode;
    var X0 = -1500, X1 = 1500, Z0 = -620, Z1 = 1750, D = 1150;
    var W = 0, H = 0, NX = 0, NZ = 0, xs, zs, sx, sy, ok, rowGlow, shuttles = [];
    var st = { weave: motion ? 0 : 1, t: motion ? 0 : 3 };
    var mx = 0.5, my = 0.5, tmx = 0.5, tmy = 0.5, mon = 0, tmon = 0, px = -9999, py = -9999;
    var running = false, raf = 0, last = 0;

    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var small = W < 760;
      NX = small ? 34 : 58; NZ = small ? 26 : 42;
      xs = new Float32Array(NX); zs = new Float32Array(NZ);
      for (var i = 0; i < NX; i++) xs[i] = X0 + (X1 - X0) * i / (NX - 1);
      for (var j = 0; j < NZ; j++) zs[j] = Z0 + (Z1 - Z0) * j / (NZ - 1);
      sx = new Float32Array(NX * NZ); sy = new Float32Array(NX * NZ); ok = new Uint8Array(NX * NZ);
      rowGlow = new Float32Array(NZ);
      shuttles = [];
      for (var k = 0; k < (small ? 3 : 5); k++) shuttles.push(newShuttle(true));
      if (!running) draw(0);
    }
    function newShuttle(initial) {
      return { row: 2 + Math.floor(Math.random() * NZ * 0.65), u: initial ? Math.random() : -0.3, v: 0.12 + Math.random() * 0.14, dir: Math.random() < 0.5 ? 1 : -1 };
    }
    function scrollProgress() {
      var r = hero.getBoundingClientRect();
      return clamp(-r.top / (r.height || 1), 0, 1);
    }
    function height(X, Z, t) {
      return Math.sin(X * 0.0030 + t * 0.55) * 52
           + Math.sin(Z * 0.0042 - t * 0.75 + X * 0.0012) * 40
           + Math.sin((X - Z) * 0.0019 + t * 0.35) * 30;
    }

    function project(t) {
      var p = scrollProgress(), e = p * p * (3 - 2 * p);
      var yaw = -0.42 + (mx - 0.5) * 0.16 + e * 0.3;
      var pitch = 0.5 + (my - 0.5) * 0.08 + e * 0.7;
      var amp = 1 - e * 0.7;
      var cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      var f = Math.max(W * 0.72, H * 1.05), cx = W * 0.6, cy = H * 0.5;
      var R2 = 2 * 150 * 150;
      for (var j = 0; j < NZ; j++) {
        var Z = zs[j];
        for (var i = 0; i < NX; i++) {
          var k = j * NX + i, X = xs[i], Y = height(X, Z, t) * amp;
          if (mon > 0.01 && ok[k]) {
            var dx = sx[k] - px, dy = sy[k] - py;
            Y += Math.exp(-(dx * dx + dy * dy) / R2) * 95 * mon;
          }
          var x1 = X * cyw - Z * syw, z1 = X * syw + Z * cyw;
          var y2 = Y * cp + z1 * sp, z2 = z1 * cp - Y * sp + D;
          if (z2 < 220) { ok[k] = 0; continue; }
          ok[k] = 1;
          sx[k] = cx + f * x1 / z2;
          sy[k] = cy - f * y2 / z2;
        }
      }
    }

    // Punto interpolato lungo una riga (indice frazionario)
    function rowPoint(j, fi, out) {
      var i0 = clamp(Math.floor(fi), 0, NX - 2), t = clamp(fi - i0, 0, 1), k = j * NX + i0;
      if (!ok[k] || !ok[k + 1]) return false;
      out[0] = sx[k] + (sx[k + 1] - sx[k]) * t;
      out[1] = sy[k] + (sy[k + 1] - sy[k]) * t;
      return true;
    }
    var pA = [0, 0], pB = [0, 0];

    function draw(dt) {
      var light = root.getAttribute("data-theme") === "light";
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H);
      project(st.t);

      // bagliore di fondo
      if (!light) {
        var bg = ctx.createRadialGradient(W * 0.66, H * 0.56, 0, W * 0.66, H * 0.56, Math.max(W, H) * 0.6);
        bg.addColorStop(0, "rgba(19,7,237,0.20)"); bg.addColorStop(1, "rgba(19,7,237,0)");
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      }

      var shown = st.weave * NZ, jMax = Math.min(NZ - 1, Math.floor(shown));
      if (shown <= 0.01) return;
      var top = sy[(NZ - 1) * NX + (NX >> 1)] || H * 0.2;
      var warpG = ctx.createLinearGradient(0, top - 30, 0, H);
      var weftG = ctx.createLinearGradient(0, top - 30, 0, H);
      if (light) {
        warpG.addColorStop(0, "rgba(9,12,8,0)"); warpG.addColorStop(0.45, "rgba(9,12,8,0.10)"); warpG.addColorStop(1, "rgba(9,12,8,0.2)");
        weftG.addColorStop(0, "rgba(19,7,237,0)"); weftG.addColorStop(0.45, "rgba(19,7,237,0.18)"); weftG.addColorStop(1, "rgba(19,7,237,0.34)");
      } else {
        warpG.addColorStop(0, "rgba(155,160,147,0)"); warpG.addColorStop(0.45, "rgba(155,160,147,0.16)"); warpG.addColorStop(1, "rgba(155,160,147,0.30)");
        weftG.addColorStop(0, "rgba(142,157,255,0)"); weftG.addColorStop(0.45, "rgba(142,157,255,0.30)"); weftG.addColorStop(1, "rgba(142,157,255,0.55)");
      }

      var i, j, k, s;
      // ordito (fili che vanno in profondità)
      ctx.lineWidth = 1; ctx.strokeStyle = warpG;
      ctx.beginPath();
      for (i = 0; i < NX; i++) {
        s = false;
        for (j = 0; j <= jMax; j++) {
          k = j * NX + i;
          if (!ok[k]) { s = false; continue; }
          if (s) ctx.lineTo(sx[k], sy[k]); else { ctx.moveTo(sx[k], sy[k]); s = true; }
        }
      }
      ctx.stroke();

      // trama (fili trasversali): l'ultima riga si sta tessendo
      ctx.strokeStyle = weftG;
      for (j = 0; j <= jMax; j++) {
        var frac = (j === jMax && jMax < NZ - 1) ? shown - jMax : 1;
        var iEnd = Math.floor(frac * (NX - 1));
        if (iEnd < 1) continue;
        ctx.beginPath(); s = false;
        for (i = 0; i <= iEnd; i++) {
          k = j * NX + i;
          if (!ok[k]) { s = false; continue; }
          if (s) ctx.lineTo(sx[k], sy[k]); else { ctx.moveTo(sx[k], sy[k]); s = true; }
        }
        var g = rowGlow[j];
        ctx.globalAlpha = Math.min(1, 0.6 + g * 1.4);
        ctx.lineWidth = 1 + g * 0.9;
        ctx.stroke();
        rowGlow[j] = g * Math.pow(0.3, dt);
      }
      ctx.globalAlpha = 1;

      if (reduce || st.weave < 0.98) return;

      // navette di luce
      ctx.globalCompositeOperation = light ? "source-over" : "lighter";
      for (var n = 0; n < shuttles.length; n++) {
        var sh = shuttles[n];
        sh.u += sh.v * dt;
        if (sh.u > 1.3) { shuttles[n] = newShuttle(false); continue; }
        if (sh.row > jMax) continue;
        var pos = sh.dir > 0 ? sh.u : 1 - sh.u;
        var head = pos * (NX - 1), tail = head - sh.dir * 0.24 * (NX - 1);
        if (head < 0 || head > NX - 1) continue;
        rowGlow[sh.row] = Math.max(rowGlow[sh.row], 0.7);
        if (!rowPoint(sh.row, head, pA) || !rowPoint(sh.row, clamp(tail, 0, NX - 1), pB)) continue;
        var lg = ctx.createLinearGradient(pB[0], pB[1], pA[0], pA[1]);
        lg.addColorStop(0, light ? "rgba(19,7,237,0)" : "rgba(142,157,255,0)");
        lg.addColorStop(1, light ? "rgba(19,7,237,0.9)" : "rgba(220,226,255,0.95)");
        ctx.strokeStyle = lg; ctx.lineWidth = 2.2;
        ctx.beginPath();
        var a = Math.min(head, tail), b = Math.max(head, tail), started = false;
        for (var fi = a; fi <= b; fi += 0.5) {
          if (!rowPoint(sh.row, clamp(fi, 0, NX - 1), pB)) { started = false; continue; }
          if (started) ctx.lineTo(pB[0], pB[1]); else { ctx.moveTo(pB[0], pB[1]); started = true; }
        }
        ctx.lineTo(pA[0], pA[1]);
        ctx.stroke();
        var hg = ctx.createRadialGradient(pA[0], pA[1], 0, pA[0], pA[1], 28);
        hg.addColorStop(0, light ? "rgba(19,7,237,0.35)" : "rgba(63,54,245,0.75)");
        hg.addColorStop(1, "rgba(19,7,237,0)");
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(pA[0], pA[1], 28, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = light ? "#1307ED" : "#fff";
        ctx.beginPath(); ctx.arc(pA[0], pA[1], 2.2, 0, Math.PI * 2); ctx.fill();
      }

      // nodi accesi vicino al mouse
      if (mon > 0.02) {
        ctx.fillStyle = light ? "rgba(19,7,237,1)" : "rgba(190,200,255,1)";
        for (k = 0; k < NX * (jMax + 1); k++) {
          if (!ok[k]) continue;
          var dx = sx[k] - px, dy = sy[k] - py, d2 = dx * dx + dy * dy;
          if (d2 > 32400) continue;
          ctx.globalAlpha = (1 - Math.sqrt(d2) / 180) * mon * 0.9;
          ctx.fillRect(sx[k] - 1.3, sy[k] - 1.3, 2.6, 2.6);
        }
        ctx.globalAlpha = 1;
      }
      ctx.globalCompositeOperation = "source-over";
    }

    function frame(now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      st.t += dt;
      mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05; mon += (tmon - mon) * 0.08;
      draw(dt);
      raf = requestAnimationFrame(frame);
    }
    function start() { if (running || !motion) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    hero.addEventListener("pointermove", function (e) {
      var r = canvas.getBoundingClientRect();
      px = e.clientX - r.left; py = e.clientY - r.top;
      tmx = px / (W || 1); tmy = py / (H || 1); tmon = e.pointerType === "mouse" ? 1 : 0;
    });
    hero.addEventListener("pointerleave", function () { tmon = 0; tmx = 0.5; tmy = 0.5; });
    window.addEventListener("resize", resize);
    window.__loomRedraw = function () { if (!running) draw(0); }; // chiamata da script.js al cambio tema

    resize();
    if (motion && "IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) start(); else stop(); }); }).observe(hero);
    } else if (motion) start();
    return st;
  }
})();
