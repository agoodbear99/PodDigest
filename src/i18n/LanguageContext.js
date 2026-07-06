import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import en from './locales/en';
import zh from './locales/zh';

const STORAGE_KEY = '@poddigest/language';
const DEFAULT_LANGUAGE = 'zh';
const RESOURCES = { en, zh };

const LanguageContext = createContext(null);

function getNested(obj, path) {
  return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

function interpolate(template, vars) {
  if (!vars || typeof template !== 'string') return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] !== undefined ? vars[key] : `{{${key}}}`));
}

function detectDeviceLanguage() {
  const languageCode = getLocales()[0]?.languageCode;
  return languageCode === 'en' ? 'en' : DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (cancelled) return;
      setLanguageState(saved && RESOURCES[saved] ? saved : detectDeviceLanguage());
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback((next) => {
    if (!RESOURCES[next]) return;
    setLanguageState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const t = useCallback(
    (key, vars) => {
      const template =
        getNested(RESOURCES[language], key) ?? getNested(RESOURCES[DEFAULT_LANGUAGE], key) ?? key;
      return interpolate(template, vars);
    },
    [language]
  );

  const value = useMemo(() => ({ language, setLanguage, t, ready }), [language, setLanguage, t, ready]);

  if (!ready) return null;

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
