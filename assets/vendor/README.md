# Librerie ospitate nel sito

Copie ospitate nel sito, così le pagine non le chiedono a server esterni.
Le librerie di animazione le usano tutte le pagine tramite `motion.js`; il banner dei cookie lo usa `misura.js`.

| File | Versione | Fonte | Licenza |
|---|---|---|---|
| `gsap.min.js` | GSAP 3.13.0 | npm `gsap` | GSAP Standard License (gratuita): https://gsap.com/standard-license |
| `ScrollTrigger.min.js` | 3.13.0 | npm `gsap` | come sopra |
| `SplitText.min.js` | 3.13.0 | npm `gsap` | come sopra |
| `lenis.min.js` | Lenis 1.3.11 | npm `lenis` | MIT, vedi `LICENSE-lenis.txt` |
| `cookieconsent.umd.js` | CookieConsent 3.1.0 | npm `vanilla-cookieconsent` | MIT, vedi `LICENSE-cookieconsent.txt` |
| `cookieconsent.css` | 3.1.0 | npm `vanilla-cookieconsent` | come sopra |

Scaricate da jsDelivr (`https://cdn.jsdelivr.net/npm/<pacchetto>@<versione>/dist/…`).
Per aggiornarle, sostituisci i file con la nuova versione e cambia la tabella.

I due file di CookieConsent sono identici a quelli dello standard Telaio (`collectip/tracciamento/site/config.json` nel repository `telaio`):
SHA-256 `vG4vLmOB/AJbJ6awr7Wg4fxonG+fxAp4cIrbIFTvRXU=` per il `.js` e `ygRrixsQlBByBZiOcJamh7JByO9fP+/l5UPtKNJmRsE=` per il `.css`, controllati il 19 ottobre 2026.

Attenzione: `cookieconsent.umd.js` comincia con `var e,t; e=this, t=function…` e, caricato come script classico, sovrascrive le globali `e` e `t`
che `lenis.min.js` dichiara al suo primo livello (la funzione clamp e la classe dell'animazione). Il file non si tocca, per restare identico allo standard:
`misura.js` salva le due globali prima di inserire lo script e le rimette a posto appena caricato (`caricaBanner`).
