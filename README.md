# telaioconsulting.github.io

Public marketing website for **Telaio Consulting**, served via GitHub Pages.

- **Live:** https://telaioconsulting.github.io
- **Stack:** static site, no build step. Shared `style.css` and `script.js`, plus `robots.txt`, `sitemap.xml` and `.nojekyll`. Each page is a folder with an `index.html`.
- **Home motion:** both homes (`/` and `/en/`) also load `home.css` and `home.js` (woven 3D hero, scroll animations), built on GSAP (ScrollTrigger, SplitText) and Lenis. The libraries are hosted in `assets/vendor/` (versions and licences in its README), so no page calls an external server. Without JavaScript, or with "reduce motion" on, the page stays static and fully readable.
- **Languages:** Italian at `/`, English at `/en/` (switch via the IT/EN toggle in the header).
- **Brand:** follows the Telaio Brand Book (dark-first, blue `#1307ED`, Bricolage Grotesque + IBM Plex).

## Pages

| Page | Italian | English |
|---|---|---|
| Home | `/` (`index.html`) | `/en/` (`en/index.html`) |
| AI check-up | `/check-up-ai/` | `/en/ai-check-up/` |
| How we work | `/come-lavoriamo/` | — |
| What we do | `/cosa-facciamo/` | — |
| Strategy consulting | `/consulenza-strategica/` | — |
| About us | `/chi-siamo/` | — |
| FAQ | `/domande-frequenti/` | — |
| Privacy | `/privacy/` | `/en/privacy/` |
| Cookies | `/cookie/` | `/en/cookies/` |

## Editing

Change the files and push to `main` — GitHub Pages redeploys automatically in ~1 minute.

## Custom domain

To use `telaioconsulting.com`: add a `CNAME` file containing the domain, set it in
repo Settings → Pages, and point the domain's DNS to GitHub Pages.
