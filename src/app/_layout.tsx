import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import manrope from '../../assets/fonts/lagoon/manrope.ttf';
import notoThai from '../../assets/fonts/lagoon/noto-sans-thai.ttf';
import { bemem } from '@/constants/bemem-theme';

export default function RootLayout() {
  // Render immediately with system fallback; font failure never blocks card access.
  useFonts({
    BememManrope: manrope,
    BememThai: notoThai,
  });
  return <>
    <StatusBar style="dark" />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: bemem.background } }}>
      <Stack.Screen name="index" />
    </Stack>
  </>;
}
