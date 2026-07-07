import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

const STORAGE_KEY = '@poddigest/subscriptions';

async function handleResponse(res) {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status}).`;
    throw new Error(message);
  }
  return data;
}

/**
 * @returns {Promise<Array<{ rssUrl: string, showTitle: string, pushToken: string, subscribedAt: string }>>}
 */
export async function getSubscriptions() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function isSubscribed(rssUrl) {
  const subs = await getSubscriptions();
  return subs.some((sub) => sub.rssUrl === rssUrl);
}

/**
 * Registers this device's push token with the backend for new-episode
 * notifications on this feed, then remembers the subscription locally.
 */
export async function subscribeToFeed({ rssUrl, showTitle, pushToken }) {
  const res = await fetch(`${API_BASE_URL}/api/subscriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rssUrl, showTitle, pushToken }),
  });
  await handleResponse(res);

  const subs = await getSubscriptions();
  const next = [
    { rssUrl, showTitle, pushToken, subscribedAt: new Date().toISOString() },
    ...subs.filter((sub) => sub.rssUrl !== rssUrl),
  ];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/**
 * Unsubscribes using the push token that was stored at subscribe time, so
 * the caller doesn't need to re-request notification permission just to
 * unsubscribe.
 */
export async function unsubscribeFromFeed(rssUrl) {
  const subs = await getSubscriptions();
  const entry = subs.find((sub) => sub.rssUrl === rssUrl);
  if (!entry) return;

  const res = await fetch(`${API_BASE_URL}/api/subscriptions`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rssUrl, pushToken: entry.pushToken }),
  });
  await handleResponse(res);

  const next = subs.filter((sub) => sub.rssUrl !== rssUrl);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
