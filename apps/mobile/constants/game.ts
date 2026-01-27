// Game version configuration
// Update GAME_VERSION when you release a new .pck

export const GAME_VERSION = '1.0.0';

export const R2_BASE_URL = 'https://pub-00e39c5ed81d4d70bfdb1f3408768872.r2.dev';

// DEV MODE: Set to true to use locally exported PCK instead of remote Cloudflare dev build
// When true, expects PCK at: godot/builds/ios/main.pck (for iOS) or godot/builds/android/main.pck (for Android)
// When false, downloads from Cloudflare dev URL as usual
export const USE_LOCAL_PCK = false;

// Dev: uses /dev/main.pck (quick uploads for testing) or local file if USE_LOCAL_PCK is true
// Prod: uses versioned /v{VERSION}/main.pck
export const PCK_URL = __DEV__
  ? `${R2_BASE_URL}/dev/main.pck`
  : `${R2_BASE_URL}/v${GAME_VERSION}/main.pck`;

// Version manifest URL (for checking updates)
export const MANIFEST_URL = `${R2_BASE_URL}/manifest.json`;
