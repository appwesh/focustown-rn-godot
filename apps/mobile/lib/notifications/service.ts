/**
 * Push Notifications Service
 * 
 * Handles:
 * - Permission requests
 * - Expo Push Token registration
 * - Token storage in Firestore
 * - Notification handlers (foreground, background, tap)
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// ============================================================================
// Types
// ============================================================================

export type NotificationType = 
  | 'friend_request'
  | 'friend_accepted'
  | 'group_invite'
  | 'session_started'
  | 'nudge';

export interface NotificationData {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}

// ============================================================================
// Configuration
// ============================================================================

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ============================================================================
// Token Management
// ============================================================================

/**
 * Register for push notifications and get Expo Push Token
 * @returns Expo Push Token or null if registration failed
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Must be a physical device
  if (!Device.isDevice) {
    console.log('[Notifications] Push notifications require a physical device');
    return null;
  }

  try {
    // Check existing permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission not granted');
      return null;
    }

    // Get Expo Push Token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    console.log('[Notifications] Got push token:', tokenData.data);

    // Configure Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#90BE6D',
      });
    }

    return tokenData.data;
  } catch (error) {
    console.error('[Notifications] Registration error:', error);
    return null;
  }
}

/**
 * Save push token to user's Firestore document
 */
export async function savePushToken(userId: string, token: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      expoPushToken: token,
      tokenUpdatedAt: Date.now(),
    });
    console.log('[Notifications] Token saved to Firestore');
  } catch (error) {
    console.error('[Notifications] Failed to save token:', error);
  }
}

/**
 * Remove push token from user's Firestore document (on logout)
 */
export async function removePushToken(userId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      expoPushToken: null,
      tokenUpdatedAt: Date.now(),
    });
    console.log('[Notifications] Token removed from Firestore');
  } catch (error) {
    console.error('[Notifications] Failed to remove token:', error);
  }
}

// ============================================================================
// Notification Handlers
// ============================================================================

type NotificationReceivedCallback = (notification: Notifications.Notification) => void;
type NotificationResponseCallback = (response: Notifications.NotificationResponse) => void;

let notificationReceivedListener: Notifications.EventSubscription | null = null;
let notificationResponseListener: Notifications.EventSubscription | null = null;

/**
 * Set up notification listeners
 * Call this once when app starts
 */
export function setupNotificationListeners(
  onReceived?: NotificationReceivedCallback,
  onTapped?: NotificationResponseCallback
): () => void {
  // Listener for notifications received while app is foregrounded
  notificationReceivedListener = Notifications.addNotificationReceivedListener((notification) => {
    console.log('[Notifications] Received:', notification);
    onReceived?.(notification);
  });

  // Listener for when user taps on notification
  notificationResponseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('[Notifications] Tapped:', response);
    onTapped?.(response);
  });

  // Return cleanup function
  return () => {
    notificationReceivedListener?.remove();
    notificationResponseListener?.remove();
    notificationReceivedListener = null;
    notificationResponseListener = null;
  };
}

/**
 * Get the notification that was tapped to open the app (if any)
 */
export async function getInitialNotification(): Promise<Notifications.NotificationResponse | null> {
  return Notifications.getLastNotificationResponseAsync();
}

// ============================================================================
// Local Notifications (for timers, etc.)
// ============================================================================

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  triggerSeconds: number,
  data?: Record<string, string>
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: triggerSeconds,
    },
  });
  
  console.log('[Notifications] Scheduled local notification:', id);
  return id;
}

/**
 * Cancel a scheduled local notification
 */
export async function cancelLocalNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
  console.log('[Notifications] Cancelled notification:', id);
}

/**
 * Cancel all scheduled local notifications
 */
export async function cancelAllLocalNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('[Notifications] Cancelled all notifications');
}

// ============================================================================
// Badge Management
// ============================================================================

/**
 * Set app badge number
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear app badge
 */
export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

