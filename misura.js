/* ============================================================
   TELAIO — misura: il banner dei cookie e le statistiche (PostHog, regione UE).
   Segue lo standard Telaio: il piano degli eventi è company/event-tracking/tracking-plan.json
   nel repository telaio (tenant «telaio»), le regole del consenso sono le sue «rules.consent».
   - Prima di una scelta, o dopo «Rifiuta»: PostHog conta la visita senza cookie (cookieless_mode
     «on_reject»): solo pagine viste e uscite ($pageview, $pageleave), con un'impronta del giorno
     che PostHog calcola sui suoi server. Nel browser non resta niente.
   - Dopo «Accetta» sulle statistiche: PostHog con il suo cookie, i clic, le mappe di calore, i tempi
     della pagina, la registrazione di una parte delle visite (i campi dei moduli sempre nascosti)
     e i due eventi del piano: checkup_clicked e checkup_requested.
   - Ritirando il consenso: cookie e chiavi di PostHog si cancellano e la pagina si ricarica pulita.
   - Ogni scelta sul banner va nel registro dei consensi (rules.consent_log del piano): la scheda
     «Consensi» del foglio dello script Google che riceve il modulo (MODULO_URL di script.js).
   Nessun tag di Google o di Meta. Il banner (CookieConsent 3.1.0) è in assets/vendor/.
   Per spegnere tutto: togliere <script src="/misura.js"> dalle pagine.
   ============================================================ */
