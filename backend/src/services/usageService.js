const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'usage.json');

const DAILY_FREE_LIMIT = 5;

// In-memory cache, write-through to disk — same pattern as subscriptionStore.js.
// { [ip]: { date: 'YYYY-MM-DD', count: number } }
let store = null;

function load() {
  if (store) return store;
  try {
    store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    store = {};
  }
  return store;
}

async function persist() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.writeFile(DATA_FILE, JSON.stringify(store, null, 2));
}

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// An entry from a previous day is treated as if it doesn't exist — this
// reset-on-read approach hits the "resets at midnight" requirement without a
// timer that has to survive process restarts, and it's correct even if the
// server happens to be down exactly at midnight.
function getEntry(ip, today) {
  load();
  const entry = store[ip];
  if (!entry || entry.date !== today) {
    return { date: today, count: 0 };
  }
  return entry;
}

// Drops entries from previous days so usage.json doesn't grow unbounded.
function pruneStale(today) {
  for (const ip of Object.keys(store)) {
    if (store[ip].date !== today) delete store[ip];
  }
}

function summarize(entry) {
  return {
    used: entry.count,
    remaining: Math.max(0, DAILY_FREE_LIMIT - entry.count),
    limit: DAILY_FREE_LIMIT,
  };
}

/** Returns today's usage for an IP without consuming a summary. */
function getUsage(ip) {
  return summarize(getEntry(ip, todayKey()));
}

/**
 * Attempts to consume one free summary for the given IP. Premium users
 * (isPremium: true) bypass the limit entirely and don't consume a slot —
 * this is the hook point for the future RevenueCat entitlement check, so
 * callers only need to resolve `isPremium` and pass it through.
 */
async function consumeSummary(ip, { isPremium = false } = {}) {
  if (isPremium) {
    return { allowed: true, ...summarize({ count: 0 }) };
  }

  const today = todayKey();
  const entry = getEntry(ip, today);

  if (entry.count >= DAILY_FREE_LIMIT) {
    return { allowed: false, ...summarize(entry) };
  }

  entry.count += 1;
  entry.date = today;
  store[ip] = entry;
  pruneStale(today);
  await persist();

  return { allowed: true, ...summarize(entry) };
}

module.exports = { DAILY_FREE_LIMIT, getUsage, consumeSummary };
