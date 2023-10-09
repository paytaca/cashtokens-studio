import { defineStore } from 'pinia'
import { UtxoI, Wallet } from 'mainnet-js';
import { AuthKey } from 'src/app/AuthKey';
import { AuthchainIdentity, CashToken } from 'src/app';
import { PaginatedData } from 'src/app/types';

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
  genesisInputs: UtxoI[],
  // authNFTs?: AuthNFT[],
  // authchainIdentities?: AuthchainIdentity[],
  updatingBalances?: boolean,
  authKeys?: AuthKey[],
  tokens: CashToken[],
  authchainIdentities: AuthchainIdentity[],
  paginatedAuthchainIdentities: PaginatedData,
  paginatedFtAuthchainIdentities: PaginatedData,
  paginatedNftAuthchainIdentities: PaginatedData,
  paginatedAuthKeys: PaginatedData,
  paginatedFtBalances: PaginatedData,
  paginatedNftCollections: PaginatedData
}

export const useUser = defineStore('user', {
  state: (): UserState => ({
    genesisInputs: [],
    authKeys: [],
    tokens: [],
    authchainIdentities: [],
    paginatedAuthchainIdentities: {count: 0,limit: 0,offset: 0,next: null,previous: null,results: []},
    paginatedFtAuthchainIdentities: {count: 0,limit: 0,offset: 0,next: null,previous: null,results: []},
    paginatedNftAuthchainIdentities: {count: 0,limit: 0,offset: 0,next: null,previous: null,results: []},
    paginatedAuthKeys: {count: 0,limit: 0,offset: 0,next: null,previous: null,results: []},
    paginatedFtBalances: {count: 0,limit: 0,offset: 0,next: null,previous: null,results: []},
    paginatedNftCollections: {count: 0,limit: 0,offset: 0,next: null,previous: null,results: []},
    walletBchBalance: '',
    walletAddress: '',
    walletTokenAddress: '',
  }),
  getters: {
    walletNetworkType():('mainnet' | 'testnet' | 'chipnet'){
      if (process.env.APP_ENV === 'development' || process.env.APP_ENV === 'production') {
        return 'chipnet'
      }
      return 'mainnet'
    }
  }
});
