import {
  DappRelayResult,
  initiateDappRelay,
  type RelayUpdatePayload,
} from '@wizardconnect/core';

let _dappMgr: any = null;

export async function getDappMgr(
  dappName: string,
  dappIconUrl: string,
): Promise<any> {
  if (!_dappMgr) {
    const { DappConnectionManager } = await import('@wizardconnect/dapp');
    _dappMgr = new DappConnectionManager(dappName, dappIconUrl);
  }
  return _dappMgr;
}

export function getRelay(dappMgr: any): DappRelayResult {
  const relay = initiateDappRelay(
    (payload: RelayUpdatePayload) => {
      dappMgr.updateConnection(payload.client, payload.status);
      // also update your own UI state here (connected/disconnected indicator)
    },
    { explicitRelayUrls: ['wss://relay.cauldron.quest:443'] },
  );
  return relay;
}
