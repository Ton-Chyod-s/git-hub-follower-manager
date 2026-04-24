/**
 * ============================================================
 *  STRESS TEST SUITE - GitHub Follower Manager Backend
 *
 *  Testa o comportamento sob carga: latência, taxa de erro,
 *  concorrência, throughput e limites do servidor.
 *
 *  Usage:
 *    node security-tests/stress-test.mjs [BASE_URL]
 *    node security-tests/stress-test.mjs http://localhost:3000
 * ============================================================
 */

const BASE_URL = process.argv[2] || "http://localhost:3000";

const COLORS = {
  reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m",
  yellow: "\x1b[33m", blue: "\x1b[34m", cyan: "\x1b[36m",
  bold: "\x1b[1m", dim: "\x1b[2m", magenta: "\x1b[35m",
};
const c = (color, text) => `${COLORS[color]}${text}${COLORS.reset}`;

function section(title) {
  const fill = Math.max(0, 50 - title.length);
  console.log(`\n${c("bold", c("blue", `━━━ ${title} ${"━".repeat(fill)}`))}`);
}

function bar(val, max, width = 30) {
  const filled = Math.round((val / max) * width);
  return c("green", "█".repeat(filled)) + c("dim", "░".repeat(width - filled));
}

// ─── HTTP helper ────────────────────────────────────────────────────────────────
async function req(method, path, opts = {}) {
  const { body, headers = {}, cookies = "" } = opts;
  const start = performance.now();
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(cookies ? { Cookie: cookies } : {}),
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      redirect: "manual",
    });
    const elapsed = performance.now() - start;
    let json = null;
    try { json = await res.json(); } catch (_) {}
    return { status: res.status, elapsed, json };
  } catch (err) {
    return { status: 0, elapsed: performance.now() - start, error: err.message };
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function computeStats(times) {
  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / sorted.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p90 = sorted[Math.floor(sorted.length * 0.9)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  return { avg, min, max, p50, p90, p99, count: sorted.length };
}

function printStats(label, stats, errors, total) {
  const errRate = ((errors / total) * 100).toFixed(1);
  const color = parseFloat(errRate) > 5 ? "red" : parseFloat(errRate) > 1 ? "yellow" : "green";
  console.log(`\n  ${c("bold", label)}`);
  console.log(`  Requests : ${total} | Errors: ${c(color, `${errors} (${errRate}%)`)}`);
  console.log(`  Latency  : min=${stats.min.toFixed(0)}ms  avg=${stats.avg.toFixed(0)}ms  max=${stats.max.toFixed(0)}ms`);
  console.log(`  P50=${stats.p50.toFixed(0)}ms  P90=${stats.p90.toFixed(0)}ms  P99=${stats.p99.toFixed(0)}ms`);
  console.log(`  ${bar(stats.p50, stats.max)} (P50 vs max)`);
}

// ─── 1. BASELINE LATENCY ─────────────────────────────────────────────────────
async function testBaseline() {
  section("1. BASELINE LATENCY (10 sequential requests)");
  const times = [];
  const errors = [];
  for (let i = 0; i < 10; i++) {
    const r = await req("GET", "/");
    if (r.status === 0) errors.push(r.error);
    else times.push(r.elapsed);
    process.stdout.write(".");
  }
  console.log();
  if (times.length) printStats("GET /", computeStats(times), errors.length, 10);
  else console.log(c("red", "  All requests failed - server unreachable?"));
  return times.length > 0;
}

// ─── 2. CONCURRENT REQUEST STORM ─────────────────────────────────────────────
async function testConcurrency(concurrency = 50) {
  section(`2. CONCURRENCY STORM (${concurrency} simultaneous requests)`);
  console.log(`  Firing ${concurrency} concurrent GET / requests...`);

  const promises = Array.from({ length: concurrency }, () => req("GET", "/"));
  const results = await Promise.allSettled(promises);
  const times = [];
  let errors = 0;
  const statusCodes = {};

  for (const r of results) {
    const val = r.value;
    if (!val || val.status === 0) { errors++; continue; }
    times.push(val.elapsed);
    statusCodes[val.status] = (statusCodes[val.status] || 0) + 1;
  }

  if (times.length) printStats(`${concurrency} concurrent requests`, computeStats(times), errors, concurrency);
  console.log(`  Status codes: ${Object.entries(statusCodes).map(([k, v]) => `${k}×${v}`).join(", ")}`);
}

// ─── 3. LOGIN STORM ────────────────────────────────────────────────────────────
async function testLoginStorm(count = 30) {
  section(`3. LOGIN ENDPOINT STORM (${count} requests - hits auth rate limiter)`);
  console.log("  Testing rate limiter under load...");

  const promises = Array.from({ length: count }, () =>
    req("POST", "/auth/login", { body: { email: "load@test.com", password: "wrong" } })
  );
  const results = await Promise.allSettled(promises);
  const times = [];
  const statusCodes = { "200": 0, "401": 0, "429": 0, "500": 0, "0": 0 };

  for (const r of results) {
    const val = r.value;
    if (!val) continue;
    const key = String(val.status);
    statusCodes[key] = (statusCodes[key] || 0) + 1;
    if (val.status !== 0) times.push(val.elapsed);
  }

  if (times.length) printStats("POST /auth/login", computeStats(times), statusCodes["0"], count);
  console.log(`  200: ${statusCodes["200"]} | 401: ${statusCodes["401"]} | 429 (rate-limited): ${c("yellow", statusCodes["429"])} | 500: ${statusCodes["500"]} | fail: ${statusCodes["0"]}`);

  if (statusCodes["429"] > 0) {
    console.log(c("green", `  ✅ Rate limiter active - ${statusCodes["429"]} requests throttled`));
  } else {
    console.log(c("yellow", `  ⚠️  No 429s detected in ${count} requests (limit is 20/15min per IP)`));
  }
}

// ─── 4. REGISTER BURST ─────────────────────────────────────────────────────────
async function testRegisterBurst(count = 25) {
  section(`4. REGISTRATION BURST (${count} concurrent registrations)`);
  console.log("  Firing concurrent registration requests...");

  const start = performance.now();
  const promises = Array.from({ length: count }, (_, i) =>
    req("POST", "/auth/register", {
      body: {
        name: `StressUser${i}`,
        email: `stress_${i}_${Date.now()}@test.com`,
        password: "StressTest@123",
      },
    })
  );
  const results = await Promise.allSettled(promises);
  const elapsed = performance.now() - start;

  const statusCodes = {};
  const times = [];
  for (const r of results) {
    const val = r.value;
    if (!val) continue;
    const k = String(val.status);
    statusCodes[k] = (statusCodes[k] || 0) + 1;
    if (val.status !== 0) times.push(val.elapsed);
  }

  console.log(`  Total time: ${elapsed.toFixed(0)}ms for ${count} requests`);
  console.log(`  Throughput: ${(count / (elapsed / 1000)).toFixed(1)} req/s`);
  if (times.length) printStats("POST /auth/register", computeStats(times), statusCodes["0"] || 0, count);
  console.log(`  Status codes: ${Object.entries(statusCodes).map(([k, v]) => `${k}×${v}`).join(", ")}`);
}

// ─── 5. SUSTAINED LOAD TEST ───────────────────────────────────────────────────
async function testSustainedLoad(durationSec = 10, rps = 5) {
  section(`5. SUSTAINED LOAD (${rps} req/s for ${durationSec}s = ~${rps * durationSec} requests)`);
  console.log(`  Sending ~${rps} requests/second for ${durationSec} seconds...`);

  const interval = 1000 / rps;
  const results = [];
  const startTime = Date.now();
  const endTime = startTime + durationSec * 1000;

  let i = 0;
  while (Date.now() < endTime) {
    const r = req("GET", "/");
    results.push(r);
    await new Promise((resolve) => setTimeout(resolve, interval));
    i++;
    if (i % (rps * 2) === 0) process.stdout.write(".");
  }
  console.log();

  const resolved = await Promise.allSettled(results);
  const times = [];
  let errors = 0;
  const statusCodes = {};

  for (const r of resolved) {
    const val = r.value;
    if (!val || val.status === 0) { errors++; continue; }
    times.push(val.elapsed);
    statusCodes[val.status] = (statusCodes[val.status] || 0) + 1;
  }

  const totalReqs = resolved.length;
  const actualElapsed = (Date.now() - startTime) / 1000;
  console.log(`  Total: ${totalReqs} requests in ${actualElapsed.toFixed(1)}s`);
  console.log(`  Actual throughput: ${(totalReqs / actualElapsed).toFixed(1)} req/s`);
  if (times.length) printStats("GET / sustained", computeStats(times), errors, totalReqs);
  console.log(`  Status codes: ${Object.entries(statusCodes).map(([k, v]) => `${k}×${v}`).join(", ")}`);
}

// ─── 6. LARGE BODY FLOOD ──────────────────────────────────────────────────────
async function testLargeBodyFlood(count = 10) {
  section(`6. LARGE BODY FLOOD (${count} requests near 10kb limit)`);

  const almostMax = "X".repeat(9800); // ~9.8kb, under 10kb limit
  const times = [];
  const statuses = [];

  for (let i = 0; i < count; i++) {
    const r = await req("POST", "/auth/register", {
      body: { name: almostMax.slice(0, 100), email: `big_${i}@test.com`, password: almostMax.slice(0, 72) },
    });
    statuses.push(r.status);
    if (r.status !== 0) times.push(r.elapsed);
    process.stdout.write(".");
  }
  console.log();

  if (times.length) printStats("POST /auth/register (large body)", computeStats(times), 0, count);

  // Over limit (>10kb)
  const overMax = { name: "A".repeat(50), email: "over@test.com", password: "P@ss1234", extra: "X".repeat(15000) };
  const r = await req("POST", "/auth/register", { body: overMax });
  r.status === 413
    ? console.log(c("green", "\n  ✅ 10kb body limit enforced (413 on oversized body)"))
    : console.log(c("yellow", `\n  ⚠️  Oversized body response: HTTP ${r.status} (expected 413)`));
}

// ─── 7. ENDPOINT AVAILABILITY ─────────────────────────────────────────────────
async function testEndpointAvailability() {
  section("7. ENDPOINT AVAILABILITY CHECK");

  const endpoints = [
    { method: "GET", path: "/" },
    { method: "POST", path: "/auth/register" },
    { method: "POST", path: "/auth/login" },
    { method: "POST", path: "/auth/refresh" },
    { method: "POST", path: "/auth/logout" },
    { method: "GET", path: "/auth/me" },
    { method: "GET", path: "/auth/github" },
    { method: "GET", path: "/check-follower" },
    { method: "POST", path: "/follow-users" },
    { method: "GET", path: "/check-unfollower" },
    { method: "POST", path: "/new-follower" },
    { method: "DELETE", path: "/unfollow-users" },
    { method: "POST", path: "/filter-organic" },
    { method: "GET", path: "/api-docs" },
  ];

  for (const e of endpoints) {
    const r = await req(e.method, e.path, { body: e.method !== "GET" ? {} : undefined });
    const statusColor = r.status >= 500 ? "red" : r.status === 0 ? "red" : r.status === 404 ? "yellow" : "green";
    const note = r.status === 0 ? "(UNREACHABLE)" : r.status === 404 ? "(NOT FOUND)" : "";
    console.log(
      `  ${c(statusColor, String(r.status || "ERR").padEnd(4))} ${e.method.padEnd(6)} ${e.path.padEnd(30)} ${r.elapsed?.toFixed(0) ?? "?"}ms ${note}`
    );
  }
}

// ─── 8. MEMORY/LEAK PROBE ─────────────────────────────────────────────────────
async function testLeakProbe() {
  section("8. MEMORY LEAK PROBE (100 rapid sequential requests)");
  console.log("  Sending 100 rapid requests to check for performance degradation...");

  const times = [];
  for (let i = 0; i < 100; i++) {
    const r = await req("GET", "/");
    if (r.status !== 0) times.push(r.elapsed);
  }

  const first10Avg = times.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
  const last10Avg = times.slice(-10).reduce((a, b) => a + b, 0) / 10;
  const degradation = ((last10Avg - first10Avg) / first10Avg) * 100;

  const stats = computeStats(times);
  printStats("100 sequential GET /", stats, 100 - times.length, 100);
  console.log(`\n  First 10 avg: ${first10Avg.toFixed(0)}ms | Last 10 avg: ${last10Avg.toFixed(0)}ms`);

  if (degradation > 50) {
    console.log(c("red", `  ❌ Performance degraded ${degradation.toFixed(1)}% - possible memory leak or resource exhaustion!`));
  } else if (degradation > 20) {
    console.log(c("yellow", `  ⚠️  Slight degradation: ${degradation.toFixed(1)}%`));
  } else {
    console.log(c("green", `  ✅ No significant degradation (${degradation.toFixed(1)}%)`));
  }
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(c("bold", `\n${"═".repeat(60)}`));
  console.log(c("bold", c("magenta", "  STRESS TEST SUITE - GitHub Follower Manager Backend")));
  console.log(c("bold", `  Target: ${BASE_URL}`));
  console.log(c("bold", `${"═".repeat(60)}\n`));

  // Check server is up
  const ping = await req("GET", "/");
  if (ping.status === 0) {
    console.error(c("red", `\n  ❌ SERVER NOT REACHABLE at ${BASE_URL}`));
    console.error(c("yellow", `  Run: npm run dev    (then retry)\n`));
    process.exit(1);
  }
  console.log(c("green", `  Server is UP → HTTP ${ping.status}  (${ping.elapsed.toFixed(0)}ms)\n`));

  const serverOk = await testBaseline();
  if (!serverOk) { console.log(c("red", "Server unavailable, aborting.")); process.exit(1); }

  await testEndpointAvailability();
  await testConcurrency(50);
  await testLoginStorm(30);
  await testRegisterBurst(25);
  await testSustainedLoad(10, 5);
  await testLargeBodyFlood(10);
  await testLeakProbe();

  console.log(c("bold", `\n${"═".repeat(60)}`));
  console.log(c("bold", c("magenta", "  STRESS TEST COMPLETE")));
  console.log(`${"═".repeat(60)}\n`);
}

main().catch(console.error);
