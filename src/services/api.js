import { API_BASE_URL } from '../config';

async function handleResponse(res) {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status}).`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Resolves an Apple Podcasts URL or raw RSS feed URL to show metadata + recent episodes.
 * @param {string} url
 * @returns {Promise<{ showTitle: string, rssUrl: string, episodes: Array }>}
 */
export async function resolvePodcast(url) {
  const res = await fetch(`${API_BASE_URL}/api/podcast/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  return handleResponse(res);
}

/**
 * Summarizes an episode. Prefers `description`; if it's empty, the backend falls back
 * to transcribing `audioUrl` (the RSS enclosure), then to a title-only best guess.
 * @param {{ showTitle?: string, episodeTitle?: string, description?: string, audioUrl?: string, language?: 'zh-TW'|'en' }} episode
 * @returns {Promise<{ bulletPoints: string[], shortSummary: string }>}
 */
export async function summarizeEpisode(episode) {
  const res = await fetch(`${API_BASE_URL}/api/summarize/episode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(episode),
  });
  return handleResponse(res);
}

/**
 * Uploads an audio file (MP3/M4A) for transcription + summarization.
 * @param {{ uri: string, name: string, mimeType: string }} file
 * @param {'zh-TW'|'en'} [language]
 * @returns {Promise<{ bulletPoints: string[], shortSummary: string }>}
 */
export async function summarizeAudio(file, language) {
  const formData = new FormData();
  formData.append('audio', {
    uri: file.uri,
    name: file.name || 'episode.mp3',
    type: file.mimeType || 'audio/mpeg',
  });
  if (language) {
    formData.append('language', language);
  }

  const res = await fetch(`${API_BASE_URL}/api/summarize/audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data' },
    body: formData,
  });
  return handleResponse(res);
}

/**
 * Today's free-summary usage for the caller's IP (does not consume a slot).
 * @returns {Promise<{ used: number, remaining: number, limit: number }>}
 */
export async function getUsageStatus() {
  const res = await fetch(`${API_BASE_URL}/api/summarize/usage`);
  return handleResponse(res);
}
