/**
 * Add Friend Modal - Comprehensive friend search system
 * 
 * Features:
 * - Search users by username (live search)
 * - Contact book integration (expo-contacts)
 * - Show contacts who are already on the app
 * - Pending friend requests (incoming)
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  AppState,
  Linking,
  Share,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { useSocialStore } from '@/lib/social';
import { userService } from '@/lib/firebase';
import { useAuth } from '@/lib/firebase';
import type { UserDoc } from '@/lib/firebase';

interface AddFriendModalProps {
  visible: boolean;
  onClose: () => void;
}

// Contact from phone book
interface PhoneContact {
  id: string;
  name: string;
  phoneNumber: string;
}

// Request status for each user
type RequestStatus = 'idle' | 'sending' | 'sent' | 'error';

export function AddFriendModal({ visible, onClose }: AddFriendModalProps) {
  const { user } = useAuth();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserDoc[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Contacts state
  const [hasContactsPermission, setHasContactsPermission] = useState(false);
  const [phoneContacts, setPhoneContacts] = useState<PhoneContact[]>([]);
  const [contactsOnApp, setContactsOnApp] = useState<UserDoc[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  
  // Request tracking
  const [requestStatus, setRequestStatus] = useState<Record<string, RequestStatus>>({});
  
  // Refs
  const searchInputRef = useRef<TextInput>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Social store
  const sendFriendRequest = useSocialStore((s) => s.sendFriendRequest);
  const pendingRequestsCount = useSocialStore((s) => s.pendingRequestsCount);
  
  // Check contacts permission on mount and app foreground
  useEffect(() => {
    if (!visible) return;
    
    const checkPermission = async () => {
      try {
        const { status } = await Contacts.getPermissionsAsync();
        setHasContactsPermission(status === 'granted');
        if (status === 'granted') {
          loadContacts();
        }
      } catch (error) {
        console.error('[AddFriend] Permission check error:', error);
      }
    };
    
    checkPermission();
    
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkPermission();
      }
    });
    
    return () => subscription.remove();
  }, [visible]);
  
  // Load contacts from phone
  const loadContacts = useCallback(async () => {
    if (!user) return;
    
    setIsLoadingContacts(true);
    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });
      
      // Extract phone numbers
      const contacts: PhoneContact[] = [];
      const phoneNumbers: string[] = [];
      
      for (const contact of data) {
        if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
          const primaryNumber = contact.phoneNumbers[0].number;
          if (primaryNumber) {
            // Normalize phone number (remove spaces, dashes, etc.)
            const normalized = primaryNumber.replace(/[\s\-\(\)]/g, '');
            contacts.push({
              id: contact.id || String(Math.random()),
              name: contact.name || 'Unknown',
              phoneNumber: normalized,
            });
            phoneNumbers.push(normalized);
          }
        }
      }
      
      setPhoneContacts(contacts);
      
      // Find which contacts are on the app
      if (phoneNumbers.length > 0) {
        const usersOnApp = await userService.findByPhoneNumbers(phoneNumbers, user.uid);
        // Deduplicate by uid (same user may match multiple phone numbers)
        const uniqueUsers = Array.from(
          new Map(usersOnApp.map((u) => [u.uid, u])).values()
        );
        setContactsOnApp(uniqueUsers);
      }
    } catch (error) {
      console.error('[AddFriend] Load contacts error:', error);
    } finally {
      setIsLoadingContacts(false);
    }
  }, [user]);
  
  // Request contacts permission
  const handleRequestContactsPermission = useCallback(async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      setHasContactsPermission(status === 'granted');
      
      if (status === 'granted') {
        loadContacts();
      } else {
        // If denied and can't ask again, open settings
        Linking.openSettings();
      }
    } catch (error) {
      console.error('[AddFriend] Permission request error:', error);
    }
  }, [loadContacts]);
  
  // Live search users by username
  useEffect(() => {
    if (!user || !visible) return;
    
    const query = searchQuery.trim();
    
    if (query.length === 0) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    
    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      setHasSearched(true);
      
      try {
        const results = await userService.searchUsers(query, user.uid);
        setSearchResults(results);
      } catch (error) {
        console.error('[AddFriend] Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, user, visible]);
  
  // Send friend request
  const handleSendRequest = useCallback(async (targetUser: UserDoc) => {
    if (!user) return;
    
    setRequestStatus((s) => ({ ...s, [targetUser.uid]: 'sending' }));
    
    const result = await sendFriendRequest(user.uid, targetUser.uid);
    
    if (result.success) {
      setRequestStatus((s) => ({ ...s, [targetUser.uid]: 'sent' }));
    } else {
      setRequestStatus((s) => ({ ...s, [targetUser.uid]: 'error' }));
    }
  }, [user, sendFriendRequest]);
  
  // Share invite link
  const handleShareInvite = useCallback(async () => {
    try {
      await Share.share({
        message: 'Join me on TalkTown! Download the app and let\'s study together.',
        // TODO: Add actual app store link
      });
    } catch (error) {
      console.error('[AddFriend] Share error:', error);
    }
  }, []);
  
  // Close and reset
  const handleClose = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
    setRequestStatus({});
    onClose();
  }, [onClose]);
  
  // Filter contacts not on app (for invite section)
  const contactsNotOnApp = useMemo(() => {
    const onAppPhones = new Set(contactsOnApp.map(u => u.phoneNumber));
    return phoneContacts.filter(c => !onAppPhones.has(c.phoneNumber)).slice(0, 5);
  }, [phoneContacts, contactsOnApp]);
  
  // Render a user result row
  const renderUserRow = (userDoc: UserDoc, showAddButton = true) => {
    const status = requestStatus[userDoc.uid] || 'idle';
    const isSent = status === 'sent';
    const isSending = status === 'sending';
    
    return (
      <View key={userDoc.uid} style={styles.userRow}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>👤</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {userDoc.displayName || 'Anonymous'}
          </Text>
          <Text style={styles.userUsername}>@{userDoc.username || 'user'}</Text>
        </View>
        {showAddButton && (
          <Pressable
            style={[
              styles.addButton,
              isSent && styles.addButtonSent,
              isSending && styles.addButtonSending,
            ]}
            onPress={() => handleSendRequest(userDoc)}
            disabled={isSent || isSending}
          >
            <Text style={[styles.addButtonText, isSent && styles.addButtonTextSent]}>
              {isSent ? 'Sent!' : isSending ? '...' : '+ Add'}
            </Text>
          </Pressable>
        )}
      </View>
    );
  };
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
            onPress={handleClose}
          >
            <Text style={styles.closeIcon}>←</Text>
          </Pressable>
          <Text style={styles.title}>Find Friends</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        {/* Pending requests banner */}
        {pendingRequestsCount > 0 && (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingBannerText}>
              {pendingRequestsCount} pending request{pendingRequestsCount > 1 ? 's' : ''}
            </Text>
            <Text style={styles.pendingBannerDot}>•</Text>
            <Text style={styles.pendingBannerNew}>New!</Text>
          </View>
        )}
        
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Enter username..."
            placeholderTextColor="#A0A0A0"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearButtonText}>×</Text>
            </Pressable>
          )}
        </View>
        
        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Search Results */}
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#90BE6D" />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : hasSearched && searchResults.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Search Results</Text>
              {searchResults.map((u) => renderUserRow(u))}
            </View>
          ) : hasSearched && searchQuery.length > 0 ? (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>No users found</Text>
              <Text style={styles.noResultsHint}>Try a different username</Text>
            </View>
          ) : null}
          
          {/* Contacts on App */}
          {!hasSearched && hasContactsPermission && contactsOnApp.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contacts on TalkTown</Text>
              {contactsOnApp.map((u) => renderUserRow(u))}
            </View>
          )}
          
          {/* Enable Contacts */}
          {!hasSearched && !hasContactsPermission && (
            <View style={styles.contactsCard}>
              <Text style={styles.contactsCardEmoji}>📒</Text>
              <Text style={styles.contactsCardTitle}>Enable contact book access</Text>
              <Text style={styles.contactsCardSubtitle}>
                Find your friends already on the app!
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.contactsButton,
                  pressed && styles.contactsButtonPressed,
                ]}
                onPress={handleRequestContactsPermission}
              >
                <Text style={styles.contactsButtonText}>Enable Access</Text>
              </Pressable>
            </View>
          )}
          
          {/* Loading Contacts */}
          {!hasSearched && hasContactsPermission && isLoadingContacts && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#90BE6D" />
              <Text style={styles.loadingText}>Loading contacts...</Text>
            </View>
          )}
          
          {/* Invite Friends */}
          {!hasSearched && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Invite Friends</Text>
              <Text style={styles.sectionSubtitle}>
                Study together and earn bonus gems!
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.inviteButton,
                  pressed && styles.inviteButtonPressed,
                ]}
                onPress={handleShareInvite}
              >
                <Text style={styles.inviteButtonText}>📤 Share Invite Link</Text>
              </Pressable>
            </View>
          )}
          
          {/* Bottom spacer */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5EDD8',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF8E7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonPressed: {
    opacity: 0.8,
  },
  closeIcon: {
    fontSize: 24,
    color: '#5D4037',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5D4037',
  },
  headerSpacer: {
    width: 44,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE4B5',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  pendingBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5D4037',
  },
  pendingBannerDot: {
    fontSize: 14,
    color: '#5D4037',
    marginHorizontal: 8,
  },
  pendingBannerNew: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D4A017',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#DDD5C7',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#3D3D3D',
    paddingVertical: 4,
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DDD5C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 18,
    color: '#6B5344',
    marginTop: -2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#8B7355',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5D4037',
  },
  noResultsHint: {
    fontSize: 14,
    color: '#8B7355',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5D4037',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#8B7355',
    marginBottom: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#EDE4CF',
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: '#F5EDD8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 22,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3D3D3D',
  },
  userUsername: {
    fontSize: 13,
    color: '#8B7355',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  addButtonSent: {
    backgroundColor: '#90BE6D',
  },
  addButtonSending: {
    backgroundColor: '#C4C4C4',
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  addButtonTextSent: {
    color: '#FFF',
  },
  contactsCard: {
    backgroundColor: '#FFF8E7',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#DDD5C7',
    borderStyle: 'dashed',
  },
  contactsCardEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  contactsCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5D4037',
    marginBottom: 4,
  },
  contactsCardSubtitle: {
    fontSize: 14,
    color: '#8B7355',
    textAlign: 'center',
    marginBottom: 16,
  },
  contactsButton: {
    backgroundColor: '#FF9F43',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
  },
  contactsButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  contactsButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  inviteButton: {
    backgroundColor: '#90BE6D',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  inviteButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  inviteButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
