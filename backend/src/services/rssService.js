const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
});

const MAX_EPISODES = 20;

function isSpotifyUrl(url) {
  return /(^|\.)open\.spotify\.com/i.test(url) || /(^|\.)spotify\.com/i.test(url);
}

function isApplePodcastsUrl(url) {
  return /(^|\.)podcasts\.apple\.com/i.test(url);
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

  const lookupUrl = `https://itunes.apple.com/lookup?id=${appleId}&entity=podcast`;
  const res = await fetch(lookupUrl);
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
  const res = await fetch(rssUrl);
  if (!res.ok) {
    const err = new Error(`Failed to fetch RSS feed (status ${res.status}).`);
    err.status = 502;
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

  const episodes = items.map((item, index) => ({
    id: String(index),
    title: textOf(item.title) || `Episode ${index + 1}`,
    description: stripHtml(
      textOf(item['itunes:summary']) || textOf(item.description) || textOf(item['content:encoded'])
    ),
    pubDate: textOf(item.pubDate) || null,
    audioUrl: item.enclosure ? item.enclosure['@_url'] : null,
    imageUrl: imageUrlOf(item['itunes:image']) || showImage,
  }));

  return {
    showTitle: textOf(channel.title) || 'Untitled Show',
    showImage,
    rssUrl,
    episodes,
  };
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

  const rssUrl = isApplePodcastsUrl(url) ? await resolveAppleRssUrl(url) : url;
  return fetchFeed(rssUrl);
}

module.exports = { resolvePodcastUrl, fetchFeed, isSpotifyUrl, isApplePodcastsUrl };
