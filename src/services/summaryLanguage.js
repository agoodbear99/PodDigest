import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@poddigest/summaryLanguage';
const DEFAULT_LANGUAGE = 'zh-TW';
const SUPPORTED_LANGUAGES = new Set(['zh-TW', 'en']);

/** @returns {Promise<'zh-TW'|'en'>} */
export async function getSummaryLanguage() {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  return SUPPORTED_LANGUAGES.has(stored) ? stored : DEFAULT_LANGUAGE;
}

/** @param {'zh-TW'|'en'} language */
export async function setSummaryLanguage(language) {
  if (!SUPPORTED_LANGUAGES.has(language)) return;
  await AsyncStorage.setItem(STORAGE_KEY, language);
}
