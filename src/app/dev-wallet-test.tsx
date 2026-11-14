/* global __DEV__ */
import { Redirect } from 'expo-router';
import { WalletTestHarness } from '@/components/bemem/WalletTestHarness';

export default function DevWalletTestScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <WalletTestHarness />;
}
