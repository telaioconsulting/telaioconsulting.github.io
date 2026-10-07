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
    if (document.querySelector(".p-bigword")) {
      gsap.fromTo(".p-bigword span", { yPercent: 100 }, {
        yPercent: 0, ease: "none", stagger: 0.06,
        scrollTrigger: { trigger: ".p-bigword", start: "top bottom", end: "bottom bottom", scrub: 1 }
      });
    }

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
})();
