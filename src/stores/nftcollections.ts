import { TestNetWallet, Wallet } from 'mainnet-js';
import { defineStore } from 'pinia'
import { AuthKey, AuthchainIdentity, CashToken, FetchUtxoQueryParams, Watchtower } from 'src/apps';
import { PaginatedData, TransactionSigner } from 'src/apps/types';
import { UserState } from './user';

type Paginator = {
  currentPage: number,
  maxRowsPerPage: number,
  rowCount: number,
  numberOfPages: number,
  offset: number
}

export const useNftCollections = defineStore('nftcollections', {

  state: (): {nfts: PaginatedData, count: number, limit: number, offset: number, next: string|null, previous: string|null, results: any[], paginator: Paginator, status?: string} => ({
        count: 0,
        limit: 0,
        offset: 10,
        next: null,
        previous: null,
        results: [],
        nfts: {
          count: 0,
          limit: 0,
          offset: 10,
          next: null,
          previous: null,
          results: [],
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

    async populateNftCollections(user: Pick<UserState, 'wallet' | 'transactionSigner'>, excludePossibleAuthKeys?: boolean) {
      if (user.wallet) {
        
        const query: FetchUtxoQueryParams = { limit: this.paginator.maxRowsPerPage, offset: this.paginator.offset }
        if (excludePossibleAuthKeys) {
            query.commitment_ne = '00'
        }

        this.nfts = await (new Watchtower()).fetchNfts(
            user.wallet.getTokenDepositAddress(),
            query
        )

        if (this.nfts && this.nfts.count > 0) {
          this.nfts.results?.forEach(async (cashtoken, i) => {
            const authKeyUtxoClone = Object.assign({}, cashtoken.authKey)
            const authKey = new AuthKey({ ...authKeyUtxoClone, ownerWallet: user.wallet })
            const {
              txid,
              vout,
              satoshis,
              height,
              coinbase,
              token
            } = cashtoken
            this.nfts.results[i] = new CashToken({ txid, vout, satoshis, height, coinbase, token, authKey: authKey, ownerWallet: user.wallet as Wallet }, user.transactionSigner)
            await this.nfts.results[i].resolveNftType()
          })
          this.updatePaginator({
            currentPage: Math.ceil((this.paginator.offset + 1) / this.nfts.limit),
            maxRowsPerPage: this.nfts.limit,
            rowCount: this.nfts.count,
            numberOfPages: Math.ceil(this.nfts.count / this.nfts.limit),
            offset: this.nfts.offset
          })
        }
        
      }
    }
  }
  
});


