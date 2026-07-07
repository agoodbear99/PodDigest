import { useEffect } from 'react';
import { NavigationContainer, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import HomeScreen from '../screens/HomeScreen';
import SummaryScreen from '../screens/SummaryScreen';
import HistoryScreen from '../screens/HistoryScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SubscriptionsScreen from '../screens/SubscriptionsScreen';
import { useLanguage } from '../i18n/LanguageContext';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

function openSubscribedFeed(rssUrl) {
  if (!rssUrl || !navigationRef.isReady()) return;
  navigationRef.navigate('Subscriptions', { focusRssUrl: rssUrl });
}

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.accent,
  },
};

export default function RootNavigator() {
  const { t } = useLanguage();

  useEffect(() => {
    // Cold start: the app was launched by tapping a notification.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      const rssUrl = response?.notification.request.content.data?.rssUrl;
      if (rssUrl) openSubscribedFeed(rssUrl);
    });

    // Warm start: the app was already running/backgrounded.
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const rssUrl = response.notification.request.content.data?.rssUrl;
      openSubscribedFeed(rssUrl);
    });
    return () => subscription.remove();
  }, []);

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Summary" component={SummaryScreen} options={{ title: t('summary.title') }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: t('history.title') }} />
        <Stack.Screen
          name="Favorites"
          component={FavoritesScreen}
          options={{ title: t('favorites.title') }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: t('settings.title') }}
        />
        <Stack.Screen
          name="Subscriptions"
          component={SubscriptionsScreen}
          options={{ title: t('subscriptions.title') }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
