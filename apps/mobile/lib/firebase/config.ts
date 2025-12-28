/**
 * Firebase JS SDK configuration.
 * Used for Firestore (native Firestore module has compatibility issues).
 * Auth uses native SDK (@react-native-firebase/auth) for phone auth.
 */
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your Firebase config - matches GoogleService-Info.plist
const firebaseConfig = {
  apiKey: "AIzaSyBSuNqo0VXDbSrtbLQhdJg5L0qFf1GqeSs",
  authDomain: "mobileapps-441818.firebaseapp.com",
  projectId: "mobileapps-441818",
  storageBucket: "mobileapps-441818.firebasestorage.app",
  messagingSenderId: "437937185673",
  appId: "1:437937185673:ios:2f5373fc5a91ab6f7e7758",
};

// Initialize Firebase JS SDK (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Export Firestore instance
export const db = getFirestore(app);

