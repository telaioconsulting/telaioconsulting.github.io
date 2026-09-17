/* ============================================================
   TELAIO — interazioni. Nessun tracker, nessun cookie.
   Vanilla JS, nessuna libreria/build. Rispetta prefers-reduced-motion.
   ============================================================ */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Cambio tema (scuro predefinito ⇄ chiaro) ---- */
  var themeBtn = document.getElementById("themeBtn");
  var STORAGE_KEY = "telaio-theme";

  function applyTheme(theme) {
    if (theme === "light") {
      root.setAttribute("data-theme", "light");
      if (themeBtn) { themeBtn.textContent = "☾"; themeBtn.setAttribute("aria-label", "Passa al tema scuro"); }
    } else {
      root.removeAttribute("data-theme");
      if (themeBtn) { themeBtn.textContent = "◐"; themeBtn.setAttribute("aria-label", "Passa al tema chiaro"); }
    }
    if (typeof window.__loomRedraw === "function") window.__loomRedraw();
  }
  try { if (localStorage.getItem(STORAGE_KEY) === "light") applyTheme("light"); } catch (e) {}
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      applyTheme(next);
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
  }
  window.addEventListener("resize", function () { if (window.innerWidth > 720) closeMenu(); });

  /* ---- Modulo contatti: apre l'email con il messaggio già pronto ---- */
  var form = document.getElementById("contactForm");
  if (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var nome = (form.nome.value || "").trim();
      var email = (form.email.value || "").trim();
      var messaggio = (form.messaggio.value || "").trim();
      var isEn = (document.documentElement.lang || "it").toLowerCase().indexOf("en") === 0;
      var oggetto = (isEn ? "Website enquiry — " : "Richiesta dal sito — ") + (nome || (isEn ? "new contact" : "nuovo contatto"));
      var corpo = (isEn ? "Name: " : "Nome: ") + nome + "\n" + "Email: " + email + "\n\n" + messaggio + "\n";
      window.location.href = "mailto:info@telaioconsulting.com?subject=" + encodeURIComponent(oggetto) + "&body=" + encodeURIComponent(corpo);
    });
  }

  /* ---- Anno corrente nel footer ---- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---- Reveal "tessuto" del titolo (carattere per carattere) ---- */
  (function () {
    var h = document.querySelector(".reveal-h");
    if (!h) return;
    var i = 0, kids = Array.prototype.slice.call(h.childNodes);
    h.innerHTML = "";
    kids.forEach(function (node) {
      if (node.nodeType === 3) {
        Array.prototype.forEach.call(node.textContent, function (chr) {
          var s = document.createElement("span"); s.className = "ch"; s.style.setProperty("--i", i++); s.textContent = chr; h.appendChild(s);
        });
      } else if (node.nodeName === "BR") {
        h.appendChild(document.createElement("br"));
      } else {
        node.classList.add("ch"); node.style.setProperty("--i", i++); h.appendChild(node);
      }
    });
  })();

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
    // toggle: si ri-anima ogni volta che la sezione entra/esce dalla viewport
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.target.classList.toggle("in", e.isIntersecting); });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---- Voce di menu attiva in base alla sezione visibile ---- */
  (function () {
    if (!("IntersectionObserver" in window)) return;
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]'));
    if (!links.length) return;
    var map = {};
    links.forEach(function (a) { var id = a.getAttribute("href").slice(1); if (id) map[id] = a; });
    var secs = Object.keys(map).map(function (id) { return document.getElementById(id); }).filter(Boolean);
    if (!secs.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          links.forEach(function (a) { a.classList.remove("active"); });
          if (map[e.target.id]) map[e.target.id].classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    secs.forEach(function (s) { io.observe(s); });
  })();

  /* ---- Spotlight che segue il cursore + navetta del "Perché" ---- */
  (function () {
    var spots = document.querySelectorAll('.card, .founder, .values li, .contact-panel');
    spots.forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
    if ("IntersectionObserver" in window) {
      var row = document.querySelector('.why-row');
      if (row) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { e.target.classList.toggle("lit", e.isIntersecting); });
        }, { threshold: 0.3 });
        io.observe(row);
      }
    }
  })();

  /* ============================================================
     LA TRAMA — visual generativo "telaio" (ordito + trama)
     · navetta di luce diagonale · reattivo al mouse (increspatura +
       incrocio ordito/trama) · parallax · dissolvenza allo scroll
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

      // bloom focale
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
      // ORDITO
      for (i = 0; i < cols.length; i++) {
        bx = cols[i]; ctx.beginPath(); s = false;
        for (y = -GAP * 2; y <= H + GAP * 2; y += 6) {
          x = bx + baseDX(bx, y); yy = y; u = push(bx, y); if (u) { x += u[0]; yy += u[1]; }
          if (s) ctx.lineTo(x, yy); else { ctx.moveTo(x, yy); s = true; }
        }
        ctx.strokeStyle = P.line; ctx.lineWidth = 1; ctx.stroke();
      }
      // TRAMA
      for (j = 0; j < rows.length; j++) {
        by = rows[j]; ctx.beginPath(); s = false;
        for (x = -GAP * 2; x <= W + GAP * 2; x += 6) {
          xx = x; y = by + baseDY(x, by); u = push(x, by); if (u) { xx += u[0]; y += u[1]; }
          if (s) ctx.lineTo(xx, y); else { ctx.moveTo(xx, y); s = true; }
        }
        ctx.strokeStyle = P.warp; ctx.lineWidth = 1; ctx.stroke();
      }
      // NODI
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
      // CROCE sotto il cursore (la navetta infila ordito + trama)
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

    var last = performance.now();
    function loop(now) { t += (now - last) / 1000; last = now; draw(); applyParallaxDOM(); requestAnimationFrame(loop); }

    if (hero) {
      hero.addEventListener("pointermove", function (e) { var r = canvas.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top; pointerOn = true; });
      hero.addEventListener("pointerleave", function () { pointerOn = false; });
    }
    window.addEventListener("scroll", function () { scrollY = window.scrollY || window.pageYOffset || 0; }, { passive: true });
    window.addEventListener("resize", function () { resize(); if (reduce) draw(); });

    resize();
    if (reduce) { draw(); } else { last = performance.now(); requestAnimationFrame(loop); }
  })();
})();
