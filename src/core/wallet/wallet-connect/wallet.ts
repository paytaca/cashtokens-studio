import type { Utxo, WatchWallet } from 'mainnet-js'
import { ExternalWallet } from '../types'
import { getWatchWalletClass } from '../get-watch-wallet-class'
import { walletConnectCacheId } from '../wallet-cache-id'

/**
 * The wallet behind a WalletConnect session.
 *
 * A WalletConnect session only hands back a single address — no xpubs — so this is a watch-only
 * wallet over that one address. It implements the same `ExternalWallet` surface as
 * `WizardConnectExternalWallet`, so the transaction builders accept its UTXOs unchanged; the only
 * difference is that its UTXOs carry no `pathName`/`addressIndex`, which every builder already
 * tolerates (a WalletConnect wallet resolves the signing key itself).
 */
export class WalletConnectExternalWallet implements ExternalWallet {
    ready: boolean | undefined
    balance: bigint | undefined
    utxos: Utxo[] | undefined
    session: any | undefined
    initializing?: boolean
    network: 'chipnet' | 'mainnet' | 'testnet'
    address: string | undefined

    private watchWallet: WatchWallet | undefined

    constructor(options?: { ready?: boolean, network?: 'chipnet' | 'mainnet' | 'testnet' }) {
        this.ready = options?.ready
        this.network = options?.network || 'mainnet'
    }

    async initWallet(address: string) {
        this.initializing = true
        try {
            const WatchWalletClass = await getWatchWalletClass()
            this.watchWallet = await WatchWalletClass.watchOnly(address)
            this.address = this.watchWallet.getDepositAddress()
            await this.getUtxos({ sync: true })
            this.ready = true
            return this
        } finally {
            this.initializing = false
        }
    }

    /** WalletConnect sessions are single-address, so the index is ignored. */
    getDepositAddress(_index?: number): string {
        return this.watchWallet?.getDepositAddress() ?? this.address ?? ''
    }

    getTokenDepositAddress(_index?: number): string {
        return this.watchWallet?.getTokenDepositAddress() ?? ''
    }

    /** The connected address is the only identity a WalletConnect session carries. */
    getCacheId(): string {
        return this.address ? walletConnectCacheId(this.address) : ''
    }

    async getBalance(options?: { sync: boolean }) {
        if (!options?.sync) return this.balance
        const utxos = await this.getUtxos({ sync: true })
        return this.getBalanceFromUtxos(utxos)
    }

    async getUtxos(options?: { sync?: boolean }): Promise<Utxo[]> {
        if (!options?.sync && this.utxos !== undefined) return this.utxos

        this.utxos = (await this.watchWallet?.getUtxos()) ?? []
        this.balance = this.getBalanceFromUtxos(this.utxos)
        return this.utxos
    }

    async getGenesisInputUtxos(options?: { sync: boolean }): Promise<Utxo[]> {
        if (!options?.sync || this.utxos === undefined) {
            return (this.utxos ?? []).filter(utxo => !utxo.token && utxo.vout === 0)
        }
        const utxos = await this.getUtxos({ sync: true })
        return utxos.filter(utxo => !utxo.token && utxo.vout === 0)
    }

    getWalletType(): 'wallet-connect' {
        return 'wallet-connect'
    }

    async sync() {
        if (!this.ready) return
        await this.getUtxos({ sync: true })
    }

    /**
     * Single-address subscription, so the authguard pages still refresh when a new block touches
     * this wallet. `WatchWallet` has no per-path wallets to watch, unlike the HD wallet.
     */
    async watchStatus(callback: (status: string | null, address: string) => void) {
        return this.watchWallet?.watchStatus(callback)
    }

    /** Token UTXOs are excluded, matching `WizardConnectExternalWallet.getBalanceFromUtxos`. */
    getBalanceFromUtxos(utxos: Utxo[]) {
        return utxos.reduce((total, utxo) => utxo.token ? total : total + utxo.satoshis, 0n)
    }
}
