# telaioconsulting.github.io

Public marketing website for **Telaio Consulting**, served via GitHub Pages.

- **Live:** https://telaioconsulting.com (the old https://telaioconsulting.github.io addresses redirect there)
- **Stack:** static site, no build step. Shared `style.css` and `script.js`, plus `robots.txt`, `sitemap.xml` and `.nojekyll`. Each page is a folder with an `index.html`.
- **Motion:** every page also loads `motion.css` and `motion.js` (woven 3D hero, scroll animations, a faint weave behind the sections that lights up around the pointer), built on GSAP (ScrollTrigger, SplitText) and Lenis. The title is still and visible from the first paint on every page (no entrance: Google measures the page from it, and the line-by-line rise put the LCP at about 3 s); the blue mark under «4 settimane» is a CSS animation, the rest of the hero fades in with GSAP. On the homes the «where to start» cards are a grid and «how we work» shows the four steps beside the fabric, which weaves itself once (about 3 s) when a third of it is on screen, without holding the page (finished at once with «reduce motion», and when printing); `data-racconto="vivo" on the method section brings back the scene that holds the page while the fabric weaves. Each effect only runs if the page has the elements it needs. The libraries are hosted in `assets/vendor/` (versions and licences in its README), so no page asks another server for them. Without JavaScript, or with "reduce motion" on, the page stays static and fully readable.
- **Languages:** Italian at `/`, English at `/en/` (switch via the IT/EN toggle in the header).
- **The main button is the AI self-assessment** (since 30 Oct 2026, Dan): the header, hero, phone bar and closing buttons of every page say «Fai l'autovalutazione AI» / «Take the AI self-assessment» and lead to it (`data-cta="assessment"`). The check-up can still be booked directly: on its own page, from «Parliamone nel check-up», «Scrivici», the «Non vedi la tua attività?» card, the menu's «Contatti», the «Prenota il check-up» links under the home's buttons, and the one under each guide's closing button.
- **Check-up form:** every link with `data-cta="checkup"` opens a form in a window (`script.js`); on the check-up pages the same form also sits in the blue box. A link with `data-messaggio` (the «Parliamone nel check-up» links of /cosa-facciamo/) writes that text in the message field, unless the visitor has already written something. After the thank-you the window closes by itself after 8 s, with a thin bar emptying meanwhile; a tap, a key, scrolling inside it, a hidden tab or «reduce motion» keep it open, and an answer that arrives after the window was closed shows (and counts down) when it is opened again. It posts to a Google Apps Script web app of info@telaioconsulting.com (`MODULO_URL` at the top of `script.js`), which emails the request to info@ and keeps it in a Google Sheet. While `MODULO_URL` is empty the buttons are plain links to the check-up page, which shows the email address.
- **AI self-assessment / Autovalutazione AI** (`/autovalutazione-ai/`, `/en/ai-self-assessment/`, `autovalutazione.js`, styles under «AUTOVALUTAZIONE AI» in `style.css`): company name and email first, then eight questions, one per screen, then the result at once: the AI potential and the readiness (up to 100, bands medium-high, high, very high, each with the sentence that explains it), the hours a week that could be won back (the top of the hours band times the share AI can take off), «Quanto vale questo tempo?» / «What is this time worth?» (the year's hours times an hourly cost the visitor picks, 20, 35 or 60 € or their own figure, shown a month and a year as the value of the time, never a saving), where we would start (the chosen activities, with an example for the sector), what to prepare together, and one of three verdicts. The calculation is fixed rules in `autovalutazione.js`, written out in the page's «Come calcoliamo il risultato» / «How we work out the result»: change both together. When the result shows, company, email, answers and scores are posted to the check-up form's Google script (`pulsante` = `assessment_result`: a row in the sheet at once and, if no «Contattami» follows from the same address within 30 minutes, the email «Senza Contattami» to info@); «Contattami» / «Contact me» at the bottom posts them again with the phone if given and the hourly cost chosen (`pulsante` = `assessment_contact`: a row and the email «Contattami» to info@ at once; one email per address either way) and is the site's conversion (`checkup_requested`). With JavaScript off, the card shows a link to the check-up page.
- **Measurement and consent** (event tracking active since 19 Oct 2026, the Telaio standard end to end: PostHog, consent log, the site's page in the Telaio dashboard, Search Console, Bing, IndexNow; Google Tag Manager, Analytics and Meta wait for the first campaign): every page loads `misura.js`: the cookie banner (CookieConsent 3.1.0, hosted in `assets/vendor/`, styled at the end of `style.css`; a low bar at the bottom, «bar inline», so the title stays visible; the library draws the X only in the box layout, so `misura.js` adds it to the bar and it clicks «Rifiuta») and PostHog (EU Cloud, project «telaioconsulting.com», id 312302, organisation Telaio). Visitors who reject or don't answer are counted without cookies (`cookieless_mode: "on_reject"`: page views and page leaves only); after «Accept», PostHog runs with its cookie, autocapture, heatmaps, web vitals and replays (20%, every input masked), plus the events of the Telaio tracking plan: `checkup_clicked` (a click on any `data-cta="checkup"` link, with its `data-placement`), `checkup_requested` (the form was received; `script.js` fires `telaio:checkup-inviato`), `assessment_clicked` (a click on any `data-cta="assessment"` link), `assessment_started` and `assessment_completed` (the self-assessment's start screen sent and its result, with the answers as codes and the two scores, never the company or the email; `autovalutazione.js` fires `telaio:autovalutazione`; its «Contattami» is a `checkup_requested` with placement `assessment_contact`). Events are sent only on `telaioconsulting.com` (`env: prod`) and on `localhost` (`env: test`). PostHog's own script comes from `eu-assets.i.posthog.com`, the only file the site loads from another server. The contract is `company/event-tracking/tracking-plan.json` in the private `telaio` repository (tenant `telaio`). «Preferenze cookie» / «Cookie preferences» in every footer reopens the choices. To switch it all off, remove `<script src="/misura.js">` from the pages.
- **Brand:** follows the Telaio Brand Book (dark-first, blue `#1307ED`, Bricolage Grotesque + IBM Plex).

