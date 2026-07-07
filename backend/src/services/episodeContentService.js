const { transcribeAudioFromUrl } = require('./transcriptionService');

const MIN_DESCRIPTION_LENGTH = 40;

function isMeaningful(text) {
  return Boolean(text && text.trim().length >= MIN_DESCRIPTION_LENGTH);
}

/**
 * Resolves what text to summarize for an episode, in priority order:
 *   1. The RSS show notes / description, if substantial (handles feeds like NPR
 *      News Now whose <description> is empty or a placeholder).
 *   2. A transcript of the episode audio (via Whisper), if an audio URL is available.
 *   3. Neither — the caller should fall back to a title-only best-guess summary.
 * @param {{ description?: string, audioUrl?: string }} input
 * @returns {Promise<{ sourceText: string|null, isGuess: boolean }>}
 */
async function resolveEpisodeSourceText({ description, audioUrl }) {
  if (isMeaningful(description)) {
    return { sourceText: description, isGuess: false };
  }

  if (audioUrl) {
    try {
      const transcript = await transcribeAudioFromUrl(audioUrl);
      if (isMeaningful(transcript)) {
        return { sourceText: transcript, isGuess: false };
      }
    } catch (err) {
      console.warn(`Falling back to a title-only guess — audio transcription failed: ${err.message}`);
    }
  }

  return { sourceText: null, isGuess: true };
}

module.exports = { resolveEpisodeSourceText };
