import { onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { Platform } from 'react-native';

/**
 * TanStack's default online detection listens for the browser's `online` and
 * `offline` events, which do not exist in React Native — so without this it
 * believes the app is online forever, and queries burn their retries firing
 * into a dead network instead of pausing until it comes back.
 *
 * Returns an unsubscribe function, so it composes with the other effects in
 * the root layout.
 */
export function subscribeToNetwork(): () => void {
  if (Platform.OS === 'web') return () => {};

  const setOnline = (state: { isConnected?: boolean; isInternetReachable?: boolean }) => {
    // isInternetReachable is undefined until the OS has decided; treating that
    // as offline would pause every query on a cold start.
    onlineManager.setOnline(Boolean(state.isConnected) && state.isInternetReachable !== false);
  };

  Network.getNetworkStateAsync().then(setOnline).catch(() => onlineManager.setOnline(true));

  const subscription = Network.addNetworkStateListener(setOnline);
  return () => subscription.remove();
}
