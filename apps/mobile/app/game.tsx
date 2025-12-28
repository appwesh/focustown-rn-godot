import { useState, useCallback } from 'react';
import { StyleSheet, View, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GodotGame } from '@/components/godot-view';
import { DebugModal } from '@/components/debug-modal';
import { BeanCounter } from '@/components/ui';
import {
  SessionSetupModal,
  SessionCompleteModal,
  SessionAbandonedModal,
  BreakTimerModal,
  ActiveSessionOverlay,
  AbandonConfirmModal,
} from '@/components/session';
import {
  useGodotSession,
  usePlayerSeated,
  useSessionControls,
} from '@/lib/godot';
import { SessionProvider, useSession } from '@/lib/session';
import { useAuth } from '@/lib/firebase';
import { PCK_URL } from '@/constants/game';

// Assets
const homeIcon = require('@/assets/ui/home.png');
const settingsIcon = require('@/assets/ui/settings.png');

/**
 * Inner game content that has access to session context
 */
function GameContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [debugVisible, setDebugVisible] = useState(false);

  const { recordSession } = useAuth();

  // Session state from context
  const {
    phase,
    showingAbandonConfirm,
    onPlayerSeated,
    endSession,
    requestAbandonSession,
  } = useSession();

  // Handle session completion from Godot - write to Firebase and update RN state
  const handleSessionComplete = useCallback(
    (focusTime: number, coinsEarned: number) => {
      console.log('[Game] Session complete:', focusTime, 's,', coinsEarned, 'coins');
      recordSession(focusTime, coinsEarned);
      endSession(focusTime, coinsEarned);
    },
    [recordSession, endSession]
  );

  // Register Godot callbacks
  useGodotSession(handleSessionComplete);
  usePlayerSeated(onPlayerSeated);

  // Hide top bar during modals
  const showTopBar = (phase === 'idle' || phase === 'active') && !showingAbandonConfirm;

  return (
    <View style={styles.container}>
      <GodotGame style={styles.game} pckUrl={PCK_URL} />

      {/* Active Session Overlay - shows timer during focus session */}
      <ActiveSessionOverlay
        visible={phase === 'active' && !showingAbandonConfirm}
        onEndEarly={requestAbandonSession}
      />

      {/* Top Bar - hide during modals */}
      {showTopBar && (
        <View style={[styles.topBar, { top: insets.top + 12 }]}>
          {/* Home Button - hide during active session */}
          {phase === 'idle' && (
            <Pressable
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.iconButtonPressed,
              ]}
              onPress={() => router.dismissTo('/home')}
            >
              <Image source={homeIcon} style={styles.homeIcon} />
            </Pressable>
          )}

          {/* Settings Button */}
          <Pressable
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.iconButtonPressed,
            ]}
            onPress={() => router.push('/settings')}
            onLongPress={__DEV__ ? () => setDebugVisible(true) : undefined}
            delayLongPress={800}
          >
            <Image source={settingsIcon} style={styles.settingsIcon} />
          </Pressable>

          {/* Coin Counter */}
          <BeanCounter size="small" style={styles.beanCounter} />
        </View>
      )}

      {/* Session Modals */}
      <SessionSetupModal visible={phase === 'setup'} />
      <SessionCompleteModal visible={phase === 'complete'} />
      <SessionAbandonedModal visible={phase === 'abandoned'} />
      <BreakTimerModal visible={phase === 'break'} />
      <AbandonConfirmModal visible={showingAbandonConfirm} />

      {/* Debug Modal (dev only) */}
      {__DEV__ && (
        <DebugModal
          visible={debugVisible}
          onClose={() => setDebugVisible(false)}
        />
      )}
    </View>
  );
}

/**
 * Main game screen wrapped with SessionProvider
 * Godot callbacks are passed to provider to sync RN state with Godot
 */
export default function GameScreen() {
  const {
    startSession: startGodotSession,
    endSession: endGodotSession,
    cancelSetup: cancelGodotSetup,
  } = useSessionControls();

  return (
    <SessionProvider
      onStartSession={startGodotSession}
      onCancelSetup={cancelGodotSetup}
      onEndSession={endGodotSession}
    >
      <GameContent />
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  game: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
    gap: 8,
  },
  iconButton: {
    backgroundColor: '#FFF8E7',
    padding: 8,
    borderRadius: 16,
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#DDD5C7',
  },
  iconButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  homeIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  settingsIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  beanCounter: {
    borderWidth: 2,
    borderColor: '#DDD5C7',
  },
});
