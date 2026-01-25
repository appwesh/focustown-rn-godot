# Talk Town

A mobile game built with React Native and Godot.

## Tech Stack

- **Mobile App**: React Native / Expo
- **Game Engine**: Godot 4 (embedded via [react-native-godot](https://github.com/borndotcom/react-native-godot))
- **Landing Page**: Next.js / Tailwind CSS
- **Backend**: Firebase (Auth, Firestore)
- **State Management**: Zustand

## Project Structure

```
apps/
  mobile/     # React Native app (Expo)
  landing/    # Marketing website (Next.js)
godot/        # Godot game project
docs/         # Documentation
tools/        # Build scripts
```

## Getting Started

### Prerequisites

- Node.js 18+
- Xcode (for iOS)
- Android Studio (for Android)
- Godot 4.x

### Mobile App

```bash
cd apps/mobile
npm install
npx expo run:ios     # iOS
npx expo run:android # Android
```

### Landing Page

```bash
cd apps/landing
npm install
npm run dev
```

## Documentation

- [Godot Bridge](docs/GODOT-BRIDGE.md) - React Native ↔ Godot communication
- [Godot Conventions](docs/GODOT_PROJECT_CONVENTIONS.md) - Game project standards
- [Deployment](docs/DEPLOYMENT.md) - Build and release process