(function () {
  "use strict";
  if (window.__telaioMisura) return;
  window.__telaioMisura = true;

  // la chiave del progetto PostHog «telaioconsulting.com» (organizzazione Telaio, id 312302):
  // è pubblica per natura, compare nel codice di ogni pagina
  var CHIAVE = "phc_D6yydXxCovPG9j6CFeri6ZBDFXjRfyJBFYxtCBtczjMz";
  var POSTHOG = {
    api_host: "https://eu.i.posthog.com",
    ui_host: "https://eu.posthog.com",
    script: "https://eu-assets.i.posthog.com/static/array.js"
  };
  var REVISIONE = 1;   // cambiarla quando cambiano categorie o strumenti: tutti rivedono il banner
  var GIORNI = 182;    // la scelta vale sei mesi, poi il banner torna (Garante, linee guida 2021)

  // si misura solo sul sito vero (env prod) e in locale per le prove (env test)
  var host = location.hostname;
  var ENV = host === "telaioconsulting.com" ? "prod" : (host === "localhost" || host === "127.0.0.1") ? "test" : "";
  var isEn = (document.documentElement.lang || "it").toLowerCase().indexOf("en") === 0;

  /* ---- 1. La scelta di chi visita. Si legge dal cookie del banner prima che il banner arrivi,
     così già la prima pagina vista la rispetta. Una scelta fatta con una revisione vecchia non vale. */
  var consenso = { statistiche: false };

  function categorieSalvate() {
    try {
      var m = document.cookie.match(/(?:^|;\s*)cc_cookie=([^;]*)/);
      if (!m) return null;
      var v = JSON.parse(decodeURIComponent(m[1]));
      if (!v || v.revision !== REVISIONE || !v.categories) return null;
      return v.categories;
    } catch (e) { return null; }
  }

  function leggiConsenso() {
    var CC = window.CookieConsent, cat = null;
    if (CC && CC.validConsent && CC.validConsent()) cat = CC.getCookie("categories") || [];
    else cat = categorieSalvate();
    consenso.statistiche = !!cat && cat.indexOf("analytics") >= 0;
  }

  /* ---- 2. PostHog. Parte per tutti: senza consenso conta senza cookie, con il consenso misura tutto. */
  var ph = { carica: false, pronto: false, coda: [] };
  var SEMPRE = { "$pageview": 1, "$pageleave": 1 };   // gli unici eventi di chi non ha accettato

  function conPostHog(fn) {
    if (ph.pronto) { try { fn(window.posthog); } catch (e) { /* la misura non rompe mai la pagina */ } }
    else ph.coda.push(fn);
  }

  function postHogPronto() {
    ph.pronto = true;
    var q = ph.coda; ph.coda = [];
    for (var i = 0; i < q.length; i++) { try { q[i](window.posthog); } catch (e) { /* il prossimo */ } }
  }

  function caricaPostHog() {
    if (ph.carica || !ENV || !CHIAVE) return;   // fuori dal sito, o senza chiave: non parte niente
    ph.carica = true;
    var s = document.createElement("script");
    s.async = true;
    s.src = POSTHOG.script;
    s.onload = function () {
      if (!window.posthog || !window.posthog.init) return;
      window.posthog.init(CHIAVE, {
        api_host: POSTHOG.api_host,
        ui_host: POSTHOG.ui_host,
        person_profiles: "identified_only",
        persistence: "localStorage+cookie",
        cookie_expiration: 365,
        cross_subdomain_cookie: false,         // il cookie resta su telaioconsulting.com, non va ai sottodomini dei clienti
        opt_out_capturing_by_default: true,
        opt_out_persistence_by_default: true,
        cookieless_mode: "on_reject",
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: true,
        capture_dead_clicks: true,
        capture_heatmaps: true,
        capture_performance: { web_vitals: true },
        capture_exceptions: false,
        disable_session_recording: true,       // parte solo dopo il consenso (applicaConsenso)
        session_recording: { maskAllInputs: true },
        disable_surveys: true,
        advanced_disable_feature_flags: true,
        before_send: function (ev) {
          if (!ev) return ev;
          return (consenso.statistiche || SEMPRE[ev.event]) ? ev : null;
        },
        loaded: function () { postHogPronto(); applicaConsenso(); }
      });
    };
    (document.head || document.documentElement).appendChild(s);
  }

  var giaAccettato = false;
  function applicaConsenso() {
    if (!consenso.statistiche || giaAccettato) return;   // altrimenti resta il conteggio senza cookie
    giaAccettato = true;
    conPostHog(function (p) {
      if (!p.has_opted_in_capturing()) p.opt_in_capturing();
      p.startSessionRecording();                         // decide PostHog quali visite registrare (20%)
    });
  }

  function dimenticaPostHog() {                          // consenso ritirato: non resta nessun identificativo
    conPostHog(function (p) { p.stopSessionRecording(); p.clear_opt_in_out_capturing(); p.reset(); });
    var archivi = [];
    try { archivi.push(window.localStorage); } catch (e) { /* bloccato */ }
    try { archivi.push(window.sessionStorage); } catch (e) { /* bloccato */ }
    for (var i = 0; i < archivi.length; i++) {
      try {
        for (var j = archivi[i].length - 1; j >= 0; j--) {
          var k = archivi[i].key(j);
          if (/^(ph_|__ph_|_ph_)/.test(k)) archivi[i].removeItem(k);
        }
      } catch (e) { /* il prossimo */ }
    }
  }

  /* ---- 3. Gli eventi del piano: solo con il consenso alle statistiche. */
  function evento(nome, prop) {
    if (!consenso.statistiche) return;
    var tutte = { tenant: "telaio", surface: "site", env: ENV };
    for (var k in prop) if (Object.prototype.hasOwnProperty.call(prop, k)) tutte[k] = prop[k];
    conPostHog(function (p) { p.capture(nome, tutte, { send_instantly: true, transport: "sendBeacon" }); });
  }

  function punto(v) { return /^[a-z0-9_]{1,40}$/.test(v || "") ? v : "other"; }   // i valori di data-placement

  // un clic su un pulsante del check-up: anche quando lo si apre in una scheda nuova (Ctrl, rotella)
  function suPulsante(ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest("a[data-cta='checkup']") : null;
    if (a) evento("checkup_clicked", { placement: punto(a.getAttribute("data-placement")) });
  }
  document.addEventListener("click", suPulsante, true);
  document.addEventListener("auxclick", function (ev) { if (ev.button === 1) suPulsante(ev); }, true);

  // la richiesta è arrivata: lo dice script.js dopo la risposta positiva dello script Google
  document.addEventListener("telaio:checkup-inviato", function (ev) {
    evento("checkup_requested", { placement: punto(ev.detail && ev.detail.pulsante) });
  });

  function applica() {
    leggiConsenso();
    caricaPostHog();
    applicaConsenso();
  }

  /* ---- 3b. Il registro dei consensi: serve a dimostrare la scelta di chi visita. Lo script Google la
     scrive nella scheda «Consensi»: l'id casuale del banner (lo stesso del cookie cc_cookie), le categorie,
     la revisione, se è la prima scelta o un cambio, e l'ora. Nessun cookie parte con la richiesta
     (credentials «omit»: per questo niente sendBeacon) e lo script non salva IP né browser.
     Solo sul sito vero; keepalive la fa arrivare anche se la pagina si ricarica subito dopo (ritiro). */
  function registraConsenso(azione) {
    var CC = window.CookieConsent, url = window.TELAIO_MODULO_URL;
    if (ENV !== "prod" || !url || !CC || !CC.getCookie || !window.fetch) return;
    try {
      var corpo = JSON.stringify({
        kind: "consent",
        consent_id: CC.getCookie("consentId"),
        categories: CC.getCookie("categories"),
        revision: CC.getCookie("revision"),
        action: azione
      });
      window.fetch(url, {
        method: "POST", body: corpo, keepalive: true, mode: "no-cors", credentials: "omit",
        headers: { "Content-Type": "text/plain" }
      })["catch"](function () { /* registro perso: la pagina non cambia */ });
    } catch (e) { /* la misura non rompe mai la pagina */ }
  }

  /* ---- 4. I testi del banner. */
  var T = isEn ? {
    consentModal: {
      title: "Can we measure your visit?",
      description: "We use PostHog, an analytics service with servers in the European Union, to see which pages help and what to improve. If you accept, we store a cookie in your browser and record how you use the site: pages, clicks and, for one visit in five, a screen recording with form fields hidden. If you reject, we only count the pages viewed, with no cookies and without recognising you from one day to the next.",
      acceptAllBtn: "Accept",
      acceptNecessaryBtn: "Reject",
      showPreferencesBtn: "Choose",
      closeIconLabel: "Reject and close",
      footer: '<a href="/en/privacy/">Privacy notice</a><a href="/en/cookies/">Cookies</a>'
    },
    preferencesModal: {
      title: "Your cookie choices",
      acceptAllBtn: "Accept all",
      acceptNecessaryBtn: "Reject all",
      savePreferencesBtn: "Save my choices",
      closeIconLabel: "Close",
      serviceCounterLabel: "Service|Services",
      sections: [
        { title: "What you can choose", description: 'Here you decide what the site may store in your browser. The details, with each cookie\'s name and how long it lasts, are on the <a href="/en/cookies/">Cookies page</a>.' },
        { title: "Necessary", description: "They remember your choice on this banner (for six months) and the light or dark theme, if you change it. They are always on.", linkedCategory: "necessary" },
        { title: "Analytics (PostHog)", description: "A PostHog cookie, lasting one year, lets us recognise the same visit from page to page and when you come back. We record pages, clicks, loading times and, for one visit in five, a screen recording with form fields hidden. With this off we only count the pages viewed, with no cookies.", linkedCategory: "analytics" },
        { title: "Questions", description: 'Write to <a href="mailto:info@telaioconsulting.com">info@telaioconsulting.com</a>.' }
      ]
    }
  } : {
    consentModal: {
      title: "Possiamo misurare la tua visita?",
      description: "Usiamo PostHog, un servizio di statistica con i server nell'Unione europea, per capire quali pagine servono e cosa migliorare. Se accetti, salviamo un cookie nel tuo browser e registriamo come usi il sito: pagine, clic e, per una visita su cinque, una registrazione dello schermo con i campi dei moduli nascosti. Se rifiuti, contiamo solo le pagine viste, senza cookie e senza riconoscerti da un giorno all'altro.",
      acceptAllBtn: "Accetta",
      acceptNecessaryBtn: "Rifiuta",
      showPreferencesBtn: "Scegli",
      closeIconLabel: "Rifiuta e chiudi",
      footer: '<a href="/privacy/">Informativa privacy</a><a href="/cookie/">Cookie</a>'
    },
    preferencesModal: {
      title: "Le tue scelte sui cookie",
      acceptAllBtn: "Accetta tutto",
      acceptNecessaryBtn: "Rifiuta tutto",
      savePreferencesBtn: "Salva le scelte",
      closeIconLabel: "Chiudi",
      serviceCounterLabel: "Servizio|Servizi",
      sections: [
        { title: "Cosa puoi scegliere", description: 'Qui decidi cosa può salvare il sito nel tuo browser. I dettagli, con il nome di ogni cookie e quanto dura, sono nella <a href="/cookie/">pagina Cookie</a>.' },
        { title: "Necessari", description: "Ricordano la tua scelta su questo banner (per sei mesi) e il tema chiaro o scuro, se lo cambi. Sono sempre attivi.", linkedCategory: "necessary" },
        { title: "Statistiche (PostHog)", description: "Un cookie di PostHog, che dura un anno, ci fa riconoscere la stessa visita da una pagina all'altra e quando torni. Registriamo pagine, clic, tempi di caricamento e, per una visita su cinque, una registrazione dello schermo con i campi dei moduli nascosti. Se lo lasci spento contiamo solo le pagine viste, senza cookie.", linkedCategory: "analytics" },
        { title: "Domande", description: 'Scrivi a <a href="mailto:info@telaioconsulting.com">info@telaioconsulting.com</a>.' }
      ]
    }
  };

  /* ---- 5. Il banner: foglio di stile e script ospitati nel sito, caricati senza bloccare la pagina.
     Parte quando ci sono tutti e due, così non si vede mai senza stile. */
  function avviaBanner() {
    var CC = window.CookieConsent;
    if (!CC || !CC.run) return;                          // senza banner vale la scelta salvata, o il conteggio senza cookie
    var lingua = isEn ? "en" : "it", testi = {};
    testi[lingua] = T;
    CC.run({
      mode: "opt-in",
      autoShow: true,
      revision: REVISIONE,
      hideFromBots: true,
      manageScriptTags: false,
      cookie: { name: "cc_cookie", expiresAfterDays: GIORNI, sameSite: "Lax" },
      guiOptions: {
        consentModal: { layout: "box", position: "bottom left", equalWeightButtons: true, flipButtons: false },
        preferencesModal: { layout: "box", equalWeightButtons: true, flipButtons: false }
      },
      categories: {
        necessary: { enabled: true, readOnly: true },
        analytics: { autoClear: { cookies: [{ name: /^ph_/ }, { name: /^__ph_/ }] } }
      },
      language: { default: lingua, translations: testi },
      onModalReady: function (e) {                       // dentro il banner scorre il browser, non Lenis (motion.js)
        if (e && e.modal) e.modal.setAttribute("data-lenis-prevent", "");
      },
      onFirstConsent: function () { registraConsenso("first"); },
      onConsent: function () { applica(); },
      onChange: function () {
        registraConsenso("change");                      // prima del ricaricamento qui sotto
        var prima = consenso.statistiche;
        leggiConsenso();
        if (prima && !consenso.statistiche) {            // statistiche ritirate: si cancella e si riparte puliti
          dimenticaPostHog();
          location.reload();
          return;
        }
        applica();
      }
    });
  }

  function caricaBanner() {
    var pronti = 0;
    function uno() { if (++pronti === 2) avviaBanner(); }
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "/assets/vendor/cookieconsent.css";
    l.onload = uno;
    l.onerror = uno;
    document.head.appendChild(l);
    // Il file UMD di CookieConsent comincia con «var e,t; e=this, t=function…»: caricato come script
    // classico sovrascrive le globali «e» e «t» che lenis.min.js dichiara al suo primo livello (la sua
    // funzione clamp e la classe dell'animazione). Senza rimetterle a posto ogni scrollTo di Lenis
    // chiamerebbe la fabbrica di CookieConsent e la rotella del mouse non muoverebbe più la pagina.
    var globali = { e: window.e, t: window.t };
    var s = document.createElement("script");
    s.src = "/assets/vendor/cookieconsent.umd.js";
    s.onload = function () {
      window.e = globali.e;
      window.t = globali.t;
      uno();
    };
    document.head.appendChild(s);
  }

  /* ---- 6. Si parte: subito la scelta salvata, poi il banner. */
  applica();
  caricaBanner();
})();
