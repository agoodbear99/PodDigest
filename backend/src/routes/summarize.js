const express = require('express');
const fs = require('fs/promises');
const { summarizeEpisode } = require('../services/claudeClient');
const { transcribeAudio } = require('../services/transcriptionService');
const { resolveEpisodeSourceText } = require('../services/episodeContentService');
const { upload } = require('../middleware/upload');
const { consumeSummary, getUsage } = require('../services/usageService');

const router = express.Router();

// Gate for the two summarize endpoints below. Free users are limited by IP
// (see usageService); on rejection responds 429 with the same shape the
// frontend needs to render "今日免費摘要次數已用完 (used/limit)".
//
// `isPremium` is a placeholder — until RevenueCat entitlement verification is
// wired up, it can only be set by a trusted request field, never by an
// unverified client claim in production. For now it stays `false` unless a
// future change passes a verified value in here.
function checkUsageLimit(req, res, next) {
  const isPremium = false;
  consumeSummary(req.ip, { isPremium })
    .then((result) => {
      if (!result.allowed) {
        // On the audio route this runs after multer has already written the
        // upload to disk; the route handler (which normally cleans it up)
        // never runs, so clear it here to avoid leaking temp files.
        if (req.file) fs.unlink(req.file.path).catch(() => {});
        return res.status(429).json({
          error: 'Daily free summary limit reached.',
          used: result.used,
          remaining: result.remaining,
          limit: result.limit,
        });
      }
      next();
    })
    .catch(next);
}

// GET /api/summarize/usage — today's remaining free-summary count for the
// caller's IP, without consuming one. Used by the home screen to show
// "今日剩餘摘要次數：X/5" and to grey out the resolve button when exhausted.
router.get('/usage', (req, res) => {
  res.json(getUsage(req.ip));
});

// POST /api/summarize/episode  { showTitle?, episodeTitle?, description?, audioUrl?, language? }
// Summarizes an RSS episode. Prefers the show notes / description; if that's empty
// (e.g. NPR News Now's feed), falls back to transcribing the episode audio (if an
// enclosure URL is available), and as a last resort produces a title-only best guess.
// `language` selects the output language ("zh-TW" or "en"; defaults to "zh-TW").
router.post('/episode', checkUsageLimit, async (req, res, next) => {
  try {
    const { showTitle, episodeTitle, description, audioUrl, language } = req.body;
    const { sourceText, isGuess } = await resolveEpisodeSourceText({ description, audioUrl });

    const summary = await summarizeEpisode({
      showTitle,
      episodeTitle,
      sourceText,
      isGuess,
      language,
    });
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

// POST /api/summarize/audio  multipart/form-data with an "audio" field and an
// optional "language" field ("zh-TW" or "en").
// Transcribes the uploaded audio, then summarizes the transcript.
router.post('/audio', upload.single('audio'), checkUsageLimit, async (req, res, next) => {
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
      language: req.body.language,
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
