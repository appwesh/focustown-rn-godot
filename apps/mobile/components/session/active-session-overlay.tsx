/**
 * Active Session Overlay
 * 
 * Minimal timer display during an active focus session.
 * Shows at the bottom of the screen without blocking the game view.
 * Camera controls are handled by the game screen.
 */

import React from 'react';
import { useSessionStore, formatTime } from '@/lib/session';
import { TimerOverlay } from '@/components/ui';

interface ActiveSessionOverlayProps {
  visible: boolean;
  onEndEarly?: () => void;
  onTripleTap?: () => void;
}

export function ActiveSessionOverlay({ visible, onEndEarly, onTripleTap }: ActiveSessionOverlayProps) {
  const activeSession = useSessionStore((s) => s.activeSession);

  if (!visible || !activeSession) return null;

  const { remainingSeconds } = activeSession;

  return (
    <>
      {/* Bottom Timer Card */}
      <TimerOverlay
        visible={true}
        time={formatTime(remainingSeconds)}
        label="Studying"
        buttonTitle="End Session"
        onButtonPress={onEndEarly ?? (() => {})}
        onTripleTap={onTripleTap}
        buttonVariant="danger"
      />
    </>
  );
}

