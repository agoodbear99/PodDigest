import { Platform } from 'react-native';
import Purchases, { PURCHASES_ERROR_CODE } from 'react-native-purchases';

// RevenueCat's public SDK keys (the "appl_..." / "goog_..." strings) are safe
// to ship in the client bundle — unlike the backend's Anthropic key, they are
// not secrets. Android has no key yet; configurePurchases() no-ops on
// platforms without one instead of crashing.
const REVENUECAT_API_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
};

export const PRODUCT_IDS = {
  monthly: 'poddigest_pro_monthly',
  yearly: 'poddigest_pro_yearly',
};

// Must match the entitlement identifier configured in the RevenueCat
// dashboard (Project -> Entitlements) that the two products above unlock.
// "pro" is RevenueCat's own convention for a single-tier app; update this if
// the dashboard entitlement is named differently.
const ENTITLEMENT_ID = 'pro';

let configured = false;

function getApiKey() {
  return Platform.OS === 'android' ? REVENUECAT_API_KEYS.android : REVENUECAT_API_KEYS.ios;
}

/**
 * Initializes the RevenueCat SDK. Safe to call more than once — only the
 * first call takes effect. No-ops (logging a warning) if there's no API key
 * for the current platform, e.g. Android before a RevenueCat Android key
 * has been provisioned.
 */
export function configurePurchases() {
  if (configured) return;
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn(`[purchaseService] No RevenueCat API key for platform "${Platform.OS}" — purchases disabled.`);
    return;
  }
  Purchases.configure({ apiKey });
  configured = true;
}

function isActiveEntitlement(customerInfo) {
  return Boolean(customerInfo?.entitlements?.active?.[ENTITLEMENT_ID]);
}

/**
 * Whether the current user has an active Pro entitlement.
 * @returns {Promise<boolean>}
 */
export async function checkPremiumStatus() {
  if (!configured) return false;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return isActiveEntitlement(customerInfo);
  } catch (err) {
    console.warn('[purchaseService] checkPremiumStatus failed:', err.message);
    return false;
  }
}

async function purchaseProduct(productId) {
  if (!configured) {
    throw new Error('Purchases are not available on this platform yet.');
  }

  const offerings = await Purchases.getOfferings();
  const pkg = offerings.current?.availablePackages.find((p) => p.product.identifier === productId);
  if (!pkg) {
    throw new Error(
      `No RevenueCat package found for product "${productId}". Check that the current offering in the RevenueCat dashboard includes it.`
    );
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return isActiveEntitlement(customerInfo);
  } catch (err) {
    if (err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      const cancelError = new Error('Purchase cancelled.');
      cancelError.userCancelled = true;
      throw cancelError;
    }
    throw err;
  }
}

/** Purchases the monthly Pro subscription ($4.99/mo). @returns {Promise<boolean>} true if Pro is now active */
export function purchaseMonthly() {
  return purchaseProduct(PRODUCT_IDS.monthly);
}

/** Purchases the yearly Pro subscription ($39.99/yr). @returns {Promise<boolean>} true if Pro is now active */
export function purchaseYearly() {
  return purchaseProduct(PRODUCT_IDS.yearly);
}

/**
 * Restores previously purchased subscriptions (e.g. after a reinstall or on a new device).
 * @returns {Promise<boolean>} true if Pro is active after restoring
 */
export async function restorePurchases() {
  if (!configured) {
    throw new Error('Purchases are not available on this platform yet.');
  }
  const customerInfo = await Purchases.restorePurchases();
  return isActiveEntitlement(customerInfo);
}
