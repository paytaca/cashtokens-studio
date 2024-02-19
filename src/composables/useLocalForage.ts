import { ref, onMounted, onBeforeUnmount } from 'vue';
import localforage from 'localforage';
import { usePage } from 'src/stores/page';

export function useLocalForage() {

  // Create a localforage instance with Quasar-specific options for offline support
  const nftTypesStore = localforage.createInstance({
    name: 'cts-nfttypes',
    storeName: 'cts', 
    driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE, localforage.WEBSQL] // Use multiple drivers for fallback
  });

  const pageLocalForage = localforage.createInstance({
    name: 'cts-page',
    storeName: 'cts', 
    driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE, localforage.WEBSQL] // Use multiple drivers for fallback
  });

  const registryTempStore = localforage.createInstance({
    name: 'cts-registry',
    storeName: 'registry', 
    driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE, localforage.WEBSQL] // Use multiple drivers for fallback
  });

  return { nftTypesStore, registryTempStore, pageLocalForage };
}
