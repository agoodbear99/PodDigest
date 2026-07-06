/**
 * Claude's Messages API does not accept audio input (no audio content block type) — only
 * text, images, and documents. To summarize an uploaded MP3/M4A, the audio must first be
 * transcribed to text by a separate speech-to-text service, and only the transcript is sent
 * to Claude for summarization.
 *
 * This is a stub. Plug in a transcription provider (e.g. OpenAI Whisper API, AssemblyAI,
 * Deepgram, or a self-hosted whisper.cpp) here before wiring up the audio-upload tab.
 *
 * @param {{ filePath: string, mimeType: string }} input
 * @returns {Promise<string>} the transcript text
 */
async function transcribeAudio({ filePath, mimeType }) {
  const err = new Error(
    'Audio transcription is not configured yet. Claude cannot summarize raw audio directly — ' +
      'wire up a speech-to-text provider in backend/src/services/transcriptionService.js first.'
  );
  err.status = 501;
  throw err;
}

module.exports = { transcribeAudio };
