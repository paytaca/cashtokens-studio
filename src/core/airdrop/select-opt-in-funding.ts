import { binToHex, cashAddressToLockingBytecode, decodeCashAddress, encodeCashAddress } from 'bitauth-libauth-v3'
import { UtxoWithPath } from '../types'

export type SelectOptInFundingParams = {
    walletUtxos: UtxoWithPath[],
    walletType: 'wizard-connect' | 'wallet-connect',
    /** Used when no receive-branch UTXO exists, so the UI can still show where to send BCH. */
    defaultRecipientAddress: string,
}

export type OptInFundingSelection =
    | {
        success: true,
        recipientAddress: string,
        /** Becomes transaction input 1 and therefore the address the NFT is minted to. */
        funderInput: UtxoWithPath,
        /** Additional BCH-only inputs the builder may append to cover the fee. */
        feeUtxos: UtxoWithPath[],
        /** BCH-only balance at recipientAddress (token UTXOs cannot fund input 1). */
        recipientBalance: bigint,
    }
    | {
        success: false,
        error: 'no-receive-funds',
        recipientAddress: string,
        recipientBalance: bigint,
    }

/** Hex of the locking script behind a cashaddress, token-aware or not. */
export function lockingBytecodeOf(address: string): string {
    const decoded = cashAddressToLockingBytecode(address)
    if (typeof decoded === 'string') throw new Error(decoded)
    return binToHex(decoded.bytecode)
}

/**
 * Token outputs require a token-aware cashaddress; the UTXO addresses returned by the wallet are
 * plain. Both encode the same locking script, so this is just the address form CashScript needs.
 */
export function tokenAwareAddressOf(address: string): string {
    const decoded = decodeCashAddress(address)
    if (typeof decoded === 'string') throw new Error(decoded)
    if (decoded.type.includes('WithTokens')) return address

    const encoded = encodeCashAddress({
        ...decoded,
        throwErrors: true,
        type: `${decoded.type as 'p2pkh' | 'p2sh'}WithTokens`,
    })

    return encoded.address
}

/**
 * BCH-only balance at an address. Token-bearing UTXOs are excluded because the opt-in builder
 * cannot spend them as the funding input without also accounting for their tokens.
 */
export function bchBalanceAt(walletUtxos: UtxoWithPath[], address: string): bigint {
    const addressLock = lockingBytecodeOf(address)

    return walletUtxos.reduce((balance, utxo) => {
        if (utxo.token) return balance
        return lockingBytecodeOf(utxo.address) === addressLock ? balance + utxo.satoshis : balance
    }, 0n)
}

function sortBySatoshisDescending(utxos: UtxoWithPath[]): UtxoWithPath[] {
    return [...utxos].sort((a, b) => Number(b.satoshis) - Number(a.satoshis))
}

/**
 * Picks the opt-in funding UTXO.
 *
 * The deployed AirdropBeacon contract requires the minted NFT output to share a locking script
 * with transaction input 1, so the funder doubles as the NFT destination. The funder is therefore
 * restricted to the receive branch (preferring receive index 0); change/defi UTXOs may only cover
 * the fee. A single-address WalletConnect session has no path metadata, and its only address is the
 * recipient.
 */
export function selectOptInFunding(params: SelectOptInFundingParams): OptInFundingSelection {
    const bchUtxos = sortBySatoshisDescending(params.walletUtxos.filter((utxo) => !utxo.token))

    const defaultRecipientAddress = params.defaultRecipientAddress
        ? tokenAwareAddressOf(params.defaultRecipientAddress)
        : ''

    const balanceAtDefault = defaultRecipientAddress
        ? bchBalanceAt(bchUtxos, defaultRecipientAddress)
        : 0n

    if (params.walletType === 'wallet-connect') {
        const [funderInput, ...feeUtxos] = bchUtxos
        const recipientAddress = defaultRecipientAddress

        if (!funderInput) {
            return {
                success: false,
                error: 'no-receive-funds',
                recipientAddress,
                recipientBalance: balanceAtDefault,
            }
        }

        return {
            success: true,
            recipientAddress,
            funderInput,
            feeUtxos,
            recipientBalance: balanceAtDefault,
        }
    }

    const receiveUtxos = bchUtxos.filter((utxo) => utxo.pathName === 'receive')
    const funderInput = receiveUtxos.find((utxo) => utxo.addressIndex === 0) ?? receiveUtxos[0]

    if (!funderInput) {
        const recipientAddress = defaultRecipientAddress
        return {
            success: false,
            error: 'no-receive-funds',
            recipientAddress,
            recipientBalance: balanceAtDefault,
        }
    }

    return {
        success: true,
        recipientAddress: tokenAwareAddressOf(funderInput.address),
        funderInput,
        feeUtxos: bchUtxos.filter((utxo) => utxo !== funderInput),
        recipientBalance: bchBalanceAt(bchUtxos, funderInput.address),
    }
}
