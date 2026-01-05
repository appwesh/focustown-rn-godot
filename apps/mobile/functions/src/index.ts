/**
 * Firebase Cloud Functions for TalkTown
 * 
 * Triggers:
 * - Friend request created → notify recipient
 * - Friend request accepted → notify requester
 * - Group invite created → notify invitee
 * - Group session started → notify all participants
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Expo SDK
const expo = new Expo();

// Firestore reference
const db = admin.firestore();

// ============================================================================
// Helper: Send Push Notification
// ============================================================================

interface PushNotificationParams {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

async function sendPushNotification(params: PushNotificationParams): Promise<boolean> {
  const { token, title, body, data } = params;

  // Validate token
  if (!Expo.isExpoPushToken(token)) {
    console.error(`[Push] Invalid Expo push token: ${token}`);
    return false;
  }

  const message: ExpoPushMessage = {
    to: token,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
  };

  try {
    const chunks = expo.chunkPushNotifications([message]);
    
    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log('[Push] Ticket:', ticketChunk);
    }
    
    return true;
  } catch (error) {
    console.error('[Push] Error sending notification:', error);
    return false;
  }
}

// ============================================================================
// Helper: Get User's Push Token
// ============================================================================

async function getUserPushToken(userId: string): Promise<string | null> {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.log(`[Push] User ${userId} not found`);
      return null;
    }
    
    const userData = userDoc.data();
    return userData?.expoPushToken || null;
  } catch (error) {
    console.error(`[Push] Error getting user ${userId}:`, error);
    return null;
  }
}

// ============================================================================
// Trigger: Friend Request Created
// ============================================================================

export const onFriendRequestCreated = functions.firestore
  .document('friendships/{friendshipId}')
  .onCreate(async (snapshot, context) => {
    const friendship = snapshot.data();
    
    // Only notify on pending requests
    if (friendship.status !== 'pending') {
      return;
    }

    const requesterId = friendship.requesterId;
    const users = friendship.users as string[];
    
    // Find the recipient (the user who is NOT the requester)
    const recipientId = users.find(uid => uid !== requesterId);
    if (!recipientId) {
      console.error('[Push] Could not determine recipient');
      return;
    }

    // Get requester's display name
    const requesterDoc = await db.collection('users').doc(requesterId).get();
    const requesterName = requesterDoc.data()?.displayName || 'Someone';

    // Get recipient's push token
    const recipientToken = await getUserPushToken(recipientId);
    if (!recipientToken) {
      console.log(`[Push] Recipient ${recipientId} has no push token`);
      return;
    }

    // Send notification
    await sendPushNotification({
      token: recipientToken,
      title: 'New Friend Request! 👋',
      body: `${requesterName} wants to be friends`,
      data: {
        type: 'friend_request',
        friendshipId: context.params.friendshipId,
        requesterId,
      },
    });

    console.log(`[Push] Sent friend request notification to ${recipientId}`);
  });

// ============================================================================
// Trigger: Friend Request Accepted
// ============================================================================

export const onFriendRequestAccepted = functions.firestore
  .document('friendships/{friendshipId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only trigger when status changes from pending to accepted
    if (before.status !== 'pending' || after.status !== 'accepted') {
      return;
    }

    const requesterId = after.requesterId;
    const users = after.users as string[];
    
    // The accepter is the user who is NOT the requester
    const accepterId = users.find(uid => uid !== requesterId);
    if (!accepterId) {
      return;
    }

    // Get accepter's display name
    const accepterDoc = await db.collection('users').doc(accepterId).get();
    const accepterName = accepterDoc.data()?.displayName || 'Someone';

    // Get requester's push token
    const requesterToken = await getUserPushToken(requesterId);
    if (!requesterToken) {
      console.log(`[Push] Requester ${requesterId} has no push token`);
      return;
    }

    // Send notification
    await sendPushNotification({
      token: requesterToken,
      title: 'Friend Request Accepted! 🎉',
      body: `${accepterName} is now your friend`,
      data: {
        type: 'friend_accepted',
        friendshipId: context.params.friendshipId,
        accepterId,
      },
    });

    console.log(`[Push] Sent friend accepted notification to ${requesterId}`);
  });

// ============================================================================
// Trigger: Group Invite Created
// ============================================================================

export const onGroupInviteCreated = functions.firestore
  .document('groupInvites/{inviteId}')
  .onCreate(async (snapshot, context) => {
    const invite = snapshot.data();
    
    // Only notify on pending invites
    if (invite.status !== 'pending') {
      return;
    }

    const inviteeId = invite.odId;
    const hostName = invite.hostName || 'Someone';

    // Get group details
    const groupDoc = await db.collection('groupSessions').doc(invite.groupId).get();
    const groupData = groupDoc.data();
    const buildingName = groupData?.buildingName || 'a café';

    // Get invitee's push token
    const inviteeToken = await getUserPushToken(inviteeId);
    if (!inviteeToken) {
      console.log(`[Push] Invitee ${inviteeId} has no push token`);
      return;
    }

    // Send notification
    await sendPushNotification({
      token: inviteeToken,
      title: 'Group Study Invite! 📚',
      body: `${hostName} invited you to study at ${buildingName}`,
      data: {
        type: 'group_invite',
        inviteId: context.params.inviteId,
        groupId: invite.groupId,
        hostId: invite.hostId,
      },
    });

    console.log(`[Push] Sent group invite notification to ${inviteeId}`);
  });

// ============================================================================
// Trigger: Group Session Started
// ============================================================================

export const onGroupSessionStarted = functions.firestore
  .document('groupSessions/{groupId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only trigger when status changes from lobby to active
    if (before.status !== 'lobby' || after.status !== 'active') {
      return;
    }

    const hostId = after.hostId;
    const hostName = after.hostName || 'The host';
    const buildingName = after.buildingName || 'the café';
    const participantIds = after.participantIds as string[];

    // Notify all participants except the host
    const notifyIds = participantIds.filter(id => id !== hostId);

    for (const participantId of notifyIds) {
      const token = await getUserPushToken(participantId);
      if (!token) {
        continue;
      }

      await sendPushNotification({
        token,
        title: 'Study Session Starting! 🚀',
        body: `${hostName} started the group session at ${buildingName}`,
        data: {
          type: 'session_started',
          groupId: context.params.groupId,
        },
      });

      console.log(`[Push] Sent session started notification to ${participantId}`);
    }
  });

// ============================================================================
// HTTP: Send Nudge (callable from client)
// ============================================================================

export const sendNudge = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { targetUserId, message } = data;
  
  if (!targetUserId) {
    throw new functions.https.HttpsError('invalid-argument', 'targetUserId required');
  }

  // Get sender's name
  const senderDoc = await db.collection('users').doc(context.auth.uid).get();
  const senderName = senderDoc.data()?.displayName || 'A friend';

  // Get target's push token
  const targetToken = await getUserPushToken(targetUserId);
  if (!targetToken) {
    return { success: false, error: 'User has no push token' };
  }

  // Send notification
  const success = await sendPushNotification({
    token: targetToken,
    title: `${senderName} nudged you! 👋`,
    body: message || 'Come study with me!',
    data: {
      type: 'nudge',
      senderId: context.auth.uid,
    },
  });

  return { success };
});

