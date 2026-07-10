const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  // Some podcast feeds nest markup deeply (e.g. rich HTML in show notes) and blow
  // past fast-xml-parser's default cap of 100, throwing "Maximum nested tags exceeded".
  maxNestedTags: 10000,
});

const MAX_EPISODES = 20;

const FETCH_TIMEOUT_MS = 10 * 1000; // 10s — avoid hanging forever on a slow/dead host
const FEED_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const APPLE_LOOKUP_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Minimal in-memory TTL cache — entries just expire on read, no background sweep needed. */
function createTtlCache(ttlMs) {
  const store = new Map();
  return {
    get(key) {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value) {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
  };
}

const feedCache = createTtlCache(FEED_CACHE_TTL_MS);
const appleLookupCache = createTtlCache(APPLE_LOOKUP_CACHE_TTL_MS);

/**
 * fetch() with a hard timeout. Network failures and aborts are both normalized
 * into a thrown Error with a `.status` the route layer can respond with.
 */
async function fetchWithTimeout(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error(`Request timed out after ${timeoutMs / 1000}s: ${url}`);
      timeoutErr.status = 504;
      throw timeoutErr;
    }
    const networkErr = new Error(`Network error while fetching ${url}: ${err.message}`);
    networkErr.status = 502;
    throw networkErr;
  } finally {
    clearTimeout(timeoutId);
  }
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    try {
      // Be lenient about URLs pasted without a scheme (e.g. "podcasts.apple.com/...").
      return new URL(`https://${url}`).hostname.toLowerCase();
    } catch {
      return '';
    }
  }
}

function isSpotifyUrl(url) {
  const hostname = hostnameOf(url);
  return hostname === 'spotify.com' || hostname.endsWith('.spotify.com');
}

function isApplePodcastsUrl(url) {
  const hostname = hostnameOf(url);
  return hostname === 'podcasts.apple.com' || hostname.endsWith('.podcasts.apple.com');
}

function extractAppleId(url) {
  const match = url.match(/id(\d+)/);
  return match ? match[1] : null;
}

/**
 * Resolves an Apple Podcasts URL to its underlying RSS feed URL via the public iTunes Lookup API.
 */
async function resolveAppleRssUrl(appleUrl) {
  const appleId = extractAppleId(appleUrl);
  if (!appleId) {
    const err = new Error('Could not find a podcast id in that Apple Podcasts URL.');
    err.status = 400;
    throw err;
  }

  const cached = appleLookupCache.get(appleId);
  if (cached) return cached;

  // `country=US` pins the lookup to the US catalog so results are consistent
  // regardless of the server's own IP-based locale.
  const lookupUrl = `https://itunes.apple.com/lookup?id=${appleId}&entity=podcast&country=US`;
  const res = await fetchWithTimeout(lookupUrl);
  if (!res.ok) {
    const err = new Error(`Apple lookup failed with status ${res.status}.`);
    err.status = 502;
    throw err;
  }

  const data = await res.json();
  const result = data.results && data.results[0];
  if (!result || !result.feedUrl) {
    const err = new Error('Apple Podcasts did not return an RSS feed URL for this show.');
    err.status = 404;
    throw err;
  }

  appleLookupCache.set(appleId, result.feedUrl);
  return result.feedUrl;
}

function toArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function textOf(node) {
  if (node === undefined || node === null) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'object' && '#text' in node) return String(node['#text']);
  return '';
}

function imageUrlOf(node) {
  if (!node || typeof node !== 'object') return null;
  if (node['@_href']) return node['@_href'];
  if (node.url) return textOf(node.url) || null;
  return null;
}

/**
 * Fetches and parses an RSS feed, returning show metadata and the most recent episodes.
 */
async function fetchFeed(rssUrl) {
  const cached = feedCache.get(rssUrl);
  if (cached) return cached;

  const res = await fetchWithTimeout(rssUrl);
  if (!res.ok) {
    const err = new Error(`Failed to fetch RSS feed (status ${res.status}).`);
    err.status = 502;
    // The real upstream status (404, 403, ...), as opposed to the 502 we return to
    // our own API client — callers use this to tell "feed is gone" apart from
    // other fetch failures and craft a more specific message.
    err.upstreamStatus = res.status;
    throw err;
  }

  const xml = await res.text();
  const parsed = parser.parse(xml);
  const channel = parsed && parsed.rss && parsed.rss.channel;
  if (!channel) {
    const err = new Error('That URL did not return a valid podcast RSS feed.');
    err.status = 422;
    throw err;
  }

  const items = toArray(channel.item).slice(0, MAX_EPISODES);
  const showImage = imageUrlOf(channel['itunes:image']) || imageUrlOf(channel.image) || null;

  const episodes = items.map((item, index) => {
    const audioUrl = item.enclosure ? item.enclosure['@_url'] : null;
    const pubDate = textOf(item.pubDate) || null;
    const title = textOf(item.title) || `Episode ${index + 1}`;

    return {
      id: String(index),
      // Stable identity for an episode across separate feed fetches, used to
      // detect "is this a new episode?" — prefers the RSS <guid>, falling
      // back to the audio URL or a title+pubDate composite when absent.
      guid: textOf(item.guid) || audioUrl || `${title}::${pubDate}`,
      title,
      description: stripHtml(
        textOf(item['itunes:summary']) || textOf(item.description) || textOf(item['content:encoded'])
      ),
      pubDate,
      audioUrl,
      imageUrl: imageUrlOf(item['itunes:image']) || showImage,
    };
  });

  const feedData = {
    showTitle: textOf(channel.title) || 'Untitled Show',
    showImage,
    rssUrl,
    episodes,
  };
  feedCache.set(rssUrl, feedData);
  return feedData;
}

/**
 * Resolves a user-supplied URL (Apple Podcasts, raw RSS, or Spotify) to feed metadata + episodes.
 * Throws a 400 with a clear message for Spotify URLs, which have no public RSS resolution path.
 */
async function resolvePodcastUrl(inputUrl) {
  const url = inputUrl.trim();

  if (isSpotifyUrl(url)) {
    const err = new Error(
      'Spotify does not publish a public RSS feed for podcasts, so this link can’t be resolved automatically. ' +
        'Please paste the show’s RSS feed URL instead (search the podcast name + "RSS feed", or check the podcast’s own website).'
    );
    err.status = 400;
    throw err;
  }

  if (!isApplePodcastsUrl(url)) {
    return fetchFeed(url);
  }

  const rssUrl = await resolveAppleRssUrl(url);
  try {
    return await fetchFeed(rssUrl);
  } catch (err) {
    if (err.upstreamStatus === 404 || err.upstreamStatus === 403) {
      const wrapped = new Error(
        `This show's RSS feed (${rssUrl}) is unavailable right now (status ${err.upstreamStatus}). ` +
          'This usually means the podcast has been taken down, the network moved it to a different host, ' +
          'or it’s now a subscriber-only show (e.g. Wondery+ or an Apple Podcasts subscription) that ' +
          'doesn’t publish a public feed. Try searching for the show’s name plus "RSS feed" to find an ' +
          'alternative link, or check the show’s official website.'
      );
      wrapped.status = err.upstreamStatus;
      throw wrapped;
    }
    throw err;
  }
}

module.exports = { resolvePodcastUrl, fetchFeed, isSpotifyUrl, isApplePodcastsUrl };
