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

  /* Indirizzo che riceve il modulo del check-up: lo script Google dell'account info@,
     pubblicato come App web. Finché è vuoto, i pulsanti portano alla pagina del check-up
     e lì il riquadro mostra l'email. */
  var MODULO_URL = "https://script.google.com/macros/s/AKfycbzJmiY4G_pbbwvgdwyeIiqgITCb_plU3cYFLQ9vrBKGVN-VcL90GIzHZD7A5dZu4g0r7g/exec";

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

  /* ---- Richiesta del check-up: ogni pulsante «Prenota» apre una finestra col modulo;
     nella pagina del check-up lo stesso modulo sta anche nel riquadro blu. L'invio va allo
     script Google (MODULO_URL), che scrive a info@ e salva la richiesta. ---- */
  (function () {
    var EMAIL = '<a href="mailto:info@telaioconsulting.com" data-email-link>info@telaioconsulting.com</a>';
    var T = isEn ? {
      kicker: "AI check-up · 30 minutes · Free",
      titolo: "Book your AI check-up",
      lede: "Leave your name and contact details: we’ll write to you within 48 hours to set a day and time.",
      nome: "Name and surname", email: "Email", telefono: "Phone",
      messaggio: "What would you like to talk about?", facoltativo: "optional",
      esempio: "For example: answering customer emails takes us hours every week.",
      invia: "Send request", invio: "Sending…", chiudi: "Close",
      privacy: 'We only use this information to organise and prepare the call. <a href="/en/privacy/" target="_blank" rel="noopener">Read our privacy notice.</a>',
      grazie: function (n, e) { return ["Thank you, " + n + ".", "Your request has reached us. We’ll write to you at " + e + " within 48 hours to set a day and time."]; },
      errore: "The request could not be sent. Please try again in a moment, or write to us at " + EMAIL + "."
    } : {
      kicker: "Check-up AI · 30 minuti · Gratuito",
      titolo: "Prenota il check-up AI",
      lede: "Lasciaci nome e contatti: ti scriviamo noi entro 48 ore per fissare giorno e ora.",
      nome: "Nome e cognome", email: "Email", telefono: "Telefono",
      messaggio: "Di cosa vorresti parlare?", facoltativo: "facoltativo",
      esempio: "Per esempio: rispondere alle email dei clienti ci porta via ore ogni settimana.",
      invia: "Invia la richiesta", invio: "Invio in corso…", chiudi: "Chiudi",
      privacy: 'Usiamo questi dati solo per organizzare e preparare la call. <a href="/privacy/" target="_blank" rel="noopener">Leggi l’informativa privacy.</a>',
      grazie: function (n, e) { return ["Grazie, " + n + ".", "La tua richiesta è arrivata. Ti scriviamo a " + e + " entro 48 ore per fissare giorno e ora."]; },
      errore: "La richiesta non è partita. Riprova tra poco, oppure scrivici a " + EMAIL + "."
    };

    var box = document.querySelector("[data-booking]");
    if (!MODULO_URL || !window.fetch || !window.URLSearchParams) {
      // senza modulo vale il paragrafo con l'email già scritto nella pagina (quello di chi non ha JavaScript)
      var senza = box && box.parentNode.querySelector(".no-js-only");
      if (senza) senza.classList.add("is-shown");
      return;
    }

    // il modulo: id distinti per ogni copia (finestra e pagina), «punto» dice da quale pulsante si è partiti,
    // «dopo» (solo la finestra) riceve il ringraziamento appena c'è
    function modulo(id, punto, conNota, dopo) {
      var opz = ' <span class="ck-opt">(' + T.facoltativo + ")</span>";
      var f = document.createElement("form");
      f.className = "ck-form";
      f.innerHTML =
        '<div class="ck-field"><label for="' + id + '-nome">' + T.nome + "</label>" +
          '<input id="' + id + '-nome" name="nome" type="text" autocomplete="name" required maxlength="100"></div>' +
        '<div class="ck-two">' +
          '<div class="ck-field"><label for="' + id + '-email">' + T.email + "</label>" +
            '<input id="' + id + '-email" name="email" type="email" autocomplete="email" required maxlength="200" spellcheck="false"></div>' +
          '<div class="ck-field"><label for="' + id + '-tel">' + T.telefono + opz + "</label>" +
            '<input id="' + id + '-tel" name="telefono" type="tel" autocomplete="tel" maxlength="40"></div>' +
        "</div>" +
        '<div class="ck-field"><label for="' + id + '-msg">' + T.messaggio + opz + "</label>" +
          '<textarea id="' + id + '-msg" name="messaggio" rows="4" maxlength="3000" placeholder="' + T.esempio + '"></textarea></div>' +
        // campo trappola: invisibile alle persone, lo riempiono solo i programmi che mandano spam
        '<div class="ck-hp" aria-hidden="true"><label>Lascia vuoto <input name="sito_web" type="text" tabindex="-1" autocomplete="off"></label></div>' +
        '<div class="ck-send"><button class="btn btn-primary btn-block" type="submit"><span class="ck-label">' + T.invia + "</span></button>" +
          '<p class="ck-status" role="status" aria-live="polite"></p></div>' +
        (conNota ? '<p class="ck-note">' + T.privacy + "</p>" : "");

      var btn = f.querySelector("button"), label = f.querySelector(".ck-label"), stato = f.querySelector(".ck-status");
      var inVolo = false;
      // il browser controlla prima i campi obbligatori e l'email: «submit» arriva solo se sono a posto
      f.addEventListener("submit", function (ev) {
        ev.preventDefault();
        if (inVolo) return;
        var dati = new URLSearchParams(new FormData(f));
        dati.set("lingua", isEn ? "en" : "it");
        dati.set("pagina", location.pathname);
        dati.set("pulsante", punto());
        inVolo = true;
        btn.disabled = true; label.textContent = T.invio;
        stato.textContent = ""; stato.classList.remove("is-error");
        var ctrl = window.AbortController ? new AbortController() : null;
        var attesa = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
        fetch(MODULO_URL, { method: "POST", body: dati, credentials: "omit", signal: ctrl ? ctrl.signal : undefined })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            if (!res || !res.ok) throw new Error((res && res.errore) || "risposta");
            var fatto = grazie(f, dati.get("nome"), dati.get("email"));
            if (dopo) dopo(fatto);
          })
          .catch(function () { stato.innerHTML = T.errore; stato.classList.add("is-error"); })
          .then(function () { clearTimeout(attesa); inVolo = false; btn.disabled = false; label.textContent = T.invia; });
      });
      return f;
    }

    // dopo l'invio il modulo lascia il posto al ringraziamento (i dati della persona solo come testo)
    function grazie(f, nome, email) {
      var t = T.grazie(nome, email);
      var fatto = document.createElement("div");
      fatto.className = "ck-done";
      fatto.setAttribute("tabindex", "-1");
      var h = document.createElement("p"), p = document.createElement("p");
      h.className = "ck-done-h";
      h.textContent = t[0]; p.textContent = t[1];
      fatto.appendChild(h); fatto.appendChild(p);
      f.parentNode.replaceChild(fatto, f);
      fatto.focus();
      return fatto;
    }

    // nella pagina del check-up il modulo prende il posto dell'email nel riquadro blu
    if (box) {
      box.innerHTML = "";
      box.appendChild(modulo("ck-p", function () { return "checkup_form"; }, false));
      box.hidden = false;
    }

    // la finestra: si apre da ogni pulsante del check-up. Il link resta per chi lo apre in una
    // scheda nuova (Ctrl, Cmd, rotella) e per i browser senza <dialog>
    if (typeof HTMLDialogElement !== "function") return;
    var dlg = document.createElement("dialog"), daPulsante = "", testoDato = "";
    dlg.className = "ck-dialog";
    dlg.setAttribute("aria-labelledby", "ck-titolo");
    dlg.setAttribute("data-lenis-prevent", ""); // dentro la finestra scorre il browser, non Lenis (motion.js)
    dlg.innerHTML = '<div class="ck-dialog-in">' +
      '<button class="icon-btn ck-close" type="button" aria-label="' + T.chiudi + '"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<p class="ck-kicker">' + T.kicker + "</p>" +
      '<h2 class="ck-title" id="ck-titolo">' + T.titolo + "</h2>" +
      '<p class="ck-lede">' + T.lede + "</p></div>";
    function moduloFinestra() { return modulo("ck-d", function () { return daPulsante; }, true, avviaChiusura); }
    dlg.firstChild.appendChild(moduloFinestra());
    document.body.appendChild(dlg);

    dlg.querySelector(".ck-close").addEventListener("click", function () { dlg.close(); });
    // un clic sullo sfondo chiude; non se è partito dentro (selezionando il testo di un campo) e non
    // sulla barra di scorrimento della finestra, che per il browser è la finestra stessa
    function fuori(ev) {
      var r = dlg.getBoundingClientRect();
      return ev.target === dlg && (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom);
    }
    var giuFuori = false;
    dlg.addEventListener("pointerdown", function (ev) { giuFuori = fuori(ev); });
    dlg.addEventListener("click", function (ev) { if (giuFuori && fuori(ev)) dlg.close(); });

    // dopo il ringraziamento la finestra si chiude da sola: una barra sottile si svuota nel frattempo.
    // Non parte a finestra chiusa (la risposta è arrivata dopo un Esc: parte quando si riapre), né a scheda
    // nascosta, né con «riduci movimento». Chi tocca, scorre o usa la tastiera dentro la finestra la tiene
    // aperta, e anche chi passa a un'altra scheda: tornando, trova ancora il ringraziamento
    var CHIUDI_DOPO = 8000, timerChiudi = 0, barra = null;
    var fermo = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function fermaChiusura() {
      clearTimeout(timerChiudi); timerChiudi = 0;
      if (barra && barra.parentNode) barra.parentNode.removeChild(barra);
      barra = null;
    }
    function avviaChiusura(fatto) {
      fermaChiusura();
      if (!dlg.open || document.hidden || fermo) return;
      barra = document.createElement("i");
      barra.className = "ck-done-bar"; barra.setAttribute("aria-hidden", "true");
      barra.style.animationDuration = CHIUDI_DOPO + "ms";
      fatto.appendChild(barra);
      timerChiudi = setTimeout(function () { dlg.close(); }, CHIUDI_DOPO); // la pulizia la fa «close»
    }
    ["pointerdown", "keydown", "wheel", "touchmove"].forEach(function (t) {
      dlg.addEventListener(t, function () { if (timerChiudi) fermaChiusura(); }, { passive: true });
    });
    document.addEventListener("visibilitychange", function () { if (document.hidden && timerChiudi) fermaChiusura(); });
    // chiusa dopo un invio, alla prossima apertura la finestra ha un modulo nuovo e vuoto
    dlg.addEventListener("close", function () {
      fermaChiusura();
      root.classList.remove("ck-open");
      var fatto = dlg.querySelector(".ck-done");
      if (fatto) fatto.parentNode.replaceChild(moduloFinestra(), fatto);
    });

    // in fase di cattura: così il clic risulta già gestito per lo scorrimento morbido di motion.js,
    // qualunque sia l'ordine degli script
    document.addEventListener("click", function (ev) {
      var a = ev.target.closest ? ev.target.closest("a[data-cta='checkup']") : null;
      if (!a || ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      ev.preventDefault();
      daPulsante = a.getAttribute("data-placement") || "";
      closeMenu();
      // la pagina sotto resta ferma; lo spazio della sua barra di scorrimento resta occupato, così nulla si sposta
      root.style.setProperty("--ck-gutter", (window.innerWidth - root.clientWidth) + "px");
      root.classList.add("ck-open");
      if (!dlg.open) dlg.showModal();
      // un ringraziamento arrivato a finestra chiusa: lo si vede ora, poi la finestra si chiude da sola
      var giaFatto = dlg.querySelector(".ck-done");
      if (giaFatto && !timerChiudi) avviaChiusura(giaFatto);
      // un link che dice già di cosa parlare («Parliamone nel check-up» di un'area) scrive il messaggio;
      // quello che la persona ha scritto da sé non si tocca
      var msg = dlg.querySelector("textarea[name='messaggio']"), testo = a.getAttribute("data-messaggio") || "";
      if (msg && (!msg.value || msg.value === testoDato)) msg.value = testo;
      testoDato = testo;
      // con mouse e tastiera si parte dal nome; sul telefono no, la tastiera coprirebbe la finestra
      var nome = dlg.querySelector("input[name='nome']");
      if (nome && window.matchMedia("(pointer: fine)").matches) nome.focus();
    }, true);
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
     ha una sua immagine e può attraversare lo schermo sopra la pagina e sotto la testata. */
  window.addEventListener("pageswap", function (e) {
    if (!e.viewTransition) return;
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
    // all'arrivo si tesse, tranne arrivando col filo.
    // Se «pagereveal» non è ancora arrivato si aspetta: è lui a dire se la pagina arriva col filo.
    var allArrivo = function (colFilo) {
      if (colFilo || !anima) marchio.classList.add("p-tessuto");
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
