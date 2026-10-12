import { defineBoot } from '#q-app/wrappers';

/**
 * Registers the `@bitjson/qr-code` web component (`<qr-code>`).
 *
 * The package ships a Stencil custom element that references `window`/`document`
 * at module load, so it is imported lazily and only in the browser to keep the
 * SSR build clean.
 */
export default defineBoot(async () => {
  if (typeof window === 'undefined') return;

  const { defineCustomElements } = await import('@bitjson/qr-code');
  defineCustomElements(window);
});
