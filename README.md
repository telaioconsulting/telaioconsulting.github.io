# telaioconsulting.github.io

Public marketing website for **Telaio Consulting**, served via GitHub Pages.

- **Live:** https://telaioconsulting.github.io
- **Stack:** static site, no build step, no dependencies. Shared `style.css` and `script.js`, plus `robots.txt`, `sitemap.xml` and `.nojekyll`. Each page is a folder with an `index.html`.
- **Languages:** Italian at `/`, English at `/en/` (switch via the IT/EN toggle in the header).
- **Brand:** follows the Telaio Brand Book (dark-first, blue `#1307ED`, Bricolage Grotesque + IBM Plex).

## Pages

| Page | Italian | English |
|---|---|---|
| Home | `/` (`index.html`) | `/en/` (`en/index.html`) |
| AI check-up | `/check-up-ai/` | `/en/ai-check-up/` |
| How we work | `/come-lavoriamo/` | — |
| What we do | `/cosa-facciamo/` | — |
| About us | `/chi-siamo/` | — |
| FAQ | `/domande-frequenti/` | — |
| Privacy | `/privacy/` | `/en/privacy/` |
| Cookies | `/cookie/` | `/en/cookies/` |

## Editing

Change the files and push to `main` — GitHub Pages redeploys automatically in ~1 minute.

## Custom domain

To use `telaioconsulting.com`: add a `CNAME` file containing the domain, set it in
repo Settings → Pages, and point the domain's DNS to GitHub Pages.
