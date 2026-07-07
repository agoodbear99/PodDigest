import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Requests iOS notification permission if it hasn't been granted yet.
 * @returns {Promise<boolean>}
 */
export async function ensureNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return requested.granted;
}

/**
 * Resolves this device's Expo push token. Requires the project to be linked
 * to EAS (`eas init`) since minting a token needs a projectId.
 * @returns {Promise<string>}
 */
export async function getPushToken() {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    throw new Error(
      'This project isn’t linked to EAS yet, so it can’t receive push notifications. Run `eas init` first.'
    );
  }
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}
