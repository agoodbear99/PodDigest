import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@poddigest/history';
const MAX_ITEMS = 50;

/**
 * @returns {Promise<Array>} history items, newest first
 */
export async function getHistory() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Prepends a new entry and persists it, capping the list at MAX_ITEMS.
 * @param {{ source: object, summary: object }} entry
 */
export async function addHistoryItem({ source, summary }) {
  const history = await getHistory();
  const item = {
    id: `${Date.now()}`,
    createdAt: new Date().toISOString(),
    source,
    summary,
  };
  const next = [item, ...history].slice(0, MAX_ITEMS);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return item;
}

export async function removeHistoryItem(id) {
  const history = await getHistory();
  const next = history.filter((item) => item.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function clearHistory() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
