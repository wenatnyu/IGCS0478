# Visitor statistics setup

Status: **the backend is deployed and verified on Cloudflare Workers Free; the
frontend is configured to collect visits on the production GitHub Pages site**.
Publishing this revision activates collection. Localhost previews remain excluded,
and lessons continue to work when the statistics service is unavailable. No
historical visits can be reconstructed from this change.

## Current deployment

- Worker: [igcs0478-analytics](https://igcs0478-analytics.igcs0478-private-analytics.workers.dev)
- Administrator dashboard: [Site analytics](https://igcs0478-analytics.igcs0478-private-analytics.workers.dev/admin)
- Teaching site: [IGCS0478](https://wenatnyu.github.io/IGCS0478/)
- D1 database: `igcs0478-analytics`, bound as `DB`; ID
  `00fb540e-4c0c-4963-a5b8-5a3a7cb5344f`.
- `analytics/wrangler.jsonc` contains the deployment account ID, the D1 binding,
  compatibility date `2026-10-25` and `nodejs_compat`. The allowed origin is
  `https://wenatnyu.github.io` and the site path prefix is `/IGCS0478/`.

Administrator credentials are stored locally in the macOS Keychain generic entry
`IGCS0478 Analytics Admin`, account `wenatnyu`. The Worker receives them through
the `ADMIN_USER` and `ADMIN_PASSWORD` secrets. No passwords or account tokens are
stored in the repository. Wrangler OAuth credentials also use the OS keychain.

Live endpoint checks confirmed that visits increment the count and repeated IPs
remain one entry. Public responses expose no IP addresses; administrator endpoints
return `401` without authentication and work with valid credentials. Allowed and
disallowed browser origins behaved as configured.

During deployment on this Mac, direct lookup or connection to the `workers.dev`
endpoint failed, while Safari reached it through the existing system proxy.
Reachability from mainland China has not been verified and is not guaranteed.
If the tracker is unavailable, its requests do not block lesson content.

## What it counts

Each visible, top-level HTML page load sends one request. Refreshing counts again;
changing a slide/hash, loading an iframe and directly downloading a PDF/PPT do not.
The homepage shows total page views (PV) once enabled. This is not a unique-person
count. Ad blockers, privacy settings, bots and interrupted connections affect the
result. No IP lookup service is called by the browser.

The authenticated dashboard is the Worker URL followed by `/admin`. Its current
list has at most ten distinct IP addresses, ordered by last accepted visit. Repeat
visits move the same address to the top while incrementing PV. Only the current
list and aggregate count are stored; there is no per-visit history table. IPv6
forms are normalized before deduplication. IPs describe network exits, not people.
Cloudflare D1 backups may retain previous database states after live-row eviction.

## Maintain or recreate the deployment

The existing GitHub Pages site stays in place. A Cloudflare Workers service and a
D1 database provide the backend. Use an account you control. Keep account tokens
and administrator credentials out of chat, source files and Git commits.

From the repository's `analytics` directory:

1. Install the locked deployment dependencies with `npm ci`, then sign in using
   `npx wrangler login --use-keyring` in your browser. This stores OAuth credentials
   in the OS keychain and preserves that preference for later commands. The backend
   tests themselves require only Node 24 or newer and no package installation.
2. For the existing deployment, retain the D1 database configured in
   `wrangler.jsonc`. To recreate it in another account, first update `account_id`
   to that account's ID, run `npx wrangler d1 create igcs0478-analytics`, then
   replace `database_id` with the newly created database ID.
3. Confirm `ALLOWED_ORIGINS` is the exact live site origin and `SITE_PATH_PREFIX`
   is its path. The supplied values target `https://wenatnyu.github.io/IGCS0478/`;
   change both if the published site uses another address.
4. Initialize a new database with
   `npx wrangler d1 execute igcs0478-analytics --remote --file=schema.sql`.
   The existing database has already been initialized; rerunning this schema is
   idempotent and does not reset its count.
5. For a new deployment or credential rotation, set secrets interactively with
   `npx wrangler secret put ADMIN_USER` and
   `npx wrangler secret put ADMIN_PASSWORD`. Use a unique, randomly generated
   long password and save it in your password manager. Do not put it in frontend
   JavaScript, `wrangler.jsonc`, a URL or localStorage.
6. Run `npx wrangler deploy` to publish backend changes. For another deployment,
   record its actual HTTPS Worker URL and use that origin in the frontend.
7. Verify `/api/count` returns only `pageviews`. `/admin` and `/api/admin/stats`
   must require the administrator password. Use test visits only before launch;
   those visits also contribute to the count if submitted to production.
8. To activate collection, set `endpoint` in `assets/analytics-config.js` to
   `https://igcs0478-analytics.igcs0478-private-analytics.workers.dev`, confirm the
   website origin/path, and set `enabled: true`. Publish the website changes.
   Review the bilingual `privacy.html` wording before enabling collection.

The dashboard uses the browser's HTTP Basic authentication over HTTPS. The browser
may remember credentials until its authentication session ends; use a private
window on a shared computer. The public frontend has no administrator credential.
CORS restricts browser origins but does not authenticate public counting requests
or guarantee bot-free analytics. For active abuse, apply service-side rate limits
or access controls separately.

## Verify locally

- `cd analytics && npm test` runs Worker behavior against a real local SQLite DB.
- `node --check assets/analytics.js` checks the browser script syntax.
- `python3 scripts/add_analytics.py` reattaches integration after HTML generation.
  It is idempotent, includes tracked nested lesson pages, and skips backend files.
- Disabled configuration, localhost previews, DNT/GPC and the browser opt-out do
  not send collection requests. No authentication secrets are required to preview
  the teaching pages. Production activation requires a configured HTTPS endpoint.

The collection script respects the opt-out stored on this browser. The privacy
page itself does not count. Failed requests do not block lessons or retry, so a
network failure can make the displayed total unavailable without breaking content.

## Official references

- [D1 atomic batches](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- [Trusted edge headers](https://developers.cloudflare.com/fundamentals/reference/http-headers/)
- [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [D1 recovery history](https://developers.cloudflare.com/d1/reference/time-travel/)
