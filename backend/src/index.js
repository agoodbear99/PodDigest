require('dotenv').config();

const express = require('express');
const cors = require('cors');

const podcastRoutes = require('./routes/podcast');
const summarizeRoutes = require('./routes/summarize');
const subscriptionRoutes = require('./routes/subscriptions');
const { startEpisodeWatcher } = require('./services/episodeWatcher');

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    'Warning: ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key before summarizing.'
  );
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/podcast', podcastRoutes);
app.use('/api/summarize', summarizeRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// Centralized error handler — every route above calls next(err) on failure.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error.' });
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`PodDigest backend listening on http://localhost:${PORT}`);
  startEpisodeWatcher();
});
