import { useSyncExternalStore } from 'react';
import { store } from './store';

/** Subscribe a component to the live game snapshot. */
export function useGame() {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
