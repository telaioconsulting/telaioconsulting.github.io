/* ============================================================
   TELAIO — interazioni. Nessun tracker, nessun cookie.
   Vanilla JS, nessuna libreria/build. Rispetta prefers-reduced-motion.
   ============================================================ */
(function () {
  "use strict";
  window.__telaio = true; // lo script è partito: lo snippet nell'<head> lascia la classe .js
  var root = document.documentElement;
  root.classList.add("js"); // se lo script è arrivato tardi, ripristina la classe
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isEn = (root.lang || "it").toLowerCase().indexOf("en") === 0;

  /* Indirizzi di incorporamento del calendario Google (Calendar › pagina di
     prenotazione › Condividi › Incorpora › "Pagina di prenotazione in linea").
     Finché restano vuoti, il riquadro mostra l'email. */
  var BOOKING_EMBED_URL_IT = "";
  var BOOKING_EMBED_URL_EN = "";

  /* ---- Cambio tema (scuro predefinito ⇄ chiaro) ---- */
  var themeBtn = document.getElementById("themeBtn");
  var STORAGE_KEY = "telaio-theme";
  function applyTheme(theme) {
    if (theme === "light") {
      root.setAttribute("data-theme", "light");
      if (themeBtn) { themeBtn.textContent = "☾"; themeBtn.setAttribute("aria-label", isEn ? "Switch to dark theme" : "Passa al tema scuro"); }
    } else {
      root.removeAttribute("data-theme");
      if (themeBtn) { themeBtn.textContent = "◐"; themeBtn.setAttribute("aria-label", isEn ? "Switch to light theme" : "Passa al tema chiaro"); }
    }
    // anche la barra del browser sul telefono prende il colore del tema
    var tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.content = theme === "light" ? "#F4F5F8" : "#090C08";
    if (typeof window.__loomRedraw === "function") window.__loomRedraw();
    // gli effetti disegnati (tessuto, trama, numeri…) ascoltano questo evento e si ridisegnano coi colori del tema
    document.dispatchEvent(new CustomEvent("telaio:tema", { detail: { tema: theme === "light" ? "light" : "dark" } }));
  }
  try { if (localStorage.getItem(STORAGE_KEY) === "light") applyTheme("light"); } catch (e) {}
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      // tutta la pagina passa al nuovo tema in dissolvenza, insieme (dove il browser lo permette)
      if (document.startViewTransition && !reduce) document.startViewTransition(function () { applyTheme(next); });
      else applyTheme(next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
    });
  }

  /* ---- Menu mobile ---- */
  var menuBtn = document.getElementById("menuBtn");
  var nav = document.getElementById("nav");
  function closeMenu() { if (nav) { nav.classList.remove("open"); if (menuBtn) menuBtn.setAttribute("aria-expanded", "false"); } }
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (ev) { if (ev.target.tagName === "A") closeMenu(); });
    // si chiude anche con Esc o toccando fuori dal menu
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && nav.classList.contains("open")) { closeMenu(); menuBtn.focus(); }
    });
    document.addEventListener("click", function (ev) {
      if (nav.classList.contains("open") && !nav.contains(ev.target) && !menuBtn.contains(ev.target)) closeMenu();
    });
  }
  window.addEventListener("resize", function () { if (window.innerWidth > 1120) closeMenu(); });

  /* ---- Reveal allo scroll (con stagger nei gruppi) ---- */
  (function () {
    document.querySelectorAll("[data-stagger]").forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, idx) {
        if (child.classList.contains("reveal")) child.style.setProperty("--d", (idx * 80) + "ms");
      });
    });
    var els = document.querySelectorAll(".reveal");
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.target.classList.toggle("in", e.isIntersecting); });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---- Spotlight che segue il cursore (card, fondatori, valori) ---- */
  document.querySelectorAll(".card, .founder, .values li").forEach(function (el) {
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty("--mx", (e.clientX - r.left) + "px");
      el.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });

  /* ---- Prenotazione: carica il calendario di Google solo al clic ---- */
  (function () {
    var box = document.querySelector("[data-booking]");
    if (!box) return;
    box.hidden = false; // visibile solo con JavaScript; senza JS vale il <noscript>
    var url = isEn ? (BOOKING_EMBED_URL_EN || BOOKING_EMBED_URL_IT) : BOOKING_EMBED_URL_IT;
    if (!url) {
      box.innerHTML = isEn
        ? '<p>Write to us at <a href="mailto:info@telaioconsulting.com" data-email-link>info@telaioconsulting.com</a> and we’ll suggest a day and time.</p>'
        : '<p>Scrivici a <a href="mailto:info@telaioconsulting.com" data-email-link>info@telaioconsulting.com</a>: ti proponiamo noi giorno e ora.</p>';
      return;
    }
    var btn = box.querySelector("[data-booking-loader]");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var f = document.createElement("iframe");
      f.src = url; f.className = "booking-frame"; f.loading = "lazy";
      f.title = isEn ? "Booking calendar" : "Calendario di prenotazione";
      box.innerHTML = "";
      box.appendChild(f);
    });
  })();

  /* ---- Barra fissa su telefono col pulsante principale ---- */
  (function () {
    var bar = document.querySelector(".mobile-bar");
    if (!bar) return;
    // La barra si nasconde quando sullo schermo c'è già un pulsante del check-up, il riquadro
    // di prenotazione o il fondo della pagina: mai due pulsanti uguali uno sopra l'altro.
    var hiders = [].slice.call(document.querySelectorAll("[data-booking], .booking-box, a[data-cta='checkup'], .p-final, footer"))
      .filter(function (el) { return !bar.contains(el) && !(el.closest && el.closest(".top")); });
    var inView = 0;
    function update() {
      var past = (window.scrollY || window.pageYOffset || 0) > 300;
      var menuOpen = nav && nav.classList.contains("open");
      if (past && !inView && !menuOpen) bar.classList.add("show");
      else bar.classList.remove("show");
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    if (menuBtn) menuBtn.addEventListener("click", function () { setTimeout(update, 0); });
    if (hiders.length && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting === !!e.target.__inView) return;
          e.target.__inView = e.isIntersecting;
          inView += e.isIntersecting ? 1 : -1;
        });
        update();
      }, { threshold: 0 });
      hiders.forEach(function (el) { io.observe(el); });
    }
    update();
  })();

  /* ============================================================
     LA TRAMA — visual generativo "telaio" (ordito + trama)
     · navetta di luce diagonale · reattivo al mouse · parallax
     ============================================================ */
  (function () {
    var canvas = document.getElementById("loom");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var hero = document.querySelector(".hero");
    var heroIn = document.querySelector(".hero-in");

    var GAP = 40, R = 150, PUSH = 22;
    var W = 0, H = 0, dpr = 1, cols = [], rows = [], t = 0;
    var tx = -999, ty = -999, px = -999, py = -999, pa = 0, pointerOn = false;
    var parX = 0, parY = 0, scrollY = 0;

    function palette() {
      var light = root.getAttribute("data-theme") === "light";
      return light
        ? { line: "rgba(9,12,8,0.16)", warp: "rgba(9,12,8,0.06)", rest: "rgba(9,12,8,0.20)", brand: [19, 7, 237], weft: [46, 62, 168] }
        : { line: "rgba(58,63,50,0.55)", warp: "rgba(155,160,147,0.10)", rest: "rgba(155,160,147,0.16)", brand: [19, 7, 237], weft: [142, 157, 255] };
    }
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = []; for (var x = -GAP; x <= W + GAP; x += GAP) cols.push(x);
      rows = []; for (var y = -GAP; y <= H + GAP; y += GAP) rows.push(y);
    }
    function lerp(a, b, k) { return a + (b - a) * k; }
    function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

    function draw() {
      var P = palette();
      var isLight = root.getAttribute("data-theme") === "light";
      ctx.clearRect(0, 0, W, H);
      var amp = reduce ? 0 : 3.2, time = t;

      px += (tx - px) * 0.14; py += (ty - py) * 0.14;
      pa += (((pointerOn && !reduce) ? 1 : 0) - pa) * 0.08;

      var tpx = reduce ? 0 : ((px - W / 2) / (W / 2 || 1)) * 14 * pa;
      var tpy = reduce ? 0 : ((py - H / 2) / (H / 2 || 1)) * 10 * pa;
      parX += (tpx - parX) * 0.08; parY += (tpy - parY) * 0.08;
      var pxL = px - parX, pyL = py - parY;

      ctx.save();
      ctx.translate(parX, parY);

      var fx = W * 0.72, fy = H * 0.52, fr = Math.max(W, H) * 0.5;
      var b = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
      b.addColorStop(0, rgba(P.brand, isLight ? 0.05 : 0.09)); b.addColorStop(1, rgba(P.brand, 0));
      ctx.fillStyle = b; ctx.fillRect(-GAP * 2, -GAP * 2, W + GAP * 4, H + GAP * 4);

      function baseDX(bx, y) { return Math.sin(y * 0.012 + time * 0.6 + bx * 0.02) * amp; }
      function baseDY(x, by) { return Math.cos(x * 0.012 + time * 0.6 + by * 0.02) * amp; }
      function push(x, y) {
        if (pa < 0.003) return null;
        var ex = x - pxL, ey = y - pyL, dist = Math.hypot(ex, ey);
        if (dist >= R) return null;
        var f = 1 - dist / R, p = f * f * PUSH * pa, inv = dist > 0.001 ? 1 / dist : 0;
        return [ex * inv * p, ey * inv * p, f];
      }

      var period = 8.2, ph = (time % period) / period, wavePos = -0.25 + ph * 1.5;
      function diag(x, y) { return (x / W) * 0.68 + (y / H) * 0.32; }

      var i, j, s, u, x, y, bx, by, xx, yy;
      for (i = 0; i < cols.length; i++) {
        bx = cols[i]; ctx.beginPath(); s = false;
        for (y = -GAP * 2; y <= H + GAP * 2; y += 6) {
          x = bx + baseDX(bx, y); yy = y; u = push(bx, y); if (u) { x += u[0]; yy += u[1]; }
          if (s) ctx.lineTo(x, yy); else { ctx.moveTo(x, yy); s = true; }
        }
        ctx.strokeStyle = P.line; ctx.lineWidth = 1; ctx.stroke();
      }
      for (j = 0; j < rows.length; j++) {
        by = rows[j]; ctx.beginPath(); s = false;
        for (x = -GAP * 2; x <= W + GAP * 2; x += 6) {
          xx = x; y = by + baseDY(x, by); u = push(x, by); if (u) { xx += u[0]; y += u[1]; }
          if (s) ctx.lineTo(xx, y); else { ctx.moveTo(xx, y); s = true; }
        }
        ctx.strokeStyle = P.warp; ctx.lineWidth = 1; ctx.stroke();
      }
      for (i = 0; i < cols.length; i++) {
        for (j = 0; j < rows.length; j++) {
          bx = cols[i]; by = rows[j];
          x = bx + baseDX(bx, by); y = by + baseDY(bx, by); var near = 0;
          u = push(bx, by); if (u) { x += u[0]; y += u[1]; near = u[2]; }
          var dw = Math.abs(diag(bx, by) - wavePos);
          var glow = reduce ? 0 : Math.max(0, 1 - dw / 0.10);
          glow = Math.max(glow, near * 0.95);
          ctx.fillStyle = P.rest; ctx.fillRect(x - 1, y - 1, 2, 2);
          if (glow > 0.02) {
            var col = glow > 0.5 ? P.weft : P.brand, r = lerp(1.2, 4.8, glow);
            var g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
            g.addColorStop(0, rgba(col, 0.5 * glow)); g.addColorStop(1, rgba(col, 0));
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = rgba(col, 0.9 * glow); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = rgba(col, 0.75 * glow); ctx.lineWidth = 1.4; ctx.beginPath();
            if ((i + j) % 2 === 0) { ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); } else { ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5); }
            ctx.stroke();
          }
        }
      }
      if (!reduce && pa > 0.02) {
        var a = 0.30 * pa; ctx.lineWidth = 1.4; ctx.strokeStyle = rgba(P.weft, a);
        var ci = Math.max(0, Math.min(cols.length - 1, Math.round((pxL - cols[0]) / GAP)));
        var ri = Math.max(0, Math.min(rows.length - 1, Math.round((pyL - rows[0]) / GAP)));
        bx = cols[ci]; ctx.beginPath(); s = false;
        for (y = -GAP * 2; y <= H + GAP * 2; y += 6) { x = bx + baseDX(bx, y); yy = y; u = push(bx, y); if (u) { x += u[0]; yy += u[1]; } if (s) ctx.lineTo(x, yy); else { ctx.moveTo(x, yy); s = true; } }
        ctx.stroke();
        by = rows[ri]; ctx.beginPath(); s = false;
        for (x = -GAP * 2; x <= W + GAP * 2; x += 6) { xx = x; y = by + baseDY(x, by); u = push(x, by); if (u) { xx += u[0]; y += u[1]; } if (s) ctx.lineTo(xx, y); else { ctx.moveTo(xx, y); s = true; } }
        ctx.stroke();
      }
      ctx.restore();
    }
    window.__loomRedraw = function () { if (reduce) draw(); };

    function applyParallaxDOM() {
      if (reduce || !heroIn) return;
      var fade = Math.max(0, 1 - scrollY / (H * 0.9 || 1));
      heroIn.style.transform = "translate3d(" + (-parX * 0.5).toFixed(2) + "px," + (-parY * 0.5 - scrollY * 0.14).toFixed(2) + "px,0)";
      heroIn.style.opacity = fade.toFixed(3);
      canvas.style.transform = "translate3d(0," + (scrollY * 0.28).toFixed(2) + "px,0)";
    }

    // L'animazione gira solo mentre la hero è sullo schermo.
    var last = performance.now(), running = false, rafId = 0;
    function loop(now) {
      if (!running) return;
      t += (now - last) / 1000; last = now;
      draw(); applyParallaxDOM();
      rafId = requestAnimationFrame(loop);
    }
    function start() { if (running) return; running = true; last = performance.now(); rafId = requestAnimationFrame(loop); }
    function stop() { running = false; cancelAnimationFrame(rafId); }

    if (hero) {
      hero.addEventListener("pointermove", function (e) { var r = canvas.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top; pointerOn = true; });
      hero.addEventListener("pointerleave", function () { pointerOn = false; });
    }
    window.addEventListener("scroll", function () { scrollY = window.scrollY || window.pageYOffset || 0; }, { passive: true });
    window.addEventListener("resize", function () { resize(); if (reduce) draw(); });

    resize();
    if (reduce) { draw(); }
    else if (hero && "IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) start(); else stop(); });
      }).observe(hero);
    } else { start(); }
  })();
})();

