/* ============================================================
   TELAIO — interazioni. Nessun tracker, nessun cookie.
   Vanilla JS, nessuna libreria/build. Le animazioni sono in motion.js.
   ============================================================ */
(function () {
  "use strict";
  window.__telaio = true; // lo script è partito: lo snippet nell'<head> lascia la classe .js
  var root = document.documentElement;
  root.classList.add("js"); // se lo script è arrivato tardi, ripristina la classe
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
    if (typeof window.__loomRedraw === "function") window.__loomRedraw(); // il tessuto della hero (motion.js)
    // gli effetti disegnati (tessuto, trama, numeri…) ascoltano questo evento e si ridisegnano coi colori del tema
    document.dispatchEvent(new CustomEvent("telaio:tema", { detail: { tema: theme === "light" ? "light" : "dark" } }));
  }
  try { if (localStorage.getItem(STORAGE_KEY) === "light") applyTheme("light"); } catch (e) {}
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      // tutta la pagina passa al nuovo tema in dissolvenza, insieme (dove il browser lo permette)
      var fermo = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (document.startViewTransition && !fermo) document.startViewTransition(function () { applyTheme(next); });
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
