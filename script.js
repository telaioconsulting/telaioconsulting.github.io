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
    if (typeof window.__loomRedraw === "function") window.__loomRedraw(); // il tessuto della hero (motion.js)
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
    var booking = document.querySelector("[data-booking], .booking-box");
    var bookingInView = false;
    function update() {
      var past = (window.scrollY || window.pageYOffset || 0) > 300;
      var menuOpen = nav && nav.classList.contains("open");
      if (past && !bookingInView && !menuOpen) bar.classList.add("show");
      else bar.classList.remove("show");
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    if (menuBtn) menuBtn.addEventListener("click", function () { setTimeout(update, 0); });
    if (booking && "IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { bookingInView = e.isIntersecting; });
        update();
      }, { threshold: 0 }).observe(booking);
    }
    update();
  })();
})();
