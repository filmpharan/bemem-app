import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { bemem } from '@/constants/bemem-theme';

export default function RootLayout() {
  return <>
    <StatusBar style="dark" />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: bemem.background } }}>
      <Stack.Screen name="index" />
    </Stack>
  </>;
}
