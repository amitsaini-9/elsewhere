import { createHmac, randomBytes } from "node:crypto";
import { chmodSync, mkdirSync } from "node:fs";
import { isIP } from "node:net";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2_048;
const MAX_WAITLIST_ENTRIES = 100_000;
const PER_IP_HOURLY_LIMIT = 20;
const GLOBAL_HOURLY_LIMIT = 2_000;
const databaseCache = globalThis as typeof globalThis & {
  elsewhereWaitlistDatabase?: DatabaseSync;
};

class RequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function json(
  body: object,
  status = 200,
  headers: Record<string, string> = {},
) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

function database() {
  if (databaseCache.elsewhereWaitlistDatabase) {
    return databaseCache.elsewhereWaitlistDatabase;
  }

  const path = resolve(
    process.env.ELSEWHERE_DB_PATH || "/root/elsewhere-data/waitlist.sqlite",
  );
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path, { timeout: 5_000 });
  try {
    chmodSync(path, 0o600);
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = FULL;
      CREATE TABLE IF NOT EXISTS waitlist (
        email TEXT PRIMARY KEY CHECK(length(email) <= 254),
        created_at TEXT NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        window INTEGER NOT NULL,
        count INTEGER NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      ) STRICT;
    `);
    db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run(
      "rate_limit_secret",
      randomBytes(32).toString("hex"),
    );
    databaseCache.elsewhereWaitlistDatabase = db;
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

// Both workers use one transaction, so alternating upstreams cannot evade limits.
function rateLimit(db: DatabaseSync, request: Request) {
  const now = Date.now();
  const window = Math.floor(now / 3_600_000);
  const retryAfter = Math.max(
    1,
    Math.ceil(((window + 1) * 3_600_000 - now) / 1_000),
  );
  const candidate = request.headers.get("x-real-ip") || "";
  // Nginx must replace this header, and the Next ports must remain loopback-only.
  const address = isIP(candidate) ? candidate : "local-or-unknown";
  const { value: secret } = db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get("rate_limit_secret") as { value: string };
  const key = createHmac("sha256", secret)
    .update(`${window}:${address}`)
    .digest("hex");

  db.exec("BEGIN IMMEDIATE");
  try {
    // Expired identifiers are removed on the next request, including after idle time.
    db.prepare("DELETE FROM rate_limits WHERE window < ?").run(window);
    const read = db.prepare(
      "SELECT count FROM rate_limits WHERE key = ? AND window = ?",
    );
    const globalCount =
      (read.get("global", window) as { count: number } | undefined)?.count || 0;
    const ipCount =
      (read.get(key, window) as { count: number } | undefined)?.count || 0;
    if (globalCount >= GLOBAL_HOURLY_LIMIT || ipCount >= PER_IP_HOURLY_LIMIT) {
      db.exec("COMMIT");
      return retryAfter;
    }
    const increment = db.prepare(`
      INSERT INTO rate_limits (key, window, count) VALUES (?, ?, 1)
      ON CONFLICT(key) DO UPDATE SET count = count + 1
    `);
    increment.run("global", window);
    increment.run(key, window);
    db.exec("COMMIT");
    return 0;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;

  try {
    const requestUrl = new URL(request.url);
    const protocol =
      request.headers.get("x-forwarded-proto") ||
      requestUrl.protocol.slice(0, -1);
    const host = request.headers.get("host") || requestUrl.host;
    const expected = new URL(
      process.env.ELSEWHERE_PUBLIC_ORIGIN || `${protocol}://${host}`,
    ).origin;
    if (new URL(origin).origin !== expected || origin === "null") {
      throw new Error("Origin mismatch");
    }
  } catch {
    throw new RequestError(403, "Please join from the Elsewhere website.");
  }
}

async function readBody(request: Request): Promise<unknown> {
  if (!request.body)
    throw new RequestError(400, "Please enter your email address.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        void reader.cancel().catch(() => {});
        throw new RequestError(413, "That request is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RequestError(400, "Please send a valid email request.");
  }
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254) return null;
  const parts = email.split("@");
  if (parts.length !== 2) return null;
  const [local, domain] = parts;
  if (
    !local ||
    local.length > 64 ||
    local.startsWith(".") ||
    local.endsWith(".") ||
    local.includes("..")
  ) {
    return null;
  }
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return null;
  const labels = domain.split(".");
  if (labels.length < 2 || !/^[a-z]{2,63}$/.test(labels.at(-1) || ""))
    return null;
  if (
    labels.some(
      (label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label),
    )
  )
    return null;
  return email;
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const contentType = request.headers
      .get("content-type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();
    if (contentType !== "application/json") {
      throw new RequestError(415, "Please send your email as JSON.");
    }
    const contentLength = request.headers.get("content-length");
    if (
      contentLength &&
      (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_BODY_BYTES)
    ) {
      throw new RequestError(413, "That request is too large.");
    }

    const db = database();
    const retryAfter = rateLimit(db, request);
    if (retryAfter) {
      return json(
        { ok: false, error: "Too many attempts. Please try again later." },
        429,
        {
          "Retry-After": String(retryAfter),
        },
      );
    }

    const body = await readBody(request);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new RequestError(400, "Please enter a valid email address.");
    }
    const { email: input, website } = body as {
      email?: unknown;
      website?: unknown;
    };
    if (website !== undefined && typeof website !== "string") {
      throw new RequestError(400, "Please send a valid email request.");
    }
    if (typeof website === "string" && website.trim())
      return json({ ok: true });
    const email = normalizeEmail(input);
    if (!email)
      throw new RequestError(400, "Please enter a valid email address.");

    const result = db
      .prepare(
        `
      INSERT INTO waitlist (email, created_at)
      SELECT ?, ? WHERE (SELECT COUNT(*) FROM waitlist) < ?
      ON CONFLICT(email) DO NOTHING
    `,
      )
      .run(email, new Date().toISOString(), MAX_WAITLIST_ENTRIES);
    if (
      !result.changes &&
      !db.prepare("SELECT 1 FROM waitlist WHERE email = ?").get(email)
    ) {
      throw new RequestError(
        503,
        "The waitlist is temporarily unavailable. Please try again later.",
      );
    }
    return json({ ok: true });
  } catch (error) {
    if (error instanceof RequestError)
      return json({ ok: false, error: error.message }, error.status);
    // Do not put submitted email addresses, client addresses, or SQL in logs.
    console.error("Elsewhere waitlist request could not be completed.");
    return json(
      {
        ok: false,
        error:
          "The waitlist is temporarily unavailable. Please try again later.",
      },
      503,
    );
  }
}
