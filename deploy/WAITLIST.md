# Elsewhere waitlist

`POST /api/waitlist` stores launch-interest emails in a private SQLite database. No emails are sent, no email provider is connected, and there is no public subscriber export. Success confirms storage; it does not verify email ownership or give access to the proposed product.

## Runtime and proxy

- Node 24 is required for the built-in `node:sqlite` API.
- Both Next processes must use `ELSEWHERE_DB_PATH=/root/elsewhere-data/waitlist.sqlite` and `ELSEWHERE_PUBLIC_ORIGIN=https://elsewhere.sainiamit.com`. The database path is the default if omitted. If the origin is omitted, the route uses the request host and proxy protocol.
- Run both workers as the same account, on loopback ports 3301 and 3302. Nginx must overwrite `X-Real-IP`, `X-Forwarded-Proto`, and `Host` as in `nginx.conf`. Upstream ports must never be exposed publicly. The route does not trust `X-Forwarded-For`.
- The directory is created with mode `0700`, and the database is set to `0600`. Ensure an existing directory is private and owned by the service account. Keep storage outside the public web root.
- SQLite uses WAL, full synchronous commits, a five-second busy timeout, and transactional counters shared by both workers. This deployment requires one local disk on one VPS. Back up using SQLite's backup API; copying only the main database file during writes is insufficient.

## Request contract

```http
POST /api/waitlist
Content-Type: application/json

{"email":"you@example.com","website":""}
```

New and duplicate emails both return `200 {"ok":true}`. Addresses are trimmed, lowercased, and validated as conventional ASCII emails; quoted and internationalized forms are unsupported. Duplicate signups preserve the original UTC timestamp.

The optional `website` honeypot returns success without saving a nonempty value. Hide this input from assistive technology and normal keyboard navigation.

Errors have the shape `{"ok":false,"error":"Human-readable message."}`: 400 for invalid input, 403 for another origin, 413 for bodies over 2 KiB, 415 for other content types, 429 for rate limits, and 503 for unavailable storage. The stream limit applies without `Content-Length`. Responses use `Cache-Control: no-store`. Other methods are unsupported.

## Stored data and limits

The subscriber table stores only email and the first UTC signup timestamp. The route logs no submitted email, client address, request body, or SQL details. A private settings table holds a random HMAC secret shared by both workers. Rate counters use a keyed hash of the address and hour; raw addresses are never stored in SQLite. Nginx access logs have their own retention settings.

Limits are 20 attempts per address per UTC hour, 2,000 globally per UTC hour, and 100,000 unique subscribers. Rate-limited responses include `Retry-After`. Limits apply across both workers. Missing or invalid proxy addresses share one local/unknown bucket. Invalid input and honeypot submissions count after origin, content-type, and declared-length checks pass. Expired counters are deleted on the next eligible request and may remain during idle time. Existing subscribers still receive success at capacity. Configure Nginx timeouts and request limits as the first layer of protection.

## Disposable verification

Use a fresh temporary database for each run; the final check intentionally exhausts its local rate bucket. Never use production storage, including through a loopback URL.

```bash
ELSEWHERE_DB_PATH=/tmp/elsewhere-waitlist-check.sqlite npm run dev -- --hostname 127.0.0.1 --port 3315
```

In another terminal, from the project directory:

```bash
ELSEWHERE_DB_PATH=/tmp/elsewhere-waitlist-check.sqlite node deploy/test-waitlist.cjs http://127.0.0.1:3315
```

The script refuses non-loopback hosts. It checks normalized duplicates, malformed input, declared and streamed size limits, content types, origins, honeypot behavior, unsupported methods, persistent rows, and rate limiting. When testing processes configured with a public origin, pass the same `ELSEWHERE_PUBLIC_ORIGIN` to the script.

## Removal and future messaging

Operators can delete a subscriber using a parameterized `DELETE FROM waitlist WHERE email = ?` query with the normalized address. Verify the request through the normal support process, avoid recording addresses in shell history or logs, and manage backup retention separately. Future launch messaging requires a separately configured provider, email ownership verification, and unsubscribe handling.
