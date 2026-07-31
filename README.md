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
robots.txt      crawler directives
sitemap.xml     sitemap referenced by robots.txt
CNAME           custom domain served by GitHub Pages
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
[`Deploy website to GitHub Pages`](.github/workflows/deploy.yml) workflow.

It runs on two events:

- a push of a tag matching `v*` (for example `v1.0.0`) — this is the normal
  release path;
- a manual run from the *Actions* tab, to deploy the current state of a branch
  without creating a tag.

Pushing to `main` does **not** publish anything. Merge freely, then tag when the
site is ready to go live:

```sh
git tag -a v1.0.0 -m "Website 1.0.0"
git push origin v1.0.0
```

The workflow checks out the commit, stages the site into `_site/` (excluding
hidden files, Markdown documentation and archives), adds `.nojekyll`, verifies
that the expected files are present, then uploads and deploys the artifact.

### Preview mode and production mode

The site is authored for the apex domain `https://open-rag.ai/`, but until the
DNS records exist it is published to the GitHub-provided URL instead. The
`CUSTOM_DOMAIN` variable at the top of the workflow selects which:

| `CUSTOM_DOMAIN` | Published at | Behaviour |
| --------------- | ------------ | --------- |
| `''` (current) | `https://linagora.github.io/openrag-website/` | Preview |
| `open-rag.ai` | `https://open-rag.ai/` | Production |

In **preview** mode the workflow does three things so that the temporary URL
behaves correctly, all of them on the staged copy only — the repository itself
is never modified:

- no `CNAME` is deployed, so Pages keeps serving the `github.io` URL;
- the absolute `https://open-rag.ai/…` URLs — canonical, Open Graph and Twitter
  cards, JSON-LD, sitemap — are repointed at the preview URL, so social cards
  and structured data resolve. Relative links, assets and anchors already work
  from a subpath and are left alone;
- `robots.txt` becomes `Disallow: /` and the page gets `noindex, nofollow`, so
  the preview is never indexed and cannot compete with the real domain later.

In **production** mode the site is deployed exactly as authored, with a `CNAME`
generated from `CUSTOM_DOMAIN`. The build fails if a preview is about to ship a
`CNAME`, if any reference to the production domain survived the rewrite, or if
the `noindex` directive is missing.

## Going live

1. Set up the DNS records below at the registrar.
2. Change `CUSTOM_DOMAIN` in
   [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) from `''` to
   `open-rag.ai`.
3. Tag and push. The deployment sets the custom domain from the `CNAME` in the
   artifact.
4. **Settings → Pages**: tick **Enforce HTTPS** once the certificate has been
   issued (a few minutes after the records propagate).

Keep the root [`CNAME`](CNAME) file in sync with `CUSTOM_DOMAIN`; it records the
production domain while preview mode is active.

## One-time repository configuration

Not covered by the workflow:

1. **Settings → Pages → Build and deployment → Source**: select
   **GitHub Actions**. The first run fails without this.
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
