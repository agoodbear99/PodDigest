/**
 * Claude's Messages API does not accept audio input (no audio content block type) — only
 * text, images, and documents. To summarize a podcast episode from its audio, the audio
 * must first be transcribed to text by OpenAI's Whisper API, and only the transcript is
 * sent to Claude for summarization.
 */

const fs = require('fs/promises');

const OPENAI_TRANSCRIPTION_URL = 'https://api.openai.com/v1/audio/transcriptions';
const WHISPER_MODEL = 'whisper-1';
const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // Whisper API's per-file limit

function assertConfigured() {
  if (!process.env.OPENAI_API_KEY) {
    const err = new Error('Audio transcription is not configured (missing OPENAI_API_KEY).');
    err.status = 501;
    throw err;
  }
}

async function callWhisper(blob, filename) {
  assertConfigured();

  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('model', WHISPER_MODEL);

  const res = await fetch(OPENAI_TRANSCRIPTION_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: formData,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    const err = new Error(`Whisper transcription failed (status ${res.status}). ${detail}`.trim());
    err.status = 502;
    throw err;
  }

  const data = await res.json();
  return data.text || '';
}

/**
 * Transcribes an audio file already saved on local disk (uploaded via multer).
 * @param {{ filePath: string, mimeType: string }} input
 * @returns {Promise<string>} the transcript text
 */
async function transcribeAudio({ filePath, mimeType }) {
  const stats = await fs.stat(filePath);
  if (stats.size > MAX_AUDIO_BYTES) {
    const err = new Error('Audio file is too large to transcribe (25MB limit).');
    err.status = 413;
    throw err;
  }

  const buffer = await fs.readFile(filePath);
  const blob = new Blob([buffer], { type: mimeType || 'audio/mpeg' });
  return callWhisper(blob, 'episode.mp3');
}

/**
 * Downloads a remote episode audio file (an RSS <enclosure> URL) and transcribes it.
 * @param {string} audioUrl
 * @returns {Promise<string>} the transcript text
 */
async function transcribeAudioFromUrl(audioUrl) {
  assertConfigured();

  const res = await fetch(audioUrl);
  if (!res.ok) {
    const err = new Error(`Failed to download episode audio (status ${res.status}).`);
    err.status = 502;
    throw err;
  }

  const contentLength = Number(res.headers.get('content-length') || 0);
  if (contentLength > MAX_AUDIO_BYTES) {
    const err = new Error('Episode audio file is too large to transcribe (25MB limit).');
    err.status = 413;
    throw err;
  }

  const arrayBuffer = await res.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_AUDIO_BYTES) {
    const err = new Error('Episode audio file is too large to transcribe (25MB limit).');
    err.status = 413;
    throw err;
  }

  const mimeType = res.headers.get('content-type') || 'audio/mpeg';
  const blob = new Blob([arrayBuffer], { type: mimeType });
  return callWhisper(blob, 'episode-audio');
}

module.exports = { transcribeAudio, transcribeAudioFromUrl };
