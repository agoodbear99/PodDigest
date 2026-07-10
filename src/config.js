import { Platform } from 'react-native';
import Constants from 'expo-constants';

const BACKEND_PORT = 8787;
const LOCALHOST_URL = 'http://localhost:8787';

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
  // Production builds (EAS Build / TestFlight / standalone) — there's no dev
  // server to introspect, so the backend URL must be provided explicitly.
  if (!__DEV__) {
    return process.env.EXPO_PUBLIC_API_BASE_URL || LOCALHOST_URL;
  }

  // Dev, web (running in a browser via react-native-web) — the backend runs
  // on the same machine as the browser, so localhost always resolves and
  // sidesteps any LAN/firewall quirks.
  if (Platform.OS === 'web') {
    return LOCALHOST_URL;
  }

  // Dev, native (Expo Go / dev client on a phone or simulator) — swap Metro's
  // own LAN IP in for the backend port, so it never goes stale when you
  // switch WiFi networks.
  const ip = getDevServerIp();
  if (ip) return `http://${ip}:${BACKEND_PORT}`;

  // Fallback — e.g. tunnel mode, where there's no discoverable LAN host.
  return process.env.EXPO_PUBLIC_API_BASE_URL || LOCALHOST_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();
