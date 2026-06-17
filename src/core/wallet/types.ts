import { type Utxo } from "mainnet-js-v3"

export type UtxoWithPath = Utxo & { 
    pathName: 'receive' | 'change' | 'defi',
    addressIndex?: number 
};

export interface ExternalWallet {
    ready?: boolean,
    utxos?: UtxoWithPath[]
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
