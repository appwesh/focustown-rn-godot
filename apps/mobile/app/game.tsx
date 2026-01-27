import { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Pressable, Animated } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { GodotGame } from '@/components/godot-view';
import { SceneTransition } from '@/components/scene-transition';
import { DebugModal } from '@/components/debug-modal';
import { BackButton, BeanCounter } from '@/components/ui';
import { AmbienceMixer } from '@/components/audio/ambience-mixer';
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
  useSessionTapOutside,
  spawnRemotePlayer,
  updateRemotePlayerState,
  removeRemotePlayer,
  isGodotReady,
  switchToOverviewCamera,
  switchToSeatedCamera,
  switchToSetupCamera,
  switchToThirdPersonCamera,
  changeScene,
  setUserCharacter,
  setEntranceCinematicFinishedHandler,
  registerEntranceCinematicFinishedCallback,
  type SpotLocation,
  useCameraControls,
} from '@/lib/godot';
import {
  useSessionStore,
  setGodotCallbacks,
  clearGodotCallbacks,
} from '@/lib/session';
import { useAuth, groupsService } from '@/lib/firebase';
import { useSocialStore } from '@/lib/social';
import { PCK_URL } from '@/constants/game';
import { useAmbienceEngine, useAmbienceStore } from '@/lib/sound';
import { MUSIC_TRACKS_BY_BUILDING_ID } from '@/lib/sound/tracks';
import { MaterialCommunityIcons } from '@expo/vector-icons';


/**
 * Main game screen with focus session management
 */
