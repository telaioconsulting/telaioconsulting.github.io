/* ============================================================
   TELAIO — Autovalutazione AI: otto domande sull'impresa, il risultato subito, poi l'invito al check-up.
   Si parte dal nome dell'azienda e dall'email, poi le domande. Quando appare il risultato, azienda,
   email, risposte e punteggi vanno allo script Google del modulo del check-up (TELAIO_MODULO_URL di
   script.js, pulsante «assessment_result»): una riga nel foglio «Richieste» e, se in 30 minuti non arriva
   «Contattami», l'email «Senza Contattami» a info@. In fondo al risultato «Contattami» manda di nuovo tutto,
   col telefono se c'è e il valore del tempo scelto (pulsante «assessment_contact»): una riga e subito
   l'email «Contattami» a info@, la richiesta di essere ricontattati, la conversione del sito. Un'email sola
   per azienda, con due segnali distinti (Dan, 30 ottobre 2026); l'attesa la fa lo script Google.
   Sotto i punteggi, «Quanto vale questo tempo?»: le ore all'anno per il costo orario che la persona sceglie.
   misura.js conta l'inizio e la fine (evento «telaio:autovalutazione»), solo con il consenso alle statistiche
   e mai con i dati della persona: solo i codici delle risposte e i due punteggi.
   Il calcolo e le sue ipotesi sono scritti nella pagina, «Come calcoliamo il risultato»: chi cambia
   un numero qui cambia anche quella sezione, in italiano e in inglese.
   Vanilla JS, nessuna libreria/build. Parte solo dove la pagina ha [data-autovalutazione].
   ============================================================ */
