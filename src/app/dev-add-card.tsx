/* global __DEV__ */
import { Redirect } from 'expo-router';
import { DevAddCardRuntime } from '@/components/bemem/DevAddCardRuntime';

export default function DevAddCardScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <DevAddCardRuntime />;
}
