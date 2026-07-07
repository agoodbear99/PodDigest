const { fetchFeed } = require('./rssService');
const { getAll, updateLastSeenGuid } = require('./subscriptionStore');
const { sendPushNotifications } = require('./pushService');

const POLL_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

async function checkFeedForNewEpisode(rssUrl, entry) {
  const feed = await fetchFeed(rssUrl);
  const latest = feed.episodes[0];
  if (!latest) return;

  if (!entry.lastSeenGuid) {
    // First check for this feed — establish a baseline instead of notifying
    // about an episode that already existed before anyone subscribed.
    await updateLastSeenGuid(rssUrl, latest.guid);
    return;
  }

  if (latest.guid === entry.lastSeenGuid) return;

  await updateLastSeenGuid(rssUrl, latest.guid);
  if (entry.tokens.length > 0) {
    await sendPushNotifications(entry.tokens, {
      title: feed.showTitle,
      body: latest.title,
      data: { rssUrl },
    });
  }
}

async function checkAllSubscriptions() {
  const store = getAll();
  for (const rssUrl of Object.keys(store)) {
    try {
      await checkFeedForNewEpisode(rssUrl, store[rssUrl]);
    } catch (err) {
      console.error(`Failed to check feed for new episodes (${rssUrl}):`, err.message);
    }
  }
}

function startEpisodeWatcher() {
  checkAllSubscriptions().catch((err) => console.error('Initial subscription check failed:', err.message));
  setInterval(() => {
    checkAllSubscriptions().catch((err) => console.error('Subscription check failed:', err.message));
  }, POLL_INTERVAL_MS);
}

module.exports = { startEpisodeWatcher, checkAllSubscriptions };