(function () {
  "use strict";
  var box = document.querySelector("[data-autovalutazione]");
  if (!box) return;
  var root = document.documentElement;
  var isEn = (root.lang || "it").toLowerCase().indexOf("en") === 0;
  var fermo = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Le domande. I codici sono quelli del piano di tracciamento (assessment_completed): non cambiarli
     senza cambiare anche company/event-tracking/tracking-plan.json nel repository telaio. */
  var DOMANDE = [
    { id: "sector", altro: "other", opzioni: ["manufacturing", "retail", "professional_services", "hospitality", "construction", "other"] },
    { id: "team_size", corte: true, opzioni: ["1", "2_3", "4_8", "9_15", "16_50", "51_100", "over_100"] },
    { id: "areas", piu: 3, opzioni: ["customer_requests", "quotes", "documents", "knowledge", "content", "reporting"] },
    { id: "hours", opzioni: ["under_5", "5_15", "15_40", "over_40"] },
    { id: "repetition", opzioni: ["high", "medium", "low"] },
    { id: "data", opzioni: ["system", "spreadsheets", "scattered"] },
    { id: "ai_today", opzioni: ["in_processes", "personal", "none"] },
    { id: "owner", opzioni: ["owner", "manager", "nobody"] }
  ];

  /* ---- Il calcolo (spiegato nella pagina).
     Potenziale, fino a 100: ore in gioco (fino a 50) + quanto si ripetono le attività (fino a 30) + quante
     attività hai scelto (fino a 20). Prontezza, fino a 100: dove stanno le informazioni (fino a 40) + l'AI
     che usate già (fino a 30) + chi segue il progetto (fino a 30).
     La scala parte alta di proposito (Dan, 30 ottobre 2026): ogni piccola impresa ha un'attività da cui
     partire, i punteggi dicono quanto c'è da guadagnare e quanto si è pronti, il minimo è circa 50.
     Ore da recuperare: il valore più alto della fascia scelta per la quota che l'AI può togliere (in percento
     intero, così il conto è esatto); le quote e gli arrotondamenti per eccesso sono di Dan (30 ottobre 2026: «vai
     sempre verso il maggior risparmio»), il valore più alto anche (la sera stessa: «stringere il range delle ore
     che si risparmiano mantenendo il limite superiore»: sull'intera fascia andava per esempio da 3 a 11 ore). */
  var ORE = { under_5: { max: 5, punti: 25 }, "5_15": { max: 15, punti: 35 }, "15_40": { max: 40, punti: 45 }, over_40: { max: 60, punti: 50 } };
  var RIPETIZIONE = { high: { da: 60, a: 80, punti: 30 }, medium: { da: 50, a: 70, punti: 22 }, low: { da: 15, a: 30, punti: 15 } };
  var PUNTI_ATTIVITA = [0, 14, 17, 20];   // per 0, 1, 2, 3 attività scelte
  var DATI = { system: 40, spreadsheets: 30, scattered: 20 };
  var AI_OGGI = { in_processes: 30, personal: 24, none: 18 };
  var CHI = { owner: 30, manager: 22, nobody: 12 };
  var SETTIMANE_ANNO = 46;                // settimane di lavoro in un anno, per la cifra annua
  var SOGLIA_PICCOLO = 65;                // potenziale sotto: «Si parte in piccolo»
  var FASCE = { molto_alto: 85, alto: 70 }; // da 85 molto alto, da 70 alto, sotto medio-alto
  /* Quanto vale questo tempo (Dan, 30 ottobre 2026): le ore all'anno del risultato per il costo di un'ora,
     scelto tra tre cifre indicative o scritto a mano. Per eccesso, come le ore: l'anno alle centinaia di
     euro, il mese (un dodicesimo dell'anno) alle decine. È il valore del tempo, non un risparmio promesso. */
  var COSTI = [20, 35, 60];               // €/ora: lavoro operativo, impiegato qualificato, titolare o professionista
  var COSTO_BASE = 35;                    // quello scelto quando appare il risultato
  var COSTO_MIN = 5, COSTO_MAX = 500;     // la cifra scritta a mano, in euro interi

  function calcola(r) {
    var ore = ORE[r.hours], rip = RIPETIZIONE[r.repetition], n = Math.min(r.areas.length, 3);
    var potenziale = ore.punti + rip.punti + PUNTI_ATTIVITA[n];
    var prontezza = DATI[r.data] + AI_OGGI[r.ai_today] + CHI[r.owner];
    var da = Math.max(1, Math.ceil(ore.max * rip.da / 100));
    var a = Math.max(da + 1, Math.ceil(ore.max * rip.a / 100));
    // senza un posto per le informazioni o qualcuno che segua il progetto si parte da lì, qualunque sia il punteggio
    var blocchi = [];
    if (r.data === "scattered") blocchi.push("data");
    if (r.owner === "nobody") blocchi.push("owner");
    var profilo = blocchi.length ? "prepare_first" : potenziale < SOGLIA_PICCOLO ? "start_small" : "ready";
    return { potenziale: potenziale, prontezza: prontezza, oreDa: da, oreA: a, profilo: profilo, blocchi: blocchi };
  }
  function decina(n) { return Math.max(10, Math.ceil(n / 10) * 10); }   // le ore di un anno: una cifra tonda, per eccesso
  function valore(oreAnnoDa, oreAnnoA, costo) {
    var annoDa = Math.ceil(oreAnnoDa * costo / 100) * 100, annoA = Math.ceil(oreAnnoA * costo / 100) * 100;
    return { annoDa: annoDa, annoA: annoA, meseDa: Math.ceil(annoDa / 120) * 10, meseA: Math.ceil(annoA / 120) * 10 };
  }
  // 13000 → «13.000» (in inglese «13,000»): a mano, uguale in ogni browser
  function cifra(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, isEn ? "," : "."); }
  function fascia(v) { return v >= FASCE.molto_alto ? "molto_alto" : v >= FASCE.alto ? "alto" : "medio_alto"; }

  /* ---- I testi. */
  var T = isEn ? {
    domanda: function (i, n) { return "Question " + i + " of " + n; },
    inizio: {
      kicker: "Before we start", titolo: "Let’s start with your business",
      azienda: "Company name", email: "Email", via: "Start",
      nota: "When you see the result, your company name, email and answers reach us too, so we can get back to you about this result.",
      privacy: "Read our privacy notice.", privacyHref: "/en/privacy/",
      noAzienda: "Write your company name.", noEmail: "Write a valid email, for example name@company.com."
    },
    avanti: "Next", vedi: "See my result", indietro: "Back",
    scegli: "Choose an answer to go on.", scegliPiu: "Choose at least one activity to go on.",
    scegliAltro: "Tell us in a few words what your business does.",
    massimo: "You’ve chosen three. To change one, untick another first.",
    q: {
      sector: { t: "What sector is your business in?", altro: "What does your business do?", altroEs: "For example: we make made-to-measure furniture", o: { manufacturing: "Manufacturing and production", retail: "Retail, shop or e-commerce", professional_services: "Professional services (firms, agencies, consulting)", hospitality: "Tourism, food and events", construction: "Construction, installation, building services", other: "Something else" } },
      team_size: { t: "How many people work there?", o: { "1": "Just me", "2_3": "2–3", "4_8": "4–8", "9_15": "9–15", "16_50": "16–50", "51_100": "51–100", over_100: "More than 100" } },
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
      prepare_first: ["You can start: we’ll lay the groundwork together", "The time at stake is there. To start well, we prepare what you’ll find below together: it’s the first step of the work."],
      start_small: ["Start small", "Few hours are at stake, or the activities change often. It’s best to start from a single activity, the most repetitive one: it’s the quickest way to see that it works."]
    },
    potenziale: "AI potential", prontezza: "Readiness",
    fasce: { molto_alto: "Very high", alto: "High", medio_alto: "Medium-high" },
    fascePr: { molto_alto: "Very high", alto: "High", medio_alto: "Medium-high" },
    spiega: {
      potenziale: { molto_alto: "Many hours on activities that repeat: ideal ground for AI.", alto: "Real hours on repetitive activities: AI can take a good share of them off.", medio_alto: "Fewer hours at stake, or varied activities: we start from one, the most repetitive." },
      prontezza: { molto_alto: "Information in order and someone to follow it: you can start right away.", alto: "The basics are there: the details get sorted in the first weeks.", medio_alto: "There’s a base to prepare together before starting: you’ll find it below." }
    },
    come: "How we work out the scores", comeHref: "#how-we-calculate",
    ore: "Time you could win back",
    oreS: "hours a week",
    oreNota: function (da, a) { return "That’s about " + da + " to " + a + " hours over a working year. A rough estimate on the hours you gave us, not a promise."; },
    valore: {
      h: "What is this time worth?",
      p: "Choose what an hour of the people doing these activities costs the business today, all-in. The figures are indicative: pick the closest or write your own.",
      ora: function (v) { return "€" + v + "/h"; },
      fasce: { 20: "operational work", 35: "skilled employee", 60: "owner or professional" },
      altra: "Another figure", altraL: "Cost of an hour, in euros", altraR: "my own figure",
      fuori: "Write an hourly cost between €5 and €500.",
      soldi: function (da, a) { return "€" + cifra(da) + "–" + cifra(a); },
      mese: "a month",
      nota: function (da, a) { return "That’s €" + cifra(da) + " to €" + cifra(a) + " over a working year. It’s the value of the time freed up, not a guaranteed saving."; },
      riga: function (costo, chi, v) { return "\nValue of the time: €" + costo + "/h (" + chi + "), €" + cifra(v.meseDa) + "–" + cifra(v.meseA) + " a month, €" + cifra(v.annoDa) + "–" + cifra(v.annoA) + " a year."; }
    },
    partenza: "Where we would start",
    prima: "To prepare together",
    gap: {
      data: "Put the information you need in one place: a well-kept shared spreadsheet is enough to begin with, and we help you set it up.",
      owner: "Choose one person to follow the project on your side: someone who tries the tool in real work and tells us what doesn’t fit."
    },
    gapAi: "Not using AI yet? No problem: we start from a single activity and try it with your people.",
    ctaH: "Want to talk it through?",
    ctaP: "We get back to you within 48 hours for the free 30-minute check-up with one of the founders: we go through this result together and tell you where we would start.",
    ctaTel: "Phone", facoltativo: "optional",
    ctaBtn: "Contact me", invio: "Sending…",
    ctaNota: function (e) { return "We’ll write to " + e + "."; },
    grazie: function (e) { return ["Thank you.", "We’ll get back to you within 48 hours at " + e + "."]; },
    errore: "The request could not be sent. Please try again in a moment, or write to us at ",
    richiesta: "Request: please contact me for the free check-up.\n",
    ancora: "Start the self-assessment again",
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
      return "I took the AI self-assessment on the site.\n" +
        "Sector: " + settore(r) + " · People: " + L("team_size", r.team_size) + "\n" +
        "Activities that take time: " + r.areas.map(function (a) { return L("areas", a); }).join("; ") + "\n" +
        "Hours a week: " + L("hours", r.hours) + " · " + L("repetition", r.repetition) + "\n" +
        "Information: " + L("data", r.data) + " · AI today: " + L("ai_today", r.ai_today) + " · Who follows it: " + L("owner", r.owner) + "\n" +
        "Result: potential " + c.potenziale + "/100, readiness " + c.prontezza + "/100, " + c.oreDa + "–" + c.oreA + " hours a week to win back.";
    }
  } : {
    domanda: function (i, n) { return "Domanda " + i + " di " + n; },
    inizio: {
      kicker: "Prima di cominciare", titolo: "Iniziamo dalla tua impresa",
      azienda: "Nome dell'azienda", email: "Email", via: "Inizia",
      nota: "Quando vedi il risultato, il nome dell'azienda, l'email e le risposte arrivano anche a noi, per poterti ricontattare su questo risultato.",
      privacy: "Leggi l'informativa privacy.", privacyHref: "/privacy/",
      noAzienda: "Scrivi il nome dell'azienda.", noEmail: "Scrivi un'email valida, per esempio nome@azienda.it."
    },
    avanti: "Avanti", vedi: "Vedi il risultato", indietro: "Indietro",
    scegli: "Scegli una risposta per andare avanti.", scegliPiu: "Scegli almeno un'attività per andare avanti.",
    scegliAltro: "Scrivi in poche parole di cosa si occupa la tua impresa.",
    massimo: "Ne hai scelte tre. Per cambiarne una, togline prima un'altra.",
    q: {
      sector: { t: "In che settore lavora la tua impresa?", altro: "Di cosa si occupa la tua impresa?", altroEs: "Per esempio: produciamo mobili su misura", o: { manufacturing: "Produzione e manifattura", retail: "Commercio, negozio o e-commerce", professional_services: "Servizi professionali (studi, agenzie, consulenza)", hospitality: "Turismo, ristorazione ed eventi", construction: "Edilizia, impianti e installazioni", other: "Altro" } },
      team_size: { t: "Quante persone ci lavorano?", o: { "1": "Solo io", "2_3": "2–3", "4_8": "4–8", "9_15": "9–15", "16_50": "16–50", "51_100": "51–100", over_100: "Più di 100" } },
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
      prepare_first: ["Puoi partire: prepariamo insieme la base", "Il tempo in gioco c'è. Per partire bene prepariamo insieme quello che trovi qui sotto: è il primo passo del lavoro."],
      start_small: ["Si parte in piccolo", "Le ore in gioco sono poche, o le attività cambiano spesso. Conviene partire da un'attività sola, la più ripetitiva: è il modo più rapido per vedere che funziona."]
    },
    potenziale: "Potenziale dell'AI", prontezza: "Prontezza",
    fasce: { molto_alto: "Molto alto", alto: "Alto", medio_alto: "Medio-alto" },
    fascePr: { molto_alto: "Molto alta", alto: "Alta", medio_alto: "Medio-alta" },
    spiega: {
      potenziale: { molto_alto: "Tante ore su attività che si ripetono: è il terreno ideale per l'AI.", alto: "Ci sono ore vere su attività ripetitive: l'AI può toglierne una buona parte.", medio_alto: "Le ore in gioco sono meno, o le attività variano: si parte da una sola, la più ripetitiva." },
      prontezza: { molto_alto: "Informazioni in ordine e qualcuno che segue: si può partire subito.", alto: "Le basi ci sono: i dettagli si sistemano nelle prime settimane.", medio_alto: "C'è una base da preparare insieme prima di partire: la trovi qui sotto." }
    },
    come: "Come calcoliamo i punteggi", comeHref: "#come-calcoliamo",
    ore: "Tempo che puoi recuperare",
    oreS: "ore a settimana",
    oreNota: function (da, a) { return "Cioè circa da " + da + " a " + a + " ore in un anno di lavoro. È una stima di massima sulle ore che ci hai indicato, non una promessa."; },
    valore: {
      h: "Quanto vale questo tempo?",
      p: "Scegli quanto costa all'impresa un'ora di chi fa oggi queste attività, contributi compresi. Sono cifre indicative: scegli la più vicina o scrivi la tua.",
      ora: function (v) { return v + " €/ora"; },
      fasce: { 20: "lavoro operativo", 35: "impiegato qualificato", 60: "titolare o professionista" },
      altra: "Un'altra cifra", altraL: "Costo di un'ora, in euro", altraR: "cifra scritta da me",
      fuori: "Scrivi un costo orario tra 5 e 500 €.",
      soldi: function (da, a) { return cifra(da) + "–" + cifra(a) + " €"; },
      mese: "al mese",
      nota: function (da, a) { return "Cioè da " + cifra(da) + " a " + cifra(a) + " € in un anno di lavoro. È il valore del tempo che tornerebbe libero, non un risparmio garantito."; },
      riga: function (costo, chi, v) { return "\nValore del tempo: " + costo + " €/ora (" + chi + "), " + cifra(v.meseDa) + "–" + cifra(v.meseA) + " € al mese, " + cifra(v.annoDa) + "–" + cifra(v.annoA) + " € in un anno."; }
    },
    partenza: "Da dove partiremmo",
    prima: "Da preparare insieme",
    gap: {
      data: "Mettere in un posto solo le informazioni che servono: per cominciare basta un foglio condiviso tenuto bene, e ti aiutiamo noi a impostarlo.",
      owner: "Scegliere una persona che segua il progetto da parte vostra: qualcuno che provi lo strumento nel lavoro vero e ci dica cosa non torna."
    },
    gapAi: "Non usate ancora l'AI? Nessun problema: si parte da un'attività sola e la proviamo con le tue persone.",
    ctaH: "Vuoi parlarne con noi?",
    ctaP: "Ti ricontattiamo entro 48 ore per il check-up gratuito di 30 minuti con uno dei fondatori: guardiamo insieme questo risultato e ti diciamo da dove partiremmo.",
    ctaTel: "Telefono", facoltativo: "facoltativo",
    ctaBtn: "Contattami", invio: "Invio in corso…",
    ctaNota: function (e) { return "Ti scriviamo a " + e + "."; },
    grazie: function (e) { return ["Grazie.", "Ti ricontattiamo entro 48 ore a " + e + "."]; },
    errore: "La richiesta non è partita. Riprova tra poco, oppure scrivici a ",
    richiesta: "Richiesta: contattatemi per il check-up gratuito.\n",
    ancora: "Rifai l'autovalutazione",
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
      return "Ho fatto l'autovalutazione AI sul sito.\n" +
        "Settore: " + settore(r) + " · Persone: " + L("team_size", r.team_size) + "\n" +
        "Attività che portano via tempo: " + r.areas.map(function (a) { return L("areas", a); }).join("; ") + "\n" +
        "Ore a settimana: " + L("hours", r.hours) + " · " + L("repetition", r.repetition) + "\n" +
        "Informazioni: " + L("data", r.data) + " · AI oggi: " + L("ai_today", r.ai_today) + " · Chi segue: " + L("owner", r.owner) + "\n" +
        "Risultato: potenziale " + c.potenziale + "/100, prontezza " + c.prontezza + "/100, " + c.oreDa + "–" + c.oreA + " ore a settimana da recuperare.";
    }
  };
  function L(q, v) { return T.q[q].o[v]; }
  // «Altro»: nel riepilogo per il check-up va quello che la persona ha scritto (mai negli eventi)
  function settore(r) { return r.sector === "other" && r.sector_other ? r.sector_other : L("sector", r.sector); }
  var EMAIL = "info@telaioconsulting.com";
  var EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]+$/;   // la stessa regola dello script Google

  /* ---- Stato: la domanda corrente e le risposte. */
  var passo = 0, risposte = {}, contatto = null;
  function annuncia(fase, dati) {
    var d = { fase: fase };
    for (var k in dati) if (Object.prototype.hasOwnProperty.call(dati, k)) d[k] = dati[k];
    document.dispatchEvent(new CustomEvent("telaio:autovalutazione", { detail: d }));
  }

  /* ---- L'invio allo script Google del modulo (lo stesso del check-up): azienda nel campo «nome»,
     il riepilogo nel messaggio, «pulsante» dice se è il risultato o «Contattami». Risponde {ok: true}. */
  function invia(pulsante, messaggio, telefono) {
    var url = window.TELAIO_MODULO_URL;
    if (!url || !window.fetch || !window.URLSearchParams) return Promise.reject(new Error("senza modulo"));
    var dati = new URLSearchParams();
    dati.set("nome", contatto.azienda);
    dati.set("email", contatto.email);
    dati.set("telefono", telefono || "");
    dati.set("messaggio", messaggio);
    dati.set("lingua", isEn ? "en" : "it");
    dati.set("pagina", location.pathname);
    dati.set("pulsante", pulsante);
    if (contatto.trappola) dati.set("sito_web", contatto.trappola);   // lo script risponde sì e non tiene niente
    var ctrl = window.AbortController ? new AbortController() : null;
    var attesa = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
    return fetch(url, { method: "POST", body: dati, credentials: "omit", signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { return r.json(); })
      .then(function (res) { clearTimeout(attesa); if (!res || !res.ok) throw new Error((res && res.errore) || "risposta"); return res; },
            function (e) { clearTimeout(attesa); throw e; });
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
    if (!fermo) { nodo.classList.add("av-in"); }
    if (primo) return;
    var h = nodo.querySelector("[data-av-focus]");
    if (h) h.focus({ preventScroll: true });
    inVista();
  }

  /* ---- Prima di cominciare: nome dell'azienda ed email. */
  function campo(id, nome, etichetta, tipo, extra) {
    var c = el("div", "ck-field"), l = el("label", null, etichetta), i = document.createElement("input");
    l.htmlFor = id;
    i.id = id; i.name = nome; i.type = tipo;
    for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) i[k] = extra[k];
    c.appendChild(l); c.appendChild(i);
    return c;
  }
  function inizio(primo) {
    var t = T.inizio, f = el("form", "av-step av-start");
    f.noValidate = true;
    var prog = el("div", "av-prog");
    prog.appendChild(el("span", "av-prog-t", t.kicker));
    f.appendChild(prog);
    var h = el("h2", "av-q", t.titolo);
    h.id = "av-q-start"; h.tabIndex = -1; h.setAttribute("data-av-focus", "");
    f.appendChild(h);
    var campi = el("div", "av-fields");
    campi.appendChild(campo("av-azienda", "azienda", t.azienda, "text", { autocomplete: "organization", maxLength: 100, required: true, value: contatto ? contatto.azienda : "" }));
    campi.appendChild(campo("av-email", "email", t.email, "email", { autocomplete: "email", maxLength: 200, required: true, spellcheck: false, value: contatto ? contatto.email : "" }));
    f.appendChild(campi);
    // campo trappola: invisibile alle persone, lo riempiono solo i programmi che mandano spam (come nel modulo del check-up)
    var hp = el("div", "ck-hp");
    hp.setAttribute("aria-hidden", "true");
    var hpl = el("label", null, "Lascia vuoto "), hpi = document.createElement("input");
    hpi.name = "sito_web"; hpi.type = "text"; hpi.tabIndex = -1; hpi.autocomplete = "off";
    hpl.appendChild(hpi); hp.appendChild(hpl); f.appendChild(hp);
    var nota = el("p", "av-note", t.nota + " ");
    var pl = el("a", null, t.privacy);
    pl.href = t.privacyHref; pl.target = "_blank"; pl.rel = "noopener";
    nota.appendChild(pl);
    f.appendChild(nota);
    var stato = el("p", "av-status");
    stato.setAttribute("role", "status"); stato.setAttribute("aria-live", "polite");
    f.appendChild(stato);
    var nav = el("div", "av-nav"), via = el("button", "btn btn-primary av-next");
    via.type = "submit";
    via.appendChild(document.createTextNode(t.via + " "));
    var fr = el("span", "p-arr", "→"); fr.setAttribute("aria-hidden", "true"); via.appendChild(fr);
    nav.appendChild(via); f.appendChild(nav);
    f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var a = f.elements.azienda, e = f.elements.email, az = a.value.trim(), em = e.value.trim();
      if (az.length < 2) { stato.textContent = t.noAzienda; a.focus(); return; }
      if (!EMAIL_RE.test(em)) { stato.textContent = t.noEmail; e.focus(); return; }
      var nuovo = !contatto;
      contatto = { azienda: az, email: em, trappola: hpi.value };
      if (nuovo) annuncia("iniziato", {});
      passo = 0;
      domanda();
    });
    mostra(f, primo);
  }

  /* ---- Una domanda. */
  function domanda(primo) {
    var q = DOMANDE[passo], testi = T.q[q.id], piu = !!q.piu;
    var f = el("form", "av-step");
    f.noValidate = true;

    var prog = el("div", "av-prog");
    prog.appendChild(el("span", "av-prog-t", T.domanda(passo + 1, DOMANDE.length)));
    var barra = el("i", "av-prog-bar"), pieno = el("i");
    pieno.style.width = Math.round(passo / DOMANDE.length * 100) + "%";
    barra.appendChild(pieno);
    barra.setAttribute("aria-hidden", "true");
    prog.appendChild(barra);
    f.appendChild(prog);

    var fs = el("fieldset", "av-fs"), id = "av-q-" + q.id;
    fs.setAttribute("aria-labelledby", id + (testi.h ? " " + id + "-h" : ""));
    var titolo = el("h2", "av-q", testi.t);
    titolo.id = id;
    titolo.tabIndex = -1;
    titolo.setAttribute("data-av-focus", "");
    fs.appendChild(titolo);
    if (testi.h) { var aiuto = el("p", "av-help", testi.h); aiuto.id = id + "-h"; fs.appendChild(aiuto); }

    var lista = el("div", "av-opts" + (q.corte ? " is-short" : q.opzioni.length > 4 && !piu ? " is-two" : "") + (piu ? " is-many" : ""));
    var scelti = piu ? (risposte[q.id] || []) : null;
    q.opzioni.forEach(function (v) {
      var lab = el("label", "av-opt"), inp = document.createElement("input");
      inp.type = piu ? "checkbox" : "radio";
      inp.name = q.id;
      inp.value = v;
      inp.checked = piu ? scelti.indexOf(v) >= 0 : risposte[q.id] === v;
      lab.appendChild(inp);
      lab.appendChild(el("span", "av-opt-t", testi.o[v]));
      lista.appendChild(lab);
    });
    fs.appendChild(lista);

    // «Altro»: un campo per dire di cosa si occupa l'impresa, solo quando è scelto
    var altro = null, campo = null;
    if (q.altro) {
      campo = el("div", "ck-field av-altro");
      var etichetta = el("label", null, testi.altro);
      etichetta.htmlFor = "av-altro";
      altro = document.createElement("input");
      altro.type = "text"; altro.id = "av-altro"; altro.name = q.id + "_other";
      altro.maxLength = 80; altro.autocomplete = "off"; altro.placeholder = testi.altroEs;
      altro.value = risposte[q.id + "_other"] || "";
      campo.appendChild(etichetta);
      campo.appendChild(altro);
      campo.hidden = risposte[q.id] !== q.altro;
      fs.appendChild(campo);
    }
    f.appendChild(fs);

    var stato = el("p", "av-status");
    stato.setAttribute("role", "status");
    stato.setAttribute("aria-live", "polite");
    f.appendChild(stato);

    var nav = el("div", "av-nav");
    var indietro = el("button", "av-back", "← " + T.indietro);
    indietro.type = "button";
    indietro.addEventListener("click", function () { leggi(); if (passo > 0) { passo--; domanda(); } else inizio(); });
    nav.appendChild(indietro);
    var ultimo = passo === DOMANDE.length - 1;
    var avanti = el("button", "btn btn-primary av-next");
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
      if (altro) risposte[q.id + "_other"] = altro.value.trim();
    }
    function conAltro() { return !!altro && risposte[q.id] === q.altro; }
    function risposto() {
      if (piu) return (risposte[q.id] || []).length > 0;
      return !!risposte[q.id] && (!conAltro() || risposte[q.id + "_other"].length >= 2);
    }

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
      if (campo) campo.hidden = !conAltro();
    });
    // una risposta sola scelta col mouse o col dito: si passa subito alla domanda dopo (anche toccando la
    // risposta già scelta, tornando indietro). Con la tastiera no: le frecce e lo spazio cambiano la scelta,
    // e si va avanti con Invio o col pulsante. Vale solo il tocco sulla risposta stessa: uno su «Avanti»
    // o «Indietro» non deve far avanzare la scelta fatta dopo con la tastiera
    if (!piu) {
      var tocco = null;
      f.addEventListener("pointerdown", function (ev) { tocco = ev.target && ev.target.closest ? ev.target.closest(".av-opt") : null; });
      f.addEventListener("keydown", function () { tocco = null; });
      f.addEventListener("click", function (ev) {
        if (!ev.target || ev.target.tagName !== "INPUT" || !tocco || !tocco.contains(ev.target)) return;
        tocco = null;
        // «Altro» non porta avanti: prima si scrive di cosa si occupa l'impresa
        if (altro && ev.target.value === q.altro) { campo.hidden = false; altro.focus(); return; }
        setTimeout(function () { if (f.isConnected) avanza(); }, fermo ? 0 : 220);
      });
    }

    function avanza() {
      leggi();
      if (!risposto()) {
        stato.textContent = piu ? T.scegliPiu : conAltro() ? T.scegliAltro : T.scegli;
        if (conAltro()) altro.focus();
        return;
      }
      if (ultimo) { risultato(); return; }
      passo++;
      domanda();
    }
    f.addEventListener("submit", function (ev) { ev.preventDefault(); avanza(); });

    mostra(f, primo);
  }

  /* ---- Il risultato. */
  function metro(nome, valore, fasciaTesto, spiega) {
    var d = el("div", "av-score");
    d.appendChild(el("p", "av-score-l", nome));
    var v = el("p", "av-score-v");
    v.appendChild(el("b", null, String(valore)));
    v.appendChild(el("span", null, " / 100"));
    d.appendChild(v);
    d.appendChild(el("p", "av-score-b", fasciaTesto));
    var barra = el("i", "av-bar"), pieno = el("i");
    barra.setAttribute("aria-hidden", "true");
    pieno.style.width = valore + "%";
    barra.appendChild(pieno);
    d.appendChild(barra);
    d.appendChild(el("p", "av-score-n", spiega));
    return d;
  }

  /* «Quanto vale questo tempo?»: tre costi orari e una cifra a mano; il valore si aggiorna a ogni scelta.
     riga() è la riga per «Contattami» (vuota se la cifra a mano non è valida): il costo scelto arriva solo lì. */
  function quantoVale(annoDa, annoA) {
    var t = T.valore, costo = COSTO_BASE, chi = t.fasce[COSTO_BASE];
    var b = el("div", "av-block av-value");
    var fs = el("fieldset", "av-fs");
    fs.setAttribute("aria-labelledby", "av-value-h av-value-p");
    var h = el("h3", "av-h3", t.h); h.id = "av-value-h";
    var p = el("p", "av-help", t.p); p.id = "av-value-p";
    fs.appendChild(h); fs.appendChild(p);
    var lista = el("div", "av-opts is-short av-rates");
    COSTI.concat(["altra"]).forEach(function (v) {
      var lab = el("label", "av-opt"), inp = document.createElement("input");
      inp.type = "radio"; inp.name = "costo"; inp.value = String(v);
      inp.checked = v === COSTO_BASE;
      lab.appendChild(inp);
      var testo = el("span", "av-opt-t");
      if (v === "altra") testo.textContent = t.altra;
      else { testo.appendChild(el("b", null, t.ora(v))); testo.appendChild(el("span", null, t.fasce[v])); }
      lab.appendChild(testo);
      lista.appendChild(lab);
    });
    fs.appendChild(lista);
    var campo = el("div", "ck-field av-altro");
    var l = el("label", null, t.altraL); l.htmlFor = "av-costo";
    var mano = document.createElement("input");
    mano.type = "text"; mano.id = "av-costo"; mano.name = "costo_altro";
    mano.inputMode = "decimal"; mano.maxLength = 6; mano.autocomplete = "off";
    campo.appendChild(l); campo.appendChild(mano);
    campo.hidden = true;
    fs.appendChild(campo);
    b.appendChild(fs);

    var esito = el("div", "av-value-out");
    esito.setAttribute("aria-live", "polite");
    b.appendChild(esito);

    function aggiorna() {
      var s = lista.querySelector("input:checked"), scelta = s ? s.value : String(COSTO_BASE);
      campo.hidden = scelta !== "altra";
      if (scelta === "altra") {
        var n = Number(mano.value.trim().replace(",", "."));
        costo = mano.value.trim() && n >= COSTO_MIN && n <= COSTO_MAX ? Math.round(n) : null;
        chi = t.altraR;
      } else {
        costo = Number(scelta); chi = t.fasce[scelta];
      }
      esito.textContent = "";
      if (costo == null) { esito.appendChild(el("p", "av-score-n", mano.value.trim() ? t.fuori : "")); return; }
      var v = valore(annoDa, annoA, costo), cifre = el("p", "av-score-v");
      cifre.appendChild(el("b", null, t.soldi(v.meseDa, v.meseA)));
      cifre.appendChild(el("span", null, " " + t.mese));
      esito.appendChild(cifre);
      esito.appendChild(el("p", "av-score-n", t.nota(v.annoDa, v.annoA)));
    }
    lista.addEventListener("change", aggiorna);
    mano.addEventListener("input", aggiorna);
    aggiorna();
    return {
      nodo: b,
      riga: function () { return costo == null ? "" : t.riga(costo, chi, valore(annoDa, annoA, costo)); }
    };
  }

  function risultato() {
    var r = risposte, c = calcola(r);
    var out = el("div", "av-result");

    out.appendChild(el("p", "av-kicker", T.risultato));
    var h = el("h2", "av-verdict", T.profili[c.profilo][0]);
    h.tabIndex = -1;
    h.setAttribute("data-av-focus", "");
    out.appendChild(h);
    out.appendChild(el("p", "av-verdict-p", T.profili[c.profilo][1]));
    // chi non usa ancora l'AI riceve un incoraggiamento sotto il giudizio, non una cosa da preparare
    if (r.ai_today === "none") out.appendChild(el("p", "av-verdict-p", T.gapAi));

    var punti = el("div", "av-scores");
    var fp = fascia(c.potenziale), fr = fascia(c.prontezza);
    punti.appendChild(metro(T.potenziale, c.potenziale, T.fasce[fp], T.spiega.potenziale[fp]));
    punti.appendChild(metro(T.prontezza, c.prontezza, T.fascePr[fr], T.spiega.prontezza[fr]));
    var ore = el("div", "av-score is-hours");
    ore.appendChild(el("p", "av-score-l", T.ore));
    var ov = el("p", "av-score-v");
    ov.appendChild(el("b", null, c.oreDa + "–" + c.oreA));
    ov.appendChild(el("span", null, " " + T.oreS));
    ore.appendChild(ov);
    var annoDa = decina(c.oreDa * SETTIMANE_ANNO), annoA = decina(c.oreA * SETTIMANE_ANNO);
    ore.appendChild(el("p", "av-score-n", T.oreNota(annoDa, annoA)));
    punti.appendChild(ore);
    out.appendChild(punti);
    var come = el("a", "arrow-link av-how", T.come + " →");
    come.href = T.comeHref;
    out.appendChild(come);
    var tempo = quantoVale(annoDa, annoA);
    out.appendChild(tempo.nodo);

    var parti = el("div", "av-block");
    parti.appendChild(el("h3", "av-h3", T.partenza));
    var ol = el("ol", "av-opps");
    r.areas.forEach(function (a) {
      var li = el("li"), att = T.att[a], es = T.es[a][r.sector];
      li.appendChild(el("h4", null, att.t));
      li.appendChild(el("p", null, att.p));
      if (es) li.appendChild(el("p", "av-ex", T.esempio + es + "."));
      ol.appendChild(li);
    });
    parti.appendChild(ol);
    out.appendChild(parti);

    var cose = c.blocchi.map(function (b) { return T.gap[b]; });
    if (cose.length) {
      var prima = el("div", "av-block");
      prima.appendChild(el("h3", "av-h3", T.prima));
      var ul = el("ul", "ticks");
      cose.forEach(function (t) { ul.appendChild(el("li", null, t)); });
      prima.appendChild(ul);
      out.appendChild(prima);
    }

    // il risultato arriva subito a noi; se l'invio non riesce, «Contattami» rimanda comunque tutto
    var riepilogo = T.riepilogo(r, c, L);
    invia("assessment_result", riepilogo)["catch"](function () { /* la persona vede comunque il risultato */ });

    // l'invito: «Contattami», col telefono se vuole lasciarlo
    var cta = el("div", "av-cta");
    cta.appendChild(el("h3", "av-cta-h", T.ctaH));
    cta.appendChild(el("p", "av-cta-p", T.ctaP));
    var f = el("form", "av-contact");
    f.noValidate = true;
    var tel = campo("av-tel", "telefono", T.ctaTel, "tel", { autocomplete: "tel", maxLength: 40 });
    tel.firstChild.appendChild(el("span", "ck-opt", " (" + T.facoltativo + ")"));
    f.appendChild(tel);
    var btn = el("button", "btn btn-primary p-btn-xl p-btn-inv");
    btn.type = "submit";
    var etichetta = el("span", null, T.ctaBtn);
    btn.appendChild(etichetta);
    var fr = el("span", "p-arr", "→");
    fr.setAttribute("aria-hidden", "true");
    btn.appendChild(document.createTextNode(" "));
    btn.appendChild(fr);
    f.appendChild(btn);
    var stato = el("p", "av-cta-n");
    stato.setAttribute("role", "status"); stato.setAttribute("aria-live", "polite");
    stato.textContent = T.ctaNota(contatto.email);
    f.appendChild(stato);
    var inVolo = false;
    f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (inVolo) return;
      inVolo = true; btn.disabled = true; etichetta.textContent = T.invio;
      invia("assessment_contact", T.richiesta + riepilogo + tempo.riga(), f.elements.telefono.value.trim())
        .then(function () {
          var g = T.grazie(contatto.email), fatto = el("div", "av-done");
          fatto.tabIndex = -1;
          fatto.appendChild(el("p", "av-done-h", g[0]));
          fatto.appendChild(el("p", null, g[1]));
          f.parentNode.replaceChild(fatto, f);
          fatto.focus();
          // per misura.js: la richiesta è arrivata (checkup_requested), mai i dati della persona
          document.dispatchEvent(new CustomEvent("telaio:checkup-inviato", { detail: { pulsante: "assessment_contact" } }));
        }, function () {
          stato.textContent = T.errore;
          var m = el("a", null, EMAIL);
          m.href = "mailto:" + EMAIL;
          stato.appendChild(m);
          stato.appendChild(document.createTextNode("."));
          stato.classList.add("is-error");
          inVolo = false; btn.disabled = false; etichetta.textContent = T.ctaBtn;
        });
    });
    cta.appendChild(f);
    out.appendChild(cta);

    // si rifà con la stessa azienda e la stessa email
    var ancora = el("button", "av-again", "↺ " + T.ancora);
    ancora.type = "button";
    ancora.addEventListener("click", function () { passo = 0; risposte = {}; domanda(); });
    out.appendChild(ancora);

    mostra(out);
    annuncia("finito", {
      profile: c.profilo, potential: c.potenziale, readiness: c.prontezza,
      sector: r.sector, team_size: r.team_size, hours: r.hours, areas: r.areas.slice().sort().join(",")
    });
  }

  // per le prove nel browser (verifica_autovalutazione.mjs): il calcolo senza passare dalle domande
  window.__telaioAutovalutazione = { calcola: calcola, valore: valore, domande: DOMANDE };

  // il paragrafo per chi non ha JavaScript (dentro [data-autovalutazione]) lascia il posto all'inizio
  inizio(true);
})();
