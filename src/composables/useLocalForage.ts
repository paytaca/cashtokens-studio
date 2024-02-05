import { ref, onMounted, onBeforeUnmount } from 'vue';
import localforage from 'localforage';

export function useLocalForage() {

  // Create a localforage instance with Quasar-specific options for offline support
  const nftTypesStore = localforage.createInstance({
    name: 'cts-nfttypes',
    storeName: 'cts', 
    driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE, localforage.WEBSQL] // Use multiple drivers for fallback
  });

  const pageStore = localforage.createInstance({
    name: 'cts-page',
    storeName: 'cts', 
    driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE, localforage.WEBSQL] // Use multiple drivers for fallback
  });


  return { nftTypesStore, pageStore };
}
