// Backend base URL. Set EXPO_PUBLIC_API_BASE_URL in a .env file at the project root, e.g.
//   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.50:8787
// (use your computer's LAN IP, not "localhost", when testing on a physical device).
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8787';
