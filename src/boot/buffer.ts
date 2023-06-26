import { boot } from 'quasar/wrappers';
import { Buffer } from 'buffer';


export default boot(({ app }) => {
  console.log(Buffer)
  window.Buffer = Buffer
});

export { Buffer };
