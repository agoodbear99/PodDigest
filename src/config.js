import Constants from 'expo-constants';

const BACKEND_PORT = 8787;

// In dev, Metro's dev server host (e.g. "192.168.1.50:8081") always matches
// the LAN IP a physical device/simulator needs to reach this computer — so we
// derive the backend URL from it instead of hand-maintaining an env var that
// goes stale every time you switch WiFi networks.
function getDevServerIp() {
  const hostUri = Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost;
  if (!hostUri) return null;
  const host = hostUri.split('/')[0].split(':')[0];
  return host || null;
}

function resolveApiBaseUrl() {
  if (__DEV__) {
    const ip = getDevServerIp();
    if (ip) return `http://${ip}:${BACKEND_PORT}`;
  }
  // Non-dev builds (or dev with no detectable host, e.g. tunnel mode) fall back
  // to an explicit override, then localhost.
  return process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8787';
}

export const API_BASE_URL = resolveApiBaseUrl();
