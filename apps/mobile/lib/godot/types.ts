/**
 * Type definitions for Godot <-> React Native bridge communication
 */

// Joystick input (normalized -1 to 1)
export interface JoystickInput {
  x: number;
  y: number;
}

// Session result (for future use with auth/DB)
export interface SessionResult {
  durationSeconds: number;
  coinsEarned: number;
}
