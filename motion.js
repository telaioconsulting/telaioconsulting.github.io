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
  var racconto = initRacconto(); // «Come lavoriamo» nella home: il telaio racconta i passi (fermo senza animazioni)
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

    /* ---- Numeri: conteggio + mini grafici ---- */
    gsap.utils.toArray("[data-count]").forEach(function (el) {
      var to = parseFloat(el.getAttribute("data-count")), dec = parseInt(el.getAttribute("data-decimals") || "0", 10), o = { v: 0 };
      function fmt(v) { var s = v.toFixed(dec); return isEn ? s : s.replace(".", ","); }
      // chi usa un lettore di schermo sente subito il valore vero, non lo 0 da cui parte il conteggio
      var sr = document.createElement("span");
      sr.className = "p-sr"; sr.textContent = fmt(to);
      el.setAttribute("aria-hidden", "true"); el.parentNode.insertBefore(sr, el);
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

    /* ---- Il telaio racconta: «Come lavoriamo» nella home si ferma e si tesse mentre scorri (initRacconto) ---- */
    if (racconto) racconto.scena();

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

    /* ---- Sezioni: la trama del tessuto, appena accennata, si accende attorno al mouse ----
       Col mouse la luce lo segue con un po' di ritardo; sul telefono è una fascia a metà schermo.
       Si aggiorna solo quando il mouse o la pagina si muovono, e solo nelle sezioni vicine allo schermo. */
    (function () {
      var layers = gsap.utils.toArray("main > section:not(.p-hero)").filter(function (s) {
        return getComputedStyle(s).position !== "static";
      }).map(function (s) {
        var l = document.createElement("div");
        l.className = "p-trama"; l.setAttribute("aria-hidden", "true");
        s.classList.add("p-has-trama"); s.appendChild(l);
        return { s: s, l: l };
      });
      if (!layers.length) return;
      // la griglia di ogni sezione parte dalla stessa trama della pagina: i fili non saltano tra una sezione e l'altra
      function align() {
        var sy = window.scrollY;
        layers.forEach(function (o) {
          var r = o.s.getBoundingClientRect();
          o.l.style.setProperty("--gx", (-(r.left % 44)).toFixed(1) + "px");
          o.l.style.setProperty("--gy", (-((r.top + sy) % 44)).toFixed(1) + "px");
        });
      }
      align();
      ST.addEventListener("refresh", align);
      var px = -9999, py = -9999, cx = px, cy = py, lastY = -1, lastX = cx, lastYc = cy;
      if (finePointer) {
        window.addEventListener("pointermove", function (e) {
          px = e.clientX; py = e.clientY;
          if (cx < -9000) { cx = px; cy = py; } // la prima volta la luce compare lì, senza attraversare la pagina
        }, { passive: true });
      }
      else root.classList.add("p-trama-touch");
      window.addEventListener("resize", function () { lastY = -1; });
      gsap.ticker.add(function (time, dtMs) {
        // stesso ritardo a 60 e a 120 Hz (0,18 per fotogramma a 60 Hz)
        var k = 1 - Math.exp(-11.9 * Math.min(dtMs, 100) / 1000);
        if (finePointer) { cx += (px - cx) * k; cy += (py - cy) * k; }
        else { cx = window.innerWidth / 2; cy = window.innerHeight / 2; }
        var y = window.scrollY;
        if (y === lastY && Math.abs(cx - lastX) < 0.5 && Math.abs(cy - lastYc) < 0.5) return;
        lastY = y; lastX = cx; lastYc = cy;
        // prima tutte le misure, poi tutte le scritture: niente ricalcoli dello stile a ogni sezione
        var vh = window.innerHeight, rs = layers.map(function (o) { return o.s.getBoundingClientRect(); });
        layers.forEach(function (o, i) {
          var r = rs[i];
          if (r.bottom < -400 || r.top > vh + 400) return;
          o.l.style.setProperty("--tx", Math.round(cx - r.left) + "px");
          o.l.style.setProperty("--ty", Math.round(cy - r.top) + "px");
        });
      });
    })();

    // Arrivo su una sezione: si scorre lì a posizioni ricalcolate (le sezioni bloccate allungano la pagina)
    if (deepLink) {
      ST.refresh();
      if (lenis) lenis.scrollTo(deepLink, { offset: -82, immediate: true, force: true });
      else deepLink.scrollIntoView();
    }

  }

  /* ============================================================
     IL TELAIO RACCONTA — «Come lavoriamo» nella home
     La sezione resta ferma mentre scorri e sulla tela si tesse in quattro fasi, una per passo:
     1. i fili dell'ordito scendono sul telaio
     2. una navetta di luce passa la trama, sopra e sotto
     3. il tessuto si stringe, si inclina e prende luce (come la stoffa della hero)
     4. il tessuto si raccoglie nel marchio, in blu
     Il marchio è un pezzo di tessuto 2×2 (due fili per verso, uno sopra e uno sotto): la stessa regola
     disegna il tessuto e il marchio, così l'uno diventa l'altro senza stacchi. Ogni filo è fatto di tratti
     con le punte tonde che s'interrompono dove passa sotto un altro filo, come i quattro tratti del marchio.
     initRacconto() prepara la sezione: senza animazioni disegna il tessuto finito, fermo, col marchio
     intessuto in blu; con le animazioni dà alla sezione l'assetto della scena e boot() chiama scena().
     I colori seguono il tema (evento telaio:tema da script.js).
     ============================================================ */
  function initRacconto() {
    var sec = document.querySelector(".p-racconto");
    var canvas = sec && sec.querySelector(".p-rac-canvas");
    if (!canvas || !canvas.getContext) return null;
    var ctx = canvas.getContext("2d");
    var still = !motion;
    var pin = sec.querySelector(".p-rac-pin"), stage = sec.querySelector(".p-rac-stage");
    var glow = sec.querySelector(".p-rac-glow"), callout = sec.querySelector(".p-rac-callout");
    var head = sec.querySelector(".p-rac-head"), side = sec.querySelector(".p-rac-side"), slot = sec.querySelector(".p-rac-slot");
    var steps = sec.querySelectorAll(".p-rac-step"), reel = sec.querySelector(".p-counter-reel");
    var bars = sec.querySelectorAll(".p-rac-bars i");

    /* ---- Piccoli aiuti ---- */
    function c01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function smooth(v) { v = c01(v); return v * v * (3 - 2 * v); }
    function outCubic(v) { v = c01(v); return 1 - (1 - v) * (1 - v) * (1 - v); }
    function inOutCubic(v) { v = c01(v); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; }
    function inOutQuad(v) { v = c01(v); return v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2; }

    /* ---- Colori: grigio dell'ordito, blu chiaro della trama, blu del marchio ----
       base = il filo dove scende sotto (più scuro), crest = dove passa sopra, spec = il riflesso.
       Nel tema chiaro la luce non si somma (sul fondo chiaro sparirebbe): si dipinge in blu. */
    function palette() {
      return root.getAttribute("data-theme") === "light" ? {
        warp: { base: [118, 124, 136], crest: [162, 168, 180], spec: [250, 251, 253] },
        weft: { base: [26, 36, 142], crest: [80, 98, 216], spec: [226, 231, 255] },
        frame: "#BDC2CE", dot: "#A4AAB8", ground: "#F4F5F8", add: "source-over",
        pool: "19,7,237", poolA: 0.3, trail0: "rgba(255,255,255,0)", trail: "255,255,255", trailA: 0.9,
        halo: "19,7,237", haloA: 0.3, core: "#1307ED", bead: "19,7,237", beadA: 0.35, beadCore: "#1307ED", markGlow: 0.45
      } : {
        warp: { base: [84, 89, 78], crest: [155, 160, 147], spec: [238, 240, 234] },
        weft: { base: [58, 68, 160], crest: [142, 157, 255], spec: [232, 236, 255] },
        frame: "#4A5041", dot: "#5C6351", ground: "#090C08", add: "lighter",
        pool: "214,220,255", poolA: 0.6, trail0: "rgba(142,157,255,0)", trail: "226,231,255", trailA: 0.95,
        halo: "63,54,245", haloA: 0.8, core: "#fff", bead: "142,157,255", beadA: 0.55, beadCore: "#E8ECFF", markGlow: 0.9
      };
    }
    var PAL = palette();
    // il marchio finito è piatto, come il logo
    var BRAND = { base: [19, 7, 237], crest: [19, 7, 237], spec: [19, 7, 237] };
    var tmpC = [0, 0, 0];
    function rgb(c) { return "rgb(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + ")"; }
    function mixC(a, b, t) { tmpC[0] = lerp(a[0], b[0], t); tmpC[1] = lerp(a[1], b[1], t); tmpC[2] = lerp(a[2], b[2], t); return tmpC; }

    /* ---- Misure (rifatte a ogni cambio di misura) ---- */
    var W = 0, H = 0, dpr = 1, stacked = false; // stacked: una colonna (telefono, tablet)
    var N = 16, B = 400, S = 25;      // fili per verso, lato del tessuto, passo tra i fili
    var cx0 = 0, cy0 = 0, markCY = 0; // centro del tessuto e del marchio sulla tela
    var M = 240;                       // lato del marchio (come il viewBox 64×64 del simbolo #mk)
    var i0 = 7, i1 = 8;                // i due fili per verso che diventano il marchio
    var MAXN = 16;
    var rank = new Float32Array(MAXN);   // distanza dal centro (0 al centro, 1 ai lati)
    var twang = new Float32Array(MAXN);  // quando il filo è arrivato in fondo (vibra un attimo)
    var tauPrev = new Float32Array(MAXN), tauNow = new Float32Array(MAXN);

    /* ---- Stato dei fili in ogni fotogramma ---- */
    // ordito (verticale): posizione, presenza, estremi, spessore, vibrazione
    var uX = new Float32Array(MAXN), wA = new Float32Array(MAXN), wV0 = new Float32Array(MAXN), wV1 = new Float32Array(MAXN);
    var wWid = new Float32Array(MAXN), tw = new Float32Array(MAXN);
    // trama (orizzontale): posizione, presenza, estremi, spessore, avanzamento della riga, testa e verso della navetta
    var vY = new Float32Array(MAXN), fA = new Float32Array(MAXN), fU0 = new Float32Array(MAXN), fU1 = new Float32Array(MAXN);
    var fWid = new Float32Array(MAXN), rowR = new Float32Array(MAXN), fHead = new Float32Array(MAXN), fDir = new Float32Array(MAXN);
    // tratti visibili di ogni filo (coppie inizio/fine lungo il filo)
    var segW = [], segF = [], segWn = new Int32Array(MAXN), segFn = new Int32Array(MAXN);
    for (var q0 = 0; q0 < MAXN; q0++) { segW.push(new Float32Array(MAXN * 2 + 4)); segF.push(new Float32Array(MAXN * 2 + 4)); }

    // fasi e luci
    var gap = 4, ue = 200, tilt = 0, light = 0, k4 = 0, k5 = 0, selMix = 0, frameA = 0, frameDraw = 0, arcA = 1;
    var shA = 0, shU = 0, shV = 0, shRow = 0, shDir = 1, twangOn = false, sheenOn = false, sheenPh = 0, sheen0 = -1;
    var glowOp = 0, glowSc = 1, glowR = 300, glowKey = "";
    var cam = { cx: 0, cy: 0, sc: 1, cg: 1, sg: 0, cf: 1, sf: 0, D: 1000, A: 0, wk: 0.01 };
    var P3 = [0, 0, 1];
    // avanzamento: P = la scena (0 → 1 mentre è ferma), E = l'entrata (il telaio si disegna)
    var P = 0, Pt = 0, E = 0, Et = 0, T = 0, snap = true, dirty = true;
    var runners = [];

    function build(n) {
      N = n; i0 = n / 2 - 1; i1 = n / 2;
      var c = (n - 1) / 2;
      for (var i = 0; i < n; i++) { rank[i] = Math.abs(i - c) / c; twang[i] = -9; tauPrev[i] = 0; }
      runners = [];
      for (var k = 0; k < 3; k++) runners.push(newRunner(true));
    }
    function newRunner(first) {
      return { row: 1 + Math.floor(Math.random() * (N - 2)), u: first ? Math.random() : -0.3, v: 0.2 + Math.random() * 0.14, dir: Math.random() < 0.5 ? 1 : -1 };
    }

    function resize() {
      var cw = canvas.clientWidth, ch = canvas.clientHeight;
      if (!cw || !ch) return;
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      W = cw; H = ch;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      var sx = 0, sy = 0, sw = W, sh = H;
      stacked = false;
      if (!still) {
        var pr = canvas.getBoundingClientRect(), r = stage.getBoundingClientRect();
        sx = r.left - pr.left; sy = r.top - pr.top; sw = r.width; sh = r.height;
        stacked = window.innerWidth < 900;
        B = Math.min(sw * (stacked ? 0.72 : 0.7), sh * (stacked ? 0.64 : 0.6), 470);
      } else B = Math.min(sw * 0.66, sh * 0.62);
      var n = B < 330 ? 12 : 16;
      if (n !== N || !runners.length) build(n);
      S = B / N;
      cx0 = sx + sw / 2; cy0 = sy + sh / 2;
      M = B * (stacked ? 0.6 : 0.62);
      markCY = cy0;
      // alla fine: marchio e frase sotto, centrati insieme nella colonna
      if (!still && callout) {
        var chH = callout.offsetHeight, gapC = stacked ? 18 : 30, markH = M * 51 / 64;
        var blockTop = sy + Math.max(8, (sh - (markH + gapC + chH)) / 2);
        markCY = blockTop + markH / 2;
        callout.style.top = Math.round(blockTop + markH + gapC - sy) + "px";
      }
      // bagliore: un cerchio grande quanto il tessuto
      glowR = Math.round(B * 1.15);
      if (!still) { glow.style.width = glow.style.height = glowR * 2 + "px"; glowKey = ""; }
      cam.D = B * 2.3;
      cam.wk = 2 * Math.PI / (B * 1.1);
      dirty = true;
    }

    /* ---- POSA: dove sta ogni filo per un certo avanzamento P (e tempo T) ---- */
    function pose() {
      var a, b, c, d;
      if (still) { a = 1; b = 1; c = 0.21; d = 0; }
      else {
        a = c01((P - 0.012) / 0.17);   // 1 · ordito       (P 0    → 0,2)
        b = c01((P - 0.212) / 0.29);   // 2 · trama        (P 0,2  → 0,52)
        c = c01((P - 0.528) / 0.215);  // 3 · al lavoro    (P 0,52 → 0,76)
        d = c01((P - 0.768) / 0.2);    // 4 · il marchio   (P 0,76 → 1)
      }
      var k1 = inOutCubic(c / 0.42);                       // il tessuto si stringe
      var tIn = still ? 0 : inOutCubic((c - 0.18) / 0.62); // si inclina come la stoffa della hero
      k4 = inOutCubic((d - 0.08) / 0.6);                   // si raccoglie nel marchio
      tilt = tIn * (1 - inOutCubic(d / 0.38));             // prima torna di fronte, poi si raccoglie
      light = smooth((c - 0.42) / 0.4) * (1 - smooth(d / 0.3));
      k5 = smooth((d - 0.25) / 0.45);                      // prende il blu del marchio mentre si raccoglie
      selMix = still ? 1 : k5;
      frameDraw = still ? 1 : outCubic(E);
      frameA = still ? 1 : c01(E * 2.5) * (1 - smooth(c / 0.38));
      arcA = still ? 1 : 1 - smooth(k1 / 0.6);
      // nel disegno fermo il tessuto resta sul telaio: fili un po' stretti, ma niente tagli ai bordi
      var kt = still ? 0 : k1;

      var half = B / 2, m = 0.13 * B, top = -half - m, bot = half + m;
      var cmp = 1 - 0.06 * kt;                             // le righe battute si avvicinano
      var wBase = lerp(Math.max(2.2, S * 0.17), S * 0.3, k1);
      gap = lerp(lerp(S * 0.15, S * 0.1, k1), M / 64, k4);
      var mw = M * 7 / 64, mv = M * 22 / 64, mc = M * 8 / 64;
      var fr = half * cmp + 0.3 * S;                       // l'ordito tagliato ai bordi, con una frangia corta
      var fr2 = half + 0.3 * S;
      ue = half + 0.45 * S;                                // la trama esce un poco dal tessuto (cimosa)
      var i, j, sel, fade;

      // ORDITO: scende dalla trave in alto, dal centro verso i lati
      twangOn = false;
      for (i = 0; i < N; i++) {
        sel = i === i0 || i === i1;
        var tau = c01((a - rank[i] * 0.5) / 0.5);
        if (!still && tau >= 0.985 && tauPrev[i] < 0.985 && T - twang[i] > 0.45) twang[i] = T;
        tauPrev[i] = tau; tauNow[i] = tau;
        var e = outCubic(tau);
        var v0 = lerp(top, -fr, kt), v1 = lerp(top + (bot - top) * e, fr, kt);
        uX[i] = lerp((i - (N - 1) / 2) * S, i <= i0 ? -mc : mc, k4);
        wV0[i] = lerp(v0, -mv, k4); wV1[i] = lerp(v1, mv, k4);
        // i fili che non diventano marchio si spengono dai lati verso il centro, mentre scivolano dentro
        fade = sel ? 1 : 1 - smooth((d - 0.1 - (1 - rank[i]) * 0.22) / 0.26);
        wA[i] = tau > 0 ? fade : 0;
        // nel disegno fermo i quattro fili del marchio sono un poco più spessi: si legge il # dentro il tessuto
        wWid[i] = sel ? lerp(wBase * (still ? 1.4 : 1), mw, k4) : wBase;
        // appena teso, il filo vibra un attimo
        var dt = T - twang[i];
        tw[i] = (dt >= 0 && dt < 1.1 && tilt < 0.001) ? S * 0.2 * Math.sin(dt * 46) * Math.exp(-dt * 5.2) : 0;
        if (tw[i] !== 0) twangOn = true;
      }

      // TRAMA: una riga alla volta, avanti e indietro (un solo filo che gira alla cimosa)
      for (j = 0; j < N; j++) {
        sel = j === i0 || j === i1;
        var dir = j % 2 ? -1 : 1;
        var r = c01(b * N - j);
        var qq = inOutQuad((r - 0.14) / 0.86);            // 0 → 0,14: la navetta gira; poi attraversa
        var start = -dir * ue, hd = start + dir * 2 * ue * qq;
        rowR[j] = r; fDir[j] = dir; fHead[j] = hd;
        var lo = Math.min(start, hd), hi = Math.max(start, hd);
        lo = lerp(lo, -fr2, kt); hi = lerp(hi, fr2, kt);
        fU0[j] = lerp(lo, -mv, k4); fU1[j] = lerp(hi, mv, k4);
        vY[j] = lerp((j - (N - 1) / 2) * S * cmp, j <= i0 ? -mc : mc, k4);
        fade = sel ? 1 : 1 - smooth((d - 0.1 - (1 - rank[j]) * 0.22) / 0.26);
        fA[j] = qq > 0 ? fade : 0;
        fWid[j] = sel ? lerp(wBase * (still ? 1.4 : 1), mw, k4) : wBase;
      }

      // NAVETTA: dove sta la testa della trama
      shA = 0;
      if (!still && b > 0 && b < 1) {
        var jr = Math.min(N - 1, Math.floor(b * N)), rr = rowR[jr];
        shA = smooth(b / 0.012) * (1 - smooth((b - 0.988) / 0.012));
        shRow = jr; shDir = fDir[jr];
        if (rr < 0.14 && jr > 0) {
          var s = fDir[jr - 1], p = Math.PI * rr / 0.14, vc = (vY[jr - 1] + vY[jr]) / 2, rho = (vY[jr] - vY[jr - 1]) / 2;
          shU = s * ue + s * rho * Math.sin(p); shV = vc - rho * Math.cos(p);
          shDir = 0;
        } else { shU = rr < 0.14 ? -ue : fHead[jr]; shV = vY[jr]; }
      }

      // CAMERA: di fronte nelle fasi 1-2; inclinata, ingrandita e mossa dalle onde nella fase 3
      var phi = 0.95 * tilt, gam = -0.36 * tilt;
      cam.cf = Math.cos(phi); cam.sf = Math.sin(phi); cam.cg = Math.cos(gam); cam.sg = Math.sin(gam);
      // su schermo largo il tessuto inclinato cresce verso destra; su telefono resta nella larghezza dello schermo
      cam.sc = 1 + (stacked ? -0.05 : 0.32) * tilt;
      cam.cx = cx0 + (stacked ? 0 : B * 0.05) * tilt;
      cam.cy = lerp(cy0, markCY, k4) + B * 0.04 * tilt;
      cam.A = B * 0.075 * tilt;

      // bagliore blu: appena accennato sul telaio, pieno sul tessuto al lavoro, raccolto sul marchio
      glowOp = still ? 0 : Math.max(0.22 * frameA, light * 0.95, k5 * 0.9);
      glowSc = lerp(1, 0.55, k5);

      // riflesso sul marchio finito: la prima volta appena si chiude, poi ogni tanto
      sheenOn = false;
      if (!still && k5 > 0.995) {
        if (sheen0 < 0) sheen0 = T + 0.15;
        var ph = (T - sheen0) % 7;
        if (T >= sheen0 && ph < 1.5) { sheenOn = true; sheenPh = ph / 1.5; }
      } else if (k5 < 0.9) sheen0 = -1;
    }

    /* ---- Il punto del tessuto (u, v) sullo schermo: rotazione, inclinazione, prospettiva ---- */
    function proj(u, v, wave) {
      var z = 0;
      if (wave && cam.A > 0.01) z = cam.A * (Math.sin(u * cam.wk + T * 0.55) * 0.6 + Math.sin(v * cam.wk * 1.3 - T * 0.72 + u * cam.wk * 0.4) * 0.4);
      var x = u * cam.sc, y = v * cam.sc;
      var x1 = x * cam.cg - y * cam.sg, y1 = x * cam.sg + y * cam.cg;
      var y2 = y1 * cam.cf - z * cam.sf, z2 = y1 * cam.sf + z * cam.cf;
      var k = cam.D / (cam.D - z2);
      P3[0] = cam.cx + x1 * k; P3[1] = cam.cy + y2 * k; P3[2] = k;
    }
    function at(isWarp, idx, t) {
      if (isWarp) {
        var u = uX[idx];
        if (tw[idx] !== 0) { var len = wV1[idx] - wV0[idx]; if (len > 1) u += tw[idx] * Math.sin(Math.PI * (t - wV0[idx]) / len); }
        proj(u, t, true);
      } else proj(t, vY[idx], true);
    }

    /* ---- Sopra e sotto: l'ordito passa sopra dove (i + j) è pari.
       Così i due fili centrali di ogni verso fanno il marchio: in alto a sinistra sopra il verticale,
       in alto a destra l'orizzontale, e così via (come i tratti del simbolo #mk). ---- */
    function warpOver(i, j) { return ((i + j) & 1) === 0; }
    function isSel(k) { return k === i0 || k === i1; }

    // la trama è già passata sotto/sopra il filo i? (0 → 1 mentre la navetta si allontana: l'ordito si apre)
    function laid(i, j) {
      var r = rowR[j];
      if (r >= 1) return 1;
      if (r <= 0.14) return 0;
      var pd = fDir[j] * (fHead[j] - uX[i]) / (0.9 * S);
      return pd <= 0 ? 0 : smooth(pd);
    }

    // tratti visibili di un filo: il filo intero meno i tagli dove passa sotto
    function warpSegs(i, out) {
      var n = 0, cur = wV0[i], end = wV1[i];
      if (end - cur < 0.5) return 0;
      for (var j = 0; j < N; j++) {
        if (fA[j] <= 0.002 || warpOver(i, j)) continue;
        if (uX[i] < fU0[j] - 0.5 || uX[i] > fU1[j] + 0.5) continue;
        // un filo che si sta spegnendo smette presto di interrompere gli altri; il marchio lo tagliano solo i suoi fili
        var f = laid(i, j) * fA[j] * fA[j] * fA[j];
        if (k4 > 0 && isSel(i) && !isSel(j)) f *= 1 - smooth(k4 * 3);
        if (f <= 0.002) continue;
        var h = (fWid[j] / 2 + gap + wWid[i] / 2) * f;
        if (h < 0.4) continue; // un taglio invisibile spezzerebbe la luce del filo
        var a = vY[j] - h, b = vY[j] + h;
        if (b <= cur) continue;
        if (a >= end) break;
        if (a - cur > 0.3) { out[n++] = cur; out[n++] = a; }
        cur = Math.max(cur, b);
      }
      if (end - cur > 0.3) { out[n++] = cur; out[n++] = end; }
      return n;
    }
    function weftSegs(j, out) {
      var n = 0, cur = fU0[j], end = fU1[j];
      if (end - cur < 0.5) return 0;
      for (var i = 0; i < N; i++) {
        if (wA[i] <= 0.002 || !warpOver(i, j)) continue;
        if (vY[j] < wV0[i] - 0.5 || vY[j] > wV1[i] + 0.5) continue;
        var h = (wWid[i] / 2 + gap + fWid[j] / 2) * wA[i] * wA[i] * wA[i];
        if (k4 > 0 && isSel(j) && !isSel(i)) h *= 1 - smooth(k4 * 3);
        if (h < 0.4) continue;
        var a = uX[i] - h, b = uX[i] + h;
        if (b <= cur) continue;
        if (a >= end) break;
        if (a - cur > 0.3) { out[n++] = cur; out[n++] = a; }
        cur = Math.max(cur, b);
      }
      if (end - cur > 0.3) { out[n++] = cur; out[n++] = end; }
      return n;
    }

    /* ---- DISEGNO ---- */
    // un filo, in una delle tre passate: base (scura), cresta (chiara, al centro del tratto), riflesso (sottile)
    function strokeSegs(isWarp, idx, pass, alpha) {
      var segs = isWarp ? segW[idx] : segF[idx], n = isWarp ? segWn[idx] : segFn[idx];
      var w = (isWarp ? wWid[idx] : fWid[idx]) * (pass === 0 ? 1 : pass === 1 ? 0.72 : 0.22);
      var curved = cam.A > 0.01 || (isWarp && tw[idx] !== 0);
      var tilted = tilt > 0.001, key = -1, open = false;
      for (var s = 0; s < n; s += 2) {
        var a = segs[s], b = segs[s + 1], L = b - a, tr;
        if (pass === 1) { tr = Math.min(L * 0.16, S * 0.28); a += tr; b -= tr; }
        else if (pass === 2) { tr = Math.min(L * 0.3, S * 0.42); a += tr; b -= tr; }
        if (b - a < 0.2) continue;
        var lw = w * cam.sc, al = alpha;
        if (tilted) {
          // più lontano: più sottile e più spento (come la stoffa della hero verso l'orizzonte)
          at(isWarp, idx, (a + b) / 2);
          lw *= P3[2];
          al *= lerp(1, clamp(0.3 + (P3[2] - 0.8) * 1.75, 0.2, 1), tilt);
        }
        var kk = tilted ? Math.round(lw * 3) * 64 + Math.round(al * 40) : 0;
        if (!open || kk !== key) {
          if (open) ctx.stroke();
          ctx.beginPath(); ctx.lineWidth = Math.max(0.5, lw); ctx.globalAlpha = al; key = kk; open = true;
        }
        var stepsN = curved ? Math.max(2, Math.ceil((b - a) / (S * 0.3))) : 1;
        for (var k = 0; k <= stepsN; k++) {
          at(isWarp, idx, a + (b - a) * k / stepsN);
          if (k) ctx.lineTo(P3[0], P3[1]); else ctx.moveTo(P3[0], P3[1]);
        }
      }
      if (open) ctx.stroke();
    }

    // only: 0 = tutti, 1 = solo i fili qualsiasi, 2 = solo i quattro del marchio
    function drawThreads(isWarp, only) {
      var g = isWarp ? PAL.warp : PAL.weft;
      for (var pass = 0; pass < 3; pass++) {
        var gc = pass === 0 ? g.base : pass === 1 ? g.crest : g.spec;
        var bc = pass === 0 ? BRAND.base : pass === 1 ? BRAND.crest : BRAND.spec;
        for (var i = 0; i < N; i++) {
          var sel = i === i0 || i === i1;
          if ((only === 1 && sel) || (only === 2 && !sel)) continue;
          if (!(isWarp ? segWn[i] : segFn[i])) continue;
          var m = sel ? selMix : 0;
          // diventando marchio la luce del filo si spegne: resta il blu pieno, come nel logo
          var pa = pass === 2 ? 0.5 * (1 - m) : pass === 1 ? 1 - 0.85 * m : 1;
          var al = (isWarp ? wA[i] : fA[i]) * pa;
          if (al < 0.004) continue;
          ctx.strokeStyle = rgb(m > 0 ? mixC(gc, bc, m) : gc);
          // il marchio si accende come nell'apertura del sito (alone blu)
          var gk = still ? 0.55 : k5, glowOn = pass === 0 && sel && gk > 0.01;
          if (glowOn) { ctx.shadowColor = "rgba(19,7,237," + (PAL.markGlow * gk).toFixed(3) + ")"; ctx.shadowBlur = 22 * gk * dpr; }
          strokeSegs(isWarp, i, pass, al);
          if (glowOn) { ctx.shadowBlur = 0; ctx.shadowColor = "rgba(0,0,0,0)"; }
        }
      }
    }

    // le curve della cimosa: la trama è un solo filo che torna indietro a ogni riga
    function drawArcs() {
      if (arcA < 0.01) return;
      for (var pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = rgb(pass ? PAL.weft.crest : PAL.weft.base);
        for (var j = 1; j < N; j++) {
          var p = c01(rowR[j] / 0.14);
          if (p <= 0) break;
          var s = fDir[j - 1], vc = (vY[j - 1] + vY[j]) / 2, rho = (vY[j] - vY[j - 1]) / 2;
          ctx.globalAlpha = arcA * (pass ? 0.9 : 1);
          ctx.lineWidth = fWid[j] * cam.sc * (pass ? 0.66 : 1);
          ctx.beginPath();
          for (var k = 0; k <= 10; k++) {
            var ang = Math.PI * p * k / 10;
            proj(s * ue + s * rho * Math.sin(ang), vc - rho * Math.cos(ang), true);
            if (k) ctx.lineTo(P3[0], P3[1]); else ctx.moveTo(P3[0], P3[1]);
          }
          ctx.stroke();
        }
      }
    }

    // il telaio: due travi e due montanti che si disegnano entrando, rombi agli angoli come i nodi dei passi
    function line(u1, v1, u2, v2) { proj(u1, v1, false); ctx.moveTo(P3[0], P3[1]); proj(u2, v2, false); ctx.lineTo(P3[0], P3[1]); }
    function drawFrame() {
      if (frameA < 0.01) return;
      var half = B / 2, m = 0.13 * B, top = -half - m, bot = half + m, xp = half + 1.6 * S, o = 0.55 * S, f = frameDraw;
      ctx.globalAlpha = frameA; ctx.lineCap = "butt"; ctx.lineWidth = 1.5; ctx.strokeStyle = PAL.frame;
      ctx.beginPath();
      line(-(xp + o) * f, top, (xp + o) * f, top);
      line(-(xp + o) * f, bot, (xp + o) * f, bot);
      line(-xp, top - o, -xp, lerp(top - o, bot + o, f));
      line(xp, top - o, xp, lerp(top - o, bot + o, f));
      ctx.stroke();
      // dove si attaccano i fili
      ctx.fillStyle = PAL.dot;
      ctx.beginPath();
      for (var i = 0; i < N; i++) {
        var u = (i - (N - 1) / 2) * S;
        if (Math.abs(u) > (xp + o) * f) continue;
        proj(u, top, false); ctx.moveTo(P3[0] + 1.6, P3[1]); ctx.arc(P3[0], P3[1], 1.6, 0, Math.PI * 2);
        proj(u, bot, false); ctx.moveTo(P3[0] + 1.6, P3[1]); ctx.arc(P3[0], P3[1], 1.6, 0, Math.PI * 2);
      }
      ctx.fill();
      // rombi agli angoli
      ctx.globalAlpha = frameA * smooth((f - 0.6) / 0.4);
      ctx.fillStyle = PAL.ground;
      for (var c = 0; c < 4; c++) {
        proj(c & 1 ? xp : -xp, c & 2 ? bot : top, false);
        var x = P3[0], y = P3[1], r = 5.5;
        ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
      ctx.lineCap = "round";
    }

    // scia di luce lungo una riga di trama, solo sui tratti visibili (sotto l'ordito la luce sparisce)
    function trail(j, uFrom, uTo, alpha, wMul) {
      var segs = segF[j], n = segFn[j], a = Math.min(uFrom, uTo), b = Math.max(uFrom, uTo);
      if (!n || b - a < 0.5) return;
      proj(uFrom, vY[j], true); var x0 = P3[0], y0 = P3[1];
      proj(uTo, vY[j], true); var x1 = P3[0], y1 = P3[1], k = P3[2];
      if (Math.abs(x1 - x0) + Math.abs(y1 - y0) < 1) return;
      var g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, PAL.trail0);
      g.addColorStop(1, "rgba(" + PAL.trail + "," + (PAL.trailA * alpha).toFixed(3) + ")");
      ctx.strokeStyle = g; ctx.globalAlpha = 1; ctx.lineWidth = Math.max(1, fWid[j] * cam.sc * k * wMul);
      ctx.beginPath();
      for (var s = 0; s < n; s += 2) {
        var sa = Math.max(a, segs[s]), sb = Math.min(b, segs[s + 1]);
        if (sb - sa < 0.3) continue;
        var st = Math.max(1, Math.ceil((sb - sa) / (S * 0.3)));
        for (var q = 0; q <= st; q++) {
          proj(sa + (sb - sa) * q / st, vY[j], true);
          if (q) ctx.lineTo(P3[0], P3[1]); else ctx.moveTo(P3[0], P3[1]);
        }
      }
      ctx.stroke();
    }
    // la testa luminosa (navetta): alone blu e un punto; sotto un filo si attenua
    function spark(x, y, k, alpha, hidden) {
      var R = 30 * k;
      var hg = ctx.createRadialGradient(x, y, 0, x, y, R);
      hg.addColorStop(0, "rgba(" + PAL.halo + "," + (PAL.haloA * alpha).toFixed(3) + ")");
      hg.addColorStop(1, "rgba(19,7,237,0)");
      ctx.globalAlpha = 1; ctx.fillStyle = hg;
      ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = alpha * (hidden ? 0.3 : 1); ctx.fillStyle = PAL.core;
      ctx.beginPath(); ctx.arc(x, y, 2.4 * k, 0, Math.PI * 2); ctx.fill();
    }
    function insideSeg(j, u) {
      var segs = segF[j], n = segFn[j];
      for (var s = 0; s < n; s += 2) if (u >= segs[s] - 0.5 && u <= segs[s + 1] + 0.5) return true;
      return false;
    }

    function render() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      drawFrame();

      var i, j;
      for (i = 0; i < N; i++) segWn[i] = wA[i] > 0.002 ? warpSegs(i, segW[i]) : 0;
      for (j = 0; j < N; j++) segFn[j] = fA[j] > 0.002 ? weftSegs(j, segF[j]) : 0;

      // prima l'ordito, poi la trama; quando si forma il marchio i suoi quattro fili vanno sopra a tutto
      if (k4 > 0.001) {
        drawThreads(true, 1); drawThreads(false, 1); drawArcs();
        drawThreads(true, 2); drawThreads(false, 2);
      } else {
        drawThreads(true, 0); drawThreads(false, 0); drawArcs();
      }

      // teste luminose dei fili dell'ordito che scendono
      ctx.globalCompositeOperation = PAL.add;
      for (i = 0; i < N; i++) {
        var tn = tauNow[i];
        if (tn <= 0 || tn >= 1 || still) continue;
        proj(uX[i], wV1[i], false);
        var ga = Math.sin(Math.PI * tn) * frameA;
        var bg = ctx.createRadialGradient(P3[0], P3[1], 0, P3[0], P3[1], 14);
        bg.addColorStop(0, "rgba(" + PAL.bead + "," + (PAL.beadA * ga).toFixed(3) + ")"); bg.addColorStop(1, "rgba(" + PAL.bead + ",0)");
        ctx.globalAlpha = 1; ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(P3[0], P3[1], 14, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = ga; ctx.fillStyle = PAL.beadCore; ctx.beginPath(); ctx.arc(P3[0], P3[1], 1.9, 0, Math.PI * 2); ctx.fill();
      }

      // la navetta: la sua luce cade sui fili vicini, lascia una scia sulla trama appena passata
      if (shA > 0.01) {
        proj(shU, shV, true);
        var hx = P3[0], hy = P3[1], hk = P3[2], R = S * 2.8;
        ctx.globalCompositeOperation = "source-atop";
        var pool = ctx.createRadialGradient(hx, hy, 0, hx, hy, R);
        pool.addColorStop(0, "rgba(" + PAL.pool + "," + (PAL.poolA * shA).toFixed(3) + ")"); pool.addColorStop(1, "rgba(" + PAL.pool + ",0)");
        ctx.globalAlpha = 1; ctx.fillStyle = pool; ctx.fillRect(hx - R, hy - R, R * 2, R * 2);
        ctx.globalCompositeOperation = PAL.add;
        if (shDir) trail(shRow, fHead[shRow] - shDir * S * 3.2, fHead[shRow], shA, 0.9);
        spark(hx, hy, hk, shA, shDir !== 0 && !insideSeg(shRow, shU));
      }

      // fase 3: navette di luce che corrono sulla trama, come nella hero
      if (light > 0.01) {
        ctx.globalCompositeOperation = PAL.add;
        for (var n = 0; n < runners.length; n++) {
          var ru = runners[n], j2 = ru.row;
          if (!segFn[j2]) continue;
          var lo = fU0[j2], span = fU1[j2] - lo;
          var hp = ru.dir > 0 ? ru.u : 1 - ru.u, tp = hp - ru.dir * 0.3;
          var hU = lo + span * hp, tU = lo + span * tp;
          trail(j2, tU, hU, light, 0.78);
          if (hp >= 0 && hp <= 1) { proj(hU, vY[j2], true); spark(P3[0], P3[1], P3[2], light * 0.9, !insideSeg(j2, hU)); }
        }
      }

      // fase 4: il riflesso che attraversa il marchio, come quello dei pulsanti del sito
      if (sheenOn) {
        var e = inOutCubic(sheenPh), span2 = M * 1.25, xc = cam.cx - span2 + e * span2 * 2, yc = cam.cy;
        ctx.globalCompositeOperation = "source-atop"; ctx.globalAlpha = 1;
        var sg = ctx.createLinearGradient(xc - M * 0.32, yc - M * 0.09, xc + M * 0.32, yc + M * 0.09);
        sg.addColorStop(0, "rgba(255,255,255,0)"); sg.addColorStop(0.5, "rgba(255,255,255,0.4)"); sg.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = sg; ctx.fillRect(cam.cx - M * 0.6, cam.cy - M * 0.6, M * 1.2, M * 1.2);
      }
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;

      // bagliore (un div sotto la tela: si muove senza ridisegnare niente)
      if (!still) {
        var gk2 = Math.round(cam.cx) + "," + Math.round(cam.cy) + "," + glowOp.toFixed(3) + "," + glowSc.toFixed(3);
        if (gk2 !== glowKey) {
          glowKey = gk2;
          glow.style.opacity = glowOp.toFixed(3);
          glow.style.transform = "translate3d(" + Math.round(cam.cx - glowR) + "px," + Math.round(cam.cy - glowR) + "px,0) scale(" + glowSc.toFixed(3) + ")";
        }
      }
    }

    // cambio di tema: nuovi colori, e si ridisegna subito (la dissolvenza del cambio tema fotografa la tela già nuova)
    document.addEventListener("telaio:tema", function () {
      PAL = palette(); dirty = true;
      if (still) redrawStill();
      else if (W) { pose(); render(); }
    });

    /* ---- Senza animazioni: un disegno fermo, rifatto se cambiano misura o tema ---- */
    function redrawStill() { resize(); if (!W) return; pose(); render(); }
    if (still) {
      sec.classList.add("p-rac-still");
      if ("ResizeObserver" in window) new ResizeObserver(redrawStill).observe(canvas);
      else window.addEventListener("resize", redrawStill);
      redrawStill();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(redrawStill);
      return null;
    }

    /* ---- Con le animazioni: la sezione prende subito l'assetto della scena (prima che boot misuri la pagina) ---- */
    sec.classList.add("p-rac-live");
    // la tela copre tutto il blocco fermo: il tessuto può uscire dalla colonna quando si inclina
    pin.insertBefore(canvas, pin.firstChild); pin.insertBefore(glow, canvas);
    // il titolo: nella colonna a sinistra su schermo largo, sopra la scena (fuori dal blocco fermo) sotto i 900 px
    gsap.matchMedia().add("(max-width: 899px)", function () {
      slot.appendChild(head);
      return function () { side.insertBefore(head, side.firstChild); };
    });
    // i passi non attivi partono nascosti (restano nella pagina: i lettori di schermo li leggono tutti)
    for (var s0 = 1; s0 < steps.length; s0++) gsap.set(steps[s0].children, { opacity: 0, y: 24 });
    steps[0].classList.add("is-on");
    // contatore, passo e pulsante entrano insieme quando arriva la scena (non uno a uno come i [data-reveal]:
    // dentro la sezione bloccata la loro soglia può cadere proprio dove la scena si ferma, e non scattare)
    var parts = sec.querySelectorAll(".p-rac-now, .p-rac-steps, .p-rac-cta");
    gsap.set(parts, { y: 46, opacity: 0 });

    return { scena: scena };

    /* ---- La scena: sezione bloccata, testo che cambia con la fase, tela che insegue lo scorrimento ---- */
    function scena() {
      var cur = 0, barsV = [-1, -1, -1, -1], callOn = false, visible = false, lastP = -1, lastE = -1;
      var STARTS = [0, 0.2, 0.52, 0.76, 1];

      function setStep(i) {
        var prev = cur, dir = i > prev ? 1 : -1;
        cur = i;
        for (var k = 0; k < steps.length; k++) steps[k].classList.toggle("is-on", k === i);
        // esce in fretta, entra con calma (expo), nel verso dello scorrimento
        gsap.to(steps[prev].children, { opacity: 0, y: -14 * dir, filter: "blur(4px)", duration: 0.32, ease: "power2.out", stagger: 0.02, overwrite: true });
        gsap.fromTo(steps[i].children, { opacity: 0, y: 26 * dir, filter: "blur(6px)" },
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.95, ease: "expo.out", stagger: 0.06, delay: 0.08, overwrite: true });
        if (reel) gsap.to(reel, { yPercent: -25 * i, duration: 0.9, ease: "expo.out", overwrite: true });
      }
      function ui() {
        var idx = P < STARTS[1] ? 0 : P < STARTS[2] ? 1 : P < STARTS[3] ? 2 : 3;
        if (idx !== cur) setStep(idx);
        for (var i = 0; i < bars.length; i++) {
          var f = c01((P - STARTS[i]) / (STARTS[i + 1] - STARTS[i]));
          if (Math.abs(f - barsV[i]) > 0.0005) { barsV[i] = f; bars[i].style.transform = "scaleX(" + f.toFixed(4) + ")"; }
        }
        if (!callout) return;
        if (!callOn && P > 0.94) { callOn = true; gsap.to(callout, { opacity: 1, y: 0, duration: 0.9, ease: "expo.out", overwrite: true }); }
        else if (callOn && P < 0.91) { callOn = false; gsap.to(callout, { opacity: 0, y: 10, duration: 0.3, ease: "power2.out", overwrite: true }); }
      }

      // Sezione bloccata sotto la testata (64 px, sempre sopra): lo scorrimento diventa l'avanzamento
      // della scena (più corta su telefono e tablet).
      // refreshPriority (anche solo 0) fa ricalcolare tutti i trigger nell'ordine della pagina: le comparse
      // più in basso, create prima delle sezioni bloccate, tengono conto dello spazio che queste aggiungono.
      ST.create({
        trigger: pin, start: "top 64px",
        end: function () { var w = window.innerWidth; return "+=" + Math.round(window.innerHeight * (w >= 900 ? 3.8 : w > 560 ? 3 : 2.6)); },
        pin: true, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 0,
        onUpdate: function (st) { Pt = st.progress; },
        onRefresh: function (st) { Pt = st.progress; }
      });
      // entrata: il telaio si disegna mentre la sezione arriva; contatore, passo e pulsante salgono insieme
      var partsIn = false;
      function showParts() {
        if (partsIn) return;
        partsIn = true;
        gsap.to(parts, { y: 0, opacity: 1, duration: 1.1, ease: "expo.out", stagger: 0.08, overwrite: "auto" });
      }
      ST.create({
        trigger: pin, start: "top 92%", end: "top 15%",
        onUpdate: function (st) { Et = st.progress; if (st.progress > 0.2) showParts(); },
        onRefresh: function (st) { Et = st.progress; if (st.progress > 0.2) showParts(); }
      });

      // si disegna solo quando la sezione è sullo schermo
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) dirty = true; }, { rootMargin: "120px 0px" }).observe(sec);
      } else visible = true;
      if ("ResizeObserver" in window) new ResizeObserver(function () { resize(); }).observe(pin);
      window.addEventListener("resize", function () { resize(); });
      resize();

      gsap.ticker.add(function (time, dtMs) {
        if (!visible || !W) return;
        var dt = Math.min(dtMs || 16, 64) / 1000;
        T += dt;
        // la tela insegue lo scorrimento con un filo di ritardo (stesso effetto a 60 e a 120 Hz)
        if (snap) { P = Pt; E = Et; snap = false; }
        var k = 1 - Math.exp(-dt * 8);
        P += (Pt - P) * k; if (Math.abs(Pt - P) < 0.00005) P = Pt;
        E += (Et - E) * k; if (Math.abs(Et - E) < 0.0005) E = Et;
        ui();
        pose();
        if (light > 0.001) {
          for (var n = 0; n < runners.length; n++) {
            runners[n].u += runners[n].v * dt;
            if (runners[n].u > 1.3) runners[n] = newRunner(false);
          }
        }
        var moving = P !== lastP || E !== lastE;
        lastP = P; lastE = E;
        if (!(moving || dirty || twangOn || sheenOn || tilt > 0.001 || light > 0.001)) return;
        dirty = false;
        render();
      });
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
