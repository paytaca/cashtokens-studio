import type { DecoratedUtxo } from '../types'

export function shortenTokenId(tokenId: string) {
    return (tokenId || '').replace(tokenId.substring(5, 60), '...')
}

export function shortenCashAddress(address: string) {
    return (address || '').replace(address.substring(15, 45), '...')
}

export function formatTokenAmount(
    amount: number | bigint, 
    customSymbol: string, 
    decimals?: number,
    symbolPosition: 'prefix' | 'suffix' | 'none' = 'prefix'
) {
    const decs = decimals ?? 0;
    
    // Scale down the atomic amount to its fractional unit base
    const scaledAmount = typeof amount === 'bigint' 
        ? Number(amount) / Math.pow(10, decs) 
        : amount / Math.pow(10, decs);

    // We use a dummy currency (USD) to get the correct decimal/thousands layout
    const formatter = new Intl.NumberFormat(navigator.language, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: decs,
        minimumFractionDigits: decs,
    });

    const parts = formatter.formatToParts(scaledAmount);

    // Filter out the placeholder currency sign to handle it manually based on position
    const valueString = parts
        .filter(part => part.type !== 'currency')
        .map(part => part.value)
        .join('')
        .trim(); // Cleans up any trailing/leading whitespace left by the currency part

    // Position or omit the symbol based on the configuration
    if (symbolPosition === 'none') {
        return valueString;
    }
    
    return symbolPosition === 'suffix' 
        ? `${valueString} ${customSymbol}`.trim() 
        : `${customSymbol}${valueString}`;
}



/**
 * Sorts an array of Extended Public Keys (xpubs) lexicographically.
 * This ensures deterministic multi-sig address derivation (BIP67).
 * 
 * @param xpubs Array of xpub strings to sort
 * @returns A new array with the sorted xpub strings
 */
export function sortXpubsLexicographically(xpubs: string[]): string[] {
    // Use slice() to avoid mutating the original array directly
    return xpubs.slice().sort((a, b) => a.localeCompare(b));
  }

export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}

export function getTokenType(utxo: DecoratedUtxo): 'fungible' | 'nft' | 'mixed' {
  const hasAmount = !!utxo.token?.amount
  const capability = utxo.token?.nft?.capability
  if (hasAmount && capability === 'minting') return 'mixed'
  if (hasAmount && (capability === 'mutable' || capability === 'none')) return 'fungible'
  if (!hasAmount) return 'nft'
  return 'fungible'
}

export function isPureFungible(utxo: DecoratedUtxo): boolean {
  return getTokenType(utxo) === 'fungible'
}
  