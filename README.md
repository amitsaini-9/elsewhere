# Elsewhere

A coming-soon landing page for a nearby micro-escape planner. The product hypothesis: people with a few free hours need an outdoor plan that fits their travel mode, available time, and desired atmosphere, with enough time to get home. Elsewhere turns those constraints into a manageable escape instead of another destination search.

Public address: https://elsewhere.sainiamit.com

## Scope

The landing experience uses Next.js, React, TypeScript, custom responsive styling, generated nature imagery and video, and an interactive preview of the proposed planner. The waitlist is a real SQLite-backed endpoint with input validation, duplicate handling, a honeypot, and rate limits shared across both server processes. It sends no emails.

The actual planning application, live destination data, route calculation, navigation, booking, and external integrations are proposed features. Preview routes are illustrative and must not be used for navigation. Generated media are conceptual landscapes, not photographs or footage of the named sample destinations. No launch date or pricing is promised.

## Development and checks

Node 24 is required by the built-in SQLite API.

```bash
npm install
npm run dev
npm run check
npm run build
```

Use the disposable-database procedure in [deploy/WAITLIST.md](deploy/WAITLIST.md) for backend verification. The script creates test subscribers and intentionally reaches the local rate limit; never run it against production storage.

`node deploy/browser-check.cjs https://elsewhere.sainiamit.com` checks desktop, tablet, and phone layouts, planner state, downloads, browser persistence, keyboard focus, and form recovery. All browser signup requests are mocked. `node deploy/verify-api.cjs` creates an isolated local server and disposable database for API checks.

See [RESEARCH.md](RESEARCH.md) for the product rationale, and [creative/README.md](creative/README.md) for generated assets, prompts, and optimization details.

## Deployment

`ecosystem.config.cjs` defines two Next production workers bound to `127.0.0.1` on ports 3301 and 3302. Both use `/root/elsewhere-data/waitlist.sqlite` and the public origin `https://elsewhere.sainiamit.com`. `deploy/nginx.conf` is an HTTP provisioning template with round-robin upstream selection and retry on failed upstreams. HTTPS certificates and the live Nginx configuration are managed separately.

The database lives outside the public web root and must remain private. Preserve Nginx's replacement of client-IP and protocol headers, and keep the Next ports on loopback so the shared abuse controls use trusted proxy input. Two workers provide resilience against a process failure; they share one host. Build future releases in a separate directory before switching traffic.
