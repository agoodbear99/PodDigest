const express = require('express');
const { resolvePodcastUrl } = require('../services/rssService');

const router = express.Router();

// POST /api/podcast/resolve  { url }
// Resolves an Apple Podcasts URL or a raw RSS feed URL to show metadata + recent episodes.
router.post('/resolve', async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing "url" in request body.' });
    }

    const feed = await resolvePodcastUrl(url);
    res.json(feed);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
