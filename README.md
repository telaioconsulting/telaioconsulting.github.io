# telaioconsulting.github.io

Public marketing website for **Telaio Consulting**, served via GitHub Pages.

- **Live:** https://telaioconsulting.github.io
- **Stack:** static site, no build step. Shared `style.css` and `script.js`, plus `robots.txt`, `sitemap.xml` and `.nojekyll`. Each page is a folder with an `index.html`.
- **Motion:** every page also loads `motion.css` and `motion.js` (woven 3D hero, scroll animations, a faint weave behind the sections that lights up around the pointer), built on GSAP (ScrollTrigger, SplitText) and Lenis. The two homes open with the logo, whose four strokes stretch into large lines and settle onto the threads of the hero fabric; this opening plays once per visit (sessionStorage `telaio-intro`), and a click, scroll or key press fast-forwards it. The other pages, and the homes on later visits, have a shorter title entrance. Each effect only runs if the page has the elements it needs. The libraries are hosted in `assets/vendor/` (versions and licences in its README), so no page calls an external server. Without JavaScript, or with "reduce motion" on, the page stays static and fully readable.
- **Languages:** Italian at `/`, English at `/en/` (switch via the IT/EN toggle in the header).
- **Check-up form:** every «Prenota il check-up AI» / «Book your AI check-up» button opens a form in a window (`script.js`); on the check-up pages the same form also sits in the blue box. It posts to a Google Apps Script web app of info@telaioconsulting.com (`MODULO_URL` at the top of `script.js`), which emails the request to info@ and keeps it in a Google Sheet. While `MODULO_URL` is empty the buttons are plain links to the check-up page, which shows the email address.
- **Brand:** follows the Telaio Brand Book (dark-first, blue `#1307ED`, Bricolage Grotesque + IBM Plex).

## Pages

| Page | Italian | English |
|---|---|---|
| Home | `/` (`index.html`) | `/en/` (`en/index.html`) |
| AI check-up | `/check-up-ai/` | `/en/ai-check-up/` |
| How we work | `/come-lavoriamo/` | — |
| What we do | `/cosa-facciamo/` | — |
| E-commerce (bridge to the Telaio - Ecommerce Automations site) | `/cosa-facciamo/e-commerce/` | — |
| Strategy consulting | `/consulenza-strategica/` | — |
| About us | `/chi-siamo/` | — |
| FAQ | `/domande-frequenti/` | — |
| Privacy | `/privacy/` | `/en/privacy/` |
| Cookies | `/cookie/` | `/en/cookies/` |
| Not found (served by GitHub Pages for any missing path, `noindex`) | `/404.html` | — |

## Search engines and AI answers

- Every page has a title, description, canonical URL, Open Graph tags and JSON-LD (`WebPage` or a subtype, the `Organization`, the breadcrumb; services, FAQ and people where the page has them). `dateModified` in the JSON-LD and `lastmod` in `sitemap.xml` follow the last content change: update both when a page's text changes.
- `llms.txt`: a plain summary of Telaio and its key pages for AI assistants. Keep it in line with the site when services, prices or contacts change.
- `robots.txt` lets every crawler in (AI search crawlers included) and lists both sitemaps (this site and `/ecommerce-automations/`, which lives on the same host).
- Icons: `favicon.ico`, `favicon.svg`, `apple-touch-icon.png`, `assets/icon-192.png`, `assets/icon-512.png`, `site.webmanifest`.

## Editing

Change the files and push to `main` — GitHub Pages redeploys automatically in ~1 minute.

## Custom domain

To use `telaioconsulting.com`: first point the domain's DNS to GitHub Pages (A/AAAA records for the apex,
CNAME `www` → `telaioconsulting.github.io`), then add a `CNAME` file containing the domain and set it in
repo Settings → Pages. Do it in this order: with the `CNAME` file in place GitHub redirects every visit to the
domain, so the site would be unreachable until the DNS is ready. Then replace `https://telaioconsulting.github.io`
with the new address everywhere (canonical and hreflang links, Open Graph, JSON-LD, `sitemap.xml`, `robots.txt`,
`llms.txt`) and resubmit the sitemaps in Search Console and Bing Webmaster Tools.
