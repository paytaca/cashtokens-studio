
let _dappMgr: any = null;

export async function getDappMgr(
  dappName: string,
  dappIconUrl: string,
): Promise<any> {
  if (!process.env.CLIENT) return 
  if (!_dappMgr) {
    const { DappConnectionManager } = await import('@wizardconnect/dapp');
    _dappMgr = new DappConnectionManager(dappName, dappIconUrl);
  }
  return _dappMgr;
}
