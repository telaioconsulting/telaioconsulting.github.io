/* ============================================================
   TELAIO — interazioni minime, nessun tracker, nessun cookie.
   ============================================================ */
(function () {
  "use strict";

  /* ---- Cambio tema (scuro predefinito ⇄ chiaro) ---- */
  var root = document.documentElement;
  var themeBtn = document.getElementById("themeBtn");
  var STORAGE_KEY = "telaio-theme";

  function applyTheme(theme) {
    if (theme === "light") {
      root.setAttribute("data-theme", "light");
      if (themeBtn) { themeBtn.textContent = "☾"; themeBtn.setAttribute("aria-label", "Passa al tema scuro"); }
    } else {
      root.removeAttribute("data-theme"); // :root = tema scuro
      if (themeBtn) { themeBtn.textContent = "◐"; themeBtn.setAttribute("aria-label", "Passa al tema chiaro"); }
    }
  }

  // All'avvio: default scuro; rispetta la scelta salvata dall'utente, se presente.
  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light") { applyTheme("light"); }
  } catch (e) { /* storage non disponibile: resta scuro */ }

  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      applyTheme(next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch (e) { /* ignora */ }
    });
  }

  /* ---- Menu mobile ---- */
  var menuBtn = document.getElementById("menuBtn");
  var nav = document.getElementById("nav");

  function closeMenu() {
    if (!nav) return;
    nav.classList.remove("open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
  }

  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // Chiudi il menu quando si sceglie una voce
    nav.addEventListener("click", function (ev) {
      if (ev.target.tagName === "A") closeMenu();
    });
  }
  // Chiudi il menu se si torna a schermo largo
  window.addEventListener("resize", function () {
    if (window.innerWidth > 720) closeMenu();
  });

  /* ---- Modulo contatti: apre l'email con il messaggio già pronto ----
     Sito statico senza server: nessun dato lascia il browser finché
     l'utente non invia l'email dal proprio client di posta.
     Per un modulo con invio automatico, collega un servizio come
     Formspree (https://formspree.io) cambiando l'attributo action. */
  var form = document.getElementById("contactForm");
  if (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var nome = (form.nome.value || "").trim();
      var email = (form.email.value || "").trim();
      var messaggio = (form.messaggio.value || "").trim();

      var oggetto = "Richiesta dal sito — " + (nome || "nuovo contatto");
      var corpo =
        "Nome: " + nome + "\n" +
        "Email: " + email + "\n\n" +
        messaggio + "\n";

      var url =
        "mailto:info@telaioconsulting.com" +
        "?subject=" + encodeURIComponent(oggetto) +
        "&body=" + encodeURIComponent(corpo);

      window.location.href = url;
    });
  }

  /* ---- Anno corrente nel footer ---- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
