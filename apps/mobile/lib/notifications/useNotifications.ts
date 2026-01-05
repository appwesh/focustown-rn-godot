/**
 * useNotifications Hook
 * 
 * Manages push notification registration and handlers.
 * Should be used in the app's root layout.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import {
  registerForPushNotifications,
  savePushToken,
  setupNotificationListeners,
  getInitialNotification,
  clearBadge,
} from './service';
import { useAuth } from '../firebase';

/**
 * Hook to manage push notifications
 * Call this once in your root layout
 */
export function useNotifications() {
  const router = useRouter();
  const { user } = useAuth();
  const hasRegistered = useRef(false);

  // Handle notification tap - navigate based on type
  const handleNotificationTap = useCallback((response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;
    const type = data?.type as string;

    console.log('[Notifications] Tapped notification:', type, data);

    switch (type) {
      case 'friend_request':
      case 'friend_accepted':
        // Navigate to social screen
        router.push('/social');
        break;
      
      case 'group_invite':
        // Navigate to home (where the invite modal shows)
        router.push('/home');
        break;
      
      case 'session_started':
        // Navigate to game
        router.push('/game');
        break;
      
      case 'nudge':
        // Navigate to social screen
        router.push('/social');
        break;
      
      default:
        // Default: go to home
        router.push('/home');
    }
  }, [router]);

  // Register for push notifications when user logs in
  useEffect(() => {
    if (!user || hasRegistered.current) return;

    const register = async () => {
      try {
        const token = await registerForPushNotifications();
        
        if (token) {
          await savePushToken(user.uid, token);
          hasRegistered.current = true;
          console.log('[Notifications] Registered with token');
        }
      } catch (error) {
        console.error('[Notifications] Registration failed:', error);
      }
    };

    register();
  }, [user]);

  // Set up notification listeners
  useEffect(() => {
    const cleanup = setupNotificationListeners(
      // On receive (foreground)
      (notification) => {
        console.log('[Notifications] Received in foreground:', notification);
      },
      // On tap
      handleNotificationTap
    );

    return cleanup;
  }, [handleNotificationTap]);

  // Handle initial notification (app opened from notification)
  useEffect(() => {
    const checkInitialNotification = async () => {
      const response = await getInitialNotification();
      if (response) {
        console.log('[Notifications] App opened from notification');
        handleNotificationTap(response);
      }
    };

    checkInitialNotification();
  }, [handleNotificationTap]);

  // Clear badge when app becomes active
  useEffect(() => {
    clearBadge();
  }, []);

  return null;
}

