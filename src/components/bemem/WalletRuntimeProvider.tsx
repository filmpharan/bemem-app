import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createDeviceWalletRuntime } from '../../lib/wallet-device-runtime';

const Context = createContext<ReturnType<typeof createDeviceWalletRuntime> | null>(null);
export function WalletRuntimeProvider({ children }: { children: ReactNode }) {
  const [runtime] = useState(createDeviceWalletRuntime);
  useEffect(() => { void runtime.commands.initialize(); }, [runtime]);
  return <Context.Provider value={runtime}>{children}</Context.Provider>;
}
export function useWalletRuntime() {
  const runtime = useContext(Context);
  if (!runtime) throw Error('WalletRuntimeProvider required');
  const snapshot = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot, runtime.getSnapshot);
  return { runtime, snapshot };
}
