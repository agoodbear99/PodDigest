const express = require('express');
const { subscribe, unsubscribe } = require('../services/subscriptionStore');
const { fetchFeed } = require('../services/rssService');
const { checkAllSubscriptions } = require('../services/episodeWatcher');

const router = express.Router();

// POST /api/subscriptions  { rssUrl, showTitle?, pushToken }
// Subscribes a device (identified by its Expo push token) to new-episode
// notifications for a feed. Baselines against the feed's current newest
// episode so subscribing doesn't trigger a notification for old episodes.
router.post('/', async (req, res, next) => {
  try {
    const { rssUrl, showTitle, pushToken } = req.body;
    if (!rssUrl || !pushToken) {
      return res.status(400).json({ error: 'Missing "rssUrl" or "pushToken" in request body.' });
    }

    const feed = await fetchFeed(rssUrl);
    const lastSeenGuid = feed.episodes[0] ? feed.episodes[0].guid : null;

    const entry = await subscribe({
      rssUrl,
      showTitle: showTitle || feed.showTitle,
      pushToken,
      lastSeenGuid,
    });
    res.json({ subscribed: true, showTitle: entry.showTitle });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/subscriptions  { rssUrl, pushToken }
router.delete('/', async (req, res, next) => {
  try {
    const { rssUrl, pushToken } = req.body;
    if (!rssUrl || !pushToken) {
      return res.status(400).json({ error: 'Missing "rssUrl" or "pushToken" in request body.' });
    }
    await unsubscribe({ rssUrl, pushToken });
    res.json({ subscribed: false });
  } catch (err) {
    next(err);
  }
});

// POST /api/subscriptions/check
// Manually triggers a check-and-notify pass over every subscribed feed,
// instead of waiting for the periodic poll — handy for testing.
router.post('/check', async (req, res, next) => {
  try {
    await checkAllSubscriptions();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
