import { defineStore } from 'pinia'
import { UtxoI, Wallet } from 'mainnet-js';
import { AuthKey } from 'src/app/AuthKey';
import { AuthchainIdentity, CashToken } from 'src/app';

type UserState = {
  connectedPaytacaAddress?: string,
  connectedPaytacaWalletBchBalance?: string | number,
  walletBchBalance?: string | number,
  walletAddress?: string,
  walletTokenAddress?: string,
  wallet?: Wallet,
  /**
   * True if wallet is being watched
   */
  walletWatched?: boolean,
  /**
   * Utxos acceptable as authchain authbases, zeroeth decendant outputs
   */
  genesisInputs?: UtxoI[],
  // authNFTs?: AuthNFT[],
  // authchainIdentities?: AuthchainIdentity[],
  updatingBalances?: boolean,
  authKeys?: AuthKey[],
  tokens?: CashToken[],
  authchainIdentities?: AuthchainIdentity[]
}

export const useUser = defineStore('user', {
  state: (): UserState => ({}),
  getters: {
    walletNetworkType():('mainnet' | 'testnet' | 'chipnet'){
      if (process.env.APP_ENV === 'development' || process.env.APP_ENV === 'production') {
        return 'chipnet'
      }
      return 'mainnet'
    }
  }
});
