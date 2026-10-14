import { HDWallet, NetworkType, Utxo } from "mainnet-js";
import { ExternalWallet, UtxoWithPath } from "./types";
import { PathXpub } from "@wizardconnect/core";
import { getHDWalletClass } from "./get-hd-wallet-class";
import { CashAddressNetworkPrefix, decodeHdPublicKey, encodeHdPublicKey } from "bitauth-libauth-v3";


export type WZWalletPath = { name: string, xpub: string }

export class WizardConnectExternalWallet implements ExternalWallet {

    receive?: HDWallet | undefined 
    change?: HDWallet | undefined
    defi?: HDWallet | undefined 
    initializing?: boolean | undefined
    ready: boolean | undefined;
    balance: bigint | undefined 
    utxos: UtxoWithPath[] | undefined
    session: any | undefined
    network: 'chipnet' | 'mainnet' | 'testnet'

    constructor(options?: { ready?: boolean, network?: 'chipnet' | 'mainnet' | 'testnet'}) {
        this.ready = options?.ready
        this.network = options?.network || 'mainnet'
    }

    async initWallet(session: {paths?: PathXpub[]}) {
        try {
            this.initializing = true
            if (!session.paths || session.paths.length === 0) {
                this.ready = false 
                return 
            }
            this.session = session
            const receiveXPub = session.paths.find((p: WZWalletPath) => p.name === 'receive')?.xpub
            const changeXPub = session.paths.find((p: WZWalletPath) => p.name === 'change')?.xpub
            const defiXPub = session.paths.find((p: WZWalletPath) => p.name === 'defi')?.xpub
            
            let network: string  = this.network

            if (this.network === 'chipnet') {
                network = 'testnet'
            }
            const HDWalletClass = await getHDWalletClass()

            /**
             * Normalise an xpub for `fromXPub`. libauth v3 hands back a Result union from
             * `decodeHdPublicKey` (an error string when it fails) and an object from
             * `encodeHdPublicKey` — v2 returned a bare string from the latter and a cast-able
             * node from the former. Falsy xpubs stay undefined so the `if` guards below still
             * decide which wallets get built.
             */
            const normalizeXPub = (xpub?: string) => {
                if (!xpub) return undefined
                const decoded = decodeHdPublicKey(xpub)
                if (typeof decoded === 'string') throw new Error(decoded)
                return encodeHdPublicKey({
                    network: network as 'mainnet' | 'testnet',
                    node: decoded.node
                }).hdPublicKey
            }

            const encodedReceiveXPub = normalizeXPub(receiveXPub)
            const encodedChangeXPub = normalizeXPub(changeXPub)
            const encodedDefiXPub = normalizeXPub(defiXPub)

            if (encodedReceiveXPub) {
                this.receive = await HDWalletClass.fromXPub(encodedReceiveXPub)
            }

            if (encodedChangeXPub) {
                this.change = await HDWalletClass.fromXPub(encodedChangeXPub)
                // this.receive = new HDWallet(network as NetworkType)
            }
            if (encodedDefiXPub) {
                this.defi = await HDWalletClass.fromXPub(encodedDefiXPub)
                // this.receive = new HDWallet(network as NetworkType)
            }

            await this.getUtxos({ sync: true })
            this.ready = true         
            this.initializing = false
            return this
        } catch (error) {
            throw error 
        } finally {
            this.initializing = false
        }
        
    }

    getDepositAddress(index?: number): string {
        return this.receive?.getDepositAddress(index ?? 0) as string
    }

    getTokenDepositAddress(index?: number): string {
        return this.receive?.getTokenDepositAddress(index ?? 0) as string
    }

    async getBalance(option?: { sync: boolean }) {
        if (!option?.sync) return this.balance 
        const utxos = await this.getUtxos({ sync: true })
        return this.getBalanceFromUtxos(utxos) as bigint
    }

    getBalanceFromUtxos (utxos: Utxo[]|UtxoWithPath[]) {
        const utxoMap = new Map()
        const balance = utxos!.reduce((acc, next) => {
            if (next.token) return acc
            if(utxoMap.has(`${next.txid}:${next.vout}`)) return acc
            utxoMap.set(`${next.txid}:${next.vout}`, next)
            acc = acc + next.satoshis
            return acc
        }, 0n)

        return balance
    }

