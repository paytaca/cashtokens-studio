import { boot } from 'quasar/wrappers';
import { Buffer } from 'buffer';
export default boot(({ app }) => {
  window.Buffer = Buffer
});

export { Buffer };
