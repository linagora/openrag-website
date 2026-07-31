# OpenRAG website

Source of [open-rag.ai](https://open-rag.ai/), the website of
[OpenRAG](https://github.com/linagora/openrag) by [LINAGORA](https://linagora.com/).

It is a static site: plain HTML, CSS and JavaScript, with no build step and no
external dependency. Every asset is served from this repository.

```
index.html      the single page
css/            stylesheet
js/             behaviour (no framework)
fonts/          self-hosted web fonts
images/         logos, illustrations, social card
video/          embedded demonstration video
robots.txt      crawler directives (currently blocking, see below)
sitemap.xml     sitemap referenced by robots.txt
CNAME           production domain, applied on go-live
```

## Working locally

Open `index.html` directly in a browser, or serve the directory over HTTP to get
the same behaviour as in production:

```sh
python3 -m http.server 8000
```

Then browse to <http://localhost:8000/>.

## Deployment

The site is deployed to GitHub Pages by the
[`Deploy static content to Pages`](.github/workflows/static.yml) workflow, which
uploads the repository as-is and publishes it.

It runs on every push to `main`, and on demand from the *Actions* tab. There is
no build step and no staging: what is committed is what is served.

## Current state: preview

The site is authored for the apex domain `https://open-rag.ai/`, but that domain
still serves the previous site, hosted elsewhere. Until the DNS is switched over,
this repository is published to the GitHub-provided URL instead:

**<https://linagora.github.io/openrag-website/>**

Two consequences, both temporary:

- [`robots.txt`](robots.txt) is set to `Disallow: /` so the preview is never
  indexed and cannot compete with the production domain later. The production
  directives are kept, commented out, at the bottom of that file.
- The absolute `https://open-rag.ai/…` URLs in the page — canonical link, Open
  Graph and Twitter cards, JSON-LD, and the sitemap — still point at the
  production domain, so social cards and structured data do not resolve against
  the preview. This is harmless while testing and correct on go-live. Everything
  else is relative and works unchanged from the `/openrag-website/` subpath.

## Going live

When the DNS for `open-rag.ai` is moved to GitHub Pages:

1. Point the apex domain at GitHub with the DNS records below. The domain
   currently resolves elsewhere, so this is a migration, not a fresh setup.
2. **Restore [`robots.txt`](robots.txt)** to the production directives commented
   at the bottom of the file — `Allow: /` plus the `Sitemap:` line. This is easy
   to forget and silently keeps the whole site out of search results.
3. **Settings → Pages → Custom domain**: enter `open-rag.ai`. The [`CNAME`](CNAME)
   file in the repository already records it.
4. Tick **Enforce HTTPS** once the certificate has been issued, a few minutes
   after the records propagate.
5. Check the canonical link, `og:image` and the sitemap now resolve, and that
   `https://linagora.github.io/openrag-website/` redirects to the custom domain.

## One-time repository configuration

Not covered by the workflow:

1. **Settings → Pages → Build and deployment → Source**: select
   **GitHub Actions**.
2. DNS for the apex domain `open-rag.ai`, needed only when going live:

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

   Optionally add a `CNAME` record for `www` pointing to `linagora.github.io.`
   so that `www.open-rag.ai` redirects to the apex domain.

## Licence

Published under the [GNU Affero General Public License v3.0](LICENSE), like
[OpenRAG](https://github.com/linagora/openrag) itself.
