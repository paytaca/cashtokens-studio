import { type Utxo } from "mainnet-js"

export type UtxoWithPath = Utxo & { 
    pathName: 'receive' | 'change' | 'defi',
    addressIndex?: number 
};

export interface ExternalWallet {
    ready?: boolean,
    initializing?: boolean
    /**
     * `Utxo[]` as well as `UtxoWithPath[]`: a single-address WalletConnect session has no derivation
     * path to attach, and every builder already tolerates a missing `pathName`.
     */
    utxos?: UtxoWithPath[] | Utxo[]
    balance?: bigint
    session?: any

    getBalance(): Promise<bigint|undefined>
    getUtxos(options?: { sync?: boolean }): Promise<UtxoWithPath[] | Utxo[]>
    getWalletType(): 'wizard-connect'|'wallet-connect'
    getGenesisInputUtxos(): Promise<UtxoWithPath[]|Utxo[]>
    /**
     * Returns address connected address or address at index 0 if index is not specified
     */
    getDepositAddress(index?: number): string  
    getTokenDepositAddress(index?: number): string  
    /**
     * Refreshes utxos and balance
     */
    sync(): Promise<void>
    waitForTransaction?(): Promise<void>
}