/* ============================================================
   DETTAGLI: cambio pagina col filo · marchio che si tesse ·
   link e pulsanti cuciti. Gli stili sono in fondo a motion.css.
   Blocco a sé, con le sue variabili: si toglie tutto insieme.
   ============================================================ */
(function () {
  "use strict";
  var root = document.documentElement;
  var NS = "http://www.w3.org/2000/svg";
  var CURVA = "cubic-bezier(.77, 0, .175, 1)"; // come --p-ease-in-out in motion.css
  var riduci = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var anima = !riduci && typeof Element.prototype.animate === "function";

  function nodo(nome, attr, padre) {
    var n = document.createElementNS(NS, nome);
    for (var k in attr) n.setAttribute(k, attr[k]);
    if (padre) padre.appendChild(n);
    return n;
  }

  /* ---------- 1 · Cambio pagina col filo ----------
     La transizione la fa il browser (motion.css). Qui, un attimo prima che la pagina che se ne va
     venga fotografata («pageswap»): si chiude il menu del telefono e si aggiunge il filo, che così
     ha una sua immagine e può attraversare lo schermo sopra la pagina e sotto la testata.
     Verso una home che deve ancora mostrare l'apertura il filo non serve: l'ingresso lo fa
     l'apertura, che tiene anche la testata fuori dallo schermo. */
  window.addEventListener("pageswap", function (e) {
    var vt = e.viewTransition;
    if (!vt) return;
    var verso = "", apertura = false;
    try { verso = new URL(e.activation.entry.url).pathname; } catch (err) {}
    try { apertura = sessionStorage.getItem("telaio-intro") !== "1"; } catch (err) {}
    if (apertura && /^\/(en\/)?(index\.html)?$/.test(verso)) {
      if (vt.ready) vt.ready.catch(function () {});
      vt.skipTransition();
      return;
    }
    var nav = document.getElementById("nav"), menuBtn = document.getElementById("menuBtn");
    if (nav) nav.classList.remove("open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
    if (!document.querySelector(".p-filo")) {
      var filo = document.createElement("div");
      filo.className = "p-filo";
      filo.setAttribute("aria-hidden", "true");
      document.body.appendChild(filo);
    }
  });
  // tornando indietro a una pagina rimasta in memoria, il filo non deve restare sul bordo
  window.addEventListener("pageshow", function () {
    var filo = document.querySelector(".p-filo");
    if (filo) filo.parentNode.removeChild(filo);
  });

  /* ---------- 2 · Il marchio che si tesse ----------
     Il # del marchio (simbolo #mk, griglia 64): due fili d'ordito verticali (x 24 e 40) e due di
     trama orizzontali (y 24 e 40), tutti da 10 a 54. Ogni incrocio alterna sopra e sotto: la trama
     in alto passa sotto l'ordito di sinistra e sopra quello di destra, quella in basso il contrario.
     - parti: i tratti che si vedono (gli stessi del simbolo);
     - ponte: il pezzo d'ordito che c'è finché la trama non ci passa sopra; lo cancella una maschera
       che avanza insieme a quella trama ("sotto");
     - t, d: partenza e durata in ms (in tutto 760 ms).
     Ogni filo ha una penna che corre a velocità costante lungo tutto il filo: dove il filo passa
     sotto, la penna c'è ma il tratto non si vede. */
  var DA = 10, LUNGO = 44, serie = 0;
  var FILI = [
    { v: true,  c: 24, parti: [[10, 32], [48, 54]], ponte: [32, 48], sotto: 3, t: 0,   d: 360 },
    { v: true,  c: 40, parti: [[10, 16], [32, 54]], ponte: [16, 32], sotto: 2, t: 70,  d: 360 },
    { v: false, c: 24, parti: [[10, 16], [32, 54]], t: 300, d: 380 },
    { v: false, c: 40, parti: [[10, 32], [48, 54]], t: 380, d: 380 }
  ];
  function linea(f, da, a) { return f.v ? "M" + f.c + " " + da + "V" + a : "M" + da + " " + f.c + "H" + a; }

  // sostituisce il <use> con i tratti veri (a riposo il disegno è identico al simbolo)
  function costruisci(svg) {
    var id = "p-tessi-" + (++serie), pezzi = [];
    svg.textContent = "";
    var defs = nodo("defs", {}, svg);
    var g = nodo("g", { fill: "none", stroke: "currentColor", "stroke-width": 7, "stroke-linecap": "round" }, svg);
    FILI.forEach(function (f, i) {
      f.parti.forEach(function (p) {
        pezzi.push({ f: f, da: p[0], a: p[1], n: nodo("path", { d: linea(f, p[0], p[1]) }, g) });
      });
      if (!f.ponte) return;
      var trama = FILI[f.sotto];
      var m = nodo("mask", { id: id + "-" + i, maskUnits: "userSpaceOnUse", x: 0, y: 0, width: 64, height: 64 }, defs);
      nodo("rect", { width: 64, height: 64, fill: "#fff" }, m);
      // l'ombra della trama nella maschera: larga, avanza col suo filo e cancella il ponte
      pezzi.push({ f: trama, da: DA, a: DA + LUNGO, ombra: true,
        n: nodo("path", { d: linea(trama, DA, DA + LUNGO), stroke: "#000", "stroke-width": 30, fill: "none" }, m) });
      pezzi.push({ f: f, da: f.ponte[0], a: f.ponte[1],
        n: nodo("path", { d: linea(f, f.ponte[0], f.ponte[1]), "class": "p-ponte", mask: "url(#" + id + "-" + i + ")" }, g) });
    });
    return pezzi;
  }

  function tessi(svg) {
    if (!anima || svg.__tessendo) return;
    if (!svg.__pezzi) svg.__pezzi = costruisci(svg);
    svg.__tessendo = true;
    svg.classList.add("is-tessendo");
    var anims = svg.__pezzi.map(function (p) {
      var lung = p.a - p.da, dash = lung + " " + (lung + 20);
      // nascosto: il trattino sta tutto prima dell'inizio (+1 perché la punta tonda non lasci un puntino)
      var vuoto = p.ombra ? lung : lung + 1;
      var on = (p.da - DA) / LUNGO, off = (p.a - DA) / LUNGO; // quando la penna del filo entra ed esce dal tratto
      return p.n.animate([
        { strokeDasharray: dash, strokeDashoffset: vuoto, offset: 0 },
        { strokeDasharray: dash, strokeDashoffset: vuoto, offset: on },
        { strokeDasharray: dash, strokeDashoffset: 0, offset: off },
        { strokeDasharray: dash, strokeDashoffset: 0, offset: 1 }
      ], { duration: p.f.d, delay: p.f.t, easing: CURVA, fill: "both" });
    });
    svg.classList.add("p-tessuto"); // ora le animazioni lo tengono vuoto: si può mostrare
    function fine() {
      anims.forEach(function (a) { a.cancel(); });
      svg.classList.remove("is-tessendo");
      svg.__tessendo = false;
    }
    Promise.all(anims.map(function (a) { return a.finished; })).then(fine, fine);
  }

  var marchio = document.querySelector(".top .brand .mk");
  if (marchio) {
    // al passaggio del mouse sul logo si ritesse (non mentre si sta già tessendo)
    var brand = marchio.closest ? marchio.closest(".brand") : null;
    if (brand) brand.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") tessi(marchio); });
    // all'arrivo si tesse, tranne arrivando col filo e sulla home con l'apertura.
    // Se «pagereveal» non è ancora arrivato si aspetta: è lui a dire se la pagina arriva col filo.
    var conApertura = !!document.querySelector(".p-intro") && root.classList.contains("motion") && !root.classList.contains("no-intro");
    var allArrivo = function (colFilo) {
      if (colFilo || conApertura || !anima) marchio.classList.add("p-tessuto");
      else tessi(marchio);
    };
    if (!("onpagereveal" in window) || root.classList.contains("p-rivelata") || root.classList.contains("p-filo-arrivo")) {
      allArrivo(root.classList.contains("p-filo-arrivo"));
    } else {
      window.addEventListener("pagereveal", function (e) { allArrivo(!!e.viewTransition); }, { once: true });
    }
  }

  /* ---------- 3 · Link e pulsanti cuciti ---------- */
  // link con la freccia: il testo va in uno <span> in linea, che porta la cucitura (motion.css)
  document.querySelectorAll(".arrow-link").forEach(function (a) {
    if (a.querySelector(".p-cuci")) return;
    var s = document.createElement("span");
    s.className = "p-cuci";
    while (a.firstChild) s.appendChild(a.firstChild);
    a.appendChild(s);
  });

  // pulsanti: un filo fa una volta il giro del bordo quando arriva il mouse. Finisce il giro anche se
  // il mouse esce; rientrando a metà giro non riparte da capo. Il rettangolo sta a 0,75 px dal bordo
  // esterno (metà del tratto da 1,5 px), con l'angolo di 3 px del pulsante.
  document.querySelectorAll(".btn-primary").forEach(function (btn) {
    var svg = nodo("svg", { "class": "p-btn-filo", "aria-hidden": "true", focusable: "false" });
    var r = nodo("rect", { x: 0.75, y: 0.75, rx: 2.25 }, svg);
    btn.appendChild(svg);
    btn.addEventListener("pointerenter", function (e) {
      if (e.pointerType !== "mouse" || !anima) return;
      if (btn.__filo && btn.__filo.playState === "running") return;
      var w = btn.offsetWidth - 1.5, h = btn.offsetHeight - 1.5, rr = 2.25;
      r.setAttribute("width", w);
      r.setAttribute("height", h);
      var giro = 2 * (w + h) - 8 * rr + 2 * Math.PI * rr; // perimetro con gli angoli tondi
      // il filo nasce dall'angolo in alto a sinistra, si allunga mentre corre e si chiude dove è partito
      btn.__filo = r.animate([
        { strokeDasharray: "0 " + giro, strokeDashoffset: 0 },
        { strokeDasharray: giro * 0.3 + " " + giro * 0.7, strokeDashoffset: -giro * 0.35 },
        { strokeDasharray: "0 " + giro, strokeDashoffset: -giro }
      ], { duration: 700, easing: CURVA });
    });
  });
})();
