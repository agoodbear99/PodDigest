import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { LanguageProvider } from './src/i18n/LanguageContext';
import { PremiumProvider } from './src/context/PremiumContext';
import { configurePurchases } from './src/services/purchaseService';

SplashScreen.preventAutoHideAsync().catch(() => {});

// LanguageProvider withholds rendering its children until the saved/device
// language has loaded, so mounting here is itself the "app is ready" signal.
function AppContent() {
  useEffect(() => {
    configurePurchases();
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <RootNavigator />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <PremiumProvider>
          <AppContent />
        </PremiumProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
