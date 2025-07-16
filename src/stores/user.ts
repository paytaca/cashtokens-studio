import { defineStore } from 'pinia'
import { UtxoI, Wallet } from 'mainnet-js';
import { PaginatedData, TransactionSigner } from 'src/apps/types';
import { CashToken } from 'src/apps';
import { createTemplate } from 'src/apps/utils/createMultisigWalletTemplate';
import { walletTemplateP2pkh } from 'bitauth-libauth-v3';

export type UserState = {
  connectedPaytacaAddress?: string,
  connectedPaytacaWalletBchBalance?: string | number,
  walletBchBalance: string | number | undefined
  walletAddress: string,
  wallet: Wallet | undefined,
  /**
   * True if wallet is being watched
   */
  walletWatched?: boolean,
  /**
   * Utxos acceptable as authchain authbases, zeroeth decendant outputs
   */
  genesisInputs: UtxoI[],
  updatingBalances?: boolean,
  paginatedAuthKeys: PaginatedData,
  walletConnectSigner: any,
  walletConnectSession:any,
  walletType: 'paytaca' | 'walletconnect' | undefined
  transactionSigner: TransactionSigner | undefined,
  tokens: CashToken[]
}

export const useUser = defineStore('user', {
  state: (): UserState => ({
    genesisInputs: [],
    paginatedAuthKeys: {count: 0,limit: 0,offset: 0,next: null,previous: null,results: []},
    walletBchBalance: '',
    walletAddress: '',
    wallet: undefined,
    walletConnectSigner: undefined,
    walletConnectSession: undefined,
    walletType: 'paytaca',
    transactionSigner: undefined,
    tokens: []
  }),
  getters: {
    walletNetworkType():('mainnet' | 'testnet' | 'chipnet'){
      if (process.env.APP_ENV === 'development' || process.env.APP_ENV === 'development-build') {
        return 'chipnet'
      }
      return 'mainnet'
    }
  }
});
