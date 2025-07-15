import { defineStore } from 'pinia'
import { UtxoI, Wallet } from 'mainnet-js';
import { PaginatedData, TransactionSigner } from 'src/apps/types';
import { CashToken } from 'src/apps';

export type UserState = {
  connectedPaytacaAddress?: string,
  connectedPaytacaWalletBchBalance?: string | number,
  walletBchBalance: string | number | undefined
  walletAddress: string,
  walletTokenAddress: string,
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
  walletLockingType: 'standard' | 'p2shMultisig'
  transactionSigner: TransactionSigner | undefined,
  tokens: CashToken[]
}

export const useUser = defineStore('user', {
  state: (): UserState => ({
    genesisInputs: [],
    paginatedAuthKeys: {count: 0,limit: 0,offset: 0,next: null,previous: null,results: []},
    walletBchBalance: '',
    walletAddress: '',
    walletTokenAddress: '',
    wallet: undefined,
    walletConnectSigner: undefined,
    walletConnectSession: undefined,
    walletType: 'paytaca',
    walletLockingType: 'standard',
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
