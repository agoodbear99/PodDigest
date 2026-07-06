import * as Haptics from 'expo-haptics';

function safe(fn) {
  return () => {
    try {
      const result = fn();
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch {
      // haptics unavailable on this platform/device — ignore
    }
  };
}

export const selection = safe(() => Haptics.selectionAsync());
export const impactLight = safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const notifySuccess = safe(() =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
);
export const notifyWarning = safe(() =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
);
