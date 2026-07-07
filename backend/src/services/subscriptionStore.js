const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'subscriptions.json');

// In-memory cache, write-through to disk. A single Node process handles all
// requests, so keeping the store in memory avoids read/write races between
// concurrent requests while still persisting across restarts.
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

/** @returns {Record<string, { showTitle: string, lastSeenGuid: string|null, tokens: string[] }>} */
function getAll() {
  return load();
}

/**
 * Registers a push token for a feed. Creates the entry (with the given
 * baseline lastSeenGuid) if this is the first subscriber for that feed.
 */
async function subscribe({ rssUrl, showTitle, pushToken, lastSeenGuid }) {
  load();
  const entry = store[rssUrl] || { showTitle, lastSeenGuid: lastSeenGuid ?? null, tokens: [] };
  entry.showTitle = showTitle || entry.showTitle;
  if (!entry.tokens.includes(pushToken)) {
    entry.tokens.push(pushToken);
  }
  store[rssUrl] = entry;
  await persist();
  return entry;
}

async function unsubscribe({ rssUrl, pushToken }) {
  load();
  const entry = store[rssUrl];
  if (!entry) return;
  entry.tokens = entry.tokens.filter((token) => token !== pushToken);
  if (entry.tokens.length === 0) {
    delete store[rssUrl];
  }
  await persist();
}

async function updateLastSeenGuid(rssUrl, guid) {
  load();
  if (store[rssUrl]) {
    store[rssUrl].lastSeenGuid = guid;
    await persist();
  }
}

/** Purges a token from every feed — used when Expo reports it's no longer registered. */
async function removeTokenEverywhere(pushToken) {
  load();
  let changed = false;
  for (const rssUrl of Object.keys(store)) {
    const entry = store[rssUrl];
    if (entry.tokens.includes(pushToken)) {
      entry.tokens = entry.tokens.filter((token) => token !== pushToken);
      changed = true;
      if (entry.tokens.length === 0) delete store[rssUrl];
    }
  }
  if (changed) await persist();
}

module.exports = { getAll, subscribe, unsubscribe, updateLastSeenGuid, removeTokenEverywhere };
