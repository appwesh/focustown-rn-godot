# Talktown Deployment Guide

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Godot Editor   │────▶│   GitHub CI     │────▶│ Cloudflare R2   │
│  (Export .pck)  │     │  (Automate)     │     │  (CDN Host)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │  Mobile App     │◀────│  Download .pck  │
                        │  (React Native) │     │  on first run   │
                        └─────────────────┘     └─────────────────┘
```

## R2 Bucket Structure

```
apptowns/
├── manifest.json          # Current version info
├── latest/
│   └── main.pck          # Latest version (for dev)
├── v1.0.0/
│   └── main.pck
├── v1.0.1/
│   └── main.pck
└── v1.1.0/
    └── main.pck
```

## Release Process

### Option 1: Manual Release (Local)

```bash
# Export and upload new version
./tools/release-game.sh 1.0.1
```

### Option 2: CI/CD (Automated)

1. Push changes to `godot/` folder on `main` branch
2. GitHub Actions automatically:
   - Exports the .pck
   - Uploads to R2 with version from git SHA
   - Updates manifest.json

For versioned releases:
1. Go to GitHub Actions → "Export Godot Game"
2. Click "Run workflow"
3. Enter version (e.g., `1.1.0`)

## GitHub Secrets Required

Add these to your repository secrets:

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `EXPO_TOKEN` | EAS Build token |

### Getting R2 Credentials

1. Go to Cloudflare Dashboard → R2 → Manage R2 API Tokens
2. Create new token with:
   - Permission: Object Read & Write
   - Bucket: apptowns
3. Copy the Access Key ID and Secret Access Key

## Version Management

### App Version (`apps/mobile/constants/game.ts`)

```typescript
export const GAME_VERSION = '1.0.0';  // Update this for releases
```

### Manifest (`manifest.json` in R2)

```json
{
  "version": "1.0.0",
  "url": "https://pub-xxx.r2.dev/v1.0.0/main.pck",
  "updated": "2025-12-27T10:00:00Z"
}
```

## Update Flow

### Automatic Updates

The app checks for updates on launch:

```typescript
import { useGameUpdate } from '@/hooks/use-game-update';

function App() {
  const { hasUpdate, remoteVersion, applyUpdate } = useGameUpdate();
  
  if (hasUpdate) {
    // Show update prompt
    return <UpdatePrompt onUpdate={applyUpdate} version={remoteVersion} />;
  }
  
  return <GodotGame pckUrl={PCK_URL} />;
}
```

### Force Update

For breaking changes, update `GAME_VERSION` in the app and require app store update.

### Silent Update

For non-breaking changes:
1. Upload new .pck to R2
2. Update manifest.json
3. App downloads on next launch (after cache clear)

## Build Profiles

### Development
- Internal testing
- Debug logs enabled
- Points to `latest/main.pck`

### Preview
- TestFlight / Internal Testing
- Production-like but not public

### Production
- App Store / Play Store
- Points to versioned `v{VERSION}/main.pck`

## Rollback

To rollback to a previous version:

1. Update `GAME_VERSION` in app to previous version
2. Or update `manifest.json` to point to previous version
3. Users will download the older .pck on next app restart

## Monitoring

### Cloudflare R2 Analytics
- View download counts per file
- Monitor bandwidth usage

### App Analytics
- Track `game_version` as user property
- Monitor update adoption rate

## Troubleshooting

### Game not loading
1. Check R2 bucket has the correct version folder
2. Verify `manifest.json` has correct URL
3. Check app `GAME_VERSION` matches

### Update not detected
1. Manifest might be cached - wait or clear CDN cache
2. Check `manifest.json` version field

### Large download times
1. Enable R2 caching rules
2. Consider splitting assets into multiple .pck files

