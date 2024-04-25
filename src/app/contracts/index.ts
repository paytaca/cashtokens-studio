import { UtxoI, Wallet, NetworkType } from 'mainnet-js';
import { Contract } from '@mainnet-cash/contract';

export const AUTHGUARD_CONTRACT = 'authguard-contract';

export type AuthGuardContractParameters = {
  authKeyTokenId: string;
  network: NetworkType;
};

export const authGuardScript = `
  pragma cashscript ^0.8.0;
  
  contract AuthGuard(bytes tokenId) {
  
    function unlockWithNft(bool keepGuarded) {
    // Check that the first input holds the minting baton
    require(tx.inputs[1].tokenCategory == tokenId);
    require(tx.inputs[1].tokenAmount == 0);
    if(keepGuarded){
      // Self preservation of the minting covenant as the first output
      require(tx.outputs[0].lockingBytecode == tx.inputs[this.activeInputIndex].lockingBytecode);
    }
  }
}`;

export const getInstance = (
  name: string,
  contractParams: AuthGuardContractParameters
): Contract | undefined => {
  if (name == AUTHGUARD_CONTRACT) {
    return new Contract(
      authGuardScript,
      [
        `0x${contractParams.authKeyTokenId
          .match(/[a-fA-F0-9]{2}/g)
          ?.reverse()
          .join('')}`,
      ],
      contractParams.network
    );
  }
};
