/**
 * AppsFlyer service - Attribution and deep linking
 */

import appsFlyer from 'react-native-appsflyer';

// TODO: Replace with your AppsFlyer credentials
const APPSFLYER_DEV_KEY = 'C43LbYriLHEuMFtNv7zhJT';
const APPSFLYER_APP_ID = '6757145116'; // iOS App Store ID

let isInitialized = false;

type DeepLinkHandler = (deepLinkValue: string, data: Record<string, unknown>) => void;
let deepLinkHandler: DeepLinkHandler | null = null;

/**
 * Register a handler for deep links
 */
export function onDeepLink(handler: DeepLinkHandler): void {
  deepLinkHandler = handler;
}

/**
 * Initialize AppsFlyer SDK
 */
export function init(): void {
  if (isInitialized) return;

  // Register deep link listener BEFORE initSdk (required by AppsFlyer)
  appsFlyer.onDeepLink((res) => {
    if (res?.deepLinkStatus !== 'NOT_FOUND') {
      const deepLinkValue = res?.data?.deep_link_value as string | undefined;
      console.log('[AppsFlyer] Deep link received:', deepLinkValue);

      if (deepLinkHandler && deepLinkValue) {
        deepLinkHandler(deepLinkValue, res?.data || {});
      }
    }
  });

  appsFlyer.initSdk(
    {
      devKey: APPSFLYER_DEV_KEY,
      isDebug: __DEV__,
      appId: APPSFLYER_APP_ID,
      onInstallConversionDataListener: true,
      onDeepLinkListener: true,
    },
    (result) => {
      console.log('[AppsFlyer] Init success:', result);
      isInitialized = true;
    },
    (error) => {
      console.error('[AppsFlyer] Init error:', error);
    }
  );
}

/**
 * Set customer user ID for cross-platform attribution
 */
export function setCustomerUserId(userId: string): void {
  appsFlyer.setCustomerUserId(userId);
  console.log('[AppsFlyer] Customer user ID set:', userId);
}

/**
 * Log an in-app event
 */
export function logEvent(
  eventName: string,
  eventValues: Record<string, unknown>
): void {
  appsFlyer.logEvent(
    eventName,
    eventValues,
    (result) => {
      console.log('[AppsFlyer] Event logged:', eventName, result);
    },
    (error) => {
      console.error('[AppsFlyer] Event error:', eventName, error);
    }
  );
}

// Common event helpers
export const events = {
  purchase: (revenue: number, currency: string, contentId?: string) =>
    logEvent('af_purchase', {
      af_revenue: revenue,
      af_currency: currency,
      af_content_id: contentId,
    }),

  subscribe: (revenue: number, currency: string) =>
    logEvent('af_subscribe', {
      af_revenue: revenue,
      af_currency: currency,
    }),

  completeRegistration: (method: string) =>
    logEvent('af_complete_registration', {
      af_registration_method: method,
    }),

  login: () => logEvent('af_login', {}),

  startTrial: () => logEvent('af_start_trial', {}),
};
