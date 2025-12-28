import { useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/lib/firebase';

/**
 * Root index screen - handles auth-based routing
 * 
 * - Not authenticated → redirect to onboarding
 * - Authenticated → redirect to game
 */
export default function RootScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // Wait for navigation to be ready and auth to be checked
    if (!navigationState?.key || isLoading) return;

    if (isAuthenticated) {
      // User is signed in, go to game
      router.replace('/game');
    } else {
      // User not signed in, go to onboarding
      router.replace('/onboarding');
    }
  }, [isAuthenticated, isLoading, navigationState?.key, router]);

  // Show loading while checking auth state
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FFB347" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEEB',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