    async getUtxos(options?: { sync?: boolean }): Promise<UtxoWithPath[]> {
        if (!options?.sync && this.utxos !== undefined) {
            return this.utxos
        }

        const utxoRequests: { name: string, req: Promise<Utxo[]>}[] = []

        let utxos: Utxo[] = []

        if (this.receive) utxoRequests.push({ name: 'receive', req: this.receive.getUtxos() })
        if (this.change) utxoRequests.push({ name: 'change', req: this.change.getUtxos() })
        if (this.defi) utxoRequests.push({ name: 'defi', req: this.defi.getUtxos() })
      
        const utxoPromiseResults = await Promise.allSettled([...utxoRequests.map((r) => r.req)])
          
        for (const i in utxoRequests) {
          if(utxoPromiseResults[i]?.status === 'rejected') continue
          utxos = utxos.concat(
            (utxoPromiseResults[i] as PromiseFulfilledResult<Utxo[]>).value.map((u: Utxo) => ({ ...u, pathName: utxoRequests[i]!.name }))
          )
        }
    
        utxos = WizardConnectExternalWallet.resolveUtxosAddressIndex(
            this,
            utxos as UtxoWithPath[]
        ) as UtxoWithPath[]
    
        const uniqueUtxosMap = new Map((utxos).map(utxo => [`${utxo.txid}:${utxo.vout}`, utxo]))
        this.utxos = [...uniqueUtxosMap.values()] as UtxoWithPath[]
        this.balance = this.getBalanceFromUtxos(this.utxos as Utxo[]) 
        return this.utxos
    } 
    
    async getGenesisInputUtxos(options?: {sync: boolean}): Promise<UtxoWithPath[] | Utxo[]> {
        if (!options?.sync || this.utxos === undefined) {
            return this.utxos?.filter((utxo: Utxo|UtxoWithPath) => !utxo.token && utxo.vout === 0) || []
        }
        const utxos = await this.getUtxos({ sync: true })
        return utxos?.filter((utxo: Utxo|UtxoWithPath) => !utxo.token && utxo.vout === 0) || []
    }

    getWalletType(): "wizard-connect" | "wallet-connect" {
        return 'wizard-connect'
    }

    /*
     * Parked for later — the multisig check that src/apps/utils/wallet.ts used to patch onto the
     * mainnet-js v2 Wallet prototype (`getTokenDepositAddress`/`getDepositAddress` need no patch:
     * v3's WatchWallet has both natively). It reads the wallet template a WalletConnect session
     * carries, so with wizard-connect the equivalent is the session the manager exposes. Wire that up
     * (as an isMultisig() on this class) and the pending-multisig lookup can return txs again — the
     * store and ClientDB that used to drive it are parked in .git/exclude/archive/dead-files-2026-10-14.
     *
     *   isMultisig() {
     *       if (this.walletConnectSession?.sessionProperties?.wallet?.template) {
     *           return isMultisigWallet(this.walletConnectSession.sessionProperties.wallet.template)
     *       }
     *       return false
     *   }
     *
     * isMultisigWallet() itself lives in src/core/wallet/multisig-template.ts.
     */

    async sync() {
        if (!this.ready) return 
        await this.getUtxos({ sync: true })
    }
    

    static resolveUtxosAddressIndex(walletInstance: WizardConnectExternalWallet, utxos: UtxoWithPath[]) {
        const utxosWithPath = []
        for (const utxo of utxos) {
            if (utxo.pathName) {
                const utxoDerivationInfo = walletInstance[utxo.pathName]?.walletCache?.get(utxo.address);
                if (!utxoDerivationInfo) {
                    throw new Error('Error getting the address information of some of your unspent BCH. Please try to refresh the page. If problem persists, please contact admin.')
                }
                utxosWithPath.push({
                    ...utxo,
                    addressIndex: utxoDerivationInfo.index
                })
            }
        }
        return utxosWithPath
    }

    static getInputPaths(walletInstance: WizardConnectExternalWallet, utxos: UtxoWithPath[]) {
        const inputPaths = []
        for (const inputIndex in utxos) {
            const utxo = utxos[inputIndex] as UtxoWithPath
            const addressDetails = walletInstance[utxo.pathName as 'receive' | 'change' | 'defi']?.walletCache.get(utxo.address)
            // Note: Don't use addressDetails.change produced by the walletCache it returns true even if the address is a receiving address
            if (!addressDetails) {
                throw new Error('Error creating authkey. Please try refreshing the page.')
            }
            const inputPath = [
                Number(inputIndex),
                utxo.pathName,
                addressDetails.index
            ]
            inputPaths.push(inputPath)
        }
        return inputPaths 
    }
}