import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

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

export default function RootLayout() {

  return (
    <ThemeProvider value={FocusTownTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="game" />
        <Stack.Screen
          name="profile"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'My Profile',
            headerStyle: { backgroundColor: '#FFF8E7' },
            headerTintColor: '#5D4037',
            headerTitleStyle: { fontWeight: '600' },
          }}
        />
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
    </ThemeProvider>
  );
}
