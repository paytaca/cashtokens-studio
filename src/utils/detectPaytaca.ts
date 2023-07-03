import { useUIStore } from 'src/stores/ui';
export default () => {
  const ui = useUIStore();
  // const { setShowPaytacaInstallationLink } = ui;
  if (!window.paytaca) {
    // setShowPaytacaInstallationLink(true);
    ui.paytacaInstalled = false
  } else {
    ui.paytacaInstalled = true
  }
  
  return ui.paytacaInstalled
}