import { boot } from 'quasar/wrappers';
import { Buffer } from 'buffer';
export default boot(({}) => {
  if (process.env.CLIENT) {
    window.Buffer = Buffer
  }
});

export { Buffer };
