#!/usr/bin/env node
/*
 * LifeOS ActivityWatch collector.
 * Reads local ActivityWatch window events and pushes them to the LifeOS server.
 *
 * Env:
 *   LIFEOS_SERVER       required, e.g. http://192.168.1.10:4000 (or VPS URL)
 *   LIFEOS_DEVICE_TOKEN required, device token from LifeOS Settings -> Devices
 *   LIFEOS_AW_URL       optional, default http://127.0.0.1:5600/api/0/
 *   LIFEOS_INTERVAL_MS  optional, default 300000 (5 min)
 *
 * Usage:
 *   node scripts/collect-aw.cjs            # run forever
 *   node scripts/collect-aw.cjs --once     # single run (for Task Scheduler / cron)
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

const AW_BASE = (process.env.LIFEOS_AW_URL || "http://127.0.0.1:5600/api/0/").replace(/\/$/, "/");
const SERVER = (process.env.LIFEOS_SERVER || "").replace(/\/$/, "");
const TOKEN = process.env.LIFEOS_DEVICE_TOKEN || "";
const INTERVAL_MS = Number(process.env.LIFEOS_INTERVAL_MS || 300000);
const STATE_DIR = path.join(os.homedir(), ".lifeos");
const STATE_FILE = path.join(STATE_DIR, "collector-state.json");

const BACKFILL_MS = 48 * 3600 * 1000; // 48h on first run

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeState(state) {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch (err) {
    console.error("[collect-aw] cannot write state:", err.message);
  }
}

async function getWindowBucket() {
  const r = await fetch(`${AW_BASE}buckets/`, { signal: AbortSignal.timeout(5000) });
  const buckets = await r.json();
  return Object.keys(buckets).find(
    (id) => id.includes("aw-watcher-window") || id.includes("aw-watcher-windows")
  );
}

async function fetchEvents(bucketId, start, end) {
  const url =
    `${AW_BASE}buckets/${encodeURIComponent(bucketId)}/events` +
    `?start=${encodeURIComponent(start.toISOString())}` +
    `&end=${encodeURIComponent(end.toISOString())}&limit=20000`;
  const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
  return r.json();
}

async function sendBatch(events) {
  const r = await fetch(`${SERVER}/api/screentime/events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-device-token": TOKEN,
    },
    body: JSON.stringify({ events }),
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`server responded ${r.status}: ${body.slice(0, 200)}`);
  }
  const json = await r.json();
  return json.received;
}

async function runOnce() {
  if (!SERVER || !TOKEN) {
    console.error("[collect-aw] LIFEOS_SERVER and LIFEOS_DEVICE_TOKEN are required");
    process.exit(1);
  }

  const state = readState();
  const now = new Date();
  const start = state.lastSync ? new Date(state.lastSync) : new Date(now.getTime() - BACKFILL_MS);

  const bucketId = await getWindowBucket();
  if (!bucketId) {
    console.error("[collect-aw] ActivityWatch window bucket not found — is AW running?");
    return;
  }

  const events = await fetchEvents(bucketId, start, now);
  const valid = [];
  for (const e of events) {
    const dur = Number(e.duration || 0);
    if (dur < 1) continue;
    const app = (e.data?.app ?? e.data?.application ?? "").trim();
    const title = (e.data?.title ?? "").trim();
    valid.push({ timestamp: e.timestamp, duration: Math.round(dur), app, title });
  }

  if (valid.length === 0) {
    writeState({ lastSync: now.toISOString() });
    console.log("[collect-aw] nothing new");
    return;
  }

  const received = await sendBatch(valid);
  writeState({ lastSync: now.toISOString() });
  console.log(`[collect-aw] sent ${received}/${valid.length} events`);
}

async function main() {
  const once = process.argv.includes("--once");
  if (once) {
    await runOnce();
    return;
  }

  console.log(`[collect-aw] watching AW every ${Math.round(INTERVAL_MS / 1000)}s -> ${SERVER}`);
  for (;;) {
    try {
      await runOnce();
    } catch (err) {
      console.error("[collect-aw]", err.message);
    }
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
}

main().catch((err) => {
  console.error("[collect-aw] fatal:", err);
  process.exit(1);
});
