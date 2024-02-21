import { TestNetWallet, Wallet } from 'mainnet-js';
import { defineStore } from 'pinia'
import { AuthKey, AuthchainIdentity, Watchtower } from 'src/app';
import { PaginatedData, TransactionSigner } from 'src/app/types';
import { UserState } from './user';

type Paginator = {
  currentPage: number,
  maxRowsPerPage: number,
  rowCount: number,
  numberOfPages: number,
  offset: number
}

export const useIdentityOutputs = defineStore('identityoutputs', {

  state: (): { nftReserves: PaginatedData, ftReserves: PaginatedData, authHeads: PaginatedData, paginator: Paginator, status: string} => ({
      nftReserves: {
        count: 0,
        limit: 0,
        offset: 10,
        next: null,
        previous: null,
        results: []
      },
      ftReserves: {
        count: 0,
        limit: 0,
        offset: 10,
        next: null,
        previous: null,
        results: []
      },
      authHeads: {
        count: 0,
        limit: 0,
        offset: 10,
        next: null,
        previous: null,
        results: []
      },
      paginator: {
        currentPage: 1,
        maxRowsPerPage: 10,
        rowCount: 0,
        numberOfPages: 0,
        offset: 0
      },
      status: ''
  }),

  actions: {
    updatePaginator(paginator: Paginator) {
      this.paginator.currentPage = paginator.currentPage || this.paginator.currentPage
      this.paginator.maxRowsPerPage = paginator.maxRowsPerPage || this.paginator.maxRowsPerPage
      this.paginator.rowCount = paginator.rowCount || this.paginator.rowCount
      this.paginator.numberOfPages = paginator.numberOfPages || this.paginator.numberOfPages
      this.paginator.offset = paginator.offset || this.paginator.offset
    },
    async populateNftReserves(user: Pick<UserState, 'wallet' | 'transactionSigner'>) {
      if (user.wallet) {
        
        this.nftReserves = await (new Watchtower()).fetchAuthchainIdentities(
          user.wallet.getTokenDepositAddress(),
          { limit: this.paginator.maxRowsPerPage, offset: this.paginator.offset, token_amount__eq: 0, token_is_nft: true }
        )

        this.nftReserves?.results.forEach(async (identityOutput, i) => {
          const authKeyUtxoClone = Object.assign({}, identityOutput.authKey)
          const authKey = new AuthKey({ ...authKeyUtxoClone, ownerWallet: user.wallet })
          const {
            txid,
            vout,
            satoshis,
            height,
            coinbase,
            token
          } = identityOutput
          this.nftReserves.results[i] = new AuthchainIdentity({ txid, vout, satoshis, height, coinbase, token, authKey: authKey, ownerWallet: user.wallet as Wallet }, user.transactionSigner)
          await this.nftReserves.results[i].resolveIdentitySnapshot()
        })
        this.updatePaginator({
          currentPage: Math.ceil((this.paginator.offset + 1) / this.nftReserves.limit),
          maxRowsPerPage: this.nftReserves.limit,
          rowCount: this.nftReserves.count,
          numberOfPages: Math.ceil(this.nftReserves.count / this.nftReserves.limit),
          offset: this.nftReserves.offset
        })
      }
    }
  }
  
});


