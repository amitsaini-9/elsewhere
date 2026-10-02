/* Run only against a local, disposable database. Never targets production. */
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");

const base = new URL(process.argv[2] || "http://127.0.0.1:3000");
if (!["127.0.0.1", "localhost", "[::1]"].includes(base.hostname)) {
  throw new Error("Waitlist tests only run against a loopback host.");
}
const endpoint = new URL("/api/waitlist", base);
const suffix = randomBytes(6).toString("hex");
const email = `elsewhere-test-${suffix}@example.com`;
const honeypotEmail = `elsewhere-bot-${suffix}@example.com`;

async function post(payload, status = 200, extraHeaders = {}) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
  assert.equal(response.status, status, `Expected HTTP ${status}; received ${response.status}`);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const data = await response.json();
  assert.equal(data.ok, status === 200);
  if (status !== 200) assert.equal(typeof data.error, "string");
  return data;
}

async function main() {
  const success = await post({ email });
  assert.deepEqual(success, { ok: true });
  assert.deepEqual(await post({ email: `  ${email.toUpperCase()}  ` }), success);
  assert.deepEqual(await post({ email }), success);
  await post({ email: "not-an-email" }, 400);
  await post({ email: ".invalid@example.com" }, 400);
  await post({ email: "invalid@-example.com" }, 400);
  await post({ email: `${"a".repeat(65)}@example.com` }, 400);
  await post({ email: `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(63)}.com` }, 400);
  await post({ email: [email] }, 400);
  await post("{broken", 400);
  await post({ email, padding: "x".repeat(2048) }, 413);
  await post({ email }, 415, { "Content-Type": "text/plain" });
  await post({ email }, 403, { Origin: "https://unrelated.example" });
  await post({ email: honeypotEmail, website: "https://bot.example" });
  await post({ email }, 200, { Origin: process.env.ELSEWHERE_PUBLIC_ORIGIN || base.origin });
  const chunked = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(JSON.stringify({ email, padding: "x".repeat(2048) })));
        controller.close();
      },
    }),
    duplex: "half",
  });
  assert.equal(chunked.status, 413, "Streamed requests must enforce the same size limit");
  assert.equal((await fetch(endpoint)).status, 405);

  if (process.env.ELSEWHERE_DB_PATH) {
    const { DatabaseSync } = require("node:sqlite");
    const db = new DatabaseSync(process.env.ELSEWHERE_DB_PATH, { readOnly: true });
    try {
      assert.equal(db.prepare("SELECT COUNT(*) AS count FROM waitlist WHERE email = ?").get(email).count, 1);
      assert.equal(db.prepare("SELECT COUNT(*) AS count FROM waitlist WHERE email = ?").get(honeypotEmail).count, 0);
      const row = db.prepare("SELECT created_at FROM waitlist WHERE email = ?").get(email);
      assert.ok(Number.isFinite(Date.parse(row.created_at)));
      assert.deepEqual(db.prepare("PRAGMA table_info(waitlist)").all().map((column) => column.name), ["email", "created_at"]);
    } finally {
      db.close();
    }
  }

  let rateLimited = false;
  for (let attempt = 0; attempt < 21; attempt++) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (response.status === 429) {
      assert.ok(Number(response.headers.get("retry-after")) >= 1);
      rateLimited = true;
      break;
    }
    assert.equal(response.status, 200);
  }
  assert.ok(rateLimited, "Repeated attempts must reach the per-address rate limit");

  console.log(`Waitlist checks passed on ${base.origin}.`);
  console.log(process.env.ELSEWHERE_DB_PATH
    ? "Confirmed normalized duplicate storage, timestamp, honeypot exclusion, and rate limiting."
    : "Set ELSEWHERE_DB_PATH to the server's disposable database to additionally inspect persistence.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
