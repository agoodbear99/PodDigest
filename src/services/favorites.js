import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@poddigest/favorites';

/**
 * Builds a stable identity key for a source so the same episode/audio
 * doesn't get favorited twice across separate summarize runs.
 * @param {object} source
 */
export function getSourceKey(source) {
  if (source.type === 'audio') {
    return `audio:${source.file?.name || 'unknown'}`;
  }
  return `episode:${source.showTitle || ''}::${source.episodeTitle || ''}`;
}

/**
 * @returns {Promise<Array>} favorite items, newest first
 */
export async function getFavorites() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function isFavorite(source) {
  const favorites = await getFavorites();
  const key = getSourceKey(source);
  return favorites.some((item) => item.key === key);
}

/**
 * Adds an entry (or refreshes its cached summary if it already exists).
 * @param {{ source: object, summary: object }} entry
 */
export async function addFavorite({ source, summary }) {
  const favorites = await getFavorites();
  const key = getSourceKey(source);
  const existing = favorites.find((item) => item.key === key);
  if (existing) return existing;

  const item = {
    key,
    createdAt: new Date().toISOString(),
    source,
    summary,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([item, ...favorites]));
  return item;
}

export async function removeFavorite(key) {
  const favorites = await getFavorites();
  const next = favorites.filter((item) => item.key !== key);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/**
 * Adds if absent, removes if present.
 * @returns {Promise<boolean>} the new favorited state
 */
export async function toggleFavorite({ source, summary }) {
  const key = getSourceKey(source);
  const already = await isFavorite(source);
  if (already) {
    await removeFavorite(key);
    return false;
  }
  await addFavorite({ source, summary });
  return true;
}
