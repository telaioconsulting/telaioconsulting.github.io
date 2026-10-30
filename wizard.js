/* ============================================================
   TELAIO — AI Wizard: otto domande sull'impresa, il risultato subito, poi l'invito al check-up.
   Gira tutto nel browser: le risposte non partono verso nessun server. Se dal risultato la persona
   prenota il check-up, il riepilogo entra nel messaggio del modulo (data-messaggio, script.js),
   dove lo vede e lo può cambiare prima di inviare.
   misura.js conta l'inizio e la fine (evento «telaio:wizard»), solo con il consenso alle statistiche
   e mai con i dati della persona: solo i codici delle risposte e i due punteggi.
   Il calcolo e le sue ipotesi sono scritti nella pagina, «Come calcoliamo il risultato»: chi cambia
   un numero qui cambia anche quella sezione, in italiano e in inglese.
   Vanilla JS, nessuna libreria/build. Parte solo dove la pagina ha [data-wizard].
   ============================================================ */
(function () {
  "use strict";
  var box = document.querySelector("[data-wizard]");
  if (!box) return;
  var root = document.documentElement;
  var isEn = (root.lang || "it").toLowerCase().indexOf("en") === 0;
  var fermo = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Le domande. I codici sono quelli del piano di tracciamento (wizard_completed): non cambiarli
     senza cambiare anche company/event-tracking/tracking-plan.json nel repository telaio. */
  var DOMANDE = [
    { id: "sector", opzioni: ["manufacturing", "retail", "professional_services", "hospitality", "construction", "other"] },
    { id: "team_size", opzioni: ["1_9", "10_49", "50_249", "250_plus"] },
    { id: "areas", piu: 3, opzioni: ["customer_requests", "quotes", "documents", "knowledge", "content", "reporting"] },
    { id: "hours", opzioni: ["under_5", "5_15", "15_40", "over_40"] },
    { id: "repetition", opzioni: ["high", "medium", "low"] },
    { id: "data", opzioni: ["system", "spreadsheets", "scattered"] },
    { id: "ai_today", opzioni: ["in_processes", "personal", "none"] },
    { id: "owner", opzioni: ["owner", "manager", "nobody"] }
  ];

  /* ---- Il calcolo (spiegato nella pagina).
     Potenziale, 0–100: ore in gioco (fino a 50) + quanto si ripetono le attività (fino a 30) + quante
     attività hai scelto (fino a 20). Prontezza, 25–100: dove stanno le informazioni (fino a 40) + l'AI
     che usate già (fino a 30) + chi segue il progetto (fino a 30).
     Ore da recuperare: le ore della fascia scelta per la quota che l'AI può togliere, prudente. */
  var ORE = { under_5: { da: 2, a: 5, punti: 10 }, "5_15": { da: 5, a: 15, punti: 25 }, "15_40": { da: 15, a: 40, punti: 40 }, over_40: { da: 40, a: 60, punti: 50 } };
  var RIPETIZIONE = { high: { da: 0.3, a: 0.5, punti: 30 }, medium: { da: 0.2, a: 0.35, punti: 18 }, low: { da: 0.05, a: 0.15, punti: 6 } };
  var PUNTI_ATTIVITA = [0, 10, 16, 20];   // per 0, 1, 2, 3 attività scelte
  var DATI = { system: 40, spreadsheets: 25, scattered: 10 };
  var AI_OGGI = { in_processes: 30, personal: 20, none: 10 };
  var CHI = { owner: 30, manager: 20, nobody: 5 };
  var SETTIMANE_ANNO = 46;                // settimane di lavoro in un anno, per la cifra annua
  var SOGLIA_POTENZIALE = 40;             // sotto: «oggi l'AI ha poco da fare»

  function calcola(r) {
    var ore = ORE[r.hours], rip = RIPETIZIONE[r.repetition], n = Math.min(r.areas.length, 3);
    var potenziale = ore.punti + rip.punti + PUNTI_ATTIVITA[n];
    var prontezza = DATI[r.data] + AI_OGGI[r.ai_today] + CHI[r.owner];
    var da = Math.max(1, Math.round(ore.da * rip.da));
    var a = Math.max(da + 1, Math.round(ore.a * rip.a));
    // senza un posto per le informazioni o qualcuno che segua il progetto si parte da lì, qualunque sia il punteggio
    var blocchi = [];
    if (r.data === "scattered") blocchi.push("data");
    if (r.owner === "nobody") blocchi.push("owner");
    var profilo = potenziale < SOGLIA_POTENZIALE ? "not_now" : blocchi.length ? "prepare_first" : "ready";
    return { potenziale: potenziale, prontezza: prontezza, oreDa: da, oreA: a, profilo: profilo, blocchi: blocchi };
  }
  function decina(n) { return Math.max(10, Math.round(n / 10) * 10); }   // le ore di un anno: una cifra tonda, non una falsa precisione
  function fascia(v, alta, media) { return v >= alta ? "alta" : v >= media ? "media" : "bassa"; }

  /* ---- I testi. */
  var T = isEn ? {
    domanda: function (i, n) { return "Question " + i + " of " + n; },
    avanti: "Next", vedi: "See my result", indietro: "Back",
    scegli: "Choose an answer to go on.", scegliPiu: "Choose at least one activity to go on.",
    massimo: "You’ve chosen three. To change one, untick another first.",
    q: {
      sector: { t: "What sector is your business in?", o: { manufacturing: "Manufacturing and production", retail: "Retail, shop or e-commerce", professional_services: "Professional services (firms, agencies, consulting)", hospitality: "Tourism, food and events", construction: "Construction, installation, building services", other: "Something else" } },
      team_size: { t: "How many people work there?", o: { "1_9": "1–9", "10_49": "10–49", "50_249": "50–249", "250_plus": "250 or more" } },
      areas: { t: "Which of these take up the most time?", h: "Choose up to three.", o: { customer_requests: "Answering customer emails, calls and requests", quotes: "Preparing quotes and offers", documents: "Handling orders, invoices and documents", knowledge: "Looking for information in files, contracts and procedures", content: "Writing copy: product pages, posts, newsletters", reporting: "Pulling together numbers to decide (sales, stock, costs)" } },
      hours: { t: "How many hours a week go into these activities, in total?", h: "Add up the hours of everyone involved. A rough idea is enough.", o: { under_5: "Fewer than 5", "5_15": "5 to 15", "15_40": "15 to 40", over_40: "More than 40" } },
      repetition: { t: "How repetitive are they?", o: { high: "Almost always the same: same questions, same forms", medium: "Similar, with a few exceptions", low: "Every case is different" } },
      data: { t: "Where does the information you need live?", o: { system: "In a management system, CRM or online shop", spreadsheets: "In spreadsheets and shared folders, fairly tidy", scattered: "Scattered across emails, paper and people’s heads" } },
      ai_today: { t: "Do you already use AI?", o: { in_processes: "Yes, in some everyday tasks", personal: "Some people use ChatGPT or similar, on their own", none: "Not yet" } },
      owner: { t: "Who would follow the project on your side?", o: { owner: "Me: I own the business or I make the call", manager: "An internal manager, with some time for it", nobody: "Today nobody has time for it" } }
    },
    risultato: "Your result",
    profili: {
      ready: ["You can start now", "You have repetitive activities, real time at stake and the basics to begin. This is the typical case where the first AI tool is in use within 4 weeks."],
      prepare_first: ["There’s a lot to gain, but put things in order first", "The time at stake is there. Before an AI tool, you’ll probably need to sort out a few things, listed below: that’s where we would start."],
      not_now: ["Today AI has little to do for you", "With few hours at stake, or activities that are all different, an AI tool would hardly pay for itself today. In the check-up we look at whether there’s one place where it does, or what to do first."]
    },
    potenziale: "AI potential", prontezza: "Readiness",
    fasce: { alta: "High", media: "Medium", bassa: "Low" },
    fascePr: { alta: "High", media: "Medium", bassa: "To build" },
    ore: "Time you could win back",
    oreS: "hours a week",
    oreNota: function (da, a) { return "That’s about " + da + " to " + a + " hours over a working year. A rough estimate on the hours you gave us, not a promise."; },
    partenza: "Where we would start",
    prima: "What to sort out first",
    gap: {
      data: "Gather the information you need in one place. A well-kept shared spreadsheet is enough to begin with.",
      owner: "Find one person who follows the project on your side: we need someone to try the tool in real work and tell us what doesn’t fit."
    },
    gapAi: "You don’t use AI yet: no problem. We start from a single activity and try it with your people.",
    ctaH: "Let’s talk about it in the check-up",
    ctaP: "30 minutes, free, with one of the founders. We go through this result together and tell you where we would start, or whether it isn’t worth it today.",
    ctaBtn: "Book your AI check-up",
    ctaNota: "A summary of your answers goes into the message: you can see and change it before sending.",
    ancora: "Start the wizard again",
    att: {
      customer_requests: { t: "Customer requests", p: "The questions you get every day find a draft reply ready, with the right information. You check and send." },
      quotes: { t: "Quotes", p: "From the customer’s request to a draft quote, with your price lists and your terms." },
      documents: { t: "Orders and documents", p: "Orders, invoices and documents read and filed on their own: you only check the exceptions." },
      knowledge: { t: "Procedures and archive", p: "Ask a question as you would ask a colleague, and find the answer across contracts, manuals and procedures." },
      content: { t: "Copy and product pages", p: "Product pages, posts and newsletters drafted in your tone of voice: you edit and publish." },
      reporting: { t: "The week’s numbers", p: "Sales, purchases and stock in a clear summary every Monday, with no copying and pasting." }
    },
    esempio: "For example: ",
    es: {
      customer_requests: { retail: "availability, shipping and returns", hospitality: "booking requests and information", professional_services: "clients’ recurring questions", manufacturing: "order status and technical questions", construction: "requests for site visits and quotes" },
      quotes: { manufacturing: "quotes from drawings and specs", construction: "estimates from a site visit", professional_services: "proposals from a first call", hospitality: "offers for groups and events", retail: "wholesale and B2B offers" },
      documents: { retail: "orders, invoices and shipments", manufacturing: "delivery notes and supplier invoices", construction: "site paperwork and supplier invoices", hospitality: "bookings and supplier invoices", professional_services: "client documents to file and check" },
      knowledge: { manufacturing: "technical sheets and quality procedures", professional_services: "past cases and templates", construction: "regulations and specifications", hospitality: "internal procedures for staff", retail: "supplier conditions and product information" },
      content: { retail: "product pages from the supplier’s data", hospitality: "descriptions, posts and seasonal offers", professional_services: "articles and newsletters", manufacturing: "catalogues and product pages", construction: "project write-ups and posts" },
      reporting: { retail: "sales and stock every Monday", manufacturing: "production, orders and margins", hospitality: "bookings, occupancy and takings", construction: "site progress and costs", professional_services: "hours, billing and collections" }
    },
    riepilogo: function (r, c, L) {
      return "I did the AI Wizard on the site.\n" +
        "Sector: " + L("sector", r.sector) + " · People: " + L("team_size", r.team_size) + "\n" +
        "Activities that take time: " + r.areas.map(function (a) { return L("areas", a); }).join("; ") + "\n" +
        "Hours a week: " + L("hours", r.hours) + " · " + L("repetition", r.repetition) + "\n" +
        "Information: " + L("data", r.data) + " · AI today: " + L("ai_today", r.ai_today) + " · Who follows it: " + L("owner", r.owner) + "\n" +
        "Result: potential " + c.potenziale + "/100, readiness " + c.prontezza + "/100, " + c.oreDa + "–" + c.oreA + " hours a week to win back.";
    }
  } : {
    domanda: function (i, n) { return "Domanda " + i + " di " + n; },
    avanti: "Avanti", vedi: "Vedi il risultato", indietro: "Indietro",
    scegli: "Scegli una risposta per andare avanti.", scegliPiu: "Scegli almeno un'attività per andare avanti.",
    massimo: "Ne hai scelte tre. Per cambiarne una, togline prima un'altra.",
    q: {
      sector: { t: "In che settore lavora la tua impresa?", o: { manufacturing: "Produzione e manifattura", retail: "Commercio, negozio o e-commerce", professional_services: "Servizi professionali (studi, agenzie, consulenza)", hospitality: "Turismo, ristorazione ed eventi", construction: "Edilizia, impianti e installazioni", other: "Altro" } },
      team_size: { t: "Quante persone ci lavorano?", o: { "1_9": "1–9", "10_49": "10–49", "50_249": "50–249", "250_plus": "250 o più" } },
      areas: { t: "Quali di queste attività vi portano via più tempo?", h: "Scegline fino a tre.", o: { customer_requests: "Rispondere a email, telefonate e richieste dei clienti", quotes: "Preparare preventivi e offerte", documents: "Gestire ordini, fatture e documenti", knowledge: "Cercare informazioni in file, contratti e procedure", content: "Scrivere testi: schede prodotto, post, newsletter", reporting: "Mettere insieme i numeri per decidere (vendite, magazzino, costi)" } },
      hours: { t: "Quante ore a settimana finiscono in queste attività, in tutto?", h: "Somma le ore di tutte le persone coinvolte. Basta un'idea di massima.", o: { under_5: "Meno di 5", "5_15": "Da 5 a 15", "15_40": "Da 15 a 40", over_40: "Più di 40" } },
      repetition: { t: "Quanto si ripetono?", o: { high: "Quasi sempre uguali: stesse domande, stessi moduli", medium: "Simili, con qualche eccezione", low: "Ogni caso è diverso" } },
      data: { t: "Dove stanno le informazioni che servono?", o: { system: "In un gestionale, un CRM o il negozio online", spreadsheets: "In fogli Excel e cartelle condivise, abbastanza in ordine", scattered: "Sparse tra email, carta e la testa delle persone" } },
      ai_today: { t: "Usate già l'AI?", o: { in_processes: "Sì, in qualche attività di ogni giorno", personal: "Qualcuno usa ChatGPT o simili, per conto suo", none: "Non ancora" } },
      owner: { t: "Chi seguirebbe il progetto da parte vostra?", o: { owner: "Io: sono il titolare o decido io", manager: "Un responsabile interno, con un po' di tempo", nobody: "Oggi nessuno ha tempo per seguirlo" } }
    },
    risultato: "Il tuo risultato",
    profili: {
      ready: ["Puoi partire subito", "Hai attività che si ripetono, tempo vero in gioco e le basi per cominciare. È il caso tipico in cui in 4 settimane il primo strumento AI è in uso."],
      prepare_first: ["C'è molto da guadagnare, ma prima serve ordine", "Il tempo in gioco c'è. Prima di uno strumento AI probabilmente servirà sistemare qualcosa, qui sotto: è da lì che partiremmo."],
      not_now: ["Oggi l'AI ha poco da fare da voi", "Con poche ore in gioco, o attività tutte diverse tra loro, oggi uno strumento AI difficilmente si ripaga. Nel check-up guardiamo se c'è un punto dove invece conviene, o cosa fare prima."]
    },
    potenziale: "Potenziale dell'AI", prontezza: "Prontezza",
    fasce: { alta: "Alto", media: "Medio", bassa: "Basso" },
    fascePr: { alta: "Alta", media: "Media", bassa: "Da costruire" },
    ore: "Tempo che puoi recuperare",
    oreS: "ore a settimana",
    oreNota: function (da, a) { return "Cioè circa da " + da + " a " + a + " ore in un anno di lavoro. È una stima di massima sulle ore che ci hai indicato, non una promessa."; },
    partenza: "Da dove partiremmo",
    prima: "Cosa sistemare prima",
    gap: {
      data: "Raccogliere in un posto solo le informazioni che servono. Per cominciare basta anche un foglio condiviso tenuto bene.",
      owner: "Trovare una persona che segua il progetto da parte vostra: serve qualcuno che provi lo strumento nel lavoro vero e ci dica cosa non torna."
    },
    gapAi: "Non usate ancora l'AI: nessun problema. Si parte da un'attività sola e la proviamo con le tue persone.",
    ctaH: "Parliamone nel check-up",
    ctaP: "30 minuti, gratuiti, con uno dei fondatori. Guardiamo insieme questo risultato e ti diciamo da dove partiremmo, o se oggi non conviene.",
    ctaBtn: "Prenota il check-up AI",
    ctaNota: "Il riepilogo delle tue risposte entra nel messaggio: lo vedi e lo puoi cambiare prima di inviare.",
    ancora: "Rifai il wizard",
    att: {
      customer_requests: { t: "Richieste dei clienti", p: "Le domande che ricevi ogni giorno trovano una bozza di risposta già pronta, con le informazioni giuste. Tu controlli e invii." },
      quotes: { t: "Preventivi", p: "Dalla richiesta del cliente alla bozza di preventivo, con i tuoi listini e le tue condizioni." },
      documents: { t: "Ordini e documenti", p: "Ordini, fatture e documenti letti e registrati da soli: tu controlli solo le eccezioni." },
      knowledge: { t: "Procedure e archivio", p: "Fai una domanda, come la faresti a un collega, e trovi la risposta tra contratti, manuali e procedure." },
      content: { t: "Testi e schede prodotto", p: "Schede prodotto, post e newsletter in bozza, con il tuo tono: tu correggi e pubblichi." },
      reporting: { t: "I numeri della settimana", p: "Vendite, acquisti e magazzino in un riepilogo chiaro, ogni lunedì. Senza copiare e incollare." }
    },
    esempio: "Per esempio: ",
    es: {
      customer_requests: { retail: "disponibilità, spedizioni e resi", hospitality: "richieste di prenotazione e informazioni", professional_services: "le domande che i clienti fanno sempre", manufacturing: "stato degli ordini e domande tecniche", construction: "richieste di sopralluogo e di preventivo" },
      quotes: { manufacturing: "preventivi da disegni e capitolati", construction: "computi e preventivi dopo il sopralluogo", professional_services: "proposte dopo la prima call", hospitality: "offerte per gruppi ed eventi", retail: "offerte all'ingrosso e ai clienti business" },
      documents: { retail: "ordini, fatture e spedizioni", manufacturing: "DDT e fatture dei fornitori", construction: "pratiche di cantiere e fatture dei fornitori", hospitality: "prenotazioni e fatture dei fornitori", professional_services: "documenti dei clienti da archiviare e controllare" },
      knowledge: { manufacturing: "schede tecniche e procedure di qualità", professional_services: "pratiche passate e modelli", construction: "norme e capitolati", hospitality: "procedure interne per il personale", retail: "condizioni dei fornitori e informazioni sui prodotti" },
      content: { retail: "schede prodotto dai dati del fornitore", hospitality: "descrizioni, post e offerte di stagione", professional_services: "articoli e newsletter", manufacturing: "cataloghi e schede prodotto", construction: "presentazioni dei lavori e post" },
      reporting: { retail: "vendite e magazzino ogni lunedì", manufacturing: "produzione, ordini e margini", hospitality: "prenotazioni, occupazione e incassi", construction: "avanzamento dei cantieri e costi", professional_services: "ore, fatturato e incassi" }
    },
    riepilogo: function (r, c, L) {
      return "Ho fatto l'AI Wizard sul sito.\n" +
        "Settore: " + L("sector", r.sector) + " · Persone: " + L("team_size", r.team_size) + "\n" +
        "Attività che portano via tempo: " + r.areas.map(function (a) { return L("areas", a); }).join("; ") + "\n" +
        "Ore a settimana: " + L("hours", r.hours) + " · " + L("repetition", r.repetition) + "\n" +
        "Informazioni: " + L("data", r.data) + " · AI oggi: " + L("ai_today", r.ai_today) + " · Chi segue: " + L("owner", r.owner) + "\n" +
        "Risultato: potenziale " + c.potenziale + "/100, prontezza " + c.prontezza + "/100, " + c.oreDa + "–" + c.oreA + " ore a settimana da recuperare.";
    }
  };
  function L(q, v) { return T.q[q].o[v]; }
  var CHECKUP = isEn ? "/en/ai-check-up/" : "/check-up-ai/";

  /* ---- Stato: la domanda corrente e le risposte. */
  var passo = 0, risposte = {}, iniziato = false;
  function annuncia(fase, dati) {
    var d = { fase: fase };
    for (var k in dati) if (Object.prototype.hasOwnProperty.call(dati, k)) d[k] = dati[k];
    document.dispatchEvent(new CustomEvent("telaio:wizard", { detail: d }));
  }

  function el(tag, cls, testo) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (testo != null) n.textContent = testo;
    return n;
  }

  // dopo ogni cambio la scheda torna in vista, se il suo inizio è uscito dallo schermo (non al primo disegno)
  function inVista() {
    var r = box.getBoundingClientRect();
    if (r.top < 64 || r.top > window.innerHeight * 0.6) box.scrollIntoView({ block: "start", behavior: fermo ? "auto" : "smooth" });
  }

  // il titolo nuovo prende il fuoco: chi usa la tastiera o un lettore di schermo riparte da lì
  function mostra(nodo, primo) {
    box.textContent = "";
    box.appendChild(nodo);
    if (!fermo) { nodo.classList.add("wz-in"); }
    if (primo) return;
    var h = nodo.querySelector("[data-wz-focus]");
    if (h) h.focus({ preventScroll: true });
    inVista();
  }

  /* ---- Una domanda. */
  function domanda(primo) {
    var q = DOMANDE[passo], testi = T.q[q.id], piu = !!q.piu;
    var f = el("form", "wz-step");
    f.noValidate = true;

    var prog = el("div", "wz-prog");
    prog.appendChild(el("span", "wz-prog-t", T.domanda(passo + 1, DOMANDE.length)));
    var barra = el("i", "wz-prog-bar"), pieno = el("i");
    pieno.style.width = Math.round(passo / DOMANDE.length * 100) + "%";
    barra.appendChild(pieno);
    barra.setAttribute("aria-hidden", "true");
    prog.appendChild(barra);
    f.appendChild(prog);

    var fs = el("fieldset", "wz-fs"), id = "wz-q-" + q.id;
    fs.setAttribute("aria-labelledby", id + (testi.h ? " " + id + "-h" : ""));
    var titolo = el("h2", "wz-q", testi.t);
    titolo.id = id;
    titolo.tabIndex = -1;
    titolo.setAttribute("data-wz-focus", "");
    fs.appendChild(titolo);
    if (testi.h) { var aiuto = el("p", "wz-help", testi.h); aiuto.id = id + "-h"; fs.appendChild(aiuto); }

    var lista = el("div", "wz-opts" + (q.opzioni.length > 4 && !piu ? " is-two" : "") + (piu ? " is-many" : ""));
    var scelti = piu ? (risposte[q.id] || []) : null;
    q.opzioni.forEach(function (v) {
      var lab = el("label", "wz-opt"), inp = document.createElement("input");
      inp.type = piu ? "checkbox" : "radio";
      inp.name = q.id;
      inp.value = v;
      inp.checked = piu ? scelti.indexOf(v) >= 0 : risposte[q.id] === v;
      lab.appendChild(inp);
      lab.appendChild(el("span", "wz-opt-t", testi.o[v]));
      lista.appendChild(lab);
    });
    fs.appendChild(lista);
    f.appendChild(fs);

    var stato = el("p", "wz-status");
    stato.setAttribute("role", "status");
    stato.setAttribute("aria-live", "polite");
    f.appendChild(stato);

    var nav = el("div", "wz-nav");
    if (passo > 0) {
      var indietro = el("button", "wz-back", "← " + T.indietro);
      indietro.type = "button";
      indietro.addEventListener("click", function () { leggi(); passo--; domanda(); });
      nav.appendChild(indietro);
    }
    var ultimo = passo === DOMANDE.length - 1;
    var avanti = el("button", "btn btn-primary wz-next");
    avanti.type = "submit";
    avanti.appendChild(document.createTextNode((ultimo ? T.vedi : T.avanti) + " "));
    var freccia = el("span", "p-arr", "→");
    freccia.setAttribute("aria-hidden", "true");
    avanti.appendChild(freccia);
    nav.appendChild(avanti);
    f.appendChild(nav);

    function leggi() {
      if (piu) {
        risposte[q.id] = [].slice.call(f.querySelectorAll("input:checked")).map(function (i) { return i.value; });
      } else {
        var s = f.querySelector("input:checked");
        if (s) risposte[q.id] = s.value;
      }
    }
    function risposto() { return piu ? (risposte[q.id] || []).length > 0 : !!risposte[q.id]; }

    // al massimo tre attività: le altre si spengono finché non se ne toglie una
    function limita() {
      if (!piu) return;
      var n = f.querySelectorAll("input:checked").length;
      [].forEach.call(f.querySelectorAll("input"), function (i) {
        var spento = n >= q.piu && !i.checked;
        i.disabled = spento;
        i.parentNode.classList.toggle("is-off", spento);
      });
      stato.textContent = n >= q.piu ? T.massimo : "";
    }
    limita();

    f.addEventListener("change", function () {
      leggi();
      stato.textContent = "";
      limita();
      if (!iniziato && risposto()) { iniziato = true; annuncia("iniziato", {}); }
    });
    // una risposta sola scelta col mouse o col dito: si passa subito alla domanda dopo (anche toccando la
    // risposta già scelta, tornando indietro). Con la tastiera no: le frecce e lo spazio cambiano la scelta,
    // e si va avanti con Invio o col pulsante. Vale solo il tocco sulla risposta stessa: uno su «Avanti»
    // o «Indietro» non deve far avanzare la scelta fatta dopo con la tastiera
    if (!piu) {
      var tocco = null;
      f.addEventListener("pointerdown", function (ev) { tocco = ev.target && ev.target.closest ? ev.target.closest(".wz-opt") : null; });
      f.addEventListener("keydown", function () { tocco = null; });
      f.addEventListener("click", function (ev) {
        if (!ev.target || ev.target.tagName !== "INPUT" || !tocco || !tocco.contains(ev.target)) return;
        tocco = null;
        setTimeout(function () { if (f.isConnected) avanza(); }, fermo ? 0 : 220);
      });
    }

    function avanza() {
      leggi();
      if (!risposto()) { stato.textContent = piu ? T.scegliPiu : T.scegli; return; }
      if (ultimo) { risultato(); return; }
      passo++;
      domanda();
    }
    f.addEventListener("submit", function (ev) { ev.preventDefault(); avanza(); });

    mostra(f, primo);
  }

  /* ---- Il risultato. */
  function metro(nome, valore, fasciaTesto) {
    var d = el("div", "wz-score");
    d.appendChild(el("p", "wz-score-l", nome));
    var v = el("p", "wz-score-v");
    v.appendChild(el("b", null, String(valore)));
    v.appendChild(el("span", null, " / 100"));
    d.appendChild(v);
    d.appendChild(el("p", "wz-score-b", fasciaTesto));
    var barra = el("i", "wz-bar"), pieno = el("i");
    barra.setAttribute("aria-hidden", "true");
    pieno.style.width = valore + "%";
    barra.appendChild(pieno);
    d.appendChild(barra);
    return d;
  }

  function risultato() {
    var r = risposte, c = calcola(r);
    var out = el("div", "wz-result");

    out.appendChild(el("p", "wz-kicker", T.risultato));
    var h = el("h2", "wz-verdict", T.profili[c.profilo][0]);
    h.tabIndex = -1;
    h.setAttribute("data-wz-focus", "");
    out.appendChild(h);
    out.appendChild(el("p", "wz-verdict-p", T.profili[c.profilo][1]));

    var punti = el("div", "wz-scores");
    punti.appendChild(metro(T.potenziale, c.potenziale, T.fasce[fascia(c.potenziale, 65, SOGLIA_POTENZIALE)]));
    punti.appendChild(metro(T.prontezza, c.prontezza, T.fascePr[fascia(c.prontezza, 70, 50)]));
    var ore = el("div", "wz-score is-hours");
    ore.appendChild(el("p", "wz-score-l", T.ore));
    var ov = el("p", "wz-score-v");
    ov.appendChild(el("b", null, c.oreDa + "–" + c.oreA));
    ov.appendChild(el("span", null, " " + T.oreS));
    ore.appendChild(ov);
    ore.appendChild(el("p", "wz-score-n", T.oreNota(decina(c.oreDa * SETTIMANE_ANNO), decina(c.oreA * SETTIMANE_ANNO))));
    punti.appendChild(ore);
    out.appendChild(punti);

    var parti = el("div", "wz-block");
    parti.appendChild(el("h3", "wz-h3", T.partenza));
    var ol = el("ol", "wz-opps");
    r.areas.forEach(function (a) {
      var li = el("li"), att = T.att[a], es = T.es[a][r.sector];
      li.appendChild(el("h4", null, att.t));
      li.appendChild(el("p", null, att.p));
      if (es) li.appendChild(el("p", "wz-ex", T.esempio + es + "."));
      ol.appendChild(li);
    });
    parti.appendChild(ol);
    out.appendChild(parti);

    var cose = c.blocchi.map(function (b) { return T.gap[b]; });
    if (r.ai_today === "none" && c.profilo !== "not_now") cose.push(T.gapAi);
    if (cose.length) {
      var prima = el("div", "wz-block");
      prima.appendChild(el("h3", "wz-h3", T.prima));
      var ul = el("ul", "ticks");
      cose.forEach(function (t) { ul.appendChild(el("li", null, t)); });
      prima.appendChild(ul);
      out.appendChild(prima);
    }

    // l'invito: il pulsante apre il modulo del check-up (script.js) col riepilogo già scritto nel messaggio
    var cta = el("div", "wz-cta");
    cta.appendChild(el("h3", "wz-cta-h", T.ctaH));
    cta.appendChild(el("p", "wz-cta-p", T.ctaP));
    var btn = el("a", "btn btn-primary p-btn-xl p-btn-inv");
    btn.href = CHECKUP;
    btn.setAttribute("data-cta", "checkup");
    btn.setAttribute("data-placement", "wizard_result");
    btn.setAttribute("data-messaggio", T.riepilogo(r, c, L));
    btn.appendChild(document.createTextNode(T.ctaBtn + " "));
    var fr = el("span", "p-arr", "→");
    fr.setAttribute("aria-hidden", "true");
    btn.appendChild(fr);
    cta.appendChild(btn);
    cta.appendChild(el("p", "wz-cta-n", T.ctaNota));
    out.appendChild(cta);

    var ancora = el("button", "wz-again", "↺ " + T.ancora);
    ancora.type = "button";
    ancora.addEventListener("click", function () { passo = 0; risposte = {}; iniziato = false; domanda(); });
    out.appendChild(ancora);

    mostra(out);
    annuncia("finito", {
      profile: c.profilo, potential: c.potenziale, readiness: c.prontezza,
      sector: r.sector, team_size: r.team_size, hours: r.hours, areas: r.areas.slice().sort().join(",")
    });
  }

  // per le prove nel browser (verifica_wizard.mjs): il calcolo senza passare dalle domande
  window.__telaioWizard = { calcola: calcola, domande: DOMANDE };

  // il paragrafo per chi non ha JavaScript (dentro [data-wizard]) lascia il posto alla prima domanda
  domanda(true);
})();
