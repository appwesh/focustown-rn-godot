import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, TextInput } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
} from '@expo-google-fonts/poppins';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '@/lib/firebase';
import { useNotifications } from '@/lib/notifications';
import * as analytics from '@/lib/analytics';
import * as appsflyer from '@/lib/appsflyer';

// Mixpanel token
const MIXPANEL_TOKEN = '71451a15d195dbe3f517632e97341726';

// Initialize Mixpanel
analytics.init(MIXPANEL_TOKEN);

// Initialize AppsFlyer for attribution and deep linking
appsflyer.init();

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Set Poppins as default font for all Text components
const defaultTextStyle = { fontFamily: 'Poppins_400Regular' };
// @ts-ignore - Override default props
const originalTextRender = Text.render;
// @ts-ignore
Text.render = function (props: any, ref: any) {
  const { style, ...rest } = props;
  return originalTextRender.call(this, { ...rest, style: [defaultTextStyle, style] }, ref);
};

// Same for TextInput
// @ts-ignore
const originalTextInputRender = TextInput.render;
// @ts-ignore
TextInput.render = function (props: any, ref: any) {
  const { style, ...rest } = props;
  return originalTextInputRender.call(this, { ...rest, style: [defaultTextStyle, style] }, ref);
};

// Animal Crossing style theme
const FocusTownTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#90BE6D',
    background: '#F5EFE6',
    card: '#FFF8E7',
    text: '#5D4037',
    border: '#DDD5C7',
    notification: '#FFB347',
  },
};

// Wrapper component to use hooks
function AppContent() {
  // Initialize push notifications
  useNotifications();

  // Track user identity for analytics
  const { user } = useAuth();

  // Initialize Session Replay (identity synced via analytics.identify when user logs in)
  useEffect(() => {
    analytics.initSessionReplay(MIXPANEL_TOKEN, 'anonymous');
  }, []);

  useEffect(() => {
    if (user) {
      // Link AppsFlyer with user ID for cross-platform attribution
      appsflyer.setCustomerUserId(user.uid);
      // Session Replay identity is synced automatically via analytics.identify
    } else {
      analytics.reset();
    }
  }, [user]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="home" />
        <Stack.Screen name="social" />
        <Stack.Screen name="game" options={{ gestureEnabled: false }} />
        <Stack.Screen name="profile" />
        <Stack.Screen
          name="settings"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Settings',
            headerStyle: { backgroundColor: '#FFF8E7' },
            headerTintColor: '#5D4037',
            headerTitleStyle: { fontWeight: '600' },
          }}
        />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Poppins_900Black,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider value={FocusTownTheme}>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}
