# Godot Bridge - React Native Communication

This document covers how React Native and Godot communicate in this project.

## Overview

The app uses [react-native-godot](https://github.com/borndotcom/react-native-godot) to embed the Godot engine. Communication between React Native and Godot happens via worklets - JavaScript functions that run on the Godot thread.

## Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│   React Native      │         │      Godot          │
│   (Main JS Thread)  │         │   (Godot Thread)    │
│                     │         │                     │
│  useJoystick()  ────┼────────►│  RNBridge.gd        │
│  useInteract()  ────┼────────►│  (autoload)         │
│                     │         │                     │
│  handleSession() ◄──┼─────────┤  session_complete   │
│  (Firebase write)   │         │  signal             │
└─────────────────────┘         └─────────────────────┘
```

## React → Godot (Easy)

Use `runOnGodotThread()` to call Godot from React:

```typescript
import { runOnGodotThread, RTNGodot } from '@borndotcom/react-native-godot';

runOnGodotThread(() => {
  'worklet';
  const Godot = RTNGodot.API();
  const root = Godot.Engine.get_main_loop().get_root();
  const rnBridge = root.get_node_or_null('/root/RNBridge');
  
  // Call GDScript methods
  rnBridge.set_joystick_input(x, y);
});
```

## Godot → React (Important!)

Calling back from Godot to React requires crossing thread boundaries. 

### ⚠️ The Wrong Way (Will Crash)

```typescript
// DON'T DO THIS - Reanimated's runOnJS doesn't work with Godot worklets
import { runOnJS } from 'react-native-reanimated';

runOnGodotThread(() => {
  'worklet';
  rnBridge.set_callback(function(data) {
    'worklet';
    runOnJS(myHandler)(data); // ❌ CRASH - different worklet runtimes
  });
});
```

### ✅ The Right Way

Use `Worklets.createRunOnJS()` from `react-native-worklets-core`:

```typescript
import { Worklets } from 'react-native-worklets-core';
import { runOnGodotThread, RTNGodot } from '@borndotcom/react-native-godot';

// 1. Define your JS handler (runs on main thread)
function handleSessionComplete(duration: number, coins: number): void {
  console.log('Session complete:', duration, coins);
  // Safe to call Firebase, update state, etc.
}

// 2. Create worklet-compatible wrapper at MODULE LEVEL
const handleSessionCompleteWorklet = Worklets.createRunOnJS(handleSessionComplete);

// 3. Register callback with Godot
runOnGodotThread(() => {
  'worklet';
  const root = RTNGodot.API().Engine.get_main_loop().get_root();
  const rnBridge = root.get_node_or_null('/root/RNBridge');

  rnBridge.set_session_callback(function(duration: number, coins: number) {
    'worklet';
    // 4. Call the wrapper - bridges to main JS thread
    handleSessionCompleteWorklet(duration, coins);
  });
});
```

### Why This Works

- `react-native-godot` is built on `react-native-worklets-core`
- They share the same worklet runtime
- `Worklets.createRunOnJS()` creates a function that can be called from any worklet in that runtime
- Reanimated uses a separate worklet runtime, so its `runOnJS` doesn't interop

## GDScript Side (RNBridge.gd)

The Godot autoload that handles React Native communication:

```gdscript
extends Node

# Callback set by React Native
var _session_callback: Callable

func set_session_callback(callback: Callable) -> void:
    _session_callback = callback

func _on_session_complete(duration: int, coins: int) -> void:
    if _session_callback:
        _session_callback.call(duration, coins)
```

## File Structure

```
apps/mobile/lib/godot/
├── bridge.ts    # Low-level Godot communication
├── hooks.ts     # React hooks (useJoystick, useGodotSession, etc.)
├── types.ts     # TypeScript types
└── index.ts     # Public exports

godot/autoload/
└── RNBridge.gd  # GDScript bridge (autoload)
```

## Key Patterns

1. **React → Godot**: Always use `runOnGodotThread()` with `'worklet'` directive
2. **Godot → React**: Use `Worklets.createRunOnJS()` at module level, call from worklet
3. **State updates**: Don't try to update React state directly from worklets - write to Firebase/storage, let React subscribe to changes
4. **Callbacks**: Pass JS functions to GDScript via `set_*_callback()` methods