export default function GameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [debugVisible, setDebugVisible] = useState(false);
  const [sceneTransitioning, setSceneTransitioning] = useState(true); // Start with transition visible
  const [cinematicFinished, setCinematicFinished] = useState(false); // Wait for entrance cinematic
  const { toggleCamera } = useCameraControls();
  
  // Pulsing animation for "pick your spot" text
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Triple tap debug trigger
  const tapTimesRef = useRef<number[]>([]);
  const handleTripleTap = useCallback(() => {
    const now = Date.now();
    const recentTaps = tapTimesRef.current.filter((t) => now - t < 500);
    recentTaps.push(now);
    tapTimesRef.current = recentTaps;
    
    if (recentTaps.length >= 3) {
      setDebugVisible(true);
      tapTimesRef.current = [];
    }
  }, []);
  
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Unlock orientation to allow landscape on game screen
  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.unlockAsync();
    }, [])
  );

  const { userDoc, user } = useAuth();

  // Social store (for group session and building selection)
  const lobbyGroupId = useSocialStore((s) => s.lobbyGroupId);
  const lobbyHostId = useSocialStore((s) => s.lobbyHostId);
  const resetLobbyState = useSocialStore((s) => s.resetLobbyState);
  const selectedBuildingId = useSocialStore((s) => s.selectedBuildingId);
  const setMusicSource = useAmbienceStore((s) => s.setMusicSource);
  const stopNonMusic = useAmbienceStore((s) => s.stopNonMusic);
  const setGameOverrideEnabled = useAmbienceStore((s) => s.setGameOverrideEnabled);

  // Godot controls
  const {
    startSession: startGodotSession,
    endSession: endGodotSession,
    cancelSetup: cancelGodotSetup,
  } = useSessionControls();

  // Session state from Zustand store
  const phase = useSessionStore((s) => s.phase);
  const showingAbandonConfirm = useSessionStore((s) => s.showingAbandonConfirm);
  const isGroupSession = useSessionStore((s) => s.isGroupSession);
  const groupSessionId = useSessionStore((s) => s.groupSessionId);
  const onPlayerSeated = useSessionStore((s) => s.onPlayerSeated);
  const endSession = useSessionStore((s) => s.endSession);
  const requestAbandonSession = useSessionStore((s) => s.requestAbandonSession);
  const setUser = useSessionStore((s) => s.setUser);
  const setGroupSession = useSessionStore((s) => s.setGroupSession);
  const updateConfig = useSessionStore((s) => s.updateConfig);
  const startSession = useSessionStore((s) => s.startSession);
  const initialize = useSessionStore((s) => s._initialize);

  // Initialize store lifecycle (AppState listener, notifications, etc.)
  useEffect(() => {
    const cleanup = initialize();
    return cleanup;
  }, [initialize]);

  // Switch to selected scene when game screen mounts
  // Shows transition overlay while scene changes
  useEffect(() => {
    let cancelled = false;
    
    // Show transition overlay
    setSceneTransitioning(true);
    setCinematicFinished(false); // Reset cinematic state
    
    const attemptSceneChange = () => {
      if (cancelled) return;
      
      if (!isGodotReady()) {
        console.log('[Game] Godot not ready yet, waiting...');
        setTimeout(attemptSceneChange, 300);
        return;
      }
      
      // Map buildingId to scene name (default to library for unknown)
      const sceneName = selectedBuildingId === 'coastal' ? 'coastal' : 'library';
      console.log('[Game] Switching to scene:', sceneName, '(building:', selectedBuildingId, ')');
      changeScene(sceneName);
      
      // Apply saved character appearance after scene loads
      setTimeout(() => {
        if (cancelled) return;
        
        if (userDoc?.characterSkin) {
          setUserCharacter(userDoc.characterSkin);
          console.log('[Game] Applied saved character skin');
        }
        
        // Hide transition after scene loads
        setTimeout(() => {
          if (!cancelled) {
            setSceneTransitioning(false);
          }
        }, 100);
      }, 300);
    };
    
    // Start scene change after brief delay
    const timer = setTimeout(attemptSceneChange, 200);
    
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [userDoc?.characterSkin, selectedBuildingId]);

  useAmbienceEngine();

  useEffect(() => {
    setGameOverrideEnabled(false);
    return () => setGameOverrideEnabled(false);
  }, [setGameOverrideEnabled]);

  useEffect(() => {
    const musicSource = MUSIC_TRACKS_BY_BUILDING_ID[selectedBuildingId ?? ''] ?? null;
    setMusicSource(musicSource);
  }, [selectedBuildingId, setMusicSource]);

  // Register entrance cinematic finished callback
  useEffect(() => {
    let callbackRegistered = false;
    
    // Set up the handler
    setEntranceCinematicFinishedHandler(() => {
      console.log('[Game] Entrance cinematic finished');
      setCinematicFinished(true);
    });
    
    // Register the Godot callback once ready
    const checkAndRegister = () => {
      if (isGodotReady() && !callbackRegistered) {
        console.log('[Game] Registering entrance cinematic callback...');
        registerEntranceCinematicFinishedCallback();
        callbackRegistered = true;
      }
    };
    
    checkAndRegister();
    const interval = setInterval(() => {
      if (!callbackRegistered) {
        checkAndRegister();
      } else {
        clearInterval(interval);
      }
    }, 500);
    
    return () => {
      clearInterval(interval);
      setEntranceCinematicFinishedHandler(null);
    };
  }, []);

  // Set user in store when auth changes
  useEffect(() => {
    if (user && userDoc) {
      setUser({
        odId: user.uid,
        displayName: userDoc.displayName || 'Anonymous',
      });
    } else {
      setUser(null);
    }
  }, [user, userDoc, setUser]);

  // Set group session from lobby state on mount
  useEffect(() => {
    if (lobbyGroupId) {
      console.log('[Game] Setting group session:', lobbyGroupId);
      setGroupSession(lobbyGroupId);
    }
    
    return () => {
      // Clear group session on unmount
      setGroupSession(null);
      // Reset lobby state if this was a group session
      if (lobbyGroupId) {
        resetLobbyState();
      }
    };
  }, [lobbyGroupId, setGroupSession, resetLobbyState]);

  // Subscribe to group session status and auto-end when completed/cancelled/failed
  useEffect(() => {
    if (!groupSessionId || !isGroupSession) return;
    
    console.log('[Game] Subscribing to group session status:', groupSessionId);
    
    const unsubscribe = groupsService.subscribeToGroupSession(groupSessionId, (group) => {
      if (!group) {
        console.log('[Game] Group session deleted/not found');
        return;
      }
      
      // If group session ended, handle it
      if (group.status === 'completed' || group.status === 'cancelled' || group.status === 'failed') {
        console.log('[Game] Group session ended:', group.status, 'current phase:', phase);
        
        if (group.status === 'failed') {
          // Someone abandoned - trigger abandon flow (shows "failed" modal)
          // Only if we have an active session, otherwise just go home
          if (phase === 'active') {
            console.log('[Game] Group session FAILED during active - triggering abandon');
            useSessionStore.getState().confirmAbandonSession(true);
          } else {
            // Not in active session yet - just show abandoned modal
            console.log('[Game] Group session FAILED before active - showing abandoned');
            useSessionStore.getState().confirmAbandonSession(true);
          }
        } else if (phase === 'active') {
          // Completed normally - calculate rewards
          const activeSession = useSessionStore.getState().activeSession;
          if (activeSession) {
            const elapsed = Math.floor((Date.now() - activeSession.startedAt) / 1000);
            const coinsPerMinute = 1;
            const coins = Math.floor((elapsed / 60) * coinsPerMinute);
            endSession(elapsed, coins);
          }
        }
        // Reset lobby state since group session is done
        resetLobbyState();
      }
    });
    
    return () => {
      console.log('[Game] Unsubscribing from group session status');
      unsubscribe();
    };
  }, [groupSessionId, isGroupSession, phase, endSession, resetLobbyState]);

  // Simple state-based multiplayer sync (no position tracking)
  // Also handles auto-start when all participants are seated
  useEffect(() => {
    if (!groupSessionId || !isGroupSession || !user || !userDoc) return;

    console.log('[Game] Setting up multiplayer state sync for group:', groupSessionId);

    const myDisplayName = userDoc.displayName || 'Anonymous';
    const myUserId = user.uid;

    // Set our initial state to 'entrance'
    groupsService.updateParticipantState(
      groupSessionId,
      myUserId,
      myDisplayName,
      'entrance',
      null
    ).catch(console.error);

    // Track remote players
    const knownPlayers = new Set<string>();
    const lastKnownStates = new Map<string, string>();
    let hasAutoStarted = false;
    
    // Buffer for pending spawns (when Godot isn't ready yet)
    const pendingSpawns = new Map<string, { displayName: string; state: 'entrance' | 'seated'; spotId: string | null }>();
    let godotReadyInterval: ReturnType<typeof setInterval> | null = null;

    // Process pending spawns when Godot is ready
    const processPendingSpawns = () => {
      if (!isGodotReady()) return;
      
      console.log('[Game] Godot ready, processing', pendingSpawns.size, 'pending spawns');
      for (const [odId, playerState] of pendingSpawns) {
        spawnRemotePlayer(odId, playerState.displayName, playerState.state, playerState.spotId);
        knownPlayers.add(odId);
        lastKnownStates.set(odId, playerState.state);
      }
      pendingSpawns.clear();
      
      if (godotReadyInterval) {
        clearInterval(godotReadyInterval);
        godotReadyInterval = null;
      }
    };

    // Subscribe to group session updates for participant states
    const unsubscribe = groupsService.subscribeToGroupSession(groupSessionId, (group) => {
      if (!group || !group.participantStates) return;

      const currentUserIds = Object.keys(group.participantStates);
      
      // Spawn/update remote players (excluding self)
      for (const [odId, state] of Object.entries(group.participantStates)) {
        if (odId === myUserId) continue; // Skip self
        
        const playerState = state as { 
          displayName: string; 
          state: 'entrance' | 'seated'; 
          spotId: string | null;
        };
        
        const isInPending = pendingSpawns.has(odId);
        const isKnown = knownPlayers.has(odId);
        const isNewPlayer = !isKnown && !isInPending;
        const lastState = lastKnownStates.get(odId);
        const stateChanged = lastState !== playerState.state;
        
        if (isNewPlayer) {
          // Check if Godot is ready
          if (isGodotReady()) {
            console.log('[Game] Spawning remote player:', odId, playerState.displayName, playerState.state);
            spawnRemotePlayer(odId, playerState.displayName, playerState.state, playerState.spotId);
            knownPlayers.add(odId);
            lastKnownStates.set(odId, playerState.state);
          } else {
            // Buffer for later
            console.log('[Game] Godot not ready, buffering spawn for:', odId);
            pendingSpawns.set(odId, playerState);
            
            // Start polling for Godot ready
            if (!godotReadyInterval) {
              godotReadyInterval = setInterval(processPendingSpawns, 500);
            }
          }
        } else if (isInPending && stateChanged) {
          // Player is pending spawn but state changed - update the pending entry
          console.log('[Game] Updating pending player state:', odId, playerState.state);
          pendingSpawns.set(odId, playerState);
        } else if (isKnown && stateChanged) {
          // State changed - update (teleport to seat or back to entrance)
          console.log('[Game] Player state changed:', odId, playerState.state, playerState.spotId);
          updateRemotePlayerState(odId, playerState.state, playerState.spotId);
          lastKnownStates.set(odId, playerState.state);
        }
      }
      
      // Remove players that left
      for (const odId of knownPlayers) {
        if (!currentUserIds.includes(odId)) {
          removeRemotePlayer(odId);
          knownPlayers.delete(odId);
          lastKnownStates.delete(odId);
        }
      }

      // Check if all participants are seated for auto-start
      if (!hasAutoStarted && group.participantIds && group.participantStates) {
        const allSeated = group.participantIds.every(
          id => group.participantStates?.[id]?.state === 'seated'
        );
        
        if (allSeated && group.participantIds.length > 0) {
          console.log('[Game] All participants seated, auto-starting session');
          hasAutoStarted = true;
          
          // Update config with group's duration and start
          const durationMinutes = Math.floor(group.plannedDuration / 60);
          updateConfig({ durationMinutes });
          startSession();
        }
      }
    });

    return () => {
      console.log('[Game] Cleaning up multiplayer state');
      if (godotReadyInterval) clearInterval(godotReadyInterval);
      groupsService.removeParticipantState(groupSessionId, myUserId).catch(console.error);
      for (const odId of knownPlayers) {
        removeRemotePlayer(odId);
      }
      knownPlayers.clear();
      lastKnownStates.clear();
      pendingSpawns.clear();
      unsubscribe();
    };
  }, [groupSessionId, isGroupSession, user, userDoc, updateConfig, startSession]);

  // Connect Godot callbacks to store
  useEffect(() => {
    setGodotCallbacks({
      onStartSession: startGodotSession,
      onEndSession: endGodotSession,
      onCancelSetup: cancelGodotSetup,
      onStartBreak: switchToOverviewCamera,
      onEndBreak: switchToSetupCamera,
    });

    return () => {
      clearGodotCallbacks();
    };
  }, [startGodotSession, endGodotSession, cancelGodotSetup]);

  // Handle session completion from Godot - write to Firebase and update store
  const handleSessionComplete = useCallback(
    (focusTime: number, coinsEarned: number) => {
      console.log('[Game] Session complete:', focusTime, 's,', coinsEarned, 'coins');
      endSession(focusTime, coinsEarned);
    },
    [endSession]
  );

  // Handle player seated - receives location from Godot
  const handlePlayerSeated = useCallback(
    (location: SpotLocation) => {
      console.log('[Game] Player seated at:', location.buildingId, location.spotId);
      onPlayerSeated(location);
      
      // Update our state in Firestore for multiplayer sync
      if (groupSessionId && isGroupSession && user && userDoc) {
        const myDisplayName = userDoc.displayName || 'Anonymous';
        groupsService.updateParticipantState(
          groupSessionId,
          user.uid,
          myDisplayName,
          'seated',
          location.spotId
        ).catch(console.error);
      }
    },
    [onPlayerSeated, groupSessionId, isGroupSession, user, userDoc]
  );

  // Handle tap outside during session - show abandon confirm
  const handleSessionTapOutside = useCallback(() => {
    console.log('[Game] Session tap outside detected');
    const currentPhase = useSessionStore.getState().phase;
    if (currentPhase === 'active') {
      requestAbandonSession();
    }
  }, [requestAbandonSession]);

  // Register Godot callbacks
  useGodotSession(handleSessionComplete);
  usePlayerSeated(handlePlayerSeated);
  useSessionTapOutside(handleSessionTapOutside);

  const handleLeaveCafe = useCallback(() => {
    if (phase === 'active') {
      requestAbandonSession();
      return;
    }

    stopNonMusic();
    setGameOverrideEnabled(false);
    router.dismissTo('/home');
  }, [phase, requestAbandonSession, stopNonMusic, setGameOverrideEnabled, router]);

  // Hide top bar during modals
  const showTopBar = (phase === 'idle' || phase === 'active') && !showingAbandonConfirm;

  return (
    <View style={styles.container} onTouchEnd={handleTripleTap}>
      <GodotGame style={styles.game} pckUrl={PCK_URL} />
      
      {/* Scene transition overlay - covers Godot during scene changes */}
      <SceneTransition 
        visible={sceneTransitioning} 
        backgroundColor="#000000"
        fadeDuration={1500}
      />

      {/* Active Session Overlay - shows timer during focus session */}
      <ActiveSessionOverlay
        visible={phase === 'active' && !showingAbandonConfirm}
        onEndEarly={requestAbandonSession}
        onTripleTap={handleTripleTap}
      />

      {/* Top UI */}
      {showTopBar && (
        <>
          {/* Back Button */}
          <BackButton
            style={{ position: 'absolute', left: 16, top: insets.top + 12, zIndex: 2 }}
            onPress={handleLeaveCafe}
          />

          {/* Right controls */}
          <View style={[styles.topRightControls, { top: insets.top + 12 }]}>
            {phase === 'active' && (
              <>
              <Pressable style={styles.cameraToggle} onPress={toggleCamera}>
                <MaterialCommunityIcons name="camera" size={24} color="#5D4037" />
              </Pressable>
              <AmbienceMixer />
              </>
            )}
          </View>

          {/* Pick your spot text - only show after entrance cinematic */}
          {phase === 'idle' && cinematicFinished && (
            <Animated.View style={[styles.pickSpotContainer, { opacity: pulseAnim }]}>
              <Text style={styles.pickSpotText}>pick your</Text>
              <Text style={styles.pickSpotText}>spot</Text>
            </Animated.View>
          )}
        </>
      )}

      {/* Bean Counter - shows during success modal */}
      {/* incrementDelay syncs with flying beans: 300ms measure + 100ms start + 600ms first bean travel */}
      {phase === 'complete' && (
        <View style={[styles.beanCounterContainer, { top: insets.top + 12 }]}>
          <BeanCounter size="small" incrementDelay={1000} />
        </View>
      )}

      {/* Session Modals */}
      {/* Setup modal only for solo sessions - group sessions auto-start when all seated */}
      <SessionSetupModal visible={phase === 'setup' && !isGroupSession} onTripleTap={handleTripleTap} />
      <SessionCompleteModal visible={phase === 'complete'} onTripleTap={handleTripleTap} />
      <SessionAbandonedModal visible={phase === 'abandoned'} onTripleTap={handleTripleTap} />
      <BreakTimerModal visible={phase === 'break'} onTripleTap={handleTripleTap} />
      <AbandonConfirmModal visible={showingAbandonConfirm} onTripleTap={handleTripleTap} />

      {/* Debug Modal (triple tap anywhere) */}
      <DebugModal
        visible={debugVisible}
        onClose={() => setDebugVisible(false)}
      />
    </View>
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
  pickSpotContainer: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 32,
    alignItems: 'center',
    zIndex: 2,
  },
  topRightControls: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 10,
  },
  cameraToggle: {
    backgroundColor: '#FFF8E7',
    borderRadius: 100,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DDD5C7',
  },
  cameraIcon: {
    fontSize: 24,
  },
  pickSpotText: {
    textAlign: 'center',
    fontSize: 36,
    fontFamily: 'Poppins_700Bold',
    color: 'white',
    lineHeight: 48,
  },
  beanCounterContainer: {
    position: 'absolute',
    right: 16,
    zIndex: 200,
  },
});