## Pages

| Page | Italian | English |
|---|---|---|
| Home | `/` (`index.html`) | `/en/` (`en/index.html`) |
| AI check-up | `/check-up-ai/` | `/en/ai-check-up/` |
| AI self-assessment | `/autovalutazione-ai/` | `/en/ai-self-assessment/` |
| How we work | `/come-lavoriamo/` | — |
| What we do | `/cosa-facciamo/` | — |
| E-commerce (bridge to the Telaio - Ecommerce Automations site) | `/cosa-facciamo/e-commerce/` | — |
| Strategy consulting | `/consulenza-strategica/` | — |
| About us | `/chi-siamo/` | — |
| FAQ | `/domande-frequenti/` | — |
| Guides (index) | `/guide/` | — |
| Guide: introducing AI in a small business | `/guide/introdurre-ai-in-azienda/` | — |
| Guide: what an AI consultant does | `/guide/consulente-ai/` | — |
| Guide: AI in Italian businesses, the data | `/guide/ai-imprese-italiane-dati/` | — |
| Privacy | `/privacy/` | `/en/privacy/` |
| Cookies | `/cookie/` | `/en/cookies/` |
| Not found (served by GitHub Pages for any missing path, `noindex`) | `/404.html` | — |

## Search engines and AI answers

- Every page has a title, description, canonical URL, Open Graph tags and JSON-LD (`WebPage` or a subtype, the `Organization`, the breadcrumb; services, FAQ and people where the page has them). `dateModified` in the JSON-LD and `lastmod` in `sitemap.xml` follow the last content change: update both when a page's text changes.
- **Guides** (`/guide/…`, since 30 Oct 2026, styles under «GUIDE» in `style.css`): Italian articles that answer one real search each. Every guide opens with a 40–60-word answer (`.g-answer`), uses question-shaped H2s, puts numbers with their source and year in the sentence, ends with «Cosa fare adesso», the closing buttons (`data-cta="assessment"` and a «Prenota il check-up» link, both `data-placement="guide_end"`), the «Chi siamo» box and the sources. A mid-guide invitation (`.g-cta`) has `data-placement="guide_mid"`; the index's closing button `guide_index`. Signed by the company, «Telaio Consulting»: in the JSON-LD `Article` the `author` and the `publisher` are the Organization (`https://telaioconsulting.com/#organization`), never a person. A new guide is a folder under `guide/` copied from an existing one, plus a card on `/guide/` (and its `ItemList`), a line in `sitemap.xml` and in `llms.txt`.
- `llms.txt`: a plain summary of Telaio and its key pages for AI assistants. Keep it in line with the site when services, prices or contacts change.
- `robots.txt` lets every crawler in (AI search crawlers included) and lists both sitemaps (this site and `/ecommerce-automations/`, which lives on the same host).
- Both sitemaps are registered in Google Search Console and Bing Webmaster Tools (account info@telaioconsulting.com).
- **IndexNow** (Bing, and the engines that share it: Yandex, Seznam, Naver, Yep) learns of new or changed pages at once, without waiting for a crawl. The key is the file `1bc619ff1501d74c3ec7270a9ade138a.txt` at the site root: its name and its content are the key (not a secret, but it lives only there and here). After a change is live on the site, run from the repository root

  ```
  python tools/indexnow.py https://telaioconsulting.com/chi-siamo/
  ```

  with the URLs that changed, were added or removed (no argument = every URL of `sitemap.xml`; an argument ending in `.xml` is a sitemap, local or `https://`, so `python tools/indexnow.py sitemap.xml https://telaioconsulting.com/ecommerce-automations/sitemap.xml` resubmits both sites). The script first checks that the key file answers on the live site, then does one POST; HTTP 200 or 202 means accepted. Without the script, the same POST by hand:

  ```
  curl -X POST https://api.indexnow.org/indexnow -H "Content-Type: application/json; charset=utf-8" -d "{\"host\":\"telaioconsulting.com\",\"key\":\"1bc619ff1501d74c3ec7270a9ade138a\",\"keyLocation\":\"https://telaioconsulting.com/1bc619ff1501d74c3ec7270a9ade138a.txt\",\"urlList\":[\"https://telaioconsulting.com/chi-siamo/\"]}"
  ```

  Submit changes, not the whole site after every deploy: IndexNow is a change notice, not a crawl request. To rotate the key, replace the file with a new `<32 hex characters>.txt`, update this paragraph and resubmit once.
- Icons: `favicon.ico`, `favicon.svg`, `apple-touch-icon.png`, `assets/icon-192.png`, `assets/icon-512.png`, `site.webmanifest`.

## Editing

Change the files and push to `main` — GitHub Pages redeploys automatically in ~1 minute.

## Custom domain

The site is served at `telaioconsulting.com` (the `CNAME` file). The DNS of the domain is on Squarespace: four `A` records on the apex to GitHub Pages (`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`), the matching `AAAA` records (`2606:50c0:8000::153` … `8003::153`) and `www` as a `CNAME` to `telaioconsulting.github.io`; GitHub sends `www` and the old `telaioconsulting.github.io` addresses to the domain. The domain's other records (mail and other services) are not part of the site: never touch them. The other Pages site of the account, `/ecommerce-automations/`, follows the same domain.

Every absolute address in the pages (canonical and hreflang links, Open Graph, JSON-LD, `sitemap.xml`, `robots.txt`, `llms.txt`) uses `https://telaioconsulting.com`; keep it so when adding a page.
