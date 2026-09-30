# OpenRAG website

Source of [open-rag.ai](https://open-rag.ai/), the website of
[OpenRAG](https://github.com/linagora/openrag) by [LINAGORA](https://linagora.com/).

![The OpenRAG website](images/screenshot.png)

It is a static site: plain HTML, CSS and JavaScript, with no build step and no
external dependency. Every asset is served from this repository.

```
index.html      the single page
css/            stylesheet
js/             behaviour (no framework)
fonts/          self-hosted web fonts
images/         illustrations, social card, screenshot
images/logos/   third-party and LINAGORA marks
video/          embedded demonstration video
tools/          helper scripts, run by hand (see below)
robots.txt      crawler directives
sitemap.xml     sitemap referenced by robots.txt
CNAME           production domain
```

## Working locally

Serve the directory over HTTP rather than opening `index.html` from disk:

```sh
python3 -m http.server 8000
```

Then browse to <http://localhost:8000/>.

## The contact form

The contact dialog frames LINAGORA's Odoo form at
<https://odoo.linagora.com/en/contact-us-openrag>; submissions go straight to
Odoo, and the page publishes no email address.

## Deployment

The site is deployed to GitHub Pages by the
[`Deploy static content to Pages`](.github/workflows/static.yml) workflow, which
uploads the repository as-is and publishes it.

It runs on every push to `main`, and on demand from the *Actions* tab. There is
no build step and no staging: what is committed is what is served.

> The run is not always created promptly: a push has been seen to land on `main`
> with its workflow run appearing only fourteen minutes later. If the live site
> has not updated, give it a few minutes before concluding anything is wrong.
> **Run workflow** in the *Actions* tab deploys the current `main` on demand, and
> is harmless if the delayed run then arrives as well.

## DNS

The apex domain resolves to GitHub Pages:

| Type | Name | Value |
| ---- | ---- | ----- |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |
| CNAME | `www` | `linagora.github.io.` |

`www.open-rag.ai` redirects to the apex, which is the intent. GitHub issued the
certificate for `open-rag.ai` alone, so the redirect is served over HTTP — enough
for a browser reaching `www`, since the apex sets no HSTS. Only a link written
explicitly as `https://www.open-rag.ai` fails, and none point there.

⚠️ **This domain also carries email.** The zone holds `MX` records and an SPF
`TXT` record. Change the `A` and `AAAA` records only — replacing the zone breaks
mail delivery.

## Repository configuration

Set once, not covered by the workflow:

- **Settings → Pages → Build and deployment → Source**: **GitHub Actions**.
- **Settings → Pages → Custom domain**: `open-rag.ai`. The [`CNAME`](CNAME) file
  alone does not set this for Actions-based deployments — the setting does.
- **Settings → Pages → Enforce HTTPS**: enabled.

## Licence

Published under the [GNU Affero General Public License v3.0](LICENSE), like
[OpenRAG](https://github.com/linagora/openrag) itself.
