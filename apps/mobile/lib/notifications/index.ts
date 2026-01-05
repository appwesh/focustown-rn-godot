/**
 * Notifications module
 */

export {
  // Token management
  registerForPushNotifications,
  savePushToken,
  removePushToken,
  
  // Listeners
  setupNotificationListeners,
  getInitialNotification,
  
  // Local notifications
  scheduleLocalNotification,
  cancelLocalNotification,
  cancelAllLocalNotifications,
  
  // Badge
  setBadgeCount,
  clearBadge,
} from './service';

export { useNotifications } from './useNotifications';

export type {
  NotificationType,
  NotificationData,
} from './service';

