/* global __DEV__ */
import { Redirect } from 'expo-router';
import { CutoverTestHarness } from '@/components/bemem/CutoverTestHarness';

export default function DevWalletCutoverScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <CutoverTestHarness />;
}
