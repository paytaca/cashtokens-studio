import { defineStore } from 'pinia'
import { UtxoI, Wallet } from 'mainnet-js';
import { PaginatedData, TransactionSigner } from 'src/apps/types';
import { CashToken, Watchtower } from 'src/apps';
import { createTemplate } from 'src/apps/utils/createMultisigWalletTemplate';
import { walletTemplateP2pkh } from 'bitauth-libauth-v3';
import { isMultisigWallet } from 'src/apps/utils';
import ClientDB from 'src/apps/clientonly/ClientDB';

export type UserState = {
  connectedPaytacaAddress?: string,
  connectedPaytacaWalletBchBalance?: string | number,
  walletBchBalance: string | number | undefined
  // walletAddress: string,
  wallet: Wallet | undefined,
  isMultisig?: boolean,
  pendingMultisigTransactions?: any[],
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
  // walletConnectSession:any,
  walletType: 'paytaca' | 'walletconnect' | undefined
  transactionSigner: TransactionSigner | undefined,
  tokens: CashToken[],
  authchainIdentities?: PaginatedData
}

export const useUser = defineStore('user', {
  state: (): UserState => ({
    genesisInputs: [],
    paginatedAuthKeys: {count: 0,limit: 0,offset: 0,next: null,previous: null,results: []},
    walletBchBalance: '',
    // walletAddress: '',
    wallet: undefined,
    walletConnectSigner: undefined,
    // walletConnectSession: undefined,
    walletType: 'paytaca',
    transactionSigner: undefined,
    tokens: []
  }),
  actions: {
    
    async getPendingMultisigTransactions() {
      if (this.wallet && typeof this.wallet.isMultisig === 'function' && this.wallet.isMultisig()) {
        const db = ClientDB.getInstance()
        return db.getPendingMultisigTransactions()
      }
      return []
    },

    async fetchAuthchainIdentities(address: string, query?: any, force?: boolean) {
      if (this.authchainIdentities && !force) {
        return this.authchainIdentities
      }

      this.authchainIdentities = await (new Watchtower()).fetchAuthchainIdentities(address, query)
      return this.authchainIdentities
    }
  },
  getters: {
    walletNetworkType():('mainnet' | 'testnet' | 'chipnet'){
      if (process.env.APP_ENV === 'development' || process.env.APP_ENV === 'development-build') {
        return 'chipnet'
      }
      return 'mainnet'
    },
    walletAddress(): string {
      return this.wallet?.getDepositAddress() || ''
    },
  }
});
