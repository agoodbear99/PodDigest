const express = require('express');
const fs = require('fs/promises');
const { summarizeEpisode } = require('../services/claudeClient');
const { transcribeAudio } = require('../services/transcriptionService');
const { resolveEpisodeSourceText } = require('../services/episodeContentService');
const { upload } = require('../middleware/upload');

const router = express.Router();

// POST /api/summarize/episode  { showTitle?, episodeTitle?, description?, audioUrl? }
// Summarizes an RSS episode. Prefers the show notes / description; if that's empty
// (e.g. NPR News Now's feed), falls back to transcribing the episode audio (if an
// enclosure URL is available), and as a last resort produces a title-only best guess.
router.post('/episode', async (req, res, next) => {
  try {
    const { showTitle, episodeTitle, description, audioUrl } = req.body;
    const { sourceText, isGuess } = await resolveEpisodeSourceText({ description, audioUrl });

    const summary = await summarizeEpisode({
      showTitle,
      episodeTitle,
      sourceText,
      isGuess,
    });
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

// POST /api/summarize/audio  multipart/form-data with an "audio" file field.
// Transcribes the uploaded audio, then summarizes the transcript.
router.post('/audio', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Missing "audio" file in form data.' });
    }

    const transcript = await transcribeAudio({
      filePath: req.file.path,
      mimeType: req.file.mimetype,
    });

    const summary = await summarizeEpisode({
      episodeTitle: req.file.originalname,
      sourceText: transcript,
    });

    res.json(summary);
  } catch (err) {
    next(err);
  } finally {
    if (req.file) {
      fs.unlink(req.file.path).catch(() => {});
    }
  }
});

module.exports = router;
