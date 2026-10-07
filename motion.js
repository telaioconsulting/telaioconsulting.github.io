/* ============================================================
   TELAIO — motion graphic di tutte le pagine
   GSAP + ScrollTrigger + SplitText + Lenis (ospitate in /assets/vendor/).
   Ogni effetto parte solo se la pagina ha gli elementi che gli servono.
   Le home hanno l'apertura (.p-intro: il marchio diventa il tessuto); le altre pagine
   un ingresso breve del titolo. Senza librerie o con "riduci movimento"
   la pagina resta statica: il telaio in apertura viene disegnato una volta, fermo.
   ============================================================ */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var gsap = window.gsap, ST = window.ScrollTrigger, Split = window.SplitText;
  var motion = root.classList.contains("motion") && !reduce && !!gsap && !!ST;
  window.__motion = true;
  if (!motion) root.classList.remove("motion");

  var isEn = (root.lang || "").toLowerCase().indexOf("en") === 0;
  // l'apertura si vede una volta per visita: la classe .no-intro la mette l'<head> quando è già stata vista
  var hasIntro = !!document.querySelector(".p-intro") && !root.classList.contains("no-intro");

  var weave = initWeave();
  if (!motion) return;

  // Arrivo diretto su una sezione (es. /en/#faq): niente apertura, si va dritti lì.
  var deepLink = null;
  try { deepLink = location.hash.length > 1 ? document.querySelector(location.hash) : null; } catch (e) {}
  if (hasIntro && !deepLink) window.scrollTo(0, 0);

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
        // arrivati, il focus passa alla sezione: tastiera e lettori di schermo ripartono da lì
        lenis.scrollTo(target, { offset: -82, duration: 1.4, onComplete: function () {
          if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
        } });
        history.pushState(null, "", a.hash);
      });
    }

    /* ---- Quando la pagina cambia altezza (una risposta delle FAQ che si apre, il calendario che arriva)
       ScrollTrigger ricalcola le posizioni: altrimenti le animazioni più in basso partono in anticipo ---- */
    var main = document.querySelector("main");
    if (main && window.ResizeObserver) {
      var mainH = main.offsetHeight, refreshT = 0;
      new ResizeObserver(function () {
        if (main.offsetHeight === mainH) return;
        mainH = main.offsetHeight;
        clearTimeout(refreshT);
        refreshT = setTimeout(function () { ST.refresh(); }, 200);
      }).observe(main);
    }

    /* ---- Barra di avanzamento ---- */
    gsap.to(".p-progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });

    /* ============================================================
       APERTURA: il marchio si disegna, le sue linee diventano i fili del tessuto, entra il titolo.
       Sulle pagine senza apertura: solo l'ingresso del titolo.
       ============================================================ */
    (function () {
      var intro = hasIntro ? document.querySelector(".p-intro") : null;
      var h1 = document.querySelector(".p-h1");
      if (!h1) return;
      var h1Split = Split ? Split.create(h1, { type: "lines", mask: "lines", linesClass: "p-line" }) : null;
      var accent = h1.querySelector(".p-accent");
      gsap.set(h1, { visibility: "visible" });
      if (h1Split) gsap.set(h1Split.lines, { yPercent: 112 });
      if (accent) gsap.set(accent, { "--mark": 0 });

      var tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      if (!intro) {
        tl.to(weave, { weave: 1, duration: 2.4, ease: "power2.out" }, 0)
          .to(h1Split ? h1Split.lines : h1, { yPercent: 0, duration: 1.2, stagger: 0.08 }, 0.1)
          .to(accent, { "--mark": 1, duration: 1, ease: "expo.inOut" }, 0.6)
          .fromTo("[data-hero-item]", { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.07 }, 0.05)
          .add(function () { if (h1Split) h1Split.revert(); });
        if (deepLink) tl.progress(1);
        heroExit();
        return;
      }
      if (lenis) lenis.stop();
      var loom = weave ? buildLoom(19, 9) : null;
      tl.to(".p-intro-mk path", { strokeDashoffset: 0, duration: 0.8, stagger: 0.07, ease: "power3.inOut" }, 0)
        .fromTo(".p-intro-wm span", { y: 0, yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.045 }, 0.25)
        .to(".p-intro-tag", { opacity: 1, duration: 0.6, ease: "power2.out" }, 0.55);

      // ORDITO E TRAMA: le quattro linee del marchio diventano i fili del tessuto della hero
      var S = 1.45, END = S + 2.85, HERO = S + 1.9, mk = intro.querySelector(".p-intro-mk");
      if (loom) {
        gsap.set(".p-weave", { opacity: 0 });
        var ground = getComputedStyle(intro).backgroundColor.replace(/rgba?\(([^,]+),([^,]+),([^,)]+).*/, "rgba($1,$2,$3,0)");
        // 1. le lettere scivolano via, il marchio va al centro dello schermo e si ingrandisce
        tl.to(".p-intro-wm span", { x: 90, opacity: 0, filter: "blur(4px)", stagger: 0.05, duration: 0.5, ease: "power2.in" }, S)
          .to(".p-intro-tag", { opacity: 0, duration: 0.25 }, S)
          .to(mk, {
            x: function () { var r = mk.getBoundingClientRect(); return innerWidth / 2 - (r.left + r.width / 2); },
            y: function () { var r = mk.getBoundingClientRect(); return innerHeight / 2 - (r.top + r.height / 2); },
            scale: 2.6, duration: 0.85, ease: "expo.inOut"
          }, S)
          .call(loom.swap, null, S + 0.9);
        // 2. le quattro linee, grosse e blu, si allungano fino ai bordi
        loom.warp.forEach(function (l) { tl.to(l, { attr: { y1: -30, y2: innerHeight + 30 }, stroke: "#3F36F5", duration: 0.6, ease: "expo.inOut" }, S + 0.92); });
        loom.weft.forEach(function (l) { tl.to(l, { attr: { x1: -30, x2: innerWidth + 30 }, stroke: "#8E9DFF", duration: 0.6, ease: "expo.inOut" }, S + 0.92); });
        tl.to(intro, { backgroundColor: ground, duration: 0.6, ease: "power2.inOut" }, S + 0.95)
        // 3. si moltiplicano e si posano sui fili del tessuto
          .call(loom.aim, null, S + 1.58);
        loom.spread(tl, S + 1.6);
        // 4. il tessuto vero prende il loro posto
        tl.set(weave, { weave: 1 }, END)
          .to(".p-weave", { opacity: 1, duration: 0.6, ease: "power1.inOut" }, END)
          .to(loom.svg, { opacity: 0, duration: 0.6, ease: "power1.inOut" }, END);
      } else {
        tl.to(intro, { clipPath: "inset(0% 0% 100% 0%)", duration: 1.1, ease: "expo.inOut" }, S)
          .to(weave, { weave: 1, duration: 2.8, ease: "power2.out" }, S);
        HERO = S + 0.5; END = S + 1.1;
      }
      tl.fromTo(".top", { y: 0, yPercent: -100 }, { yPercent: 0, duration: 1 }, HERO + 0.2)
        .fromTo(".p-kicker", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1 }, HERO)
        .to(h1Split ? h1Split.lines : h1, { yPercent: 0, duration: 1.3, stagger: 0.09 }, HERO + 0.05)
        .to(accent, { "--mark": 1, duration: 1, ease: "expo.inOut" }, HERO + 0.6)
        .fromTo("[data-hero-item]:not(.p-kicker)", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, stagger: 0.09 }, HERO + 0.35)
        .add(endIntro, END + 0.65)
        .add(function () { if (h1Split) h1Split.revert(); });
      // appena lo sfondo dell'apertura è trasparente, testata e pulsante della hero si possono già cliccare;
      // lo scorrimento riparte quando il tessuto è al suo posto
      tl.set(intro, { pointerEvents: "none" }, S + 0.95)
        .call(function () { if (lenis) lenis.start(); }, null, END);
      // Un clic, lo scroll o un tasto durante l'apertura: accelera fino alla fine, senza tagli
      var hurryOn = ["wheel", "touchstart", "keydown", "pointerdown"];
      function hurry() {
        if (tl.progress() < 1 && tl.timeScale() < 2) gsap.to(tl, { timeScale: 8, duration: 0.25, ease: "power1.in" });
      }
      hurryOn.forEach(function (t) { window.addEventListener(t, hurry, { passive: true }); });
      if (deepLink) {
        tl.progress(1);
        endIntro();
      }
      function endIntro() {
        hurryOn.forEach(function (t) { window.removeEventListener(t, hurry); });
        if (intro.parentNode) intro.parentNode.removeChild(intro);
        if (loom && loom.svg.parentNode) loom.svg.parentNode.removeChild(loom.svg);
        if (lenis) lenis.start();
      }

      // Le linee del marchio: un SVG sopra l'apertura, con tante linee pronte (ordito e trama).
      // swap: prendono il posto dei quattro tratti del marchio; aim: chiedono al tessuto dove stanno i suoi fili;
      // spread: ognuna va sul suo filo, si assottiglia e ne prende il colore.
      function buildLoom(nW, nR) {
        var W = innerWidth, H = innerHeight, NS = "http://www.w3.org/2000/svg", targets = null;
        var svg = document.createElementNS(NS, "svg");
        svg.setAttribute("class", "p-loom"); svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("aria-hidden", "true");
        // maschera: all'inizio tutto visibile; alla fine la stessa sfumatura del tessuto verso l'orizzonte
        svg.innerHTML = '<defs><linearGradient id="p-loom-g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="' + H + '">' +
          '<stop offset="0" stop-color="#000"/><stop offset="0.45" stop-color="#888"/><stop offset="1" stop-color="#fff"/></linearGradient>' +
          '<mask id="p-loom-m" maskUnits="userSpaceOnUse" x="0" y="0" width="' + W + '" height="' + H + '">' +
          '<rect width="' + W + '" height="' + H + '" fill="url(#p-loom-g)"/><rect class="p-loom-full" width="' + W + '" height="' + H + '" fill="#fff"/></mask></defs>' +
          '<g mask="url(#p-loom-m)"></g>';
        var g = svg.querySelector("g"), warp = [], weft = [], i;
        for (i = 0; i < nW; i++) warp.push(g.appendChild(document.createElementNS(NS, "line")));
        for (i = 0; i < nR; i++) weft.push(g.appendChild(document.createElementNS(NS, "line")));
        gsap.set(warp.concat(weft), { opacity: 0 });
        document.body.appendChild(svg);

        function swap() {
          var r = mk.getBoundingClientRect(), s = r.width / 64;
          var v = [r.left + 24 * s, r.left + 40 * s], h = [r.top + 24 * s, r.top + 40 * s];
          warp.forEach(function (l, k) {
            var x = v[k < nW / 2 ? 0 : 1];
            gsap.set(l, { attr: { x1: x, y1: r.top + 10 * s, x2: x, y2: r.top + 54 * s }, strokeWidth: 7 * s, stroke: "#1307ED", opacity: 1 });
          });
          weft.forEach(function (l, k) {
            var y = h[k < nR / 2 ? 0 : 1];
            gsap.set(l, { attr: { x1: r.left + 10 * s, y1: y, x2: r.left + 54 * s, y2: y }, strokeWidth: 7 * s, stroke: "#1307ED", opacity: 1 });
          });
          gsap.set(mk, { opacity: 0 });
          gsap.set(svg, { filter: "drop-shadow(0 0 14px rgba(19,7,237,0.9))" });
        }
        function aim() {
          // lo sfondo dell'apertura è già sparito: le linee passano dietro al titolo e al velo della hero, come il tessuto
          var hero = document.querySelector(".p-hero"), veil = hero && hero.querySelector(".p-hero-veil");
          if (veil) { hero.insertBefore(svg, veil); svg.style.zIndex = 1; }
          targets = weave.threads(nW, nR);
          // se un filo non è sullo schermo, la linea va sull'ultimo che c'è
          while (targets.warp.length < nW) targets.warp.push(targets.warp[targets.warp.length - 1] || { x1: W / 2, y1: H, x2: W / 2, y2: H });
          while (targets.weft.length < nR) targets.weft.push(targets.weft[targets.weft.length - 1] || { x1: 0, y1: H, x2: W, y2: H });
          var grad = svg.querySelector("linearGradient");
          grad.setAttribute("y1", targets.top - 30); grad.setAttribute("y2", H);
        }
        function spread(t, at) {
          var cw = (nW - 1) / 2;
          warp.forEach(function (l, k) {
            t.to(l, {
              attr: { x1: function () { return targets.warp[k].x1; }, y1: function () { return targets.warp[k].y1; }, x2: function () { return targets.warp[k].x2; }, y2: function () { return targets.warp[k].y2; } },
              strokeWidth: 1, stroke: function () { return targets.warpColor; }, duration: 1.1, ease: "expo.inOut"
            }, at + Math.abs(k - cw) * 0.025);
          });
          weft.forEach(function (l, k) {
            t.to(l, {
              attr: { x1: function () { return targets.weft[k].x1; }, y1: function () { return targets.weft[k].y1; }, x2: function () { return targets.weft[k].x2; }, y2: function () { return targets.weft[k].y2; } },
              strokeWidth: 1, stroke: function () { return targets.weftColor; }, duration: 0.95, ease: "power3.inOut"
            }, at + 0.1 + k * 0.04);
          });
          t.to(svg.querySelector(".p-loom-full"), { opacity: 0, duration: 1.1, ease: "power2.inOut" }, at)
            .to(svg, { filter: "drop-shadow(0 0 0px rgba(19,7,237,0))", duration: 0.9 }, at);
        }
        return { svg: svg, warp: warp, weft: weft, swap: swap, aim: aim, spread: spread };
      }

      heroExit();

      // Uscita della hero mentre si scorre
      function heroExit() {
        gsap.to(".p-hero-in", { y: -90, opacity: 0, ease: "none", scrollTrigger: { trigger: ".p-hero", start: "top top", end: "bottom 10%", scrub: true } });
        if (document.querySelector(".p-hero-foot")) {
          gsap.to(".p-hero-foot", { opacity: 0, ease: "none", scrollTrigger: { trigger: ".p-hero", start: "top top", end: "30% top", scrub: true } });
        }
      }
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

    /* ============================================================
       NUMERI TESSUTI: le cifre grandi delle statistiche si tessono quando entrano nello schermo (2 secondi).
       1. l'ordito (fili verticali, chiari) scende dentro le cifre, da sinistra a destra;
       2. la trama (fili orizzontali, blu) passa riga per riga dal basso in su, una volta da sinistra
          e una da destra come la navetta, sopra e sotto l'ordito: il tessuto cresce come sul telaio;
       3. il pettine batte la trama e i fili si stringono finché la cifra è un tessuto pieno;
       4. i bordi si rifilano sulla sagoma esatta e il testo vero prende il posto dei fili.
       Il testo vero resta sempre nella pagina col valore finale: lo leggono i lettori di schermo.
       I fili sono un canvas sopra la cifra, nascosto ai lettori di schermo, che sparisce a fine animazione.
       Le cifre sono disegnate con lo stesso carattere, una per una nelle posizioni del testo vero
       (le cifre tabellari del sito sono più larghe di quelle normali), e campionate su una griglia.
       ============================================================ */
    (function () {
      var boxes = gsap.utils.toArray(".p-stat-num");
      if (!boxes.length) return;
      var T = 2;           // durata di tutta la tessitura (secondi)
      var RUN_W = 0.5;     // quanto ci mette un filo d'ordito a scendere
      var RUN_H = 0.38;    // quanto ci mette la navetta ad attraversare la cifra

      function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
      function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
      function cubicOut(x) { return 1 - Math.pow(1 - x, 3); }
      function inOut(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
      function sineInOut(x) { return -(Math.cos(Math.PI * x) - 1) / 2; }
      function mix(a, b, k) { return "rgb(" + Math.round(a[0] + (b[0] - a[0]) * k) + "," + Math.round(a[1] + (b[1] - a[1]) * k) + "," + Math.round(a[2] + (b[2] - a[2]) * k) + ")"; }
      // numeri casuali ma sempre uguali: i fili arrivano sempre nello stesso ordine
      function rnd(i, k) { var s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); }
      function make(tag, cls) { var e = document.createElement(tag); e.className = cls; e.setAttribute("aria-hidden", "true"); return e; }
      // Colori: ordito chiaro e trama nel blu del marchio, come una tela di cotone.
      // Stringendosi vanno verso il colore del testo vero, che alla fine prende il loro posto.
      function palette() {
        return root.getAttribute("data-theme") === "light"
          ? { warp: [[86, 93, 109], [20, 23, 19]], weft: [[19, 7, 237], [22, 14, 160]] }
          : { warp: [[155, 160, 147], [236, 238, 231]], weft: [[63, 54, 245], [150, 158, 255]] };
      }

      var weaves = boxes.map(weave).filter(Boolean);
      // cambio di tema a metà tessitura: i fili si ridisegnano coi colori nuovi
      document.addEventListener("telaio:tema", function () { weaves.forEach(function (w) { w.redraw(); }); });
      var lastW = window.innerWidth, rT = 0;
      window.addEventListener("resize", function () {
        if (window.innerWidth === lastW) return; // la barra del telefono che compare non cambia le cifre
        lastW = window.innerWidth;
        clearTimeout(rT);
        rT = setTimeout(function () { weaves.forEach(function (w) { w.measure(); }); }, 150);
      });

      function weave(box, idx) {
        var val = box.querySelector("span"), unit = box.querySelector("small");
        var cv = make("canvas", "p-woven");
        if (!val || !cv.getContext) return null;
        // tre canvas dentro la cifra, così ereditano carattere e cifre tabellari del testo:
        // quello che si vede, uno per campionare le cifre, uno con la sagoma esatta
        var sp = make("canvas", "p-woven-aux"), mk = make("canvas", "p-woven-aux"), meas = make("span", "p-woven-meas");
        box.appendChild(cv); box.appendChild(sp); box.appendChild(mk); box.appendChild(meas);
        var ctx = cv.getContext("2d"), sctx = sp.getContext("2d", { willReadFrequently: true }), mctx = mk.getContext("2d");
        var text = val.textContent.trim();
        var fs, ls, font, P, base, x0, gL, gT, cols, rows, bl, br, bt, cw, ch, dpr;
        var g = null, maskOk = false, dW = [], dH = [];
        var st = { t: 0 }, tl = null, played = false;

        function measure() {
          var cs = getComputedStyle(val);
          fs = parseFloat(cs.fontSize); ls = parseFloat(cs.letterSpacing) || 0;
          font = cs.fontWeight + " " + fs + "px " + cs.fontFamily;
          // passo della griglia: fili che si vedono come fili; sul telefono relativamente più grossi (meno fili)
          P = Math.max(5, Math.round(fs / (window.innerWidth <= 560 ? 11 : 17)));
          var bx = box.getBoundingClientRect(), vr = val.getBoundingClientRect();
          // la linea di base del testo: un segnaposto alto zero, allineato alla base
          var probe = document.createElement("span");
          probe.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
          val.appendChild(probe);
          base = probe.getBoundingClientRect().top - bx.top;
          val.removeChild(probe);
          x0 = vr.left - bx.left;
          // la griglia copre la cifra (dalla cima al fondo della virgola) con un passo di margine
          cols = Math.ceil(vr.width / P) + 2; rows = Math.ceil(fs * 1.02 / P);
          gL = x0 - P; gT = base - fs * 0.8;
          // un po' di spazio attorno (la trama battuta all'inizio è più alta), senza uscire dallo schermo
          var roomL = bx.left + gL, roomR = window.innerWidth - (bx.left + gL + cols * P);
          bl = Math.max(0, Math.min(P * 2, roomL - 2)); br = Math.max(0, Math.min(P * 2, roomR - 2));
          bt = Math.round(fs * 0.16);
          cw = Math.round(bl + cols * P + br); ch = Math.round(rows * P + 2 * bt);
          dpr = Math.min(window.devicePixelRatio || 1, 1.75);
          cv.style.left = (gL - bl) + "px"; cv.style.top = (gT - bt) + "px";
          cv.style.width = cw + "px"; cv.style.height = ch + "px";
          cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
          mk.width = cv.width; mk.height = cv.height;
          sp.width = cols * P; sp.height = rows * P;
          g = null; maskOk = false;
          if (tl && st.t > 0 && st.t < T) frame(st.t);
        }

        // Posizione di ogni carattere, misurata sul testo vero (stesse cifre, stessa spaziatura)
        function layout() {
          meas.textContent = text;
          var tn = meas.firstChild, mr = meas.getBoundingClientRect(), out = [], rg = document.createRange();
          for (var i = 0; i < text.length; i++) {
            rg.setStart(tn, i); rg.setEnd(tn, i + 1);
            var rr = rg.getBoundingClientRect();
            out.push({ ch: text[i], x: rr.left - mr.left, w: rr.width - ls });
          }
          return out;
        }
        // Le cifre una per una nelle posizioni del testo vero; se il canvas non usa le cifre tabellari
        // (alcuni browser), la cifra va al centro della sua casella
        function drawText(c2d, items, ox, oy) {
          c2d.font = font; c2d.textBaseline = "alphabetic"; c2d.textAlign = "left";
          if ("letterSpacing" in c2d) c2d.letterSpacing = "0px";
          for (var i = 0; i < items.length; i++) {
            var it = items[i];
            c2d.fillText(it.ch, ox + it.x + (it.w - c2d.measureText(it.ch).width) / 2, oy);
          }
        }

        // Le cifre sulla griglia: le caselle dentro e i tratti di filo (righe di trama e colonne d'ordito)
        function sample() {
          var items = layout(), w = sp.width, r, c, a, b;
          sctx.setTransform(1, 0, 0, 1, 0, 0);
          sctx.clearRect(0, 0, sp.width, sp.height);
          sctx.fillStyle = "#000";
          drawText(sctx, items, x0 - gL, base - gT);
          var d = sctx.getImageData(0, 0, sp.width, sp.height).data, inside = new Uint8Array(rows * cols), f = [0.2, 0.5, 0.8];
          for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
            var n = 0;
            for (a = 0; a < 3; a++) for (b = 0; b < 3; b++) {
              if (d[(Math.floor((r + f[b]) * P) * w + Math.floor((c + f[a]) * P)) * 4 + 3] > 127) n++;
            }
            // generosi sul bordo: i fili escono appena dalla cifra, la sagoma esatta li rifila alla fine
            inside[r * cols + c] = n >= 2 ? 1 : 0;
          }
          var H = [], V = [], s0, r0 = rows, r1 = -1;
          for (r = 0; r < rows; r++) for (c = 0; c < cols;) {
            if (!inside[r * cols + c]) { c++; continue; }
            s0 = c; while (c < cols && inside[r * cols + c]) c++;
            H.push(r, s0, c - 1);
            if (r < r0) r0 = r;
            r1 = r;
          }
          for (c = 0; c < cols; c++) for (r = 0; r < rows;) {
            if (!inside[r * cols + c]) { r++; continue; }
            s0 = r; while (r < rows && inside[r * cols + c]) r++;
            V.push(c, s0, r - 1);
          }
          // ordine di arrivo: l'ordito da sinistra a destra, la trama dal basso in su (dove c'è la cifra)
          dW = []; dH = [];
          for (c = 0; c < cols; c++) dW.push((c / cols) * 0.3 + rnd(c + idx * 31, 1) * 0.04);
          for (r = 0; r < rows; r++) dH.push(0.34 + clamp((r1 - r) / Math.max(1, r1 - r0), 0, 1) * 0.6 + rnd(r + idx * 17, 2) * 0.03);
          return { inside: inside, H: H, V: V, items: items };
        }

        // La sagoma esatta delle cifre per rifilare i bordi: tutto pieno tranne le cifre
        function buildMask() {
          maskOk = true;
          mctx.setTransform(1, 0, 0, 1, 0, 0);
          mctx.globalCompositeOperation = "source-over";
          mctx.clearRect(0, 0, mk.width, mk.height);
          mctx.fillStyle = "#000";
          mctx.fillRect(0, 0, mk.width, mk.height);
          mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          mctx.globalCompositeOperation = "destination-out";
          drawText(mctx, g.items, bl + x0 - gL, bt + base - gT);
          mctx.globalCompositeOperation = "source-over";
        }

        function frame(t) {
          if (!g) g = sample();
          var pal = palette(), k, r, c, a, b;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = 1;
          ctx.clearRect(0, 0, cw, ch);
          var ox = bl, oy = bt, by = base - gT;
          // stringere: fili sottili con i vuoti tra l'uno e l'altro, poi ingrossano fino al tessuto pieno
          // (i vuoti non si chiudono mai del tutto: resta un tessuto, non una scacchiera)
          var tight = inOut(seg(t, 1.0, 1.55));
          var th = P * (0.32 + 0.4 * tight), gap = Math.max(1, P * (0.13 - 0.04 * tight)), cap = Math.min(th / 2, P * 0.3);
          // battere la trama: all'inizio le righe sono un poco più distanti, poi il pettine le avvicina
          var beat = 1 + 0.1 * (1 - cubicOut(seg(t, 0.35, 1.5)));
          var tone = inOut(seg(t, 1.05, 1.6));
          var warpC = mix(pal.warp[0], pal.warp[1], tone), weftC = mix(pal.weft[0], pal.weft[1], tone);
          function X(cc) { return ox + (cc + 0.5) * P; }
          function Y(rr) { return oy + by + ((rr + 0.5) * P - by) * beat; }
          var half = P * beat / 2;
          // fin dove è arrivato ogni filo: l'ordito scende, la navetta attraversa (una riga da sinistra, la dopo da destra)
          var wy = [], hx0 = [], hx1 = [];
          for (c = 0; c < cols; c++) wy.push(Y(cubicOut(seg(t, dW[c], dW[c] + RUN_W)) * (rows + 1) - 1) + half);
          for (r = 0; r < rows; r++) {
            var reach = sineInOut(seg(t, dH[r], dH[r] + RUN_H)) * (cols + 1) * P;
            if (r % 2) { hx0.push(ox + cols * P - reach); hx1.push(ox + cols * P + P); }
            else { hx0.push(ox - P); hx1.push(ox + reach); }
          }
          ctx.lineCap = "round";
          ctx.lineWidth = th;

          // 1. la trama: un tratto per ogni pezzo di riga dentro la cifra, fin dove è passata la navetta
          ctx.strokeStyle = weftC;
          ctx.beginPath();
          for (k = 0; k < g.H.length; k += 3) {
            r = g.H[k];
            a = Math.max(X(g.H[k + 1]) - P / 2 + cap, hx0[r] + cap);
            b = Math.min(X(g.H[k + 2]) + P / 2 - cap, hx1[r] - cap);
            if (b > a) { ctx.moveTo(a, Y(r)); ctx.lineTo(b, Y(r)); }
          }
          ctx.stroke();

          // 2. l'ordito, fin dove è sceso; prima un alone che taglia la trama accanto al filo:
          //    così si vede che passa sopra
          ctx.beginPath();
          for (k = 0; k < g.V.length; k += 3) {
            c = g.V[k];
            a = Y(g.V[k + 1]) - half + cap;
            b = Math.min(Y(g.V[k + 2]) + half - cap, wy[c] - cap);
            if (b > a) { ctx.moveTo(X(c), a); ctx.lineTo(X(c), b); }
          }
          ctx.globalCompositeOperation = "destination-out";
          ctx.lineWidth = th + 2 * gap;
          ctx.stroke();
          ctx.globalCompositeOperation = "source-over";
          ctx.lineWidth = th;
          ctx.strokeStyle = warpC;
          ctx.stroke();

          // 3. la tela: a caselle alterne la trama torna sopra l'ordito (sopra, sotto, sopra…),
          //    con lo stesso alone che taglia l'ordito sopra e sotto
          ctx.lineCap = "butt";
          ctx.beginPath();
          for (r = 0; r < rows; r++) {
            for (c = r % 2; c < cols; c += 2) {
              if (!g.inside[r * cols + c]) continue;
              a = Math.max(X(c) - P / 2, hx0[r]); b = Math.min(X(c) + P / 2, hx1[r]);
              if (b > a) { ctx.moveTo(a, Y(r)); ctx.lineTo(b, Y(r)); }
            }
          }
          ctx.globalCompositeOperation = "destination-out";
          ctx.lineWidth = th + 2 * gap;
          ctx.stroke();
          ctx.globalCompositeOperation = "source-over";
          ctx.lineWidth = th;
          ctx.strokeStyle = weftC;
          ctx.stroke();

          // 4. alla fine i bordi seguono la sagoma esatta: il passaggio al testo vero è pulito
          var edge = inOut(seg(t, 1.4, 1.56));
          if (edge > 0) {
            if (!maskOk) buildMask();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalAlpha = edge;
            ctx.globalCompositeOperation = "destination-out";
            ctx.drawImage(mk, 0, 0);
            ctx.globalCompositeOperation = "source-over";
            ctx.globalAlpha = 1;
          }
        }

        function hide() {
          gsap.set(val, { opacity: 0 });
          if (unit) gsap.set(unit, { opacity: 0, x: -10 });
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, cv.width, cv.height);
          gsap.set(cv, { opacity: 1, filter: "blur(0px)", visibility: "visible" });
        }
        // subito il numero vero, senza fili (la cifra è già passata sopra lo schermo)
        function finish() {
          played = true;
          if (tl) tl.kill();
          gsap.set(unit ? [val, unit] : val, { opacity: 1, x: 0 });
          gsap.set(cv, { visibility: "hidden" });
        }
        function play() {
          played = true;
          if (box.getBoundingClientRect().bottom < 0) { finish(); return; }
          if (tl) tl.kill();
          hide();
          st.t = 0;
          tl = gsap.timeline();
          tl.to(st, { t: T, duration: T, ease: "none", onUpdate: function () { frame(st.t); } }, 0);
          if (unit) tl.to(unit, { opacity: 1, x: 0, duration: 0.8, ease: "expo.out" }, 1.2);
          // il testo vero prende il posto dei fili (un filo di sfocatura: i due stati si fondono),
          // poi il canvas si nasconde e non costa più niente
          tl.to(val, { opacity: 1, duration: 0.38, ease: "power2.inOut" }, 1.62)
            .to(cv, { opacity: 0, filter: "blur(3px)", duration: 0.38, ease: "power2.inOut" }, 1.62)
            .set(cv, { visibility: "hidden" }, T);
        }

        measure();
        hide();
        ST.create({
          trigger: box, start: "top 84%", end: "bottom top",
          onEnter: function () { if (!played) play(); },
          onEnterBack: function () { if (!played) play(); },
          onLeave: function () { if (!played) finish(); }
        });
        if (box.getBoundingClientRect().bottom < 0) finish();

        return {
          measure: measure,
          redraw: function () { if (tl && tl.isActive()) frame(st.t); }
        };
      }
    })();
    /* ---- fine numeri tessuti ---- */

    /* ---- Statistiche: mini grafici e testi accanto ai numeri ---- */
    gsap.utils.toArray(".p-stat").forEach(function (st) {
      var tl = gsap.timeline({ defaults: { ease: "expo.out" }, scrollTrigger: { trigger: st, start: "top 80%", toggleActions: "play none none none" } });
      function add(sel, vars, at) { var els = st.querySelectorAll(sel); if (els.length) tl.from(els, vars, at); }
      add(".p-col i", { scaleY: 0, duration: 1.3, stagger: 0.18 }, 0.2);
      add(".p-hrow em", { scaleX: 0, duration: 1.5, stagger: 0.18 }, 0.2);
      add(".p-viz-dots i", { scale: 0.6, opacity: 0, duration: 0.9, stagger: 0.14, ease: "back.out(1.4)" }, 0.2);
      add(".p-stat-body > p", { y: 24, opacity: 0, duration: 1, stagger: 0.08 }, 0.35);
    });

    /* ---- Manifesto e frasi grandi: le parole si accendono una a una ---- */
    if (Split) {
      gsap.utils.toArray(".p-manifesto-text, [data-scrub]").forEach(function (el) {
        var s = Split.create(el, { type: "words", wordsClass: "p-word" });
        gsap.fromTo(s.words, { opacity: 0.13 }, {
          opacity: 1, ease: "none", stagger: 0.1,
          scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: true }
        });
      });
    }

    /* ---- Casi: scorrimento orizzontale con la sezione bloccata ---- */
    var mm = gsap.matchMedia();
    mm.add("(min-width: 900px)", function () {
      var pin = document.querySelector(".p-cases-pin"), track = document.querySelector(".p-cases-track");
      if (!pin || !track) return;
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
      ST.batch(".p-cases-track .p-case", {
        start: "top 90%",
        onEnter: function (els) {
          els = firstTime(els);
          if (els.length) gsap.fromTo(els, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "expo.out", stagger: 0.08 });
        }
      });
    });

    /* ---- Passi: il filo si tesse e il contatore scorre ---- */
    (function () {
      var wrap = document.querySelector(".p-steps");
      if (!wrap) return;
      var svg = wrap.querySelector(".p-thread"), bg = svg.querySelector(".bg"), fg = svg.querySelector(".fg");
      var section = wrap.closest("section") || document;
      var steps = gsap.utils.toArray(".p-step", wrap), reel = section.querySelector(".p-counter-reel");
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
        if (reel) gsap.to(reel, { yPercent: -100 * i / reel.children.length, duration: 0.9, ease: "expo.out" });
      }
      // Passo attivo: l'ultimo il cui inizio ha superato il 62% dello schermo.
      // Calcolato a ogni scorrimento, così è giusto anche dopo un salto (ricarica a metà pagina).
      var last = -1;
      function sync() {
        var line = window.innerHeight * 0.62, idx = 0;
        steps.forEach(function (s, k) { if (s.getBoundingClientRect().top <= line) idx = k; });
        if (idx !== last) { last = idx; setStep(idx); }
      }
      ST.create({ trigger: wrap, start: "top bottom", end: "bottom top", onUpdate: sync, onRefresh: sync });
      sync();
    })();

    /* ---- Check-up: la barra dei 30 minuti si riempie un pezzo alla volta ---- */
    gsap.utils.toArray(".p-timeline").forEach(function (bar) {
      gsap.from(bar.querySelectorAll(".p-tl-seg i"), {
        scaleX: 0, duration: 1.1, ease: "expo.inOut", stagger: 0.35,
        scrollTrigger: { trigger: bar, start: "top 80%", toggleActions: "play none none none" }
      });
    });

    /* ---- Chi siamo: ordito e trama si intrecciano mentre scorri ---- */
    gsap.utils.toArray(".p-loom-art").forEach(function (art) {
      gsap.fromTo(art.querySelectorAll(".warp, .weft"), { strokeDashoffset: 1 }, {
        strokeDashoffset: 0, ease: "none", stagger: 0.12,
        scrollTrigger: { trigger: art, start: "top 85%", end: "bottom 45%", scrub: 0.6 }
      });
    });

    /* ---- Blocco blu: si apre a tutta pagina ---- */
    if (document.querySelector(".p-checkup")) {
      gsap.fromTo(".p-checkup-bg", { clipPath: "inset(6% 4% 6% 4% round 32px)" }, {
        clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none",
        scrollTrigger: { trigger: ".p-checkup", start: "top 95%", end: "top 20%", scrub: true }
      });
    }

    /* ---- Chiusura e piè di pagina ---- */
    if (document.querySelector(".p-final")) {
      gsap.fromTo(".p-final-glow", { scale: 0.55, opacity: 0 }, {
        scale: 1, opacity: 1, ease: "none",
        scrollTrigger: { trigger: ".p-final", start: "top 85%", end: "center center", scrub: true }
      });
    }
    if (document.querySelector(".p-orb")) {
      // entra da piccolo e trasparente, non dal nulla (scale 0 sembra spuntare da un punto)
      gsap.from(".p-orb", { scale: 0.8, opacity: 0, rotation: -30, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: ".p-orb", start: "top 92%", toggleActions: "play none none none" } });
    }
    // con il tessuto in WebGL la parola si tesse riga dopo riga (initParolaTessuta): le lettere restano ferme
    if (document.querySelector(".p-bigword") && !(weave && weave.gl)) {
      gsap.fromTo(".p-bigword span", { yPercent: 100 }, {
        yPercent: 0, ease: "none", stagger: 0.06,
        scrollTrigger: { trigger: ".p-bigword", start: "top bottom", end: "bottom bottom", scrub: 1 }
      });
    }
    if (weave && weave.gl) gsap.utils.toArray(".p-bigword").forEach(initParolaTessuta);

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
      // Il pulsante segue il mouse in modo morbido; il rimbalzo elastico solo quando lo lasci andare
      // (rifatto a ogni movimento faceva tremolare il pulsante).
      gsap.utils.toArray("[data-magnetic]").forEach(function (el) {
        var k = el.classList.contains("p-orb") ? 0.4 : 0.22, back = null;
        var xTo = gsap.quickTo(el, "x", { duration: 0.45, ease: "power3.out" });
        var yTo = gsap.quickTo(el, "y", { duration: 0.45, ease: "power3.out" });
        el.addEventListener("pointermove", function (e) {
          if (back) { back.kill(); back = null; }
          var r = el.getBoundingClientRect();
          xTo((e.clientX - r.left - r.width / 2) * k);
          yTo((e.clientY - r.top - r.height / 2) * k);
        });
        el.addEventListener("pointerleave", function () {
          back = gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.4)", overwrite: "auto" });
        });
      });
    }

    /* ============================================================
       SEZIONI: LA TRAMA CHE SI PIEGA
       La trama del tessuto (ordito e trama ogni 44 px, nodi agli incroci), appena accennata, su un canvas:
       · attorno al mouse si accende (fili più chiari, nodi, alone blu) e i fili si scostano come stoffa premuta;
         quando il mouse lascia la trama tornano al loro posto, lì dov'erano premuti, con un piccolo rimbalzo,
         e la luce resta lì e si spegne piano
       · scorrendo veloce i fili orizzontali ondeggiano, tanto più quanto più è veloce, poi si fermano
       · sul telefono niente mouse: una fascia di luce a metà schermo e l'ondulazione
       · sul blocco blu del check-up solo la luce bianca (ha già il suo reticolo); sotto la hero la trama entra sfumando
       Il canvas non è fisso: sta nella pagina, alto quanto lo schermo più un margine, e si sposta a scatti di 44 px,
       così i fili restano attaccati al testo anche quando il telefono scorre per conto suo.
       Lavora solo quando qualcosa si muove: mouse e pagina fermi, niente calcoli e niente disegni.
       ============================================================ */
    (function () {
      var main = document.querySelector("main"), header = document.querySelector(".top");
      // le sezioni come prima: figlie di <main> (anche dentro il contenitore di un blocco fermo), non la hero, posizionate
      var secs = main ? gsap.utils.toArray("main > section:not(.p-hero), main > .pin-spacer > section:not(.p-hero)").filter(function (s) {
        return getComputedStyle(s).position !== "static";
      }) : [];
      // i blocchi col loro fondo (il blu del check-up) non hanno la trama
      var webs = secs.filter(function (s) {
        return !s.classList.contains("p-checkup") && /^(transparent|rgba\(.*,\s*0\))$/.test(getComputedStyle(s).backgroundColor);
      });
      var blues = secs.filter(function (s) { return s.classList.contains("p-checkup"); }).map(function (s) {
        var l = document.createElement("div");
        l.className = "p-tela-luce"; l.setAttribute("aria-hidden", "true");
        s.appendChild(l);
        return { s: s, l: l, top: 0, h: 0, left: 0, tx: null, ty: null };
      });
      var cv = document.createElement("canvas"), ctx = cv.getContext ? cv.getContext("2d") : null;
      if (!ctx || (!webs.length && !blues.length)) return;
      if (!finePointer) root.classList.add("p-tela-touch");
      var stage = document.createElement("div");
      stage.className = "p-tela"; stage.setAttribute("aria-hidden", "true");
      stage.appendChild(cv);
      document.body.insertBefore(stage, document.body.firstChild);

      // misure (come la trama di prima): passo, pressione, luce, ondulazione
      var P = 44, R = 220, A = 16, CORE = 28, LIGHT = 360, GLOW = 260, RIP = 8, KX = Math.PI * 2 / 360, ROW = 0.45, TAU = Math.PI * 2;
      // spostamento alla distanza r: r/√(r²+CORE²) · (1−(r/R)²)², portato a un massimo di A (nessun filo si incrocia)
      var NORM = (function () {
        for (var m = 0, r = 1; r < R; r++) { var u = r / R; m = Math.max(m, r / Math.sqrt(r * r + CORE * CORE) * (1 - u * u) * (1 - u * u)); }
        return 1 / m;
      })();
      var MARGIN = (finePointer ? 3 : 6) * P; // fili disegnati fuori dallo schermo (sul telefono di più: scorre più veloce)
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);

      // colori dai token del tema (si rileggono quando il tema cambia)
      var INK, WEFT, BRAND, C_WARP, C_WEFT, C_DOT;
      function token(name, fb) {
        var v = getComputedStyle(root).getPropertyValue(name).trim();
        return /^#[0-9a-f]{6}$/i.test(v) ? parseInt(v.substr(1, 2), 16) + "," + parseInt(v.substr(3, 2), 16) + "," + parseInt(v.substr(5, 2), 16) : fb;
      }
      function colors() {
        INK = token("--ink", "245,247,241"); WEFT = token("--weft", "142,157,255"); BRAND = token("--brand", "19,7,237");
        C_WARP = "rgba(" + INK + ",.34)"; C_WEFT = "rgba(" + WEFT + ",.6)"; C_DOT = "rgb(" + WEFT + ")";
      }
      colors();

      var CW = 0, CH = 0, VH = 0, T = -1;          // canvas, altezza dello schermo, cima del canvas nella pagina
      var bands = [], fades = [], barH = 0;         // tratti con la trama, dove entra sfumando, altezza della testata
      var px = -9999, py = -9999, inWin = false, seen = false;  // mouse
      var tx = 0, ty = 0;                           // dove va la luce: il mouse, o l'ultimo punto toccato sulla trama
      var cx = { x: 0, v: 0 }, cy = { x: 0, v: 0 }; // la luce (nello schermo), con una molla
      var lit = 0;                                  // quanto è accesa (0-1)
      var qx = 0, qy = 0;                           // la pressione (nella pagina): segue la luce finché si preme, poi resta lì
      var amp = { x: 0, v: 0 };                     // quanto preme (molla)
      var bx = -9999, by = -9999;                   // la luce bianca sul blocco blu: segue il mouse come prima
      var lastY = window.scrollY, vel = 0, E = 0, phase = 0, dir = 1;  // scorrimento e ondulazione
      var dirty = true, awake = false;

      /* ---- Misure: all'avvio, al ridimensionamento, quando la pagina cambia altezza e a ogni refresh di ScrollTrigger ---- */
      function layout() {
        var d = Math.min(window.devicePixelRatio || 1, 1.5), w = root.clientWidth, h = window.innerHeight;
        var need = Math.max(h, root.clientHeight) + 2 * MARGIN;
        VH = h;
        // il canvas si rifà solo se cambia la larghezza o se serve più alto: la barra del telefono che va e viene non lo ricrea
        if (w !== CW || need > CH || d !== dpr) {
          dpr = d; CW = w; CH = need;
          cv.width = Math.round(CW * dpr); cv.height = Math.round(CH * dpr);
          cv.style.width = CW + "px"; cv.style.height = CH + "px";
        }
        measure();
      }
      function measure() {
        var sy = window.scrollY, out = [], fd = [];
        webs.forEach(function (s) {
          // in un blocco fermo conta il suo contenitore, che resta al suo posto nella pagina
          var el = s.parentNode.classList.contains("pin-spacer") ? s.parentNode : s;
          var r = el.getBoundingClientRect(), a = Math.round(r.top + sy), b = Math.round(r.bottom + sy), p = out[out.length - 1];
          // sezioni attaccate: un solo tratto, niente cuciture
          if (p && a - p[1] <= 1) p[1] = Math.max(p[1], b); else out.push([a, b]);
          var prev = el.previousElementSibling;
          if (prev && prev.classList.contains("p-hero")) fd.push(a);
        });
        blues.forEach(function (o) {
          var r = o.s.getBoundingClientRect();
          o.top = r.top + sy; o.h = r.height; o.left = r.left; o.tx = null;
        });
        bands = out; fades = fd;
        barH = header ? header.offsetHeight : 0;
        stage.style.height = Math.ceil(main.getBoundingClientRect().bottom + sy) + "px";
        dirty = true;
      }
      // il mouse è sopra un tratto con la trama? (non sulla testata, sul blocco blu, sulla hero o sul piè di pagina)
      function onGrid() {
        if (!inWin || py < barH) return false;
        var d = py + window.scrollY;
        for (var i = 0; i < bands.length; i++) if (d >= bands[i][0] && d < bands[i][1]) return true;
        return false;
      }

      /* ---- Molle e passo: dice se qualcosa si muove ancora ---- */
      function spring(s, to, w, z, dt) {
        var n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n;
        for (var i = 0; i < n; i++) { s.v += (w * w * (to - s.x) - 2 * z * w * s.v) * h; s.x += s.v * h; }
      }
      function still(s, to, eps) {
        if (Math.abs(to - s.x) < eps && Math.abs(s.v) < eps * 4) { s.x = to; s.v = 0; return true; }
        return false;
      }
      function step(dt) {
        var moving = false;
        if (finePointer && seen) {
          var on = onGrid(), sy0 = window.scrollY;
          // il mouse torna sulla trama quando tutto è fermo: luce e pressione partono da lì, senza attraversare la pagina
          if (on && lit < 0.05 && Math.abs(amp.x) < 0.02) { cx.x = px; cy.x = py; cx.v = cy.v = 0; }
          if (on) { tx = px; ty = py; }
          // la luce segue il mouse con un po' di ritardo; fuori dalla trama resta sull'ultimo punto e si spegne piano
          spring(cx, tx, 15, 0.78, dt); spring(cy, ty, 15, 0.78, dt);
          var sx = still(cx, tx, 0.05), sy = still(cy, ty, 0.05);
          if (!sx || !sy) moving = true;
          var li = on ? 1 : 0;
          lit += (li - lit) * (1 - Math.exp(-dt * (on ? 9 : 2.2)));
          if (Math.abs(li - lit) < (on ? 0.003 : 0.01)) lit = li; else moving = true;
          // la pressione entra morbida e segue la luce; lasciata, torna su dov'era (nella pagina) con un piccolo rimbalzo
          if (on) {
            if ((Math.abs(amp.x) < 0.02 && Math.abs(amp.v) < 0.1) || amp.x > 0.95) { qx = cx.x; qy = cy.x + sy0; }
            else {
              var g = 1 - Math.exp(-dt * 60);
              qx += (cx.x - qx) * g; qy += (cy.x + sy0 - qy) * g;
              moving = true;
            }
            spring(amp, 1, 12, 0.72, dt);
          } else spring(amp, 0, 10, 0.52, dt);
          if (!still(amp, li, 0.001)) moving = true;
        }
        var y = window.scrollY, dy = y - lastY;
        lastY = y;
        if (dy !== 0) moving = true;
        // un salto (un link a una sezione) non è velocità
        if (Math.abs(dy) > VH) dy = 0;
        vel += (dy / Math.max(dt, 1 / 60) - vel) * (1 - Math.exp(-dt * 18));
        if (dy === 0 && Math.abs(vel) < 2) vel = 0;
        if (vel !== 0) moving = true;
        // l'ondulazione cresce con la velocità (sotto i 500 px/s niente) e si spegne in poco più di un secondo
        var s = Math.min(1, Math.max(0, (Math.abs(vel) - 500) / 3000));
        s = s * s * (3 - 2 * s);
        if (s > E) E += (s - E) * (1 - Math.exp(-dt * 9));
        else E = Math.max(s, E * Math.exp(-dt * 2.6));
        if (E < 0.004 && s === 0) E = 0;
        if (dy) dir = dy > 0 ? 1 : -1;
        if (E > 0) { phase += (dt * 5.5 + Math.abs(dy) * 0.0035) * dir; moving = true; }
        return moving;
      }

      /* ---- Disegno. Due passate: la trama appena accennata con un'opacità semplice e, solo nel quadrato della luce,
         la trama piena con la luce già dentro il colore (sfumature radiali: si colorano solo i pixel dei fili).
         Se si muove solo il mouse si ridisegna solo attorno alla luce e alla pressione, di adesso e di prima. ---- */
      var ox = 0, oy = 0, lx = 0, ly = 0, ex = 0, ey = 0, k = 0, dent = false, rip = 0, R2 = R * R;
      var prevBox = null, prevRip = false, m0 = 1, m1 = 0.5, mb = 0.12;
      // spostamento della pressione nel punto (x, y): via dal centro, quasi pieno vicino al polpastrello, poi sempre meno
      function push(x, y) {
        var dx = x - ex, dy = y - ey, d2 = dx * dx + dy * dy;
        if (!dent || d2 >= R2) { ox = 0; oy = 0; return; }
        var f = 1 - d2 / R2, s = k * f * f / Math.sqrt(d2 + CORE * CORE);
        ox = dx * s; oy = dy * s;
      }
      function wave(x, j) { return rip ? rip * Math.sin(x * KX - phase + j * ROW) : 0; }
      // rettangoli [x0, y0, x1, y1]: unione, intersezione, bordi sui pixel veri dello schermo (niente cuciture)
      function join(a, b) { return !a ? b : !b ? a : [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]; }
      function cut(a, b) {
        if (!a || !b) return null;
        var r = [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];
        return r[2] > r[0] && r[3] > r[1] ? r : null;
      }
      function snap(r) { return [Math.floor(r[0] * dpr) / dpr, Math.floor(r[1] * dpr) / dpr, Math.ceil(r[2] * dpr) / dpr, Math.ceil(r[3] * dpr) / dpr]; }
      function rect(r) { ctx.beginPath(); ctx.rect(r[0], r[1], r[2] - r[0], r[3] - r[1]); }

      // fili e nodi dentro il rettangolo r, coi colori dati. I punti delle curve stanno su una griglia fissa (4 o 5 px):
      // ridisegnando un pezzo, le curve coincidono con quelle intorno
      function weave(r, cWarp, cWeft, cDot) {
        var pad = A + RIP + 6, i, j, x, y, half, a, z, h, v, X, Y;
        var i0 = Math.max(0, Math.ceil((r[0] - pad) / P)), i1 = Math.floor((r[2] + pad) / P);
        var j0 = Math.ceil((T + r[1] - pad) / P), j1 = Math.floor((T + r[3] + pad) / P);
        var xl = r[0] - 2, xr = r[2] + 2, yt = r[1] - 2, yb = r[3] + 2;
        // ordito (fili verticali): dritti, piegati solo dove passa la pressione
        ctx.beginPath();
        for (i = i0; i <= i1; i++) {
          x = i * P + 0.5; h = x - ex;
          if (dent && h * h < R2) {
            half = Math.sqrt(R2 - h * h); a = ey - half; z = ey + half;
            if (a > yt) { ctx.moveTo(x, yt); ctx.lineTo(x, a); y = a; } else { push(x, yt); ctx.moveTo(x + ox, yt + oy); y = yt; }
            for (y = Math.floor(y / 4) * 4 + 4; y < z && y < yb; y += 4) { push(x, y); ctx.lineTo(x + ox, y + oy); }
            if (z < yb) { ctx.lineTo(x, z); ctx.lineTo(x, yb); } else { push(x, yb); ctx.lineTo(x + ox, yb + oy); }
          } else { ctx.moveTo(x, yt); ctx.lineTo(x, yb); }
        }
        ctx.strokeStyle = cWarp; ctx.stroke();
        // trama (fili orizzontali): la pressione e, quando si scorre veloce, l'ondulazione
        ctx.beginPath();
        for (j = j0; j <= j1; j++) {
          y = j * P - T + 0.5; v = y - ey;
          if (rip) {
            x = Math.floor(xl / 5) * 5; push(x, y); ctx.moveTo(x + ox, y + oy + wave(x, j));
            while (x < xr) { x += 5; push(x, y); ctx.lineTo(x + ox, y + oy + wave(x, j)); }
          } else if (dent && v * v < R2) {
            half = Math.sqrt(R2 - v * v); a = ex - half; z = ex + half;
            if (a > xl) { ctx.moveTo(xl, y); ctx.lineTo(a, y); x = a; } else { push(xl, y); ctx.moveTo(xl + ox, y + oy); x = xl; }
            for (x = Math.floor(x / 4) * 4 + 4; x < z && x < xr; x += 4) { push(x, y); ctx.lineTo(x + ox, y + oy); }
            if (z < xr) { ctx.lineTo(z, y); ctx.lineTo(xr, y); } else { push(xr, y); ctx.lineTo(xr + ox, y + oy); }
          } else { ctx.moveTo(xl, y); ctx.lineTo(xr, y); }
        }
        ctx.strokeStyle = cWeft; ctx.stroke();
        // nodi agli incroci, che seguono i fili
        ctx.beginPath();
        for (j = j0; j <= j1; j++) {
          y = j * P - T + 0.5;
          for (i = i0; i <= i1; i++) {
            x = i * P + 0.5; push(x, y);
            X = x + ox; Y = y + oy + wave(x, j);
            ctx.moveTo(X + 2, Y); ctx.arc(X, Y, 2, 0, TAU);
          }
        }
        ctx.fillStyle = cDot; ctx.fill();
      }
      // la luce come sfumatura radiale: colore c con opacità a, per la maschera di prima (piena, metà a 162 px, 12% da 360 px)
      function mask(r) { return r < 162 ? m0 + (m1 - m0) * r / 162 : r < LIGHT ? m1 + (mb - m1) * (r - 162) / (LIGHT - 162) : mb; }
      function lightGrad(c, a) {
        var g = ctx.createRadialGradient(lx, ly, 0, lx, ly, LIGHT);
        g.addColorStop(0, "rgba(" + c + "," + (a * m0).toFixed(4) + ")");
        g.addColorStop(0.45, "rgba(" + c + "," + (a * m1).toFixed(4) + ")");
        g.addColorStop(1, "rgba(" + c + "," + (a * mb).toFixed(4) + ")");
        return g;
      }
      // l'alone blu: 18% al centro, sparisce a 182 px, anche lui sotto la maschera
      function glowGrad() {
        var g = ctx.createRadialGradient(lx, ly, 0, lx, ly, GLOW * 0.7);
        for (var n = 0; n <= 4; n++) g.addColorStop(n / 4, "rgba(" + BRAND + "," + (0.18 * lit * (1 - n / 4) * mask(n / 4 * GLOW * 0.7)).toFixed(4) + ")");
        return g;
      }
      // sfumatura ellittica centrata nella luce (la fascia del telefono), dentro il rettangolo r
      function ellipse(rx, ry, stops, r, op) {
        var s = rx / ry, g;
        ctx.save();
        ctx.globalCompositeOperation = op;
        ctx.translate(lx, ly); ctx.scale(s, 1);
        g = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
        for (var n = 0; n < stops.length; n += 2) g.addColorStop(stops[n], stops[n + 1]);
        ctx.fillStyle = g;
        ctx.fillRect((r[0] - lx) / s - 1, r[1] - ly, (r[2] - r[0]) / s + 2, r[3] - r[1]);
        ctx.restore();
      }

      function draw() {
        var sy = window.scrollY, b, a, z, n, any = false;
        var top = Math.max(0, Math.floor((sy - MARGIN) / P) * P), moved = top !== T;
        if (moved) { T = top; cv.style.transform = "translate3d(0," + T + "px,0)"; }
        // la luce (lx, ly) e la pressione (ex, ey), in coordinate del canvas
        if (finePointer) { lx = cx.x; ly = cy.x + sy - T; ex = qx; ey = qy - T; }
        else { lx = CW / 2; ly = sy + VH / 2 - T; }
        dent = finePointer && seen && Math.abs(amp.x) > 0.004;
        k = amp.x * A * NORM;
        rip = E * RIP;
        var lightOn = !finePointer || lit > 0.003;
        // mentre i fili ondeggiano tutta la trama prende un po' più di luce (fino al 20%), poi torna al 12%
        var base = 0.12 + 0.08 * E;
        // dove ridisegnare: tutto se il canvas si è spostato, se i fili ondeggiano o se è cambiata la pagina;
        // altrimenti solo attorno alla luce e alla pressione, di adesso e del fotogramma prima
        var lightBox = !lightOn ? null : finePointer ? [lx - LIGHT, ly - LIGHT, lx + LIGHT, ly + LIGHT] : [0, ly - 262, CW, ly + 262];
        var box = join(lightBox, dent ? [ex - R - 4, ey - R - 4, ex + R + 4, ey + R + 4] : null);
        var full = dirty || moved || rip > 0 || prevRip;
        var r = cut(full ? [0, 0, CW, CH] : join(prevBox, box), [0, 0, CW, CH]);
        prevBox = box; prevRip = rip > 0;
        if (!r) return;
        r = snap(r);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.lineWidth = 1;
        ctx.clearRect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
        // solo dentro i tratti con la trama
        ctx.save();
        ctx.beginPath();
        for (b = 0; b < bands.length; b++) {
          a = Math.max(Math.floor((bands[b][0] - T) * dpr) / dpr, r[1]); z = Math.min(Math.ceil((bands[b][1] - T) * dpr) / dpr, r[3]);
          if (z > a) { ctx.rect(r[0], a, r[2] - r[0], z - a); any = true; }
        }
        if (!any) { ctx.restore(); return; }
        ctx.clip();
        var lr = lightBox ? cut(lightBox, r) : null;
        if (lr) lr = snap(lr);
        // 1. la trama appena accennata, fuori dal quadrato della luce
        ctx.save();
        if (lr) { rect(r); ctx.rect(lr[0], lr[1], lr[2] - lr[0], lr[3] - lr[1]); ctx.clip("evenodd"); }
        ctx.globalAlpha = base;
        weave(r, C_WARP, C_WEFT, C_DOT);
        ctx.restore();
        // 2. nel quadrato della luce
        if (lr) {
          ctx.save();
          rect(lr); ctx.clip();
          if (finePointer) {
            m0 = Math.max(base, 0.12 + 0.88 * lit); m1 = Math.max(base, 0.12 + 0.38 * lit); mb = base;
            weave(lr, lightGrad(INK, 0.34), lightGrad(WEFT, 0.6), lightGrad(WEFT, 1));
            ctx.fillStyle = glowGrad(); ctx.fillRect(lx - GLOW * 0.7, ly - GLOW * 0.7, GLOW * 1.4, GLOW * 1.4);
          } else {
            // telefono: la fascia più tenue (picco al 60%), con l'alone e poi la maschera ellittica
            weave(lr, C_WARP, C_WEFT, C_DOT);
            ellipse(0.9 * CW, 200, [0, "rgba(" + BRAND + ",.18)", 0.7, "rgba(" + BRAND + ",0)", 1, "rgba(" + BRAND + ",0)"], lr, "source-over");
            ellipse(1.2 * CW, 260, [0, "rgba(0,0,0,.6)", 0.45, "rgba(0,0,0," + Math.max(base, 0.3).toFixed(3) + ")", 1, "rgba(0,0,0," + base.toFixed(3) + ")"], lr, "destination-in");
          }
          ctx.restore();
        }
        // 3. subito sotto la hero la trama entra sfumando (180 px), senza un bordo netto
        for (n = 0; n < fades.length; n++) {
          var fr = cut([r[0], fades[n] - T, r[2], fades[n] - T + 180], r), lg;
          if (!fr) continue;
          fr = snap(fr);
          ctx.save();
          rect(fr); ctx.clip();
          ctx.globalCompositeOperation = "destination-in";
          lg = ctx.createLinearGradient(0, fades[n] - T, 0, fades[n] - T + 180);
          lg.addColorStop(0, "rgba(0,0,0,0)"); lg.addColorStop(1, "rgba(0,0,0,1)");
          ctx.fillStyle = lg; ctx.fillRect(fr[0], fr[1], fr[2] - fr[0], fr[3] - fr[1]);
          ctx.restore();
        }
        ctx.restore();
      }

      // la luce bianca del blocco blu: segue il mouse con un po' di ritardo (sul telefono la fascia a metà schermo);
      // le posizioni dei blocchi sono già misurate: qui solo scritture
      function blueStep(dt) {
        if (!blues.length) return false;
        var moving = false, sy = window.scrollY, vh = window.innerHeight;
        if (finePointer) {
          if (!seen) return false;
          if (bx < -9000) { bx = px; by = py; }
          var f = 1 - Math.exp(-11.9 * dt);
          bx += (px - bx) * f; by += (py - by) * f;
          moving = Math.abs(px - bx) > 0.5 || Math.abs(py - by) > 0.5;
        } else { bx = window.innerWidth / 2; by = vh / 2; }
        blues.forEach(function (o) {
          var top = o.top - sy;
          if (top > vh + 400 || top + o.h < -400) return;
          var x = Math.round(bx - o.left), y = Math.round(by - top);
          if (x === o.tx && y === o.ty) return;
          o.tx = x; o.ty = y;
          o.l.style.setProperty("--tx", x + "px"); o.l.style.setProperty("--ty", y + "px");
        });
        return moving;
      }

      // il giro sul ticker di GSAP (lo stesso di Lenis): ci si aggancia quando qualcosa si muove e ci si stacca da fermi
      function tick(time, dtMs) {
        var dt = Math.min(dtMs || 16, 50) / 1000, moving = step(dt);
        if (moving || dirty) { draw(); dirty = false; }
        if (blueStep(dt)) moving = true;
        if (!moving) { awake = false; gsap.ticker.remove(tick); }
      }
      function wake() { if (!awake) { awake = true; gsap.ticker.add(tick); } }

      if (finePointer) {
        window.addEventListener("pointermove", function (e) {
          if (e.pointerType === "touch") return;
          px = e.clientX; py = e.clientY;
          // la prima volta la luce compare lì, senza attraversare la pagina
          if (!seen) { cx.x = tx = px; cy.x = ty = py; }
          inWin = true; seen = true;
          wake();
        }, { passive: true });
        // il mouse esce dalla finestra: la stoffa torna ferma
        document.addEventListener("mouseout", function (e) { if (!e.relatedTarget) { inWin = false; wake(); } });
        window.addEventListener("blur", function () { inWin = false; wake(); });
      }
      window.addEventListener("scroll", wake, { passive: true });
      if (lenis) lenis.on("scroll", wake);
      window.addEventListener("resize", function () { layout(); wake(); });
      ST.addEventListener("refresh", function () { measure(); wake(); });
      // una risposta delle FAQ che si apre cambia l'altezza della pagina: si rimisurano subito i tratti con la trama
      if (window.ResizeObserver) new ResizeObserver(function () { measure(); wake(); }).observe(main);
      // cambio tema: nuovi colori, ridisegnata subito (così entra già giusta nella dissolvenza del tema)
      document.addEventListener("telaio:tema", function () { colors(); dirty = true; draw(); dirty = false; wake(); });
      layout();
      wake();
    })();

    // Arrivo su una sezione: si scorre lì a posizioni ricalcolate (le sezioni bloccate allungano la pagina)
    if (deepLink) {
      ST.refresh();
      if (lenis) lenis.scrollTo(deepLink, { offset: -82, immediate: true, force: true });
      else deepLink.scrollIntoView();
    }

  }

  /* ============================================================
     IL TELAIO 2D — un tessuto di fili (ordito + trama) in prospettiva
     · onde lente · navette di luce che passano sulla trama
     · il mouse solleva il tessuto · scorrendo si distende e si appiattisce
     È il ripiego del tessuto in WebGL (più sotto): senza WebGL, o se il contesto si perde.
     ============================================================ */
  function initWeave2D(canvas, st) {
    var ctx = canvas.getContext("2d");
    if (!ctx) return null;
    var hero = canvas.parentNode;
    var X0 = -1500, X1 = 1500, Z0 = -620, Z1 = 1750, D = 1150;
    var W = 0, H = 0, NX = 0, NZ = 0, xs, zs, sx, sy, ok, rowGlow, shuttles = [];
    st.t = motion ? 0 : 3;
    var mx = 0.5, my = 0.5, tmx = 0.5, tmy = 0.5, mon = 0, tmon = 0, px = -9999, py = -9999;
    var running = false, raf = 0, last = 0;

    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

    function resize() {
      // sul telefono la barra degli indirizzi che compare e sparisce manda "resize" senza cambiare la hero:
      // in quel caso il tessuto non si ricostruisce (e le navette non ripartono a metà)
      if (W && canvas.clientWidth === W && canvas.clientHeight === H) return;
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

    // I fili del tessuto come segmenti dritti, in coordinate dello schermo e nel loro colore:
    // l'apertura delle home ci fa posare sopra le linee del marchio.
    st.threads = function (nCols, nRows) {
      project(st.t);
      var r = canvas.getBoundingClientRect(), light = root.getAttribute("data-theme") === "light";
      var out = {
        warp: [], weft: [],
        top: r.top + (sy[(NZ - 1) * NX + (NX >> 1)] || H * 0.2),
        warpColor: light ? "rgba(9,12,8,0.2)" : "rgba(155,160,147,0.3)",
        weftColor: light ? "rgba(19,7,237,0.34)" : "rgba(142,157,255,0.55)"
      };
      function pick(n, a, b) { var v = []; for (var q = 0; q < n; q++) v.push(Math.round(a + (b - a) * q / Math.max(1, n - 1))); return v; }
      pick(nCols, 0, NX - 1).forEach(function (i) {
        var near = -1, far = -1;
        for (var j = 0; j < NZ; j++) if (ok[j * NX + i]) { if (near < 0) near = j; far = j; }
        if (near < 0) return;
        var a = near * NX + i, b = far * NX + i;
        out.warp.push({ x1: r.left + sx[b], y1: r.top + sy[b], x2: r.left + sx[a], y2: r.top + sy[a] });
      });
      pick(nRows, 1, Math.round(NZ * 0.75)).forEach(function (j) {
        var left = -1, right = -1;
        for (var i = 0; i < NX; i++) if (ok[j * NX + i]) { if (left < 0) left = i; right = i; }
        if (left < 0) return;
        var a = j * NX + left, b = j * NX + right;
        out.weft.push({ x1: r.left + sx[a], y1: r.top + sy[a], x2: r.left + sx[b], y2: r.top + sy[b] });
      });
      return out;
    };

    resize();
    if (motion && "IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) start(); else stop(); }); }).observe(hero);
    } else if (motion) start();
    return st;
  }

  /* ============================================================
     IL TESSUTO IN WEBGL — inizio
     Un telo vero, in prospettiva, con la stessa inquadratura del telaio 2D qui sopra.
     · ordito e trama: a ogni incrocio si alterna il filo che passa sopra, con la sua ombra corta
     · onde lente · col mouse il telo si affossa e torna su in onde
     · la navetta: ogni tanto una luce blu corre lungo una riga della trama
     · all'ingresso una linea blu tesse il telo, dal davanti verso l'orizzonte
     · scorrendo il telo viene tirato via: pieghe, e arriva la frangia dell'ordito
     · sul telefono: telo più leggero, niente mouse, ogni tanto un'onda da sola
     · nel piè di pagina la parola «Telaio» è riempita dallo stesso tessuto (initParolaTessuta)
     Il blu del marchio solo come luce. Senza WebGL, o se il contesto si perde, resta il telaio 2D.
     ============================================================ */
  function initWeave() {
    var canvas = document.getElementById("weave");
    if (!canvas || !canvas.getContext) return null;
    var st = { weave: motion ? 0 : 1 };
    var ok = initWeaveGL(canvas, st);
    if (ok === true) return st;
    // se il WebGL ha già preso il canvas, il 2D ne vuole uno nuovo
    return initWeave2D(ok || canvas, st);
  }

  function tessLimita(v, a, b) { return v < a ? a : v > b ? b : v; }
  function tessLiscia(x) { x = tessLimita(x, 0, 1); return x * x * (3 - 2 * x); }
  function tessCaso(a, b) { return a + Math.random() * (b - a); }
  function tessChiaro() { return root.getAttribute("data-theme") === "light"; }
  // le onde lente del telo: le stesse dello shader (servono per capire dove punta il mouse)
  function tessOnde(x, y, t) {
    return Math.sin(x * 0.0030 + t * 0.42) * 52 + Math.sin(y * 0.0042 - t * 0.55 + x * 0.0012) * 40 + Math.sin((x - y) * 0.0019 + t * 0.27) * 30;
  }
  // un canvas nuovo al posto di quello preso dal WebGL (stessi attributi, anche l'opacità messa da GSAP)
  function tessCanvasNuovo(old) {
    var n = old.cloneNode(false);
    if (old.parentNode) old.parentNode.replaceChild(n, old);
    return n;
  }

  // Colori del tessuto per tema (lineari): fili dell'ordito e della trama, fondo tra i fili,
  // luci (principale, ambiente, lucido dei fili, luce blu) e colore della pagina (per la nebbia)
  function tessPalette(chiaro, parola) {
    if (parola) {
      return chiaro
        ? { warp: [0.050, 0.052, 0.050], weft: [0.036, 0.041, 0.064], base: [0.006, 0.007, 0.008], luce: [1.0, 0.07, 0.14, 0], fondo: [1, 1, 1] }
        : { warp: [0.185, 0.190, 0.174], weft: [0.123, 0.143, 0.207], base: [0.0016, 0.002, 0.0016], luce: [1.2, 0.05, 0.3, 0], fondo: [0.005, 0.006, 0.004] };
    }
    return chiaro
      ? { warp: [0.50, 0.52, 0.54], weft: [0.42, 0.45, 0.52], base: [0.20, 0.21, 0.24], luce: [0.86, 0.36, 0.10, 0.22], fondo: [0.905, 0.913, 0.94] }
      : { warp: [0.066, 0.068, 0.062], weft: [0.044, 0.051, 0.074], base: [0.0016, 0.002, 0.0016], luce: [1.05, 0.035, 0.2, 1.6], fondo: [0.0027, 0.0037, 0.0024] };
  }

  /* ---- WebGL: contesto e programmi ---- */
  // WebGL2, altrimenti WebGL1. Prima solo con una scheda grafica vera; con solo WebGL software si va più leggeri.
  function tessContesto(canvas) {
    if (!window.WebGLRenderingContext) return null;
    function get(strict) {
      var o = { alpha: true, premultipliedAlpha: true, antialias: true, depth: true, stencil: false,
                powerPreference: "high-performance", failIfMajorPerformanceCaveat: strict }, gl = null;
      try { gl = canvas.getContext("webgl2", o); if (gl) return { gl: gl, v2: true }; } catch (e) {}
      try { gl = canvas.getContext("webgl", o) || canvas.getContext("experimental-webgl", o); if (gl) return { gl: gl, v2: false }; } catch (e) {}
      return null;
    }
    var c = get(true), slow = false;
    if (!c) { c = get(false); slow = !!c; }
    if (!c) return null;
    c.slow = slow;
    c.deriv = c.v2 || !!c.gl.getExtension("OES_standard_derivatives");
    return c;
  }
  // lo stesso sorgente per WebGL2 (GLSL 3.00) e WebGL1 (GLSL 1.00)
  function tessPrep(src, c, frag) {
    var h = c.v2 ? "#version 300 es\n" : "";
    if (frag && !c.v2 && c.deriv) h += "#extension GL_OES_standard_derivatives : enable\n";
    h += frag ? "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n" : "precision highp float;\n";
    if (c.deriv) h += "#define HAS_DERIV\n";
    if (c.v2) h += frag ? "#define VIN in\nout vec4 fragOut;\n#define FRAG fragOut\n#define TEX texture\n" : "#define ATTR in\n#define VOUT out\n";
    else h += frag ? "#define VIN varying\n#define FRAG gl_FragColor\n#define TEX texture2D\n" : "#define ATTR attribute\n#define VOUT varying\n";
    return h + src;
  }
  function tessProgramma(c, vs, fs) {
    var gl = c.gl;
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { if (!gl.isContextLost()) console.error(gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    var v = sh(gl.VERTEX_SHADER, tessPrep(vs, c, false)), f = sh(gl.FRAGMENT_SHADER, tessPrep(fs, c, true));
    if (!v || !f) return null;
    var p = gl.createProgram();
    gl.attachShader(p, v); gl.attachShader(p, f);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { if (!gl.isContextLost()) console.error(gl.getProgramInfoLog(p)); return null; }
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) {
      var name = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, "");
      u[name] = gl.getUniformLocation(p, name);
    }
    // un uniform che lo shader non usa non c'è: le chiamate su di lui non fanno niente
    function loc(k) { return u[k] || null; }
    return {
      p: p,
      f1: function (k, a) { gl.uniform1f(loc(k), a); },
      f2: function (k, a, b) { gl.uniform2f(loc(k), a, b); },
      f3: function (k, a) { gl.uniform3f(loc(k), a[0], a[1], a[2]); },
      f4: function (k, a, b, d, e) { gl.uniform4f(loc(k), a, b, d, e); },
      v4: function (k, arr) { gl.uniform4fv(loc(k), arr); },
      i1: function (k, a) { gl.uniform1i(loc(k), a); },
      tema: function (pal, chiaro) {
        gl.uniform3f(loc("u_warp"), pal.warp[0], pal.warp[1], pal.warp[2]);
        gl.uniform3f(loc("u_weft"), pal.weft[0], pal.weft[1], pal.weft[2]);
        gl.uniform3f(loc("u_base"), pal.base[0], pal.base[1], pal.base[2]);
        gl.uniform3f(loc("u_fondo"), pal.fondo[0], pal.fondo[1], pal.fondo[2]);
        gl.uniform4f(loc("u_luce"), pal.luce[0], pal.luce[1], pal.luce[2], pal.luce[3]);
        gl.uniform1f(loc("u_chiaro"), chiaro ? 1 : 0);
      }
    };
  }

  /* ---- Il tocco: impronta con la molla + onde che si allargano (hero in unità del mondo, parola in px) ---- */
  function tessTocco(o) {
    var T = { x: 0, y: 0, tx: 0, ty: 0, d: 0, v: 0, td: 0, r: o.rHover, on: false, down: false, glow: 0,
              has: false, lx: 0, ly: 0, lt: 0, slot: 0, rip: new Float32Array(24), out: new Float32Array(24) };
    T.move = function (x, y, now) {
      if (!T.has) { T.x = x; T.y = y; T.lx = x; T.ly = y; T.lt = now; T.has = true; }
      T.tx = x; T.ty = y; T.on = true;
      T.td = T.down ? o.press : o.hover;
    };
    T.leave = function () { T.on = false; T.down = false; T.td = 0; T.has = false; };
    T.press = function () { T.down = true; T.td = o.press; };
    T.release = function (now) {
      if (!T.down) return;
      T.down = false; T.td = T.on ? o.hover : 0;
      T.ripple(T.x, T.y, now, o.pressAmp);
    };
    T.ripple = function (x, y, now, a) {
      var i = T.slot * 4;
      T.rip[i] = x; T.rip[i + 1] = y; T.rip[i + 2] = now; T.rip[i + 3] = a;
      T.slot = (T.slot + 1) % 6;
    };
    T.step = function (dt, now) {
      // l'impronta segue il puntatore con un poco di ritardo
      var k = 1 - Math.exp(-dt * 12);
      T.x += (T.tx - T.x) * k; T.y += (T.ty - T.y) * k;
      // molla poco smorzata: lasciando il tasto la conca risale, va un filo oltre e si assesta
      var n = 4, h = dt / n;
      for (var i = 0; i < n; i++) { T.v += (o.k * (T.td - T.d) - o.c * T.v) * h; T.d += T.v * h; }
      T.r += ((T.down ? o.rPress : o.rHover) - T.r) * (1 - Math.exp(-dt * 8));
      T.glow += ((T.on ? 1 : 0) - T.glow) * (1 - Math.exp(-dt * (T.on ? 5 : 2.5)));
      // la scia: muovendosi, il tessuto manda piccole onde (più forti se il mouse va veloce)
      if (T.on) {
        var dx = T.x - T.lx, dy = T.y - T.ly, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > o.wakeStep) {
          var speed = dist / Math.max(now - T.lt, 0.016);
          T.ripple(T.x, T.y, now, o.wakeAmp * tessLimita(speed / o.wakeSpeed, 0.25, 1));
          T.lx = T.x; T.ly = T.y; T.lt = now;
        }
      }
    };
    T.uniforms = function (now) {
      for (var i = 0; i < 6; i++) {
        var b = i * 4, age = now - T.rip[b + 2], a = T.rip[b + 3];
        T.out[b] = T.rip[b]; T.out[b + 1] = T.rip[b + 1];
        T.out[b + 2] = Math.max(age, 0); T.out[b + 3] = age > 5 ? 0 : a;
      }
      return T.out;
    };
    return T;
  }

  /* ---- La navetta: ogni tanto parte su una riga e la attraversa ---- */
  function tessNavetta(o) {
    var S = { on: false, row: 0, head: 0, dir: 1, a: 0, wait: o.first, out: new Float32Array([0, 0, 1, 0]) };
    S.step = function (dt, ok) {
      if (!S.on) {
        S.a = Math.max(0, S.a - dt * 1.6);
        if (ok) S.wait -= dt;
        if (ok && S.wait <= 0) {
          var rows = o.rows();
          if (rows) {
            S.on = true; S.row = Math.floor(tessCaso(rows[0], rows[1]));
            S.dir = Math.random() < 0.5 ? 1 : -1;
            S.head = S.dir > 0 ? o.from() : o.to();
          } else S.wait = 0.5;
        }
      } else {
        S.head += S.dir * o.speed() * dt;
        S.a = Math.min(1, S.a + dt * 2.5);
        if ((S.dir > 0 && S.head > o.to() + 30) || (S.dir < 0 && S.head < o.from() - 30)) {
          S.on = false; S.wait = tessCaso(o.wait[0], o.wait[1]);
        }
      }
      S.out[0] = S.row; S.out[1] = S.head; S.out[2] = S.dir; S.out[3] = S.a;
      return S.out;
    };
    return S;
  }

  /* ---- GLSL in comune (solo nei frammenti): il tessuto ---- */
  function tessGlslTessuto() {
    return [
      "#define PI 3.14159265",
      // misure del filo, in fili: mezza larghezza, quanto sale e scende all'incrocio, rilievo della sezione
      "const float TW = 0.44;",
      "const float TA = 0.24;",
      "const float TR = 0.26;",
      // il blu del marchio (lineare) e le sue due varianti chiare: solo come luce
      "const vec3 BLUE = vec3(0.0065, 0.0021, 0.85);",   // #1307ED
      "const vec3 LIFT = vec3(0.050, 0.037, 0.915);",    // #3F36F5
      "const vec3 PALE = vec3(0.27, 0.34, 1.0);",        // #8E9DFF
      // colori del tema (tessPalette)
      "uniform vec3 u_warp;",
      "uniform vec3 u_weft;",
      "uniform vec3 u_base;",
      "uniform vec3 u_fondo;",
      "uniform vec4 u_luce;",
      "uniform float u_chiaro;",
      "float hash1(float n) { return fract(sin(n * 12.9898 + 4.1414) * 43758.5453); }",
      "float hash2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }",

      // Il filo che si vede in un punto. uv in fili (l'ordito corre lungo v, la trama lungo u).
      // aa: morbidezza dei bordi; wf: 1 dove la trama c'è già (0: solo ordito).
      // Escono normale e tangente del filo (x lungo u, y lungo v, z in alto), altezza,
      // quanto si vede di ordito (mw) e di trama (mf), la differenza da filo a filo e le fibre ritorte.
      "void weave(vec2 uv, float aa, float wf, out vec3 nm, out vec3 tg, out float h,",
      "           out float mw, out float mf, out float tint, out float fib) {",
      "  vec2 c = floor(uv);",
      "  vec2 f = uv - c - 0.5;",
      // a ogni incrocio si alterna chi sta sopra (tela semplice)
      "  float s = mod(c.x + c.y, 2.0) < 0.5 ? 1.0 : -1.0;",
      "  float top = 0.5 + 0.5 * s;",
      // ogni filo ha il suo spessore, appena diverso: il tessuto non sembra stampato
      "  float ww = TW * (0.9 + 0.16 * hash1(c.x + 3.0));",
      "  float wt = TW * (0.9 + 0.16 * hash1(c.y + 57.0));",
      "  float inW = 1.0 - smoothstep(ww - aa, ww + aa, abs(f.x));",
      "  float inF = (1.0 - smoothstep(wt - aa, wt + aa, abs(f.y))) * wf;",
      "  mw = inW * (1.0 - inF * (1.0 - top));",
      "  mf = inF * (1.0 - inW * top);",
      // ordito: sezione tonda; sale dove passa sopra, scende dove passa sotto
      "  float cw = clamp(f.x / ww, -1.0, 1.0);",
      "  float pw = sqrt(max(1.0 - cw * cw, 0.05));",
      "  float sw = 0.5 * TA * s * PI * sin(PI * f.y);",
      "  float hw = 0.5 * TA * s * cos(PI * f.y) + TR * pw;",
      "  vec3 nw = normalize(vec3(TR * cw / (pw * ww), sw, 1.0));",
      "  vec3 tw = normalize(vec3(0.0, 1.0, -sw));",
      // trama: lo stesso, girato di 90 gradi e al contrario
      "  float cf = clamp(f.y / wt, -1.0, 1.0);",
      "  float pf = sqrt(max(1.0 - cf * cf, 0.05));",
      "  float sf = -0.5 * TA * s * PI * sin(PI * f.x);",
      "  float hf = -0.5 * TA * s * cos(PI * f.x) + TR * pf;",
      "  vec3 nf = normalize(vec3(sf, TR * cf / (pf * wt), 1.0));",
      "  vec3 tf = normalize(vec3(1.0, 0.0, -sf));",
      "  float cov = mw + mf;",
      "  float k = 1.0 / max(cov, 1e-4);",
      "  nm = normalize(nw * mw + nf * mf + vec3(0.0, 0.0, 1.0) * max(1.0 - cov, 0.0));",
      "  tg = normalize(tw * mw + tf * mf + vec3(1e-3, 1e-3, 0.0));",
      "  h = mix(-0.55, (hw * mw + hf * mf) * k, min(cov, 1.0));",
      "  tint = ((hash1(c.x) - 0.5) * mw + (hash1(c.y + 91.0) - 0.5) * mf) * k;",
      // fibre ritorte: righe oblique lungo il filo
      "  fib = (sin((cw * 0.8 + uv.y * 3.0) * 6.2832) * mw + sin((cf * 0.8 + uv.x * 3.0) * 6.2832) * mf) * k;",
      "}",

      // solo l'altezza: serve per l'ombra corta del filo che passa sopra
      "float weaveH(vec2 uv, float wf) {",
      "  vec2 c = floor(uv);",
      "  vec2 f = uv - c - 0.5;",
      "  float s = mod(c.x + c.y, 2.0) < 0.5 ? 1.0 : -1.0;",
      "  float ww = TW * (0.9 + 0.16 * hash1(c.x + 3.0));",
      "  float wt = TW * (0.9 + 0.16 * hash1(c.y + 57.0));",
      "  float inW = step(abs(f.x), ww);",
      "  float inF = step(abs(f.y), wt) * step(0.5, wf);",
      "  float top = 0.5 + 0.5 * s;",
      "  float mw = inW * (1.0 - inF * (1.0 - top));",
      "  float mf = inF * (1.0 - inW * top);",
      "  float cw = f.x / ww, cf = f.y / wt;",
      "  float hw = 0.5 * TA * s * cos(PI * f.y) + TR * sqrt(max(1.0 - cw * cw, 0.0));",
      "  float hf = -0.5 * TA * s * cos(PI * f.x) + TR * sqrt(max(1.0 - cf * cf, 0.0));",
      "  return mw * hw + mf * hf - 0.55 * (1.0 - mw - mf);",
      "}",

      // riflesso lungo il filo (Kajiya-Kay): una striscia di luce di traverso al filo
      "float aniso(vec3 t, vec3 L, vec3 V, float e) {",
      "  vec3 H = normalize(L + V);",
      "  float th = dot(t, H);",
      "  return pow(sqrt(max(1.0 - th * th, 0.0)), e);",
      "}",

      // la navetta: una luce blu che corre lungo una riga della trama, con la scia.
      // S: riga, testa (in fili), direzione, intensità. lit: quanto il filo è in luce.
      "vec3 shuttle(vec2 uv, vec4 S, float mf, float lit) {",
      "  if (S.w < 0.002) return vec3(0.0);",
      "  float on = 1.0 - step(0.5, abs(floor(uv.y) - S.x));",
      "  float b = (S.y - uv.x) * S.z;",
      "  float trail = b >= 0.0 ? exp(-b / 20.0) : exp(b * 3.0);",
      "  float core = exp(-b * b * 1.5);",
      "  vec2 d = vec2((uv.x - S.y) / 4.5, (uv.y - S.x - 0.5) / 2.0);",
      "  float halo = exp(-dot(d, d));",
      "  vec3 e = (BLUE * trail * 1.2 + PALE * core * 1.6) * on * mf * (0.55 + 0.45 * lit);",
      "  e += LIFT * halo * (0.05 + 0.45 * lit);",
      "  return e * S.w;",
      "}",

      // la luce propria (navetta, linea della tessitura, mouse): sul tessuto scuro si somma,
      // su quello chiaro lo tinge del blu del marchio
      "vec3 accendi(vec3 col, vec3 em) {",
      "  float k = clamp(dot(em, vec3(0.5)), 0.0, 0.85);",
      "  return mix(col + em, mix(col, BLUE * 0.55, k), u_chiaro);",
      "}"
    ].join("\n");
  }

  /* ---- Hero: il telo in prospettiva ---- */
  function tessGlslTeloVS() {
    return [
      "ATTR vec2 a_m;",            // coordinate del tessuto (u lungo X, v lungo Z)
      "uniform float u_t;",
      "uniform vec4 u_cam;",       // imbardata, inclinazione, distanza, ampiezza delle onde
      "uniform vec4 u_view;",      // larghezza, altezza, focale, centro x (px css)
      "uniform float u_cy;",
      "uniform vec4 u_dent;",      // impronta del mouse: x, v, profondità, raggio
      "uniform vec4 u_rip[6];",    // onde: x, v, età (s), ampiezza
      "uniform vec4 u_pull;",      // scorrimento: avanzamento, pieghe, frangia, spostamento
      "VOUT vec2 v_m;",
      "VOUT vec3 v_w;",
      "VOUT vec3 v_n;",
      "VOUT float v_z;",
      "float waves(vec2 m) {",
      "  return sin(m.x * 0.0030 + u_t * 0.42) * 52.0",
      "       + sin(m.y * 0.0042 - u_t * 0.55 + m.x * 0.0012) * 40.0",
      "       + sin((m.x - m.y) * 0.0019 + u_t * 0.27) * 30.0;",
      "}",
      "vec3 place(vec2 m) {",
      "  float y = waves(m) * u_cam.w;",
      // l'impronta: una conca morbida, col bordo che si alza appena
      "  vec2 d = m - u_dent.xy;",
      "  float r = sqrt(dot(d, d)) / u_dent.w;",
      "  float rim = r - 1.7;",
      "  y -= u_dent.z * 60.0 * exp(-r * r);",
      "  y += u_dent.z * 8.0 * exp(-rim * rim * 3.0);",
      // le onde che partono dall'impronta e si allargano
      "  for (int i = 0; i < 6; i++) {",
      "    vec4 R = u_rip[i];",
      "    float rr = length(m - R.xy);",
      "    float fr = R.z * 430.0;",
      "    float s = (rr - fr) / (60.0 + R.z * 55.0);",
      "    y += R.w * exp(-R.z * 1.25 - s * s) * cos((rr - fr) * 0.052) / sqrt(1.0 + rr / 240.0);",
      "  }",
      // tirato via: il telo scivola verso l'orizzonte; dietro, dove resta indietro, fa pieghe lunghe
      // nel verso in cui viene tirato, e il bordo con la frangia si solleva appena
      "  float z = m.y + u_pull.w;",
      "  float back = 1.0 - smoothstep(-200.0, 1800.0, z);",
      "  y += u_pull.y * 58.0 * sin(m.x * 0.0115 + m.y * 0.0030 + sin(m.y * 0.0019 + u_t * 0.2) * 1.3) * back;",
      "  y += u_pull.z * 80.0 * (1.0 - smoothstep(-900.0, -300.0, m.y));",
      "  return vec3(m.x, y, z);",
      "}",
      "void main() {",
      "  vec3 p = place(a_m);",
      "  vec3 px = place(a_m + vec2(8.0, 0.0));",
      "  vec3 pz = place(a_m + vec2(0.0, 8.0));",
      "  vec3 n = normalize(cross(pz - p, px - p));",
      // la stessa proiezione del telaio 2D, scritta come matrice di prospettiva
      "  float cyw = cos(u_cam.x), syw = sin(u_cam.x), cp = cos(u_cam.y), sp = sin(u_cam.y);",
      "  float x1 = p.x * cyw - p.z * syw, z1 = p.x * syw + p.z * cyw;",
      "  float y2 = p.y * cp + z1 * sp, z2 = z1 * cp - p.y * sp + u_cam.z;",
      "  float W = u_view.x, H = u_view.y, f = u_view.z, cx = u_view.w;",
      "  float n0 = 40.0, f0 = 9000.0;",
      "  gl_Position = vec4((2.0 * cx / W - 1.0) * z2 + 2.0 * f * x1 / W,",
      "                     (1.0 - 2.0 * u_cy / H) * z2 + 2.0 * f * y2 / H,",
      "                     (z2 * (f0 + n0) - 2.0 * f0 * n0) / (f0 - n0),",
      "                     z2);",
      "  v_m = a_m; v_w = p; v_n = n; v_z = z2;",
      "}"
    ].join("\n");
  }

  function tessGlslTeloFS() {
    return [
      "uniform vec3 u_eye;",       // posizione di chi guarda
      "uniform vec3 u_key;",       // luce principale (direzione)
      "uniform vec3 u_blue;",      // la luce blu, posata sul tessuto
      "uniform float u_pitch;",    // passo dei fili (unità del mondo)
      "uniform float u_fpx;",      // focale × densità di pixel (stima del filo senza derivate)
      "uniform vec4 u_glow;",      // luce del mouse: x, v, intensità, raggio
      "uniform vec4 u_shut;",      // navetta
      "uniform vec2 u_front;",     // linea della tessitura (v) e quanto è accesa
      "uniform vec2 u_fog;",       // nebbia: inizio, fine (profondità)
      "uniform vec4 u_span;",      // il telo lungo v: inizio dei fili, inizio della trama, fine della trama, fine dei fili
      "uniform float u_alpha;",    // il telo compare all'ingresso e sparisce mentre la hero esce
      "VIN vec2 v_m;",
      "VIN vec3 v_w;",
      "VIN vec3 v_n;",
      "VIN float v_z;",
      "void main() {",
      "  vec3 N = normalize(v_n);",
      "  vec3 V = normalize(u_eye - v_w);",
      "  vec2 uv = v_m / u_pitch;",
      // quanti fili cadono in un pixel: lontano il disegno si scioglie nel suo colore medio (niente moiré)
      "#ifdef HAS_DERIV",
      "  vec2 dd = fwidth(uv);",
      "  float fw = max(dd.x, dd.y);",
      "#else",
      "  float fw = v_z / (u_fpx * u_pitch * max(dot(N, V), 0.2));",
      "#endif",
      "  float lod = smoothstep(0.3, 0.8, fw);",
      "  float aa = clamp(fw * 0.8, 0.02, 0.45);",
      // la trama c'è solo tra i due orli (fuori resta la frangia dell'ordito) e dietro la linea della tessitura
      "  float woven = smoothstep(u_span.y, u_span.y + u_pitch, v_m.y) * (1.0 - smoothstep(u_span.z - u_pitch, u_span.z, v_m.y));",
      "  float wf = woven * (1.0 - smoothstep(u_front.x - u_pitch, u_front.x, v_m.y));",
      "  vec3 nm; vec3 tg; float h; float mw; float mf; float tint; float fib;",
      "  weave(uv, aa, wf, nm, tg, h, mw, mf, tint, fib);",
      "  vec3 Tu = normalize(vec3(1.0, 0.0, 0.0) - N * N.x);",
      "  vec3 Tv = cross(Tu, N);",
      "  vec3 n = normalize(mix(Tu * nm.x + Tv * nm.y + N * nm.z, N, lod));",
      "  vec3 t = normalize(Tu * tg.x + Tv * tg.y + N * tg.z);",
      "  vec3 L = u_key;",
      // ombra corta: il filo che passa sopra copre un poco quello sotto, dal lato opposto alla luce
      "  vec2 Ld = vec2(dot(L, Tu), dot(L, Tv)) + 1e-4;",
      "  float hq = weaveH(uv + normalize(Ld) * 0.2, wf);",
      "  float sh = 1.0 - 0.55 * smoothstep(0.03, 0.2, hq - h) * (1.0 - lod);",
      "  float cov = mix(mw + mf, 0.9, lod);",
      "  float ao = mix(mix(0.4, 1.0, smoothstep(-0.42, 0.40, h)), 0.78, lod);",
      "  float k = 1.0 / max(mw + mf, 1e-4);",
      "  vec3 alb = mix((u_warp * mw + u_weft * mf) * k, (u_warp + u_weft) * 0.5, lod);",
      "  alb *= 1.0 + (tint * 0.35 + fib * 0.16 * (1.0 - smoothstep(0.05, 0.12, fw))) * (1.0 - lod);",
      "  vec3 keyC = vec3(0.90, 0.95, 1.0);",
      "  float dl = dot(n, L);",
      "  float diff = max((dl + 0.35) / 1.35, 0.0);",
      "  float sp = aniso(t, L, V, 56.0) * smoothstep(-0.05, 0.4, dl);",
      "  sp = mix(sp, 0.18 * pow(max(dot(N, normalize(L + V)), 0.0), 6.0), lod);",
      "  vec3 col = alb * (keyC * diff * sh * u_luce.x + u_luce.y) * ao;",
      "  col += keyC * sp * u_luce.z * ao * sh;",
      "  col += alb * 0.14 * max(dot(n, V), 0.0) * ao;",
      // la luce blu del marchio: una pozza piccola, non un colore del tessuto
      "  vec3 lb = u_blue - v_w;",
      "  float db = length(lb);",
      "  lb /= db;",
      "  float att = u_luce.w / (1.0 + db * db / 160000.0);",
      "  col += BLUE * alb * max(dot(n, lb) + 0.2, 0.0) * att * ao;",
      "  col += LIFT * aniso(t, lb, V, 40.0) * att * 0.0625 * ao * (1.0 - lod * 0.6);",
      "  col = mix(u_base, col, clamp(cov, 0.0, 1.0));",
      // luce propria: il mouse (soprattutto sul lucido dei fili), la navetta, la linea della tessitura
      "  vec2 gd = (v_m - u_glow.xy) / u_glow.w;",
      "  float g = exp(-dot(gd, gd)) * u_glow.z;",
      "  vec3 em = mix((LIFT * alb * 2.2 + PALE * sp * 0.45) * ao, LIFT * 0.22, u_chiaro) * g;",
      "  em += shuttle(uv, u_shut, mf, diff) * (1.0 - lod * 0.5);",
      "  float fr = exp(-abs(v_m.y - u_front.x) / (u_pitch * 2.0)) * u_front.y;",
      "  em += (BLUE * 0.9 * (mf + 0.3 * mw) + PALE * 0.15 * mf) * fr;",
      "  col = accendi(col, em);",
      // nebbia verso l'orizzonte; fuori dagli orli solo i fili dell'ordito, che finiscono sfilacciati
      "  float fog = smoothstep(u_fog.x, u_fog.y, v_z);",
      "  col = mix(col, u_fondo, fog * 0.5);",
      "  float a = 1.0 - fog;",
      "  float hem = smoothstep(u_span.y - u_pitch, u_span.y, v_m.y) * (1.0 - smoothstep(u_span.z, u_span.z + u_pitch, v_m.y));",
      "  float ends = hash1(floor(uv.x) + 7.0) * 120.0;",
      "  a *= mix(clamp(mw * 1.15, 0.0, 1.0), 1.0, hem)",
      "     * smoothstep(u_span.x + ends, u_span.x + ends + 60.0, v_m.y) * (1.0 - smoothstep(u_span.w - 60.0 - ends, u_span.w - ends, v_m.y)) * u_alpha;",
      "  vec3 c = pow(max(col, 0.0), vec3(0.4545));",
      "  c += (hash2(gl_FragCoord.xy) - 0.5) / 255.0;",
      "  FRAG = vec4(c * a, a);",
      "}"
    ].join("\n");
  }

  /* ---- La parola: un rettangolo su tutto il canvas, il tessuto solo dentro le lettere ---- */
  function tessGlslParolaVS() {
    return "ATTR vec2 a_p;\nvoid main() { gl_Position = vec4(a_p, 0.0, 1.0); }";
  }
  function tessGlslParolaFS() {
    return [
      "uniform vec2 u_res;",       // pixel del canvas
      "uniform float u_dpr;",
      "uniform float u_pitch;",    // passo dei fili (px css)
      "uniform float u_t;",
      "uniform vec4 u_dent;",      // impronta del mouse: x, y (px css, dal basso), profondità, raggio
      "uniform vec4 u_rip[6];",
      "uniform vec4 u_shut;",
      "uniform vec2 u_front;",     // linea della tessitura (in fili, dal basso) e quanto è accesa
      "uniform vec4 u_glow;",
      "uniform sampler2D u_mask;",
      "float hgt(vec2 p) {",
      // onde lente un poco più marcate che nella hero: la parola è piatta, la luce le fa vedere
      "  float y = sin(p.x * 0.0105 + u_t * 0.6) * 17.0 + sin(p.y * 0.016 - u_t * 0.45 + p.x * 0.004) * 11.0",
      "          + sin((p.x - p.y) * 0.007 + u_t * 0.3) * 12.0;",
      "  vec2 d = p - u_dent.xy;",
      "  float r = sqrt(dot(d, d)) / u_dent.w;",
      "  y -= u_dent.z * 26.0 * exp(-r * r);",
      "  for (int i = 0; i < 6; i++) {",
      "    vec4 R = u_rip[i];",
      "    float rr = length(p - R.xy);",
      "    float fr = R.z * 260.0;",
      "    float s = (rr - fr) / (30.0 + R.z * 30.0);",
      "    y += R.w * exp(-R.z * 1.3 - s * s) * cos((rr - fr) * 0.09) / sqrt(1.0 + rr / 140.0);",
      "  }",
      "  return y;",
      "}",
      "void main() {",
      "  vec2 st = gl_FragCoord.xy / u_res;",
      "  float m = TEX(u_mask, st).a;",
      "  if (m < 0.003) discard;",
      "  vec2 p = gl_FragCoord.xy / u_dpr;",
      "  float h0 = hgt(p), hx = hgt(p + vec2(2.0, 0.0)), hy = hgt(p + vec2(0.0, 2.0));",
      "  vec3 N = normalize(vec3((h0 - hx) * 0.5, (h0 - hy) * 0.5, 1.0));",
      "  vec3 V = vec3(0.0, 0.0, 1.0);",
      "  vec2 uv = p / u_pitch;",
      "  float fw = 1.0 / (u_pitch * u_dpr);",
      "  float aa = clamp(fw * 0.8, 0.02, 0.45);",
      "  float wf = 1.0 - smoothstep(u_front.x - 1.0, u_front.x, uv.y);",
      "  vec3 nm; vec3 tg; float h; float mw; float mf; float tint; float fib;",
      "  weave(uv, aa, wf, nm, tg, h, mw, mf, tint, fib);",
      "  vec3 Tu = normalize(vec3(1.0, 0.0, 0.0) - N * N.x);",
      "  vec3 Tv = cross(N, Tu);",
      "  vec3 n = normalize(Tu * nm.x + Tv * nm.y + N * nm.z);",
      "  vec3 t = normalize(Tu * tg.x + Tv * tg.y + N * tg.z);",
      // la luce principale gira piano: un riflesso che passa sulle lettere
      "  vec3 L = normalize(vec3(-0.5 + 0.3 * sin(u_t * 0.16), 0.62, 0.62));",
      "  vec2 Ld = vec2(dot(L, Tu), dot(L, Tv)) + 1e-4;",
      "  float hq = weaveH(uv + normalize(Ld) * 0.2, wf);",
      "  float sh = 1.0 - 0.55 * smoothstep(0.03, 0.2, hq - h);",
      "  float ao = mix(0.22, 1.0, smoothstep(-0.42, 0.40, h));",
      "  float k = 1.0 / max(mw + mf, 1e-4);",
      "  vec3 alb = (u_warp * mw + u_weft * mf) * k;",
      "  alb *= 1.0 + tint * 0.3 + fib * 0.14 * (1.0 - smoothstep(0.05, 0.12, fw));",
      "  float dl = dot(n, L);",
      "  float diff = max((dl + 0.35) / 1.35, 0.0);",
      "  float sp = aniso(t, L, V, 48.0) * smoothstep(-0.05, 0.4, dl);",
      "  vec3 col = alb * (diff * sh * u_luce.x + u_luce.y) * ao + vec3(0.9, 0.95, 1.0) * sp * u_luce.z * ao * sh;",
      "  col = mix(u_base, col, clamp(mw + mf, 0.0, 1.0));",
      "  vec2 gd = (p - u_glow.xy) / u_glow.w;",
      "  float g = exp(-dot(gd, gd)) * u_glow.z;",
      "  vec3 em = mix((LIFT * alb * 1.2 + PALE * sp * 0.4) * ao, LIFT * 0.2, u_chiaro) * g;",
      "  em += shuttle(uv, u_shut, mf, diff);",
      "  float fr = exp(-abs(uv.y - u_front.x) / 1.6) * u_front.y;",
      "  em += (BLUE * 0.9 * (mf + 0.3 * mw) + PALE * 0.2 * mf) * fr;",
      "  col = accendi(col, em);",
      // il bordo delle lettere: un filo di luce dal lato della luce, un'ombra dall'altro
      "  vec2 o = L.xy * 2.5 * u_dpr / u_res;",
      "  float rim = clamp(m - TEX(u_mask, st + o).a, 0.0, 1.0);",
      "  float shd = clamp(m - TEX(u_mask, st - o).a, 0.0, 1.0);",
      "  col = col * (1.0 - 0.5 * shd) + vec3(0.5, 0.55, 0.65) * 0.1 * rim * (1.0 - u_chiaro);",
      // come la scritta del sito, si spegne verso il basso
      "  float fade = mix(1.0, 0.07, smoothstep(0.06, 0.92, 1.0 - st.y));",
      // dove la trama non c'è ancora restano solo i fili dell'ordito, tesi
      "  float a = m * fade * mix(clamp(mw, 0.0, 1.0) * 0.6, 1.0, wf);",
      "  vec3 c = pow(max(col, 0.0), vec3(0.4545));",
      "  c += (hash2(gl_FragCoord.xy) - 0.5) / 255.0;",
      "  FRAG = vec4(c * a, a);",
      "}"
    ].join("\n");
  }

  /* ---- Hero ---- */
  // Torna true se il tessuto in WebGL è partito; altrimenti il canvas da dare al telaio 2D (o niente).
  function initWeaveGL(canvas, st) {
    var c = tessContesto(canvas);
    if (!c) return false;
    var prog = tessProgramma(c, tessGlslTeloVS(), tessGlslTessuto() + "\n" + tessGlslTeloFS());
    if (!prog) return tessCanvasNuovo(canvas);
    var gl = c.gl, hero = canvas.parentNode;
    var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var phone = window.innerWidth < 760 || !fine;

    // il telo: una griglia più fitta vicino a chi guarda. Lungo v: V0-VSTART e VEND-V1 sono le frange
    // (solo ordito), in mezzo il tessuto; da fermi le frange sono fuori campo
    var lightMesh = phone || c.slow;
    var NU = lightMesh ? 120 : 240, NV = lightMesh ? 90 : 170;
    var U0 = -3800, U1 = 2400, V0 = -900, VSTART = -580, VEND = 3700, V1 = 4100, PITCH = 13;
    var pos = new Float32Array(NU * NV * 2), i, j;
    for (j = 0; j < NV; j++) {
      var v = V0 + (V1 - V0) * Math.pow(j / (NV - 1), 1.45);
      for (i = 0; i < NU; i++) { var k = (j * NU + i) * 2; pos[k] = U0 + (U1 - U0) * i / (NU - 1); pos[k + 1] = v; }
    }
    var idx = new Uint16Array((NU - 1) * (NV - 1) * 6), q = 0;
    for (j = 0; j < NV - 1; j++) {
      for (i = 0; i < NU - 1; i++) {
        var a = j * NU + i, b = a + 1, d = a + NU, e = d + 1;
        idx[q++] = a; idx[q++] = d; idx[q++] = b; idx[q++] = b; idx[q++] = d; idx[q++] = e;
      }
    }
    gl.useProgram(prog.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
    var aLoc = gl.getAttribLocation(prog.p, "a_m");
    gl.enableVertexAttribArray(aLoc);
    gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.enable(gl.DEPTH_TEST);

    var D = 1150, W = 0, H = 0, dpr = 1, scale = 1, dead = false;
    var time = motion ? 0 : 3, last = 0, running = false, raf = 0, visible = true;
    var ps = 0, mx = 0.5, my = 0.5, tmx = 0.5, tmy = 0.5, px = 0, py = 0, hasPtr = false;
    var yaw = -0.42, pitch = 0.5, amp = 1, slide = 0;
    // calm: l'apertura delle home ha chiesto i fili (threads): il telo resta piatto e fermo finché
    // non è al suo posto, poi si sveglia piano (alive 0 → 1)
    var calm = false, hold = 0, alive = 1;
    var chiaro = tessChiaro(), pal = tessPalette(chiaro, false);
    var blue = [200, 260, 300], P = [0, 0];
    var touch = tessTocco({ hover: 1, press: 2.4, rHover: 150, rPress: 200, k: 62, c: 6.5, wakeStep: 110, wakeAmp: 13, wakeSpeed: 900, pressAmp: 34 });
    // la navetta corre sulle righe a metà campo, nella parte di tessuto che si vede (a destra del testo)
    var shut = tessNavetta({
      first: 1.2, wait: [2.2, 5.5],
      rows: function () { return [-20, 60]; },
      from: function () { return -45; }, to: function () { return 110; },
      speed: function () { return 44; }
    });
    var autoT = 1.5; // telefono: ogni tanto un'onda da sola

    // la camera del telaio 2D (in più lo scorrimento). Sul telefono il testo prende la parte bassa:
    // si guarda più in giù, così in alto c'è il tessuto vicino e non la nebbia
    function camera() {
      var e = tessLiscia(ps), live = tessLiscia(alive);
      yaw = -0.42 + (mx - 0.5) * 0.06 * live + e * 0.16;
      pitch = (W < 600 ? 0.72 : 0.5) + (my - 0.5) * 0.03 * live + e * 0.2;
      amp = (1 - e * 0.45) * live;
      slide = e * 950;
      return e;
    }
    // dallo schermo al tessuto: dove cade il puntatore, tenendo conto delle onde e della conca
    // già scavata (così il fondo della conca resta sotto il mouse)
    function pick(sx, sy, out, dent) {
      var f = Math.max(W * 0.72, H * 1.05), cx = W * 0.6, cy = H * 0.5;
      var cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      var a = (cy - sy) / f, hgt = 0;
      for (var it = 0; it < 3; it++) {
        var den = a * cp - sp;
        if (den > -1e-3) return false;
        var z1 = (hgt * cp - a * (D - hgt * sp)) / den;
        var z2 = z1 * cp - hgt * sp + D;
        if (z2 < 80) return false;
        var x1 = (sx - cx) * z2 / f;
        out[0] = x1 * cyw + z1 * syw;
        out[1] = -x1 * syw + z1 * cyw - slide;
        hgt = tessOnde(out[0], out[1], time) * amp - (dent || 0) * 60;
      }
      return true;
    }

    function resize(force) {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      // sul telefono la barra degli indirizzi manda "resize" senza cambiare la hero: niente da rifare
      if (!force && w === W && h === H) return;
      W = w; H = h;
      dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 1.75) * scale * (c.slow ? 0.6 : 1);
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
      // la luce blu sta sopra il punto del tessuto che si vede a destra, a metà altezza (in alto sul telefono)
      var save = ps, saveA = alive; ps = 0; alive = 1; camera();
      if (pick(W * (W < 600 ? 0.66 : 0.7), H * (W < 600 ? 0.24 : 0.5), P)) blue = [P[0] + 60, 250, P[1] + 380];
      ps = save; alive = saveA; camera();
      if (!running) draw();
    }

    function draw() {
      if (dead) return;
      var e = camera(), live = tessLiscia(alive);
      var f = Math.max(W * 0.72, H * 1.05), w = st.weave;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      prog.tema(pal, chiaro);
      prog.f1("u_t", time);
      prog.f4("u_cam", yaw, pitch, D, amp);
      prog.f4("u_view", W, H, f, W * 0.6);
      prog.f1("u_cy", H * 0.5);
      prog.f4("u_dent", touch.x, touch.y, touch.d * live, touch.r);
      prog.v4("u_rip", touch.uniforms(time));
      // le pieghe arrivano presto (appena si tira), lo scivolamento segue lo scroll
      prog.f4("u_pull", e, tessLiscia(e * 2.4), e, slide);
      var cp = Math.cos(pitch);
      prog.f3("u_eye", [-D * cp * Math.sin(yaw), D * Math.sin(pitch), -D * cp * Math.cos(yaw)]);
      prog.f3("u_key", [-0.42, 0.62, 0.66]);
      prog.f3("u_blue", blue);
      prog.f1("u_pitch", PITCH);
      prog.f1("u_fpx", f * dpr);
      prog.f4("u_glow", touch.x, touch.y, (touch.glow * 0.7 + Math.max(touch.d - 1, 0) * 0.35) * live, touch.r * 1.1);
      prog.v4("u_shut", motion ? shut.out : [0, 0, 1, 0]);
      // la linea della tessitura: al quadrato, così attraversa piano la parte vicina e accelera verso l'orizzonte
      prog.f2("u_front", VSTART - 40 + (VEND + 240 - VSTART) * w * w, w > 0 && w < 1 ? 1 - tessLiscia((w - 0.7) / 0.3) : 0);
      prog.f2("u_fog", 1400, 4300);
      prog.f4("u_span", V0, VSTART, VEND, V1);
      // compare appena parte la tessitura; sparisce mentre la hero esce
      prog.f1("u_alpha", Math.min(1, w * 3) * (1 - tessLiscia((ps - 0.4) / 0.32)));
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
    }

    // risoluzione che si adatta: se i fotogrammi tardano per due finestre di fila, si scende un poco
    // (all'inizio si aspetta: caricamento dei font e calcoli di ScrollTrigger rallentano tutta la pagina)
    var acc = 0, cnt = 0, skip = 90, slowWins = 0;
    function perf(dt) {
      if (scale <= 0.56) return;
      if (skip > 0) { skip--; return; }
      acc += dt; cnt++;
      if (cnt >= 45) {
        var avg = acc / cnt; acc = 0; cnt = 0;
        slowWins = avg > 0.026 ? slowWins + 1 : 0;
        if (slowWins >= 2) { slowWins = 0; scale = Math.max(0.55, scale * 0.82); resize(true); }
      }
    }

    function frame(now) {
      if (!running || dead) return;
      raf = requestAnimationFrame(frame);
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now; time += dt;
      // dopo l'apertura: il telo è al suo posto (weave = 1), le linee del marchio sfumano, poi si sveglia
      if (calm && st.weave >= 1) { calm = false; hold = 0.7; }
      if (!calm && alive < 1) { if (hold > 0) hold -= dt; else alive = Math.min(1, alive + dt / 2.2); }
      var live = alive >= 1;
      var r = hero.getBoundingClientRect();
      ps += (tessLimita(-r.top / (r.height || 1), 0, 1) - ps) * (1 - Math.exp(-dt * 9));
      var km = 1 - Math.exp(-dt * 3);
      mx += (tmx - mx) * km; my += (tmy - my) * km;
      camera();
      if (hasPtr && live && pick(px, py, P, touch.d)) touch.move(P[0], P[1], time);
      else if (touch.on) touch.leave();
      touch.step(dt, time);
      shut.step(dt, st.weave >= 1 && live && ps < 0.6);
      if (phone && live && st.weave >= 1) {
        autoT -= dt;
        if (autoT <= 0) {
          autoT = tessCaso(3.4, 5.2);
          if (pick(W * tessCaso(0.35, 0.9), H * tessCaso(0.14, 0.42), P)) touch.ripple(P[0], P[1], time, 26);
        }
      }
      draw();
      perf(dt);
    }
    function start() { if (running || dead || !motion || !visible) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    // il mouse (solo dove c'è un mouse vero)
    if (fine && motion) {
      hero.addEventListener("pointermove", function (ev) {
        if (dead || ev.pointerType !== "mouse") return;
        var rr = canvas.getBoundingClientRect();
        px = ev.clientX - rr.left; py = ev.clientY - rr.top;
        tmx = px / (W || 1); tmy = py / (H || 1); hasPtr = true;
      });
      hero.addEventListener("pointerleave", function () { hasPtr = false; tmx = 0.5; tmy = 0.5; });
      hero.addEventListener("pointerdown", function (ev) {
        if (dead || ev.pointerType !== "mouse" || ev.button !== 0) return;
        if (ev.target.closest && ev.target.closest("a, button")) return;
        touch.press();
      });
      window.addEventListener("pointerup", function () { touch.release(time); });
    }
    // cambio di tema: nuovi colori, e se è fermo si ridisegna subito
    document.addEventListener("telaio:tema", function () {
      chiaro = tessChiaro(); pal = tessPalette(chiaro, false);
      if (!running) draw();
    });
    // contesto perso (driver, troppe schede…): al suo posto il telaio 2D, sullo stesso oggetto
    canvas.addEventListener("webglcontextlost", function (ev) {
      ev.preventDefault();
      if (dead) return;
      dead = true; stop();
      hero.classList.remove("p-weave-gl");
      initWeave2D(tessCanvasNuovo(canvas), st);
    });
    window.addEventListener("resize", function () { if (!dead) resize(false); });

    // I fili del tessuto come segmenti dritti, in coordinate dello schermo e nel loro colore:
    // l'apertura delle home ci fa posare sopra le linee del marchio. Da qui il telo resta piatto
    // e fermo (sul piano ogni filo in prospettiva è una retta) finché non è al suo posto.
    st.threads = function (nCols, nRows) {
      calm = true; alive = 0;
      camera();
      var r = canvas.getBoundingClientRect(), light = tessChiaro();
      var f = Math.max(W * 0.72, H * 1.05), cx = W * 0.6, cy = H * 0.5;
      var cp = Math.cos(pitch), sp = Math.sin(pitch), cyw = Math.cos(yaw), syw = Math.sin(yaw);
      function proj(u, vv, o) {
        var Z = vv + slide, x1 = u * cyw - Z * syw, z1 = u * syw + Z * cyw, z2 = z1 * cp + D;
        o[0] = cx + f * x1 / z2; o[1] = cy - f * (z1 * sp) / z2;
        return z2 > 60;
      }
      // le linee finiscono dove il telo si perde nella nebbia
      var zt = 2700, top = Math.max(0, cy - f * ((zt - D) / cp) * sp / zt);
      var out = {
        warp: [], weft: [], top: r.top + top,
        warpColor: light ? "rgba(60,66,78,0.42)" : "rgba(160,164,158,0.5)",
        weftColor: light ? "rgba(19,7,237,0.36)" : "rgba(126,138,190,0.55)"
      };
      var A = [0, 0], B = [0, 0], n, x, y, u, vv;
      // ordito: fili presi lungo il bordo basso, ognuno sul centro di un filo vero, fino alla nebbia
      for (n = 0; n < nCols; n++) {
        x = W * (-0.04 + 1.08 * n / Math.max(1, nCols - 1));
        if (!pick(x, H - 4, P, 0)) continue;
        u = (Math.floor(P[0] / PITCH) + 0.5) * PITCH;
        if (!proj(u, P[1], A) || !proj(u, P[1] + 1600, B) || Math.abs(B[1] - A[1]) < 1) continue;
        out.warp.push({
          x1: r.left + A[0] + (B[0] - A[0]) * (top - A[1]) / (B[1] - A[1]), y1: r.top + top,
          x2: r.left + A[0] + (B[0] - A[0]) * (H + 30 - A[1]) / (B[1] - A[1]), y2: r.top + H + 30
        });
      }
      // trama: righe dal davanti verso il fondo, ognuna sul centro di una riga vera, da un bordo all'altro
      for (n = 0; n < nRows; n++) {
        y = H - (H - top) * (0.06 + 0.74 * n / Math.max(1, nRows - 1));
        if (!pick(cx, y, P, 0)) continue;
        vv = (Math.floor(P[1] / PITCH) + 0.5) * PITCH;
        if (!proj(-400, vv, A) || !proj(400, vv, B) || Math.abs(B[0] - A[0]) < 1) continue;
        out.weft.push({
          x1: r.left - 30, y1: r.top + A[1] + (B[1] - A[1]) * (-30 - A[0]) / (B[0] - A[0]),
          x2: r.left + W + 30, y2: r.top + A[1] + (B[1] - A[1]) * (W + 30 - A[0]) / (B[0] - A[0])
        });
      }
      return out;
    };

    st.gl = true;
    hero.classList.add("p-weave-gl");
    resize(true);
    if (motion && "IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (en) { visible = en.isIntersecting; if (visible) start(); else stop(); });
      }).observe(hero);
    } else start();
    return true;
  }

  /* ---- La parola gigante «Telaio», tessuta ----
     Le lettere vere restano nel DOM (trasparenti): danno posizione e misure. Il loro disegno
     diventa una maschera; dentro, lo stesso tessuto della hero. Si tesse riga dopo riga mentre
     arriva sullo schermo. Parte solo vicino allo schermo; senza WebGL resta la scritta del sito. */
  function initParolaTessuta(el) {
    if (!("IntersectionObserver" in window)) return;
    var started = false, api = null, vis = false;
    new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        vis = en.isIntersecting;
        if (vis && !started) {
          started = true;
          var go = function () { if (!api) api = tessParola(el); if (api) api.visible(vis); };
          if (document.fonts && document.fonts.load) document.fonts.load('700 100px "Bricolage Grotesque"').then(go, go);
          else go();
        }
        if (api) api.visible(vis);
      });
    }, { rootMargin: "300px 0px" }).observe(el);
  }

  function tessParola(el) {
    var canvas = document.createElement("canvas");
    canvas.className = "p-bigword-gl";
    canvas.setAttribute("aria-hidden", "true");
    var c = tessContesto(canvas);
    var prog = c && tessProgramma(c, tessGlslParolaVS(), tessGlslTessuto() + "\n" + tessGlslParolaFS());
    if (!prog) return null;
    el.classList.add("p-tessuta");
    el.insertBefore(canvas, el.firstChild);
    var gl = c.gl;
    var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var phone = window.innerWidth < 760 || !fine;
    var spans = [].slice.call(el.querySelectorAll("span"));
    // segno della linea di base, dentro la prima lettera
    var base = document.createElement("i");
    base.className = "p-bigword-base";
    spans[0].appendChild(base);

    gl.useProgram(prog.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var aLoc = gl.getAttribLocation(prog.p, "a_p");
    gl.enableVertexAttribArray(aLoc);
    gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    prog.i1("u_mask", 0);
    var mask = document.createElement("canvas"), mctx = mask.getContext("2d");

    var W = 0, H = 0, dpr = 1, pitchPx = 10, rows = 1, cols = 1, dead = false;
    var time = 0, last = 0, running = false, raf = 0, visible = false, q = 0;
    var hasPtr = false, px = 0, py = 0;
    var chiaro = tessChiaro(), pal = tessPalette(chiaro, true);
    var touch = tessTocco({ hover: 1, press: 2.3, rHover: 70, rPress: 95, k: 62, c: 6.5, wakeStep: 46, wakeAmp: 7, wakeSpeed: 700, pressAmp: 16 });
    var shut = tessNavetta({
      first: 0.8, wait: [1.8, 4.2],
      rows: function () {
        var hi = Math.min(rows * 0.78, front() - 1), lo = rows * 0.16;
        return hi > lo + 2 ? [lo, hi] : null;
      },
      from: function () { return -6; }, to: function () { return cols + 6; },
      speed: function () { return cols / 2.6; }
    });
    var autoT = 1.2;
    function front() { return q * (rows + 4) - 2; }

    // la maschera: ogni lettera disegnata dove il browser ha messo quella vera
    function drawMask() {
      if (dead) return;
      var r = el.getBoundingClientRect();
      W = r.width; H = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 1.75) * (c.slow ? 0.6 : 1);
      canvas.width = mask.width = Math.max(1, Math.round(W * dpr));
      canvas.height = mask.height = Math.max(1, Math.round(H * dpr));
      var cs = getComputedStyle(spans[0]), fs = parseFloat(cs.fontSize);
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mctx.clearRect(0, 0, W, H);
      mctx.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
      mctx.fillStyle = "#fff";
      mctx.textBaseline = "alphabetic";
      var by = base.getBoundingClientRect().top - r.top;
      spans.forEach(function (s) {
        var sr = s.getBoundingClientRect(), pl = parseFloat(getComputedStyle(s).paddingLeft) || 0;
        mctx.fillText(s.textContent, sr.left - r.left + pl, by);
      });
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask);
      // fili più fitti dove la scritta è piccola
      pitchPx = tessLimita(fs * 0.014, 5, 9);
      rows = H / pitchPx; cols = W / pitchPx;
      draw();
      el.classList.add("is-gl");
    }

    function draw() {
      if (dead) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      prog.tema(pal, chiaro);
      prog.f2("u_res", canvas.width, canvas.height);
      prog.f1("u_dpr", dpr);
      prog.f1("u_pitch", pitchPx);
      prog.f1("u_t", time);
      prog.f4("u_dent", touch.x, touch.y, touch.d, touch.r);
      prog.v4("u_rip", touch.uniforms(time));
      prog.v4("u_shut", shut.out);
      prog.f2("u_front", front(), q > 0.01 && q < 0.99 ? 1 : 0);
      prog.f4("u_glow", touch.x, touch.y, touch.glow * 0.6, touch.r * 1.2);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    // dove deve essere la tessitura: dal bordo basso dello schermo a quando la parola è tutta dentro
    function target() {
      var r = el.getBoundingClientRect();
      return tessLimita((window.innerHeight - r.top) / (r.height || 1), 0, 1);
    }

    function frame(now) {
      if (!running || dead) return;
      raf = requestAnimationFrame(frame);
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now; time += dt;
      var tg = target();
      q += (tg - q) * (1 - Math.exp(-dt * 6));
      if (Math.abs(tg - q) < 0.001) q = tg;
      if (hasPtr) touch.move(px, py, time);
      else if (touch.on) touch.leave();
      touch.step(dt, time);
      shut.step(dt, q > 0.3);
      if (phone) {
        autoT -= dt;
        if (autoT <= 0) { autoT = tessCaso(3.6, 5.6); touch.ripple(tessCaso(0.1, 0.9) * W, tessCaso(0.35, 0.85) * H, time, 9); }
      }
      draw();
    }
    function start() { if (running || dead || !visible) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    if (fine) {
      el.addEventListener("pointermove", function (ev) {
        if (ev.pointerType !== "mouse") return;
        var rr = canvas.getBoundingClientRect();
        px = ev.clientX - rr.left; py = rr.bottom - ev.clientY; hasPtr = true;
      });
      el.addEventListener("pointerleave", function () { hasPtr = false; });
      el.addEventListener("pointerdown", function (ev) { if (ev.pointerType === "mouse" && ev.button === 0) touch.press(); });
      window.addEventListener("pointerup", function () { touch.release(time); });
    }
    document.addEventListener("telaio:tema", function () {
      chiaro = tessChiaro(); pal = tessPalette(chiaro, true);
      if (!running) draw();
    });
    // contesto perso: torna la scritta del sito
    canvas.addEventListener("webglcontextlost", function (ev) {
      ev.preventDefault();
      dead = true; stop();
      el.classList.remove("is-gl", "p-tessuta");
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    });
    var rT = 0;
    window.addEventListener("resize", function () { clearTimeout(rT); rT = setTimeout(drawMask, 120); });
    q = target();
    drawMask();
    return { visible: function (vv) { visible = vv; if (vv) start(); else stop(); } };
  }
  /* ============================================================
     IL TESSUTO IN WEBGL — fine
     ============================================================ */
})();
