import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

const FRIENDLY_MATCHERS = [
  { test: /network request failed/i, message: '無法連線到伺服器，請確認網路連線後再試一次。' },
  { test: /failed to fetch/i, message: '無法連線到伺服器，請確認網路連線後再試一次。' },
  { test: /timeout|timed out/i, message: '請求逾時了，請稍後再試一次。' },
  { test: /spotify/i, message: null },
];

function toFriendlyMessage(raw) {
  const matched = FRIENDLY_MATCHERS.find((m) => m.test.test(raw));
  if (matched && matched.message) return matched.message;
  return raw;
}

export default function ErrorMessage({ message, style }) {
  if (!message) return null;
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.text}>{toFriendlyMessage(message)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 16,
    lineHeight: 19,
  },
  text: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 19,
  },
});
