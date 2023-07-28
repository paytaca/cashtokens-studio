import { useUIStore } from 'src/stores/ui';
export default () => {
  const ui = useUIStore();
  if (!window.paytaca) {
    ui.paytacaInstalled = false
  } else {
    ui.paytacaInstalled = true
  }
  return ui.paytacaInstalled
}
