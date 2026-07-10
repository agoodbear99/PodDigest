import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { checkPremiumStatus } from '../services/purchaseService';

const PremiumContext = createContext(null);

// Unlike LanguageProvider, this never blocks rendering on its initial fetch —
// checkPremiumStatus() hits RevenueCat's network, and gating the whole app on
// it (or on a slow/offline connection) would be worse than a brief moment of
// `isPremium: false` while it resolves.
export function PremiumProvider({ children }) {
  const [isPremium, setIsPremium] = useState(false);

  const refresh = useCallback(async () => {
    const status = await checkPremiumStatus();
    setIsPremium(status);
    return status;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({ isPremium, refresh }), [isPremium, refresh]);

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

export function usePremium() {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium must be used within a PremiumProvider');
  return ctx;
}
